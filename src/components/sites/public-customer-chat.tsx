"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  ChevronDown,
  ChevronUp,
  Loader2,
  MessageSquareText,
  SendHorizonal,
  Sparkles,
  Trash2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { buildShortPropertyPath } from "@/lib/property-links";

type ChatMessage = {
  id: string;
  senderRole: "customer" | "assistant";
  content: string;
};

export function PublicCustomerChat({
  tenantSlug,
  propertyId,
  propertyTitle,
  currentUser,
}: {
  tenantSlug: string;
  propertyId: string;
  propertyTitle: string;
  currentUser: {
    fullName: string | null;
    email: string | null;
    role: "superadmin" | "agency_admin" | "agent" | "customer";
  } | null;
}) {
  const welcomeMessage = `Hola, soy la IA de Props. Puedo ayudarte a entender si ${propertyTitle} encaja con lo que buscas y preparar una consulta clara para la inmobiliaria.`;

  const [message, setMessage] = useState("");
  const [collapsed, setCollapsed] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      senderRole: "assistant",
      content: welcomeMessage,
    },
  ]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const conversationEndRef = useRef<HTMLDivElement | null>(null);

  const canChat = currentUser?.role === "customer";

  useEffect(() => {
    conversationEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, collapsed]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!canChat) {
      return;
    }

    const trimmed = message.trim();
    if (!trimmed) {
      return;
    }

    const customerMessage: ChatMessage = {
      id: `customer-${Date.now()}`,
      senderRole: "customer",
      content: trimmed,
    };

    setMessages((current) => [...current, customerMessage]);
    setMessage("");
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/public/conversations", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          tenantSlug,
          propertyId,
          message: trimmed,
        }),
      });

      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        setError(payload?.error ?? "No se pudo enviar el mensaje.");
        setLoading(false);
        return;
      }

      setMessages((current) => [
        ...current,
        {
          id: `assistant-${Date.now()}`,
          senderRole: "assistant",
          content: payload.reply,
        },
      ]);
    } catch {
      setError("No se pudo obtener respuesta de la IA. Proba nuevamente.");
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      const form = event.currentTarget.form;
      if (form) {
        form.requestSubmit();
      }
    }
  }

  function resetConversation() {
    setMessages([
      {
        id: `welcome-${Date.now()}`,
        senderRole: "assistant",
        content: welcomeMessage,
      },
    ]);
    setError(null);
  }

  return (
    <section className="rounded-[30px] border border-slate-200 bg-white p-6 shadow-[0_28px_90px_-58px_rgba(15,23,42,0.25)]">
      <div className="flex items-start justify-between gap-4">
        <div className="flex gap-4">
          <div className="flex size-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
            <Sparkles className="size-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">Asistente de consulta</p>
            <h2 className="mt-1 text-2xl font-semibold text-slate-950">
              Habla con la IA antes de contactar a la inmobiliaria
            </h2>
            <p className="mt-2 text-sm leading-7 text-slate-600">
              Te ayuda a ordenar necesidades, hacer preguntas utiles y dejar una consulta clara para el equipo comercial.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {canChat ? (
            <button
              type="button"
              onClick={resetConversation}
              className="inline-flex size-10 items-center justify-center rounded-full border border-slate-200 text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-900"
            >
              <Trash2 className="size-4" />
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => setCollapsed((current) => !current)}
            className="inline-flex size-10 items-center justify-center rounded-full border border-slate-200 text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-900"
          >
            {collapsed ? <ChevronDown className="size-4" /> : <ChevronUp className="size-4" />}
          </button>
        </div>
      </div>

      {collapsed ? (
        <div className="mt-5 rounded-[22px] border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-500">
          El chat quedó minimizado. Toca la flecha para volver a abrirlo.
        </div>
      ) : !canChat ? (
        <div className="mt-6 rounded-[24px] border border-blue-100 bg-blue-50 p-5">
          <p className="text-sm leading-7 text-blue-900">
            Crea tu cuenta para conversar con la IA, guardar favoritos y retomar tus consultas desde cualquier dispositivo.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Link
              href={`/cuenta/login?redirectTo=${encodeURIComponent(buildShortPropertyPath(tenantSlug, propertyId))}`}
              className="inline-flex h-11 items-center rounded-2xl border border-blue-200 bg-white px-4 text-sm font-semibold text-blue-700"
            >
              Ingresar
            </Link>
            <Link
              href={`/cuenta/registro?redirectTo=${encodeURIComponent(buildShortPropertyPath(tenantSlug, propertyId))}`}
              className="inline-flex h-11 items-center rounded-2xl bg-slate-950 px-4 text-sm font-semibold text-white"
            >
              Crear cuenta
            </Link>
          </div>
        </div>
      ) : (
        <>
          <div className="mt-6 max-h-[360px] overflow-y-auto pr-2 props-scrollbar">
            <div className="space-y-3">
              {messages.map((item) => (
                <div
                  key={item.id}
                  className={
                    item.senderRole === "assistant"
                      ? "rounded-[24px] border border-slate-200 bg-slate-50 p-4 text-sm leading-7 text-slate-700"
                      : "ml-auto max-w-[90%] rounded-[24px] bg-slate-950 p-4 text-sm leading-7 text-white"
                  }
                >
                  <div className="mb-2 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] opacity-70">
                    {item.senderRole === "assistant" ? (
                      <>
                        <MessageSquareText className="size-3.5" />
                        IA de Props
                      </>
                    ) : (
                      "Tu consulta"
                    )}
                  </div>
                  <p>{item.content}</p>
                </div>
              ))}
              <div ref={conversationEndRef} />
            </div>
          </div>

          <form onSubmit={handleSubmit} className="mt-5 space-y-3">
            <Textarea
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ej: Busco algo apto credito, con balcon, cerca de subte y no mas de USD 180.000."
              className="min-h-28 rounded-[24px] border-slate-200 bg-slate-50 px-4 py-3"
            />

            <p className="text-xs text-slate-400">
              Presiona Enter para enviar y Shift+Enter para escribir varias lineas.
            </p>

            {error ? (
              <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                {error}
              </div>
            ) : null}

            <Button type="submit" className="h-11 w-full rounded-2xl" disabled={loading}>
              {loading ? <Loader2 className="mr-2 size-4 animate-spin" /> : <SendHorizonal className="mr-2 size-4" />}
              Enviar mensaje
            </Button>
          </form>
        </>
      )}
    </section>
  );
}
