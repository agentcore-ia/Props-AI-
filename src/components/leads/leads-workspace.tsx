"use client";

import Link from "next/link";
import { useMemo, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  CalendarPlus2,
  CheckCircle2,
  Loader2,
  MessageCircleMore,
} from "lucide-react";

import type { Property } from "@/lib/mock-data";
import type {
  CrmLeadMessageSummary,
  CrmLeadSummary,
  LeadStage,
  VisitAppointmentSummary,
} from "@/lib/crm-types";
import {
  buildLeadProfileSnapshot,
  deriveLeadNextAction,
  deriveLeadScoreReasons,
  findSimilarProperties,
} from "@/lib/crm-insights";
import { EmptyState } from "@/components/layout/empty-state";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { formatMoney } from "@/lib/utils";

const STAGES: LeadStage[] = [
  "Nuevo",
  "Precalificado",
  "Visita",
  "Seguimiento",
  "Propuesta",
  "Cerrado",
  "Descartado",
];

const stageStyles: Record<LeadStage, string> = {
  Nuevo: "bg-sky-500/10 text-sky-700",
  Precalificado: "bg-violet-500/10 text-violet-700",
  Visita: "bg-amber-500/10 text-amber-700",
  Seguimiento: "bg-orange-500/10 text-orange-700",
  Propuesta: "bg-emerald-500/10 text-emerald-700",
  Cerrado: "bg-emerald-600/10 text-emerald-800",
  Descartado: "bg-slate-500/10 text-slate-700",
};

export function LeadsWorkspace({
  leads,
  messages,
  properties,
  visits,
}: {
  leads: CrmLeadSummary[];
  messages: CrmLeadMessageSummary[];
  properties: Property[];
  visits: VisitAppointmentSummary[];
}) {
  const router = useRouter();
  const [feedback, setFeedback] = useState<string | null>(null);
  const [busyLeadId, setBusyLeadId] = useState<string | null>(null);
  const [visitLead, setVisitLead] = useState<CrmLeadSummary | null>(null);
  const [visitForm, setVisitForm] = useState({ scheduledFor: "", notes: "" });

  const stats = useMemo(
    () => ({
      total: leads.length,
      urgent: leads.filter((lead) => lead.priority === "Alta").length,
      open: leads.filter((lead) => lead.needsResponse).length,
      visits: leads.filter((lead) => lead.stage === "Visita").length,
    }),
    [leads]
  );

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

  async function moveStage(leadId: string, stage: LeadStage) {
    setBusyLeadId(leadId);
    setFeedback(null);
    const response = await fetch(`/api/admin/leads/${leadId}/stage`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ stage }),
    });

    const payload = await response.json().catch(() => null);
    setBusyLeadId(null);

    if (!response.ok) {
      setFeedback(payload?.error ?? "No se pudo mover la etapa.");
      return;
    }

    router.refresh();
  }

  async function sendWhatsApp(leadId: string) {
    setBusyLeadId(leadId);
    setFeedback(null);

    const response = await fetch(`/api/admin/leads/${leadId}/whatsapp`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({}),
    });
    const payload = await response.json().catch(() => null);
    setBusyLeadId(null);

    if (!response.ok) {
      setFeedback(payload?.error ?? "No se pudo enviar el WhatsApp.");
      return;
    }

    setFeedback("Mensaje enviado por WhatsApp y seguimiento actualizado.");
    router.refresh();
  }

  async function scheduleVisit() {
    if (!visitLead) return;
    setBusyLeadId(visitLead.id);
    setFeedback(null);

    const response = await fetch(`/api/admin/leads/${visitLead.id}/visit`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(visitForm),
    });
    const payload = await response.json().catch(() => null);
    setBusyLeadId(null);

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
        title="Leads"
        description="Califica cada oportunidad con contexto real: que busca, que pregunto, objeciones, opciones parecidas y proximo paso comercial."
      />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MiniStat label="Leads activos" value={String(stats.total)} />
        <MiniStat label="Urgentes" value={String(stats.urgent)} />
        <MiniStat label="Sin responder" value={String(stats.open)} />
        <MiniStat label="Con visita" value={String(stats.visits)} />
      </section>

      {feedback ? (
        <div className="rounded-2xl border bg-background px-4 py-3 text-sm text-muted-foreground">
          {feedback}
        </div>
      ) : null}

      {leads.length > 0 ? (
        <section className="grid gap-4 2xl:grid-cols-2">
          {leads.map((lead) => {
            const thread = messagesByLead.get(lead.id) ?? [];
            const relatedLeads =
              relatedLeadsByPerson.get(
                `${lead.email ?? ""}|${lead.phone ?? ""}|${lead.fullName.toLowerCase()}`
              ) ?? [];
            const profile = buildLeadProfileSnapshot({
              lead,
              messages: thread,
              relatedLeads,
              visits,
            });
            const scoreReasons = deriveLeadScoreReasons(lead);
            const nextAction = deriveLeadNextAction(lead);
            const similarProperties = findSimilarProperties(lead, properties, 3);

            return (
              <article key={lead.id} className="rounded-[30px] border bg-card p-5 shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-xl font-semibold">{lead.fullName}</h3>
                      <Badge className={`border-0 ${stageStyles[lead.stage]}`}>{lead.stage}</Badge>
                      <Badge className="border-0 bg-primary/10 text-primary">{lead.priority}</Badge>
                      <Badge className="border-0 bg-muted text-foreground">Score {lead.score}</Badge>
                    </div>
                    <p className="mt-2 text-sm text-muted-foreground">
                      {lead.email || "Sin email"} · {lead.phone || "Sin telefono"}
                    </p>
                  </div>

                  <div className="grid min-w-[220px] gap-2">
                    <select
                      className="h-10 rounded-xl border bg-background px-3 text-sm"
                      value={lead.stage}
                      onChange={(event) => void moveStage(lead.id, event.target.value as LeadStage)}
                      disabled={busyLeadId === lead.id}
                    >
                      {STAGES.map((stage) => (
                        <option key={stage} value={stage}>
                          {stage}
                        </option>
                      ))}
                    </select>
                    <Button
                      variant="outline"
                      className="rounded-2xl"
                      disabled={busyLeadId === lead.id}
                      onClick={() => void sendWhatsApp(lead.id)}
                    >
                      {busyLeadId === lead.id ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <MessageCircleMore className="size-4" />
                      )}
                      Enviar WhatsApp
                    </Button>
                    <Button
                      variant="outline"
                      className="rounded-2xl"
                      onClick={() => setVisitLead(lead)}
                      disabled={busyLeadId === lead.id}
                    >
                      <CalendarPlus2 className="size-4" />
                      Agendar visita
                    </Button>
                    <Link
                      href="/mensajes"
                      className={buttonVariants({
                        className: "rounded-2xl",
                      })}
                    >
                      Abrir en bandeja
                    </Link>
                  </div>
                </div>

                <div className="mt-5 grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
                  <div className="space-y-4">
                    <InfoBlock title="Que busca">
                      <p className="text-sm leading-6 text-muted-foreground">{profile.whatTheySeek}</p>
                    </InfoBlock>

                    <InfoBlock title="Por que este lead vale la pena">
                      <div className="space-y-3">
                        {scoreReasons.map((reason) => (
                          <div key={reason.label} className="flex gap-3">
                            <CheckCircle2 className="mt-0.5 size-4 text-primary" />
                            <div>
                              <p className="text-sm font-medium">{reason.label}</p>
                              <p className="text-sm text-muted-foreground">{reason.detail}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </InfoBlock>

                    <InfoBlock title="Lo que pregunto y objeciones">
                      <div className="space-y-3 text-sm text-muted-foreground">
                        <div>
                          <p className="font-medium text-foreground">Ultimas preguntas</p>
                          <ul className="mt-2 space-y-1">
                            {profile.whatTheyAsked.length > 0 ? (
                              profile.whatTheyAsked.map((item) => <li key={item}>- {item}</li>)
                            ) : (
                              <li>- Todavia no hay suficientes mensajes del cliente.</li>
                            )}
                          </ul>
                        </div>
                        <div>
                          <p className="font-medium text-foreground">Objeciones detectadas</p>
                          <ul className="mt-2 space-y-1">
                            {profile.objections.length > 0 ? (
                              profile.objections.map((item) => <li key={item}>- {item}</li>)
                            ) : (
                              <li>- No detecte objeciones claras todavia.</li>
                            )}
                          </ul>
                        </div>
                      </div>
                    </InfoBlock>
                  </div>

                  <div className="space-y-4">
                    <InfoBlock title="Ficha del cliente">
                      <div className="space-y-4 text-sm text-muted-foreground">
                        <div>
                          <p className="font-medium text-foreground">Propiedades que vio</p>
                          <div className="mt-2 flex flex-wrap gap-2">
                            {profile.viewedProperties.length > 0 ? (
                              profile.viewedProperties.map((item) => (
                                <Badge key={item} variant="outline" className="rounded-full">
                                  {item}
                                </Badge>
                              ))
                            ) : (
                              <p>No tenemos otras propiedades asociadas a este cliente.</p>
                            )}
                          </div>
                        </div>

                        <div>
                          <p className="font-medium text-foreground">Que ya le respondimos</p>
                          <ul className="mt-2 space-y-1">
                            {profile.whatWeAnswered.length > 0 ? (
                              profile.whatWeAnswered.map((item) => <li key={item}>- {item}</li>)
                            ) : (
                              <li>- Aun no hay respuestas salientes registradas.</li>
                            )}
                          </ul>
                        </div>

                        <div className="rounded-2xl border bg-muted/20 p-3">
                          <p className="font-medium text-foreground">
                            Probabilidad de cierre: {profile.closeProbability.label}
                          </p>
                          <p className="mt-1 text-sm">{profile.closeProbability.detail}</p>
                        </div>
                      </div>
                    </InfoBlock>

                    <InfoBlock title="Propiedad consultada">
                      <p className="font-medium">{lead.propertyTitle || "Consulta general"}</p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {lead.propertyLocation || "Sin ubicacion"}
                      </p>
                      {lead.propertyPrice && lead.propertyCurrency ? (
                        <p className="mt-3 text-sm font-medium">
                          {formatMoney(lead.propertyPrice, lead.propertyCurrency)}
                        </p>
                      ) : null}
                    </InfoBlock>

                    <InfoBlock title="Proximo paso sugerido">
                      <div className="rounded-2xl border bg-primary/5 p-4 text-sm text-primary">
                        <p className="font-medium">{nextAction}</p>
                        <p className="mt-2 text-muted-foreground">{profile.nextAction}</p>
                      </div>
                    </InfoBlock>

                    <InfoBlock title="Ademas de esta propiedad, mostrarle estas">
                      <div className="space-y-3">
                        {similarProperties.length > 0 ? (
                          similarProperties.map((property) => (
                            <div
                              key={property.id}
                              className="flex items-center justify-between gap-3 rounded-2xl border p-3"
                            >
                              <div>
                                <p className="font-medium">{property.title}</p>
                                <p className="text-sm text-muted-foreground">{property.location}</p>
                                <p className="mt-1 text-sm">
                                  {formatMoney(property.price, property.currency)}
                                </p>
                              </div>
                              <Link
                                href={`/propiedad/${lead.agencySlug}/${property.id}`}
                                target="_blank"
                                className="inline-flex size-10 items-center justify-center rounded-full border bg-background"
                              >
                                <ArrowRight className="size-4" />
                              </Link>
                            </div>
                          ))
                        ) : (
                          <div className="rounded-2xl border border-dashed p-4 text-sm text-muted-foreground">
                            No encontre alternativas claras con el inventario actual.
                          </div>
                        )}
                      </div>
                    </InfoBlock>
                  </div>
                </div>
              </article>
            );
          })}
        </section>
      ) : (
        <EmptyState
          title="Todavia no entraron leads"
          description="Cuando lleguen consultas desde el marketplace o WhatsApp, vas a poder calificarlas y trabajarlas desde aca."
        />
      )}

      <Dialog open={Boolean(visitLead)} onOpenChange={(open) => !open && setVisitLead(null)}>
        <DialogContent className="max-w-xl rounded-[30px]">
          <DialogHeader>
            <DialogTitle>Agendar visita</DialogTitle>
            <DialogDescription>
              Deja la fecha y hora confirmada para que el equipo tenga seguimiento y recordatorio listo.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Fecha y hora</label>
              <Input
                type="datetime-local"
                value={visitForm.scheduledFor}
                onChange={(event) =>
                  setVisitForm((current) => ({ ...current, scheduledFor: event.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Notas</label>
              <Textarea
                rows={4}
                value={visitForm.notes}
                onChange={(event) =>
                  setVisitForm((current) => ({ ...current, notes: event.target.value }))
                }
                placeholder="Punto de encuentro, comentarios de la visita, confirmar condiciones, etc."
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" className="rounded-2xl" onClick={() => setVisitLead(null)}>
                Cancelar
              </Button>
              <Button
                className="rounded-2xl"
                onClick={() => void scheduleVisit()}
                disabled={busyLeadId !== null}
              >
                {busyLeadId ? <Loader2 className="size-4 animate-spin" /> : null}
                Guardar visita
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[28px] border bg-card p-5 shadow-sm">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-3 text-3xl font-semibold">{value}</p>
    </div>
  );
}

function InfoBlock({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="rounded-[24px] border bg-background p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary/80">{title}</p>
      <div className="mt-3">{children}</div>
    </div>
  );
}
