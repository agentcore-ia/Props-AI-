"use client";

import { startTransition, useEffect, useMemo, useState } from "react";
import {
  Bot,
  Loader2,
  MessageCircleMore,
  SendHorizonal,
  Sparkles,
  X,
} from "lucide-react";

import type { Property } from "@/lib/mock-data";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

type AssistantMessage = {
  id: string;
  role: "assistant" | "user";
  content: string;
};

const quickPrompts = [
  "Busco alquiler de 2 ambientes en Palermo",
  "Quiero una casa en venta para familia",
  "Necesito algo con balcon y buena luz",
];

export function CatalogAssistant({
  tenantSlug,
  properties,
  mode = "inline",
  launcherText = "Te ayudo a encontrar tu proxima propiedad",
  heading = "Contame que estas buscando",
  welcomeMessage = "Contame que tipo de propiedad buscas y te sugiero opciones concretas.",
}: {
  tenantSlug?: string;
  properties: Property[];
  mode?: "inline" | "floating";
  launcherText?: string;
  heading?: string;
  welcomeMessage?: string;
}) {
  const [assistantInput, setAssistantInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(mode === "inline");
  const [assistantMessages, setAssistantMessages] = useState<AssistantMessage[]>([
    {
      id: "assistant-welcome",
      role: "assistant",
      content: welcomeMessage,
    },
  ]);

  useEffect(() => {
    setAssistantMessages([
      {
        id: "assistant-welcome",
        role: "assistant",
        content: welcomeMessage,
      },
    ]);
  }, [welcomeMessage]);

  const propertyIds = useMemo(() => properties.map((property) => property.id), [properties]);

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
      if (mode === "floating") {
        setOpen(true);
      }
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
          propertyIds,
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
            "No pude responder ahora. Proba con barrio, presupuesto o tipo de propiedad.",
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

  if (mode === "floating") {
    return (
      <>
        <div className="fixed bottom-4 right-4 z-40 flex max-w-[calc(100vw-1.5rem)] flex-col items-end gap-3 sm:bottom-6 sm:right-6">
          {open ? (
            <div className="w-[min(420px,calc(100vw-1.5rem))] overflow-hidden rounded-[28px] border border-slate-200 bg-slate-950 text-white shadow-[0_32px_90px_-42px_rgba(15,23,42,0.68)]">
              <div className="flex items-center justify-between border-b border-white/10 px-4 py-4 sm:px-5">
                <div>
                  <p className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-blue-100">
                    <Sparkles className="size-3.5" />
                    IA de busqueda
                  </p>
                  <h3 className="mt-3 text-lg font-semibold sm:text-xl">{heading}</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="inline-flex size-10 items-center justify-center rounded-full border border-white/10 bg-white/10 text-white transition-colors hover:bg-white/15"
                >
                  <X className="size-4" />
                </button>
              </div>

              <ScrollArea className="max-h-[calc(100vh-18rem)] px-4 py-4 sm:px-5">
                <AssistantConversation messages={assistantMessages} />
              </ScrollArea>

              <div className="border-t border-white/10 px-4 py-4 sm:px-5">
                <AssistantComposer
                  input={assistantInput}
                  onInputChange={setAssistantInput}
                  loading={loading}
                  onQuickPrompt={sendAssistantPrompt}
                  onSubmit={() => sendAssistantPrompt(assistantInput)}
                />
              </div>
            </div>
          ) : null}

          <button
            type="button"
            onClick={() => setOpen((current) => !current)}
            className="inline-flex max-w-[calc(100vw-1.5rem)] items-center gap-3 rounded-full bg-slate-950 px-4 py-3 text-left text-white shadow-[0_24px_60px_-34px_rgba(15,23,42,0.64)] transition-transform hover:-translate-y-0.5 sm:px-5"
          >
            <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-blue-500/20 text-blue-100">
              <Bot className="size-4.5" />
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-semibold sm:text-[15px]">{launcherText}</span>
              <span className="block text-xs text-white/65">Consultame zona, presupuesto o tipo de propiedad.</span>
            </span>
          </button>
        </div>
      </>
    );
  }

  return (
    <aside className="rounded-[30px] border border-slate-200 bg-slate-950 p-5 text-white shadow-[0_24px_80px_-48px_rgba(15,23,42,0.65)] lg:p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-blue-100">
            <Bot className="size-3.5" />
            IA de busqueda
          </p>
          <h3 className="mt-4 text-2xl font-semibold">{heading}</h3>
        </div>
        <div className="flex size-11 items-center justify-center rounded-2xl bg-white/10">
          <MessageCircleMore className="size-5" />
        </div>
      </div>

      <div className="mt-5 space-y-3">
        <AssistantConversation messages={assistantMessages} />
      </div>

      <div className="mt-5">
        <AssistantComposer
          input={assistantInput}
          onInputChange={setAssistantInput}
          loading={loading}
          onQuickPrompt={sendAssistantPrompt}
          onSubmit={() => sendAssistantPrompt(assistantInput)}
        />
      </div>
    </aside>
  );
}

function AssistantConversation({ messages }: { messages: AssistantMessage[] }) {
  return (
    <div className="space-y-3">
      {messages.map((message) => (
        <div
          key={message.id}
          className={cn(
            "max-w-[92%] rounded-[22px] p-4 text-sm leading-6",
            message.role === "assistant"
              ? "bg-white/8 text-white/85"
              : "ml-auto bg-blue-500 px-4 py-3 font-medium text-white"
          )}
        >
          <p className="whitespace-pre-line">{message.content}</p>
        </div>
      ))}
    </div>
  );
}

function AssistantComposer({
  input,
  onInputChange,
  loading,
  onQuickPrompt,
  onSubmit,
}: {
  input: string;
  onInputChange: (value: string) => void;
  loading: boolean;
  onQuickPrompt: (prompt: string) => void;
  onSubmit: () => void;
}) {
  return (
    <div className="space-y-3">
      <Textarea
        value={input}
        onChange={(event) => onInputChange(event.target.value)}
        placeholder="Ej: busco alquiler de 2 ambientes en Palermo con balcon."
        className="min-h-24 rounded-[24px] border-white/10 bg-white/5 px-4 py-3 text-white placeholder:text-white/45"
      />
      <div className="flex flex-wrap gap-2">
        {quickPrompts.map((prompt) => (
          <button
            key={prompt}
            type="button"
            onClick={() => onQuickPrompt(prompt)}
            className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs font-medium text-white/70 transition-colors hover:bg-white/10 hover:text-white"
          >
            {prompt}
          </button>
        ))}
      </div>
      <Button
        className="h-11 w-full rounded-2xl bg-white text-slate-950 hover:bg-blue-50"
        onClick={onSubmit}
        disabled={loading}
      >
        {loading ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
        Consultar a la IA
        <SendHorizonal className="ml-2 size-4" />
      </Button>
    </div>
  );
}
