"use client";

import { useState } from "react";
import Link from "next/link";
import { Loader2, MessageSquareText, SendHorizonal, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

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
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      senderRole: "assistant",
      content: `Hola, soy la IA de Props. Puedo ayudarte a entender si ${propertyTitle} encaja con lo que buscas y preparar una consulta clara para la inmobiliaria.`,
    },
  ]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canChat = currentUser?.role === "customer";

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

  return (
    <section className="rounded-[30px] border border-slate-200 bg-white p-6 shadow-[0_28px_90px_-58px_rgba(15,23,42,0.25)]">
      <div className="flex items-start gap-4">
        <div className="flex size-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
          <Sparkles className="size-6" />
        </div>
        <div>
          <p className="text-sm font-medium text-slate-500">Asistente de consulta</p>
          <h2 className="mt-1 text-2xl font-semibold text-slate-950">
            Habla con la IA antes de contactar a la inmobiliaria
          </h2>
          <p className="mt-2 text-sm leading-7 text-slate-600">
            Te ayuda a ordenar necesidades, hacer preguntas útiles y dejar una consulta mucho más clara para el equipo comercial.
          </p>
        </div>
      </div>

      {!canChat ? (
        <div className="mt-6 rounded-[24px] border border-blue-100 bg-blue-50 p-5">
          <p className="text-sm leading-7 text-blue-900">
            Crea tu cuenta para conversar con la IA, guardar favoritos y retomar tus consultas desde cualquier dispositivo.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Link
              href={`/cuenta/login?redirectTo=/propiedad/${tenantSlug}/${propertyId}`}
              className="inline-flex h-11 items-center rounded-2xl border border-blue-200 bg-white px-4 text-sm font-semibold text-blue-700"
            >
              Ingresar
            </Link>
            <Link
              href={`/cuenta/registro?redirectTo=/propiedad/${tenantSlug}/${propertyId}`}
              className="inline-flex h-11 items-center rounded-2xl bg-slate-950 px-4 text-sm font-semibold text-white"
            >
              Crear cuenta
            </Link>
          </div>
        </div>
      ) : (
        <>
          <div className="mt-6 space-y-3">
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
          </div>

          <form onSubmit={handleSubmit} className="mt-5 space-y-3">
            <Textarea
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              placeholder="Ej: Busco algo apto crédito, con balcón, cerca de subte y no más de USD 180.000."
              className="min-h-28 rounded-[24px] border-slate-200 bg-slate-50 px-4 py-3"
            />

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
