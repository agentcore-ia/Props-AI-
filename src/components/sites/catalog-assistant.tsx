"use client";

import Image from "next/image";
import Link from "next/link";
import { startTransition, useEffect, useMemo, useRef, useState } from "react";
import {
  Bath,
  BedDouble,
  Bot,
  Loader2,
  MessageCircleMore,
  MoveRight,
  Ruler,
  SendHorizonal,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";

import type { Property } from "@/lib/mock-data";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { cn, formatMoney } from "@/lib/utils";

type AssistantSuggestion = {
  id: string;
  title: string;
  location: string;
  price: number;
  currency: Property["currency"];
  operation: Property["operation"];
  image: string;
  routeHref: string;
  bedrooms: number;
  bathrooms: number;
  area: number;
};

type AssistantMessage = {
  id: string;
  role: "assistant" | "user";
  content: string;
  suggestions?: AssistantSuggestion[];
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
  welcomeMessage = "Contame zona, presupuesto o tipo de propiedad y te muestro opciones reales.",
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
  const [mobileSheetOpen, setMobileSheetOpen] = useState(false);
  const [isMobileViewport, setIsMobileViewport] = useState(false);
  const conversationEndRef = useRef<HTMLDivElement | null>(null);
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

  useEffect(() => {
    conversationEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [assistantMessages, open, mobileSheetOpen]);

  useEffect(() => {
    const media = window.matchMedia("(max-width: 639px)");

    const syncViewport = () => setIsMobileViewport(media.matches);

    syncViewport();
    media.addEventListener("change", syncViewport);

    return () => media.removeEventListener("change", syncViewport);
  }, []);

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
        if (isMobileViewport) {
          setMobileSheetOpen(true);
        } else {
          setOpen(true);
        }
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
          suggestions: Array.isArray(payload?.suggestions) ? payload.suggestions : [],
        },
      ]);
    } catch {
      setAssistantMessages((current) => [
        ...current,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: "Tuve un problema al consultar la IA. Proba de nuevo en unos segundos.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  function resetConversation() {
    setAssistantMessages([
      {
        id: crypto.randomUUID(),
        role: "assistant",
        content: welcomeMessage,
      },
    ]);
  }

  if (mode === "floating") {
    return (
      <div className="fixed bottom-4 right-4 z-40 flex max-w-[calc(100vw-1.5rem)] flex-col items-end gap-3 sm:bottom-6 sm:right-6">
        {isMobileViewport ? (
          <Sheet open={mobileSheetOpen} onOpenChange={setMobileSheetOpen}>
            <SheetContent
              side="bottom"
              showCloseButton={false}
              className="h-[min(88vh,760px)] rounded-t-[28px] border-t border-slate-200 bg-white p-0"
            >
              <SheetHeader className="border-b border-slate-200 px-4 py-4">
                <div className="mx-auto mb-3 h-1.5 w-14 rounded-full bg-slate-200" />
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="inline-flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-blue-700">
                      <Sparkles className="size-3.5" />
                      IA de busqueda
                    </p>
                    <SheetTitle className="mt-3 text-left text-lg font-semibold text-slate-950">
                      {heading}
                    </SheetTitle>
                    <p className="mt-1 text-left text-sm text-slate-500">
                      Te ayudo con zona, presupuesto y tipo de propiedad.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={resetConversation}
                      className="inline-flex size-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-900"
                    >
                      <Trash2 className="size-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setMobileSheetOpen(false)}
                      className="inline-flex size-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 transition-colors hover:bg-slate-50"
                    >
                      <X className="size-4" />
                    </button>
                  </div>
                </div>
              </SheetHeader>

              <div className="flex min-h-0 flex-1 flex-col">
                <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 props-scrollbar">
                  <AssistantConversation messages={assistantMessages} endRef={conversationEndRef} />
                </div>
                <div className="border-t border-slate-200 px-4 py-4">
                  <AssistantComposer
                    input={assistantInput}
                    onInputChange={setAssistantInput}
                    loading={loading}
                    onQuickPrompt={sendAssistantPrompt}
                    onSubmit={() => sendAssistantPrompt(assistantInput)}
                    compact
                  />
                </div>
              </div>
            </SheetContent>
          </Sheet>
        ) : open ? (
          <div className="w-[min(430px,calc(100vw-1.5rem))] overflow-hidden rounded-[28px] border border-slate-200 bg-white text-slate-950 shadow-[0_32px_90px_-42px_rgba(15,23,42,0.28)]">
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-4 sm:px-5">
              <div className="min-w-0">
                <p className="inline-flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-blue-700">
                  <Sparkles className="size-3.5" />
                  IA de busqueda
                </p>
                <h3 className="mt-3 text-lg font-semibold sm:text-xl">{heading}</h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={resetConversation}
                  className="inline-flex size-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-900"
                >
                  <Trash2 className="size-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="inline-flex size-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 transition-colors hover:bg-slate-50"
                >
                  <X className="size-4" />
                </button>
              </div>
            </div>

            <div className="max-h-[calc(100vh-18rem)] overflow-y-auto px-4 py-4 props-scrollbar sm:px-5">
              <AssistantConversation messages={assistantMessages} endRef={conversationEndRef} />
            </div>

            <div className="border-t border-slate-200 px-4 py-4 sm:px-5">
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
          onClick={() =>
            isMobileViewport
              ? setMobileSheetOpen(true)
              : setOpen((current) => !current)
          }
          className="inline-flex max-w-[calc(100vw-2rem)] items-center gap-3 rounded-full border border-slate-200 bg-white px-4 py-3 text-left text-slate-950 shadow-[0_24px_60px_-34px_rgba(15,23,42,0.22)] transition-transform hover:-translate-y-0.5 sm:max-w-[calc(100vw-1.5rem)] sm:px-5"
        >
          <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-blue-50 text-blue-700">
            <Bot className="size-4.5" />
          </span>
          <span className="min-w-0">
            <span className="block text-sm font-semibold sm:text-[15px]">
              {isMobileViewport ? "Te ayudo a buscar" : launcherText}
            </span>
            <span className="block text-xs text-slate-500">
              {isMobileViewport
                ? "Abrí el chat"
                : "Decime barrio, presupuesto o tipo de propiedad."}
            </span>
          </span>
        </button>
      </div>
    );
  }

  return (
    <aside className="rounded-[30px] border border-slate-200 bg-white p-5 text-slate-950 shadow-[0_24px_80px_-48px_rgba(15,23,42,0.18)] lg:p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="inline-flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-blue-700">
            <Bot className="size-3.5" />
            IA de busqueda
          </p>
          <h3 className="mt-4 text-2xl font-semibold">{heading}</h3>
          <p className="mt-2 max-w-md text-sm leading-6 text-slate-500">
            Te muestra opciones concretas y te ayuda a afinar zona, presupuesto o tipo de propiedad.
          </p>
        </div>
        <div className="flex size-11 items-center justify-center rounded-2xl bg-slate-100 text-slate-600">
          <MessageCircleMore className="size-5" />
        </div>
      </div>

      <div className="mt-5 max-h-[520px] overflow-y-auto pr-2 props-scrollbar">
        <AssistantConversation messages={assistantMessages} endRef={conversationEndRef} />
      </div>

      <div className="mt-4 flex items-center justify-between gap-3">
        <p className="text-xs text-slate-400">Presiona Enter para enviar y Shift+Enter para salto de línea.</p>
        <button
          type="button"
          onClick={resetConversation}
          className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-3 py-2 text-xs font-medium text-slate-500 transition-colors hover:text-slate-900"
        >
          <Trash2 className="size-3.5" />
          Reiniciar
        </button>
      </div>

      <div className="mt-4">
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

function AssistantConversation({
  messages,
  endRef,
}: {
  messages: AssistantMessage[];
  endRef: { current: HTMLDivElement | null };
}) {
  return (
    <div className="space-y-3">
      {messages.map((message) => (
        <div key={message.id} className={cn("max-w-[94%]", message.role === "user" ? "ml-auto" : "")}>
          <div
            className={cn(
              "rounded-[22px] p-4 text-sm leading-6",
              message.role === "assistant"
                ? "border border-slate-200 bg-slate-50 text-slate-700"
                : "bg-blue-500 px-4 py-3 font-medium text-white"
            )}
          >
            <p className="whitespace-pre-line">{message.content}</p>
          </div>
          {message.role === "assistant" && message.suggestions && message.suggestions.length > 0 ? (
            <div className="mt-3 grid gap-3">
              {message.suggestions.map((suggestion) => (
                <AssistantPropertyCard key={suggestion.id} suggestion={suggestion} />
              ))}
            </div>
          ) : null}
        </div>
      ))}
      <div ref={endRef} />
    </div>
  );
}

function AssistantPropertyCard({ suggestion }: { suggestion: AssistantSuggestion }) {
  return (
    <Link
      href={suggestion.routeHref}
      className="overflow-hidden rounded-[22px] border border-slate-200 bg-white shadow-[0_18px_45px_-34px_rgba(15,23,42,0.14)] transition-transform hover:-translate-y-0.5"
    >
      <div className="grid min-h-[112px] grid-cols-[108px_minmax(0,1fr)]">
        <div className="relative h-full min-h-[112px] overflow-hidden bg-slate-100">
          <Image src={suggestion.image} alt={suggestion.title} fill className="object-cover" />
          <div className="absolute left-2 top-2 rounded-full bg-white/92 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-900">
            {suggestion.operation}
          </div>
        </div>

        <div className="min-w-0 p-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-base font-semibold text-slate-950">
                {formatMoney(suggestion.price, suggestion.currency)}
              </p>
              <h4 className="mt-1 line-clamp-2 text-sm font-semibold text-slate-900">
                {suggestion.title}
              </h4>
              <p className="mt-1 line-clamp-2 text-xs text-slate-500">{suggestion.location}</p>
            </div>
            <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-blue-50 text-blue-700">
              <MoveRight className="size-4" />
            </span>
          </div>

          <div className="mt-3 flex flex-wrap gap-3 text-[11px] text-slate-500">
            <span className="inline-flex items-center gap-1">
              <BedDouble className="size-3.5" />
              {suggestion.bedrooms || 0}
            </span>
            <span className="inline-flex items-center gap-1">
              <Bath className="size-3.5" />
              {suggestion.bathrooms || 0}
            </span>
            <span className="inline-flex items-center gap-1">
              <Ruler className="size-3.5" />
              {suggestion.area || 0} m2
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}

function AssistantComposer({
  input,
  onInputChange,
  loading,
  onQuickPrompt,
  onSubmit,
  compact = false,
}: {
  input: string;
  onInputChange: (value: string) => void;
  loading: boolean;
  onQuickPrompt: (prompt: string) => void;
  onSubmit: () => void;
  compact?: boolean;
}) {
  function handleKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      onSubmit();
    }
  }

  return (
    <div className="space-y-3">
      <Textarea
        value={input}
        onChange={(event) => onInputChange(event.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Ej: busco alquiler de 2 ambientes en Palermo con balcon."
        className={cn(
          "rounded-[24px] border-slate-200 bg-slate-50 px-4 py-3 text-slate-950 placeholder:text-slate-400",
          compact ? "min-h-20" : "min-h-24"
        )}
      />
      <div className="flex flex-wrap gap-2">
        {quickPrompts.map((prompt) => (
          <button
            key={prompt}
            type="button"
            onClick={() => onQuickPrompt(prompt)}
            className={cn(
              "rounded-full border border-slate-200 bg-white text-xs font-medium text-slate-600 transition-colors hover:border-blue-200 hover:text-blue-700",
              compact ? "px-2.5 py-2" : "px-3 py-2"
            )}
          >
            {prompt}
          </button>
        ))}
      </div>
      <Button
        className="h-11 w-full rounded-2xl bg-slate-950 text-white hover:bg-slate-800"
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
