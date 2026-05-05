"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarPlus2, Loader2, MessageCircleMore, Sparkles } from "lucide-react";

import type { CrmLeadSummary, LeadStage } from "@/lib/crm-types";
import { EmptyState } from "@/components/layout/empty-state";
import { PageHeader } from "@/components/layout/page-header";
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
import { Textarea } from "@/components/ui/textarea";
import { formatMoney, formatShortDate } from "@/lib/utils";

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

export function LeadsWorkspace({ leads }: { leads: CrmLeadSummary[] }) {
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
        description="Califica consultas, prioriza a quién responder, agenda visitas y dispara mensajes sin salir del CRM."
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
          {leads.map((lead) => (
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
                <div className="grid min-w-[180px] gap-2">
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
                    {busyLeadId === lead.id ? <Loader2 className="size-4 animate-spin" /> : <MessageCircleMore className="size-4" />}
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
                </div>
              </div>

              <div className="mt-5 grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
                <div className="space-y-4">
                  <div className="rounded-[24px] border bg-background p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary/80">Consulta</p>
                    <p className="mt-3 text-sm leading-6 text-muted-foreground">{lead.lastCustomerMessage}</p>
                  </div>

                  <div className="rounded-[24px] border bg-background p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary/80">Pre-calificacion</p>
                    <p className="mt-3 text-sm leading-6 text-muted-foreground">{lead.qualificationSummary}</p>
                    <div className="mt-3 grid gap-2 text-sm text-muted-foreground md:grid-cols-2">
                      <p>Operacion: {lead.desiredOperation || lead.propertyOperation || "Sin definir"}</p>
                      <p>Zona: {lead.desiredLocation || lead.propertyLocation || "Sin definir"}</p>
                      <p>Presupuesto: {lead.budget || "Sin dato"}</p>
                      <p>Plazo: {lead.desiredTimeline || "Sin dato"}</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="rounded-[24px] border bg-background p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary/80">Propiedad</p>
                    <p className="mt-3 font-medium">{lead.propertyTitle || "Consulta general"}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{lead.propertyLocation || "Sin ubicacion"}</p>
                    {lead.propertyPrice && lead.propertyCurrency ? (
                      <p className="mt-3 text-sm font-medium">
                        {formatMoney(lead.propertyPrice, lead.propertyCurrency)}
                      </p>
                    ) : null}
                  </div>

                  <div className="rounded-[24px] border bg-background p-4">
                    <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-primary/80">
                      <Sparkles className="size-4" />
                      Borrador sugerido
                    </div>
                    <p className="mt-3 text-sm leading-6 text-muted-foreground">
                      {lead.aiReplyDraft || "Todavia no hay un borrador sugerido para este lead."}
                    </p>
                  </div>

                  <div className="grid gap-2 text-sm text-muted-foreground">
                    <p>Fuente: {lead.source}</p>
                    <p>
                      Proximo seguimiento:{" "}
                      {lead.nextFollowUpAt ? formatShortDate(lead.nextFollowUpAt.slice(0, 10)) : "Sin fecha"}
                    </p>
                  </div>
                </div>
              </div>
            </article>
          ))}
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
                onChange={(event) => setVisitForm((current) => ({ ...current, scheduledFor: event.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Notas</label>
              <Textarea
                rows={4}
                value={visitForm.notes}
                onChange={(event) => setVisitForm((current) => ({ ...current, notes: event.target.value }))}
                placeholder="Punto de encuentro, comentarios de la visita, confirmar condiciones, etc."
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" className="rounded-2xl" onClick={() => setVisitLead(null)}>
                Cancelar
              </Button>
              <Button className="rounded-2xl" onClick={() => void scheduleVisit()} disabled={busyLeadId !== null}>
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
