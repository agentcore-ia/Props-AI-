"use client";

import { startTransition, useState } from "react";
import { Bot, Loader2, MessageCircleMore, SendHorizonal } from "lucide-react";

import type { Property } from "@/lib/mock-data";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

type AssistantMessage = {
  id: string;
  role: "assistant" | "user";
  content: string;
};

const quickPrompts = [
  "Busco 2 ambientes para inversion",
  "Quiero una casa con jardin para familia",
  "Necesito alquiler amoblado en CABA",
];

export function CatalogAssistant({
  tenantSlug,
  properties,
}: {
  tenantSlug: string;
  properties: Property[];
}) {
  const [assistantInput, setAssistantInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [assistantMessages, setAssistantMessages] = useState<AssistantMessage[]>([
    {
      id: "assistant-welcome",
      role: "assistant",
      content:
        "Contame que tipo de propiedad buscas y te sugiero las opciones mas convenientes de este portafolio.",
    },
  ]);

  async function sendAssistantPrompt(rawPrompt: string) {
    const prompt = rawPrompt.trim();
    if (!prompt || loading) return;

    const userMessage: AssistantMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: prompt,
    };

    startTransition(() => {
      setAssistantMessages((current) => [...current, userMessage]);
      setAssistantInput("");
      setLoading(true);
    });

    try {
      const response = await fetch("/api/public/assistant", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          tenantSlug,
          prompt,
          propertyIds: properties.map((property) => property.id),
        }),
      });

      const payload = await response.json().catch(() => null);

      setAssistantMessages((current) => [
        ...current,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content:
            payload?.reply ??
            payload?.error ??
            "No pude responder esta vez. Proba reformular la consulta.",
        },
      ]);
    } catch {
      setAssistantMessages((current) => [
        ...current,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content:
            "Tuve un problema al consultar la IA. Proba de nuevo en unos segundos.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <aside className="rounded-[30px] border border-slate-200 bg-slate-950 p-5 text-white shadow-[0_24px_80px_-48px_rgba(15,23,42,0.65)] lg:p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-blue-100">
            <Bot className="size-3.5" />
            IA de busqueda
          </p>
          <h3 className="mt-4 text-2xl font-semibold">Contale que estas buscando</h3>
        </div>
        <div className="flex size-11 items-center justify-center rounded-2xl bg-white/10">
          <MessageCircleMore className="size-5" />
        </div>
      </div>

      <div className="mt-5 space-y-3">
        {assistantMessages.map((message) => (
          <div
            key={message.id}
            className={
              message.role === "assistant"
                ? "rounded-[22px] bg-white/8 p-4 text-sm leading-6 text-white/85"
                : "ml-auto max-w-[88%] rounded-[22px] bg-blue-500 px-4 py-3 text-sm font-medium text-white"
            }
          >
            <p className="whitespace-pre-line">{message.content}</p>
          </div>
        ))}
      </div>

      <div className="mt-5 space-y-3">
        <Textarea
          value={assistantInput}
          onChange={(event) => setAssistantInput(event.target.value)}
          placeholder="Ej: busco alquiler de 2 ambientes en Palermo con balcon y buena luz."
          className="min-h-28 rounded-[24px] border-white/10 bg-white/5 px-4 py-3 text-white placeholder:text-white/45"
        />
        <div className="flex flex-wrap gap-2">
          {quickPrompts.map((prompt) => (
            <button
              key={prompt}
              type="button"
              onClick={() => sendAssistantPrompt(prompt)}
              className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs font-medium text-white/70 transition-colors hover:bg-white/10 hover:text-white"
            >
              {prompt}
            </button>
          ))}
        </div>
        <Button
          className="h-11 w-full rounded-2xl bg-white text-slate-950 hover:bg-blue-50"
          onClick={() => sendAssistantPrompt(assistantInput)}
          disabled={loading}
        >
          {loading ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
          Consultar a la IA
          <SendHorizonal className="ml-2 size-4" />
        </Button>
      </div>
    </aside>
  );
}
