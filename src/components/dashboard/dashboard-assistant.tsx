"use client";

import { useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { Bot, Loader2, RefreshCcw, SendHorizonal, Sparkles, X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

type AssistantActionResult = {
  type: string;
  status: "success" | "error" | "clarify";
  title: string;
  details: string;
};

type AssistantMessage = {
  id: string;
  role: "assistant" | "user";
  content: string;
  actionResult?: AssistantActionResult | null;
};

const sectionPresets: Array<{
  match: (pathname: string) => boolean;
  title: string;
  description: string;
  placeholder: string;
  prompts: string[];
}> = [
  {
    match: (pathname) => pathname.startsWith("/cobranzas"),
    title: "Asistente de cobranzas",
    description: "Te ayuda a registrar pagos, revisar periodos y destrabar consultas de cobro.",
    placeholder: "Ej. ya pago Maria Gomez el alquiler de mayo por transferencia...",
    prompts: [
      "Ya pago Maria Gomez el alquiler de este mes",
      "Como registro una cobranza parcial?",
      "Que alquileres siguen pendientes de cobro?",
      "Explicame como actualizar el estado de una cobranza",
    ],
  },
  {
    match: (pathname) => pathname.startsWith("/transferencias"),
    title: "Asistente de transferencias",
    description: "Sirve para registrar pagos a propietarios y seguir lo que falta transferir.",
    placeholder: "Ej. registra la transferencia al propietario de Caballito por 450000...",
    prompts: [
      "Registra una transferencia al propietario del depto de Caballito",
      "Que transferencias tengo pendientes?",
      "Como confirmo una transferencia enviada?",
      "Explicame que diferencia hay entre programada y confirmada",
    ],
  },
  {
    match: (pathname) => pathname.startsWith("/alquileres"),
    title: "Asistente de alquileres",
    description: "Te ayuda con contratos, liquidaciones, rescisiones y seguimiento operativo.",
    placeholder: "Ej. genera la liquidacion del propietario del contrato de Maria Gomez...",
    prompts: [
      "Genera la liquidacion del propietario de Maria Gomez",
      "Como inicio una rescision contractual?",
      "Que contratos ajustan esta semana?",
      "Explicame como cargar un concepto particular en una liquidacion",
    ],
  },
  {
    match: (pathname) => pathname.startsWith("/leads"),
    title: "Asistente de leads",
    description: "Te orienta para priorizar contactos, entender objeciones y avanzar el seguimiento.",
    placeholder: "Ej. que lead deberia atender primero o que le contesto a este cliente...",
    prompts: [
      "Que lead deberia atender primero?",
      "Que objeciones puso este cliente?",
      "Como sigo a un lead que pidio visita?",
      "Que propiedades similares deberia ofrecer?",
    ],
  },
  {
    match: (pathname) => pathname.startsWith("/mensajes"),
    title: "Asistente de mensajes",
    description: "Ayuda a responder mejor y mas rapido usando el contexto de clientes y propiedades.",
    placeholder: "Ej. que le respondo a este cliente o como sigo esta conversacion...",
    prompts: [
      "Que le puedo responder a un cliente que pide visita?",
      "Como cierro esta conversacion con una proxima accion clara?",
      "Que respuesta corta uso para pasar requisitos?",
      "Ayudame a ofrecer propiedades similares",
    ],
  },
  {
    match: (pathname) => pathname.startsWith("/propiedades"),
    title: "Asistente de propiedades",
    description: "Te ayuda con publicaciones, mejoras del aviso y dudas del inventario.",
    placeholder: "Ej. como mejoro esta publicacion o que propiedad tiene mas salud comercial...",
    prompts: [
      "Que propiedades tienen peor salud comercial?",
      "Como mejorar una publicacion con pocas consultas?",
      "Que le falta a esta propiedad para salir mejor publicada?",
      "Explicame como editar una propiedad ya publicada",
    ],
  },
  {
    match: (pathname) => pathname.startsWith("/caja"),
    title: "Asistente de caja",
    description: "Sirve para registrar ingresos y egresos, y para explicar movimientos de caja.",
    placeholder: "Ej. registra un gasto de caja de 25000 por cerrajeria...",
    prompts: [
      "Registra un gasto de caja de 25000 por cerrajeria",
      "Como registro un ingreso manual en caja?",
      "Que diferencia hay entre ingreso, egreso y transferencia?",
      "Ayudame a dejar asentado un gasto operativo",
    ],
  },
  {
    match: () => true,
    title: "Asistente de Props",
    description: "Responde dudas y puede ejecutar acciones operativas del CRM.",
    placeholder: "Ej. ya pago Lucas el alquiler, como genero una liquidacion o que tengo pendiente hoy...",
    prompts: [
      "Que tengo que hacer hoy?",
      "Ya pago Maria Gomez el alquiler de este mes",
      "Como genero una liquidacion al propietario?",
      "Registra un gasto de caja de 25000 por cerrajeria",
    ],
  },
];

export function DashboardAssistant() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [messages, setMessages] = useState<AssistantMessage[]>([
    {
      id: "dashboard-assistant-welcome",
      role: "assistant",
      content:
        "Soy el asistente de Props. Puedo explicarte cualquier seccion del dashboard y ejecutar acciones como registrar un pago, una transferencia, una liquidacion o un movimiento de caja.",
    },
  ]);

  const sectionPreset = useMemo(
    () => sectionPresets.find((item) => item.match(pathname)) ?? sectionPresets[sectionPresets.length - 1],
    [pathname]
  );

  const historyForApi = useMemo(
    () =>
      messages
        .slice(-8)
        .map((message) => ({
          role: message.role,
          content: message.content,
        })),
    [messages]
  );

  async function sendPrompt(customPrompt?: string) {
    const prompt = (customPrompt ?? input).trim();
    if (!prompt || submitting) {
      return;
    }

    const userMessage: AssistantMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: prompt,
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setSubmitting(true);

    try {
      const response = await fetch("/api/admin/assistant", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          prompt,
          history: historyForApi,
        }),
      });

      const payload = await response.json().catch(() => null);
      const assistantMessage: AssistantMessage = {
        id: crypto.randomUUID(),
        role: "assistant",
        content:
          response.ok
            ? payload?.reply ?? "No pude responder esta vez."
            : [payload?.error, payload?.detail].filter(Boolean).join("\n") ||
              "No se pudo completar la consulta al asistente.",
        actionResult: payload?.actionResult ?? null,
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } finally {
      setSubmitting(false);
    }
  }

  function resetConversation() {
    setMessages([
      {
        id: "dashboard-assistant-welcome",
        role: "assistant",
        content:
          "Soy el asistente de Props. Puedo explicarte cualquier seccion del dashboard y ejecutar acciones como registrar un pago, una transferencia, una liquidacion o un movimiento de caja.",
      },
    ]);
    setInput("");
  }

  return (
    <div className="pointer-events-none fixed inset-x-4 bottom-4 z-50 flex justify-end md:inset-x-auto md:right-6">
      {!open ? (
        <Button
          type="button"
          className="pointer-events-auto h-auto rounded-full px-4 py-3 shadow-xl"
          onClick={() => setOpen(true)}
        >
          <Bot className="size-4" />
          Asistente Props
        </Button>
      ) : (
        <div className="pointer-events-auto flex w-full max-w-[440px] flex-col overflow-hidden rounded-[28px] border bg-card shadow-2xl md:w-[440px]">
          <div className="border-b px-4 py-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
                  <Sparkles className="size-5" />
                </div>
                <div>
                  <p className="text-sm font-semibold">{sectionPreset.title}</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {sectionPreset.description}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <Button type="button" variant="ghost" size="icon-sm" className="rounded-full" onClick={resetConversation}>
                  <RefreshCcw className="size-4" />
                </Button>
                <Button type="button" variant="ghost" size="icon-sm" className="rounded-full" onClick={() => setOpen(false)}>
                  <X className="size-4" />
                </Button>
              </div>
            </div>
          </div>

          <ScrollArea className="h-[52vh] min-h-[360px] max-h-[560px] px-4 py-4">
            <div className="space-y-3 pr-3">
              {messages.map((message) => (
                <div key={message.id} className={cn("flex", message.role === "assistant" ? "justify-start" : "justify-end")}>
                  <div
                    className={cn(
                      "max-w-[92%] rounded-[24px] px-4 py-3 text-sm leading-6 shadow-sm",
                      message.role === "assistant"
                        ? "border bg-muted/40 text-foreground"
                        : "bg-primary text-primary-foreground"
                    )}
                  >
                    <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.22em] opacity-70">
                      {message.role === "assistant" ? "Props AI" : "Equipo"}
                    </p>
                    <p className="whitespace-pre-wrap">{message.content}</p>
                    {message.actionResult ? (
                      <div
                        className={cn(
                          "mt-3 rounded-2xl border px-3 py-2 text-xs",
                          message.actionResult.status === "success"
                            ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                            : message.actionResult.status === "clarify"
                              ? "border-amber-200 bg-amber-50 text-amber-700"
                              : "border-red-200 bg-red-50 text-red-700"
                        )}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-semibold">{message.actionResult.title}</span>
                          <Badge variant="outline" className="rounded-full border-current/30 bg-transparent text-current">
                            {message.actionResult.status === "success"
                              ? "Ejecutado"
                              : message.actionResult.status === "clarify"
                                ? "Falta dato"
                                : "Error"}
                          </Badge>
                        </div>
                        <p className="mt-1">{message.actionResult.details}</p>
                      </div>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>

          <div className="border-t px-4 py-4">
            <div className="mb-3 flex flex-wrap gap-2">
              {sectionPreset.prompts.map((prompt) => (
                <Button
                  key={prompt}
                  type="button"
                  variant="outline"
                  size="sm"
                  className="rounded-full text-xs"
                  disabled={submitting}
                  onClick={() => void sendPrompt(prompt)}
                >
                  {prompt}
                </Button>
              ))}
            </div>

            <div className="rounded-[24px] border bg-background p-2">
              <Textarea
                value={input}
                onChange={(event) => setInput(event.target.value)}
                placeholder={sectionPreset.placeholder}
                className="min-h-[104px] resize-none border-0 bg-transparent px-3 py-2 shadow-none focus-visible:ring-0"
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    void sendPrompt();
                  }
                }}
              />
              <div className="mt-2 flex items-center justify-between gap-3 px-2 pb-1">
                <p className="text-xs text-muted-foreground">Enter para enviar · Shift+Enter para nueva linea</p>
                <Button
                  type="button"
                  className="rounded-full"
                  disabled={submitting || !input.trim()}
                  onClick={() => void sendPrompt()}
                >
                  {submitting ? <Loader2 className="size-4 animate-spin" /> : <SendHorizonal className="size-4" />}
                  Enviar
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
