"use client";

import { useState } from "react";
import { Sparkles, WandSparkles } from "lucide-react";

import { AIMessage, aiMessages } from "@/lib/mock-data";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

export function AIChat() {
  const [messages, setMessages] = useState<AIMessage[]>(aiMessages);
  const [prompt, setPrompt] = useState("");

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
              Usá prompts para ventas, mensajes, resúmenes y automatizaciones.
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
            placeholder="Ej. redactá un seguimiento cálido para un lead que visitó ayer..."
            className="border-0 shadow-none focus-visible:ring-0"
          />
          <Button
            className="rounded-2xl"
            onClick={() => {
              if (!prompt.trim()) return;

              setMessages((prev) => [
                ...prev,
                { id: crypto.randomUUID(), role: "user", content: prompt },
                {
                  id: crypto.randomUUID(),
                  role: "assistant",
                  content:
                    "Respuesta simulada: puedo convertir este prompt en un flujo reusable, sugerir una respuesta comercial y registrar la acción en el CRM.",
                },
              ]);
              setPrompt("");
            }}
          >
            <WandSparkles className="size-4" />
            Generar
          </Button>
        </div>
      </div>
    </div>
  );
}
