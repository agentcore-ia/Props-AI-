"use client";

import { useState } from "react";
import { Loader2, Sparkles, WandSparkles } from "lucide-react";

import { AIMessage, aiMessages } from "@/lib/mock-data";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

export function AIChat() {
  const [messages, setMessages] = useState<AIMessage[]>(aiMessages);
  const [prompt, setPrompt] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    if (!prompt.trim() || submitting) {
      return;
    }

    const currentPrompt = prompt.trim();
    setSubmitting(true);
    setMessages((prev) => [...prev, { id: crypto.randomUUID(), role: "user", content: currentPrompt }]);
    setPrompt("");

    try {
      const response = await fetch("/api/admin/assistant", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({ prompt: currentPrompt }),
      });

      const payload = await response.json().catch(() => null);

      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content:
            response.ok
              ? payload?.reply ?? "No pude responder esta vez."
              : payload?.error ?? "No se pudo completar la consulta a la IA.",
        },
      ]);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="overflow-hidden rounded-[32px] border bg-card shadow-sm">
      <div className="border-b px-6 py-5">
        <div className="flex items-center gap-3">
          <div className="flex size-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
            <Sparkles className="size-5" />
          </div>
          <div>
            <h3 className="text-lg font-semibold">Asistente de operaciones</h3>
            <p className="text-sm text-muted-foreground">
              Usa prompts para ventas, mensajes, resúmenes y lectura de contratos.
            </p>
          </div>
        </div>
      </div>

      <ScrollArea className="h-[560px] px-6 py-6">
        <div className="mx-auto max-w-3xl space-y-5">
          {messages.map((message) => (
            <div
              key={message.id}
              className={cn(
                "rounded-[28px] px-5 py-4 leading-7",
                message.role === "assistant" ? "bg-muted/50" : "bg-primary text-primary-foreground"
              )}
            >
              <p className="mb-2 text-xs uppercase tracking-[0.24em] opacity-70">
                {message.role === "assistant" ? "Props AI" : "Equipo"}
              </p>
              <p className="text-sm">{message.content}</p>
            </div>
          ))}
        </div>
      </ScrollArea>

      <div className="border-t px-6 py-5">
        <div className="mx-auto flex max-w-3xl items-center gap-3 rounded-[26px] border bg-background p-2">
          <Input
            value={prompt}
            onChange={(event) => setPrompt(event.target.value)}
            placeholder="Ej. resumí el contrato del alquiler de Torre Libertad y marcame próximos hitos..."
            className="border-0 shadow-none focus-visible:ring-0"
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                void handleSubmit();
              }
            }}
          />
          <Button className="rounded-2xl" disabled={submitting || !prompt.trim()} onClick={handleSubmit}>
            {submitting ? <Loader2 className="size-4 animate-spin" /> : <WandSparkles className="size-4" />}
            Generar
          </Button>
        </div>
      </div>
    </div>
  );
}
