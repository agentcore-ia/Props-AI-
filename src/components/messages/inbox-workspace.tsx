"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Bot,
  CalendarPlus2,
  CheckCheck,
  Loader2,
  MessageCircle,
  SendHorizonal,
  Sparkles,
} from "lucide-react";

import type { Property } from "@/lib/mock-data";
import type {
  AgencyMessageTemplateSummary,
  CrmLeadMessageSummary,
  CrmLeadSummary,
  VisitAppointmentSummary,
} from "@/lib/crm-types";
import {
  buildLeadProfileSnapshot,
  buildPropertyComparisonMessage,
  buildQuickReplyScenarios,
  deriveConversationStatus,
  deriveSourceChannel,
  findSimilarProperties,
} from "@/lib/crm-insights";
import { EmptyState } from "@/components/layout/empty-state";
import { PageHeader } from "@/components/layout/page-header";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { cn, formatMoney, formatShortDate } from "@/lib/utils";

const conversationStatusTone = {
  Nuevo: "bg-sky-500/10 text-sky-700",
  "Esperando respuesta": "bg-amber-500/10 text-amber-700",
  Visita: "bg-violet-500/10 text-violet-700",
  Cerrado: "bg-emerald-500/10 text-emerald-700",
} as const;

export function InboxWorkspace({
  leads,
  messages,
  properties,
  visits,
  templates,
  initialMode = "completo",
}: {
  leads: CrmLeadSummary[];
  messages: CrmLeadMessageSummary[];
  properties: Property[];
  visits: VisitAppointmentSummary[];
  templates: AgencyMessageTemplateSummary[];
  initialMode?: "completo" | "recepcion";
}) {
  const router = useRouter();
  const [selectedId, setSelectedId] = useState(leads[0]?.id ?? "");
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [mode, setMode] = useState<"completo" | "recepcion">(initialMode);
  const [compareOpen, setCompareOpen] = useState(false);
  const [compareSelection, setCompareSelection] = useState<string[]>([]);
  const [visitLead, setVisitLead] = useState<CrmLeadSummary | null>(null);
  const [visitForm, setVisitForm] = useState({ scheduledFor: "", notes: "" });
  const bottomRef = useRef<HTMLDivElement | null>(null);

  const messagesByLead = useMemo(() => {
    const grouped = new Map<string, CrmLeadMessageSummary[]>();

    for (const message of messages) {
      const current = grouped.get(message.leadId) ?? [];
      current.push(message);
      grouped.set(message.leadId, current);
    }

    return grouped;
  }, [messages]);

  const relatedLeadsByPerson = useMemo(() => {
    const grouped = new Map<string, CrmLeadSummary[]>();
    for (const lead of leads) {
      const key = `${lead.email ?? ""}|${lead.phone ?? ""}|${lead.fullName.toLowerCase()}`;
      const current = grouped.get(key) ?? [];
      current.push(lead);
      grouped.set(key, current);
    }
    return grouped;
  }, [leads]);

  const filteredLeads = useMemo(() => {
    if (mode === "recepcion") {
      return leads.filter((lead) => deriveConversationStatus(lead) !== "Cerrado");
    }
    return leads;
  }, [leads, mode]);

  const selectedLead = useMemo(
    () => filteredLeads.find((lead) => lead.id === selectedId) ?? filteredLeads[0] ?? null,
    [filteredLeads, selectedId]
  );

  const selectedMessages = useMemo(
    () => (selectedLead ? messagesByLead.get(selectedLead.id) ?? [] : []),
    [messagesByLead, selectedLead]
  );

  const selectedProperty = useMemo(
    () =>
      selectedLead?.propertyId
        ? properties.find((property) => property.id === selectedLead.propertyId) ?? null
        : null,
    [properties, selectedLead]
  );

  const similarProperties = useMemo(
    () => (selectedLead ? findSimilarProperties(selectedLead, properties, 4) : []),
    [properties, selectedLead]
  );

  const selectedTemplates = useMemo(
    () =>
      selectedLead
        ? templates.filter((template) => template.agencyId === selectedLead.agencyId)
        : [],
    [selectedLead, templates]
  );

  const quickReplies = useMemo(
    () =>
      selectedLead
        ? buildQuickReplyScenarios({
            lead: selectedLead,
            property: selectedProperty,
            similarProperties,
            templates: selectedTemplates,
          })
        : [],
    [selectedLead, selectedProperty, selectedTemplates, similarProperties]
  );

  const selectedProfile = useMemo(() => {
    if (!selectedLead) return null;
    const relatedLeads =
      relatedLeadsByPerson.get(
        `${selectedLead.email ?? ""}|${selectedLead.phone ?? ""}|${selectedLead.fullName.toLowerCase()}`
      ) ?? [];
    return buildLeadProfileSnapshot({
      lead: selectedLead,
      messages: selectedMessages,
      relatedLeads,
      visits,
    });
  }, [relatedLeadsByPerson, selectedLead, selectedMessages, visits]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [selectedId, selectedMessages.length]);

  if (!selectedLead) {
    return (
      <div className="space-y-8">
        <PageHeader
          title="Mensajes"
          description="Bandeja unificada para trabajar consultas web, WhatsApp o cualquier nuevo canal que entre a Props."
        />
        <EmptyState
          title="Todavia no hay conversaciones"
          description="Cuando entren consultas por web o WhatsApp, apareceran aca listas para responder."
        />
      </div>
    );
  }

  async function sendMessage(input?: { directText?: string; resetDraft?: boolean }) {
    setBusy(true);
    setFeedback(null);

    const directText = input?.directText ?? null;
    const customPrompt = directText ? null : draft.trim() || null;

    const response = await fetch(`/api/admin/leads/${selectedLead.id}/whatsapp`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ customPrompt, directText }),
    });

    const payload = await response.json().catch(() => null);
    setBusy(false);

    if (!response.ok) {
      setFeedback(payload?.error ?? "No se pudo enviar el mensaje.");
      return;
    }

    setFeedback("Mensaje enviado por WhatsApp y seguimiento actualizado.");
    if (input?.resetDraft !== false) {
      setDraft("");
    }
    router.refresh();
  }

  async function sendComparison() {
    if (!selectedLead || compareSelection.length === 0) return;
    const selectedProperties = properties.filter((property) =>
      compareSelection.includes(property.id)
    );
    if (selectedProperties.length === 0) return;
    const message = buildPropertyComparisonMessage(selectedLead, selectedProperties);
    await sendMessage({ directText: message });
    setCompareOpen(false);
    setCompareSelection([]);
  }

  async function scheduleVisit() {
    if (!visitLead) return;

    setBusy(true);
    setFeedback(null);

    const response = await fetch(`/api/admin/leads/${visitLead.id}/visit`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(visitForm),
    });

    const payload = await response.json().catch(() => null);
    setBusy(false);

    if (!response.ok) {
      setFeedback(payload?.error ?? "No se pudo agendar la visita.");
      return;
    }

    setVisitLead(null);
    setVisitForm({ scheduledFor: "", notes: "" });
    setFeedback("Visita agendada y recordatorio operativo creado.");
    router.refresh();
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Mensajes"
        description="Bandeja unica para atender consultas, ver la propiedad al lado, responder con contexto y dejar el siguiente paso resuelto."
        action={
          <div className="flex flex-wrap gap-2">
            <Button
              variant={mode === "recepcion" ? "default" : "outline"}
              className="rounded-2xl"
              onClick={() => setMode("recepcion")}
            >
              Modo recepcion
            </Button>
            <Button
              variant={mode === "completo" ? "default" : "outline"}
              className="rounded-2xl"
              onClick={() => setMode("completo")}
            >
              Vista completa
            </Button>
          </div>
        }
      />

      {feedback ? (
        <div className="rounded-2xl border bg-background px-4 py-3 text-sm text-muted-foreground">
          {feedback}
        </div>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)_360px]">
        <div className="overflow-hidden rounded-[30px] border bg-card shadow-sm">
          <div className="border-b px-5 py-4">
            <h3 className="font-semibold">Conversaciones</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              WhatsApp, web e ingresos del CRM en una sola cola operativa.
            </p>
          </div>
          <ScrollArea className="h-[760px]">
            <div className="space-y-2 p-3">
              {filteredLeads.map((lead) => {
                const thread = messagesByLead.get(lead.id) ?? [];
                const lastMessage = thread[thread.length - 1];
                const preview = lastMessage?.content || lead.lastCustomerMessage;
                const status = deriveConversationStatus(lead);
                const channel = deriveSourceChannel(lead.source);

                return (
                  <button
                    key={lead.id}
                    className={cn(
                      "w-full rounded-2xl border p-4 text-left transition-all",
                      selectedLead.id === lead.id
                        ? "border-primary bg-primary/5"
                        : "bg-background hover:bg-muted/40"
                    )}
                    onClick={() => setSelectedId(lead.id)}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-medium">{lead.fullName}</p>
                        <div className="mt-2 flex flex-wrap gap-2">
                          <Badge variant="outline" className="rounded-full">
                            {channel}
                          </Badge>
                          <Badge className={`border-0 ${conversationStatusTone[status]}`}>
                            {status}
                          </Badge>
                        </div>
                      </div>
                      {lead.needsResponse ? (
                        <span className="rounded-full bg-primary px-2 py-1 text-xs font-semibold text-primary-foreground">
                          Nuevo
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-3 text-xs uppercase tracking-[0.2em] text-muted-foreground">
                      {lead.propertyTitle || "Consulta general"}
                    </p>
                    <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{preview}</p>
                  </button>
                );
              })}
            </div>
          </ScrollArea>
        </div>

        <div className="flex h-[760px] min-w-0 flex-col overflow-hidden rounded-[30px] border bg-card shadow-sm">
          <div className="flex items-center justify-between border-b px-6 py-4">
            <div className="flex min-w-0 items-center gap-3">
              <Avatar className="rounded-2xl">
                <AvatarFallback className="rounded-2xl bg-primary/10 text-primary">
                  {selectedLead.fullName.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <p className="truncate font-semibold">{selectedLead.fullName}</p>
                <p className="truncate text-sm text-muted-foreground">
                  {selectedLead.propertyTitle || "Consulta general"} ·{" "}
                  {selectedLead.phone || "Sin telefono"}
                </p>
              </div>
            </div>
            <Badge className={`border-0 ${conversationStatusTone[deriveConversationStatus(selectedLead)]}`}>
              {deriveConversationStatus(selectedLead)}
            </Badge>
          </div>

          <ScrollArea className="flex-1 px-6 py-5">
            <div className="space-y-4">
              <div className="rounded-[24px] border bg-background p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-primary/75">
                  Propiedad consultada
                </p>
                <div className="mt-3 flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-medium">{selectedLead.propertyTitle || "Consulta general"}</p>
                    <p className="text-sm text-muted-foreground">
                      {selectedLead.propertyLocation || "Sin ubicacion"}
                    </p>
                    {selectedLead.propertyPrice && selectedLead.propertyCurrency ? (
                      <p className="mt-2 text-sm font-medium">
                        {formatMoney(selectedLead.propertyPrice, selectedLead.propertyCurrency)}
                      </p>
                    ) : null}
                  </div>
                  {selectedLead.propertyId ? (
                    <Link
                      href={`/propiedad/${selectedLead.agencySlug}/${selectedLead.propertyId}`}
                      target="_blank"
                      className="inline-flex size-10 items-center justify-center rounded-full border bg-background"
                    >
                      <ArrowRight className="size-4" />
                    </Link>
                  ) : null}
                </div>
              </div>

              {selectedMessages.length > 0 ? (
                selectedMessages.map((message) => (
                  <MessageBubble
                    key={message.id}
                    role={message.senderRole === "customer" ? "customer" : "assistant"}
                    title={message.senderRole === "customer" ? "Cliente" : "Equipo / IA"}
                    content={message.content}
                  />
                ))
              ) : (
                <MessageBubble
                  role="customer"
                  title="Ultimo mensaje del cliente"
                  content={selectedLead.lastCustomerMessage}
                />
              )}

              <div ref={bottomRef} />
            </div>
          </ScrollArea>

          <div className="border-t px-4 py-4">
            <div className="mb-3 flex flex-wrap gap-2">
              {quickReplies.map((reply) => (
                <Button
                  key={reply.key}
                  variant={reply.tone ?? "outline"}
                  size="sm"
                  className="rounded-full"
                  disabled={busy}
                  onClick={() => void sendMessage({ directText: reply.message })}
                >
                  {reply.label}
                </Button>
              ))}
              {similarProperties.length >= 2 ? (
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-full"
                  onClick={() => setCompareOpen(true)}
                >
                  Comparar propiedades
                </Button>
              ) : null}
            </div>

            <div className="rounded-[24px] border bg-background p-3">
              <div className="mb-3 flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <Bot className="size-4 text-primary" />
                Respuesta asistida por IA y contexto comercial
              </div>
              <div className="flex items-center gap-3">
                <Input
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  placeholder="Ej. proponé visita, aclará requisitos y ofrecé dos opciones parecidas..."
                  className="border-0 shadow-none focus-visible:ring-0"
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && !event.shiftKey) {
                      event.preventDefault();
                      void sendMessage();
                    }
                  }}
                />
                <Button className="rounded-2xl" disabled={busy} onClick={() => void sendMessage()}>
                  {busy ? <Loader2 className="size-4 animate-spin" /> : <SendHorizonal className="size-4" />}
                  Enviar
                </Button>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <section className="rounded-[30px] border bg-card p-5 shadow-sm">
            <div className="flex items-center gap-2">
              <Sparkles className="size-4 text-primary" />
              <h3 className="font-semibold">Ficha del cliente</h3>
            </div>
            <div className="mt-4 space-y-4 text-sm text-muted-foreground">
              <div>
                <p className="font-medium text-foreground">Que busca</p>
                <p className="mt-2">{selectedProfile?.whatTheySeek}</p>
              </div>
              <div>
                <p className="font-medium text-foreground">Propiedades vistas</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {selectedProfile?.viewedProperties.length ? (
                    selectedProfile.viewedProperties.map((item) => (
                      <Badge key={item} variant="outline" className="rounded-full">
                        {item}
                      </Badge>
                    ))
                  ) : (
                    <p>No hay otras fichas vinculadas.</p>
                  )}
                </div>
              </div>
              <div>
                <p className="font-medium text-foreground">Que pregunto</p>
                <ul className="mt-2 space-y-1">
                  {selectedProfile?.whatTheyAsked.length ? (
                    selectedProfile.whatTheyAsked.map((item) => <li key={item}>- {item}</li>)
                  ) : (
                    <li>- Todavia no tenemos preguntas anteriores guardadas.</li>
                  )}
                </ul>
              </div>
              <div>
                <p className="font-medium text-foreground">Que le respondimos</p>
                <ul className="mt-2 space-y-1">
                  {selectedProfile?.whatWeAnswered.length ? (
                    selectedProfile.whatWeAnswered.map((item) => <li key={item}>- {item}</li>)
                  ) : (
                    <li>- Todavia no hay respuestas salientes registradas.</li>
                  )}
                </ul>
              </div>
              <div>
                <p className="font-medium text-foreground">Objeciones</p>
                <ul className="mt-2 space-y-1">
                  {selectedProfile?.objections.length ? (
                    selectedProfile.objections.map((item) => <li key={item}>- {item}</li>)
                  ) : (
                    <li>- No detecte objeciones fuertes por ahora.</li>
                  )}
                </ul>
              </div>
              <div className="rounded-2xl border bg-muted/20 p-4">
                <p className="font-medium text-foreground">
                  Probabilidad de cierre: {selectedProfile?.closeProbability.label}
                </p>
                <p className="mt-1">
                  {selectedProfile?.closeProbability.percentage}% ·{" "}
                  {selectedProfile?.closeProbability.detail}
                </p>
              </div>
              <div className="rounded-2xl border bg-primary/5 p-4 text-primary">
                <p className="font-medium">Siguiente accion sugerida</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {selectedProfile?.nextAction}
                </p>
              </div>
            </div>
          </section>

          <section className="rounded-[30px] border bg-card p-5 shadow-sm">
            <div className="flex items-center gap-2">
              <MessageCircle className="size-4 text-primary" />
              <h3 className="font-semibold">Ademas de esta propiedad, mostrale estas</h3>
            </div>
            <div className="mt-4 space-y-3">
              {similarProperties.length > 0 ? (
                similarProperties.map((property) => (
                  <div key={property.id} className="rounded-2xl border p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-medium">{property.title}</p>
                        <p className="text-sm text-muted-foreground">{property.location}</p>
                        <p className="mt-2 text-sm">
                          {formatMoney(property.price, property.currency)}
                        </p>
                      </div>
                      <Link
                        href={`/propiedad/${selectedLead.agencySlug}/${property.id}`}
                        target="_blank"
                        className="inline-flex size-10 items-center justify-center rounded-full border bg-background"
                      >
                        <ArrowRight className="size-4" />
                      </Link>
                    </div>
                  </div>
                ))
              ) : (
                <div className="rounded-2xl border border-dashed p-4 text-sm text-muted-foreground">
                  No encontre parecidas claras con el inventario actual.
                </div>
              )}
            </div>
          </section>

          <section className="rounded-[30px] border bg-card p-5 shadow-sm">
            <div className="flex items-center gap-2">
              <CheckCheck className="size-4 text-primary" />
              <h3 className="font-semibold">Visita y seguimiento</h3>
            </div>
            <div className="mt-4 space-y-3 text-sm text-muted-foreground">
              {visits.filter((visit) => visit.leadId === selectedLead.id).length > 0 ? (
                visits
                  .filter((visit) => visit.leadId === selectedLead.id)
                  .slice(0, 2)
                  .map((visit) => (
                    <div key={visit.id} className="rounded-2xl border p-4">
                      <p className="font-medium text-foreground">{visit.status}</p>
                      <p className="mt-1">
                        {formatShortDate(visit.scheduledFor.slice(0, 10))} ·{" "}
                        {new Date(visit.scheduledFor).toLocaleTimeString("es-AR", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                      {visit.notes ? <p className="mt-2">{visit.notes}</p> : null}
                    </div>
                  ))
              ) : (
                <div className="rounded-2xl border border-dashed p-4">
                  Aun no tiene visitas registradas. Si avanza, agenda una desde aca.
                </div>
              )}
              <Button
                variant="outline"
                className="w-full rounded-2xl"
                onClick={() => {
                  setVisitLead(selectedLead);
                  setVisitForm({ scheduledFor: "", notes: "" });
                }}
              >
                <CalendarPlus2 className="size-4" />
                Agendar visita
              </Button>
            </div>
          </section>
        </div>
      </div>

      <Dialog open={compareOpen} onOpenChange={setCompareOpen}>
        <DialogContent className="max-w-2xl rounded-[30px]">
          <DialogHeader>
            <DialogTitle>Comparar propiedades para enviar al cliente</DialogTitle>
            <DialogDescription>
              Selecciona hasta 3 opciones y Props arma un resumen claro para WhatsApp.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3">
            {similarProperties.map((property) => {
              const active = compareSelection.includes(property.id);
              return (
                <button
                  key={property.id}
                  type="button"
                  className={cn(
                    "rounded-2xl border p-4 text-left transition-colors",
                    active ? "border-primary bg-primary/5" : "hover:bg-muted/30"
                  )}
                  onClick={() =>
                    setCompareSelection((current) =>
                      active
                        ? current.filter((id) => id !== property.id)
                        : current.length < 3
                          ? [...current, property.id]
                          : current
                    )
                  }
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium">{property.title}</p>
                      <p className="text-sm text-muted-foreground">{property.location}</p>
                      <p className="mt-1 text-sm">{formatMoney(property.price, property.currency)}</p>
                    </div>
                    <Badge variant={active ? "default" : "outline"} className="rounded-full">
                      {active ? "Seleccionada" : "Agregar"}
                    </Badge>
                  </div>
                </button>
              );
            })}
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" className="rounded-2xl" onClick={() => setCompareOpen(false)}>
              Cancelar
            </Button>
            <Button
              className="rounded-2xl"
              disabled={compareSelection.length === 0 || busy}
              onClick={() => void sendComparison()}
            >
              {busy ? <Loader2 className="size-4 animate-spin" /> : null}
              Enviar comparacion
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(visitLead)}
        onOpenChange={(open) => {
          if (!open) {
            setVisitLead(null);
            setVisitForm({ scheduledFor: "", notes: "" });
          }
        }}
      >
        <DialogContent className="max-w-xl rounded-[30px]">
          <DialogHeader>
            <DialogTitle>Agendar visita</DialogTitle>
            <DialogDescription>
              Deja fecha, hora y notas para que el equipo pueda confirmar la visita sin perder contexto.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4">
            <div className="rounded-2xl border bg-muted/20 p-4 text-sm">
              <p className="font-medium text-foreground">{visitLead?.fullName}</p>
              <p className="mt-1 text-muted-foreground">
                {visitLead?.propertyTitle || "Consulta general"}
              </p>
            </div>

            <label className="grid gap-2 text-sm">
              <span className="font-medium">Fecha y hora</span>
              <Input
                type="datetime-local"
                value={visitForm.scheduledFor}
                onChange={(event) =>
                  setVisitForm((current) => ({
                    ...current,
                    scheduledFor: event.target.value,
                  }))
                }
              />
            </label>

            <label className="grid gap-2 text-sm">
              <span className="font-medium">Notas internas</span>
              <Textarea
                rows={4}
                value={visitForm.notes}
                onChange={(event) =>
                  setVisitForm((current) => ({
                    ...current,
                    notes: event.target.value,
                  }))
                }
                placeholder="Ej. confirmar una hora antes, avisar expensas, llevar llave de cochera..."
              />
            </label>
          </div>

          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              className="rounded-2xl"
              onClick={() => {
                setVisitLead(null);
                setVisitForm({ scheduledFor: "", notes: "" });
              }}
            >
              Cancelar
            </Button>
            <Button
              className="rounded-2xl"
              disabled={busy || !visitForm.scheduledFor}
              onClick={() => void scheduleVisit()}
            >
              {busy ? <Loader2 className="size-4 animate-spin" /> : <CalendarPlus2 className="size-4" />}
              Guardar visita
            </Button>
          </div>
        </DialogContent>
      </Dialog>
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
          role === "assistant"
            ? "bg-primary text-primary-foreground"
            : "border bg-background"
        )}
      >
        <p className="mb-2 text-[11px] uppercase tracking-[0.2em] opacity-80">{title}</p>
        <p>{content}</p>
      </div>
    </div>
  );
}
