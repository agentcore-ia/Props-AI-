"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Bot, Loader2, SendHorizonal } from "lucide-react";

import type { CrmLeadSummary } from "@/lib/crm-types";
import { EmptyState } from "@/components/layout/empty-state";
import { PageHeader } from "@/components/layout/page-header";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

export function InboxWorkspace({ leads }: { leads: CrmLeadSummary[] }) {
  const router = useRouter();
  const [selectedId, setSelectedId] = useState(leads[0]?.id ?? "");
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const selectedLead = useMemo(
    () => leads.find((lead) => lead.id === selectedId) ?? leads[0] ?? null,
    [leads, selectedId]
  );

  if (!selectedLead) {
    return (
      <div className="space-y-8">
        <PageHeader
          title="Mensajes"
          description="Bandeja de trabajo para responder consultas y mantener el seguimiento comercial al dia."
        />
        <EmptyState
          title="Todavia no hay conversaciones"
          description="Cuando entren consultas por web o WhatsApp, apareceran aca listas para responder."
        />
      </div>
    );
  }

  async function sendMessage() {
    setBusy(true);
    setFeedback(null);

    const response = await fetch(`/api/admin/leads/${selectedLead.id}/whatsapp`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ customPrompt: draft.trim() || null }),
    });

    const payload = await response.json().catch(() => null);
    setBusy(false);

    if (!response.ok) {
      setFeedback(payload?.error ?? "No se pudo enviar el mensaje.");
      return;
    }

    setFeedback("Mensaje enviado por WhatsApp y seguimiento actualizado.");
    setDraft("");
    router.refresh();
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Mensajes"
        description="Responde consultas con contexto de propiedad, borrador sugerido y proximo paso comercial."
      />

      {feedback ? (
        <div className="rounded-2xl border bg-background px-4 py-3 text-sm text-muted-foreground">
          {feedback}
        </div>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[340px_minmax(0,1fr)]">
        <div className="overflow-hidden rounded-[30px] border bg-card shadow-sm">
          <div className="border-b px-5 py-4">
            <h3 className="font-semibold">Bandeja</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Leads abiertos con respuesta pendiente o seguimiento cercano.
            </p>
          </div>
          <ScrollArea className="h-[640px]">
            <div className="space-y-2 p-3">
              {leads.map((lead) => (
                <button
                  key={lead.id}
                  className={cn(
                    "w-full rounded-2xl border p-4 text-left transition-all",
                    selectedLead.id === lead.id ? "border-primary bg-primary/5" : "bg-background hover:bg-muted/40"
                  )}
                  onClick={() => setSelectedId(lead.id)}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium">{lead.fullName}</p>
                      <p className="mt-1 text-xs uppercase tracking-[0.2em] text-muted-foreground">
                        {lead.propertyTitle || "Consulta general"}
                      </p>
                    </div>
                    {lead.needsResponse ? (
                      <span className="rounded-full bg-primary px-2 py-1 text-xs font-semibold text-primary-foreground">
                        Nuevo
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-3 text-sm text-muted-foreground">{lead.lastCustomerMessage}</p>
                </button>
              ))}
            </div>
          </ScrollArea>
        </div>

        <div className="flex h-[640px] flex-col overflow-hidden rounded-[30px] border bg-card shadow-sm">
          <div className="flex items-center justify-between border-b px-6 py-4">
            <div className="flex items-center gap-3">
              <Avatar className="rounded-2xl">
                <AvatarFallback className="rounded-2xl bg-primary/10 text-primary">
                  {selectedLead.fullName.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="font-semibold">{selectedLead.fullName}</p>
                <p className="text-sm text-muted-foreground">
                  {selectedLead.propertyTitle || "Consulta general"} · {selectedLead.phone || "Sin telefono"}
                </p>
              </div>
            </div>
            <div className="rounded-full bg-muted px-3 py-1 text-xs font-medium">
              {selectedLead.stage}
            </div>
          </div>

          <ScrollArea className="flex-1 px-6 py-5">
            <div className="space-y-4">
              <MessageBubble role="customer" title="Ultimo mensaje del cliente" content={selectedLead.lastCustomerMessage} />
              <MessageBubble
                role="assistant"
                title="Borrador sugerido"
                content={selectedLead.aiReplyDraft || "Todavia no hay un borrador sugerido para este lead."}
              />
              <div className="rounded-[24px] border bg-background p-4 text-sm leading-6 text-muted-foreground">
                <p className="mb-2 text-xs uppercase tracking-[0.2em] text-primary/75">Contexto</p>
                {selectedLead.qualificationSummary}
              </div>
            </div>
          </ScrollArea>

          <div className="border-t px-4 py-4">
            <div className="rounded-[24px] border bg-background p-3">
              <div className="mb-3 flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <Bot className="size-4 text-primary" />
                Puedes escribir una instruccion extra y el mensaje saldra por WhatsApp usando el contexto de la propiedad.
              </div>
              <div className="flex items-center gap-3">
                <Input
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  placeholder="Ej. proponé visita para mañana y aclarale los requisitos..."
                  className="border-0 shadow-none focus-visible:ring-0"
                />
                <Button className="rounded-2xl" disabled={busy} onClick={() => void sendMessage()}>
                  {busy ? <Loader2 className="size-4 animate-spin" /> : <SendHorizonal className="size-4" />}
                  Enviar
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function MessageBubble({
  role,
  title,
  content,
}: {
  role: "customer" | "assistant";
  title: string;
  content: string;
}) {
  return (
    <div className={cn("flex", role === "assistant" ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[82%] rounded-[24px] px-4 py-3 text-sm leading-6 shadow-sm",
          role === "assistant" ? "bg-primary text-primary-foreground" : "border bg-background"
        )}
      >
        <p className="mb-2 text-[11px] uppercase tracking-[0.2em] opacity-80">{title}</p>
        <p>{content}</p>
      </div>
    </div>
  );
}
