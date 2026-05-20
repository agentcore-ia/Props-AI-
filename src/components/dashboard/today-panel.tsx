"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  CalendarClock,
  CheckCheck,
  ListChecks,
  Loader2,
  MessageCircleMore,
} from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";

import type { CrmLeadSummary, TodayWorkspaceSnapshot } from "@/lib/crm-types";
import { buildAutomaticFollowUpMessage } from "@/lib/crm-insights";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatShortDate } from "@/lib/utils";

type FollowUpResult = {
  leadId: string;
  status: "sent" | "error" | string;
  error?: string;
};

type TodayItem = {
  id: string;
  title: string;
  description: string;
  meta: string;
  actionLabel?: string;
  actionHref?: string;
  preview?: string;
};

export function TodayPanel({ snapshot }: { snapshot: TodayWorkspaceSnapshot }) {
  const router = useRouter();
  const [busyAction, setBusyAction] = useState<null | "followups" | "visits">(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [followUpResults, setFollowUpResults] = useState<FollowUpResult[]>([]);

  const actionItems = useMemo<TodayItem[]>(
    () =>
      [
        ...snapshot.myDay.leadsToAnswer.map((lead) => ({
          id: `lead-${lead.id}`,
          title: lead.fullName,
          description: `${lead.propertyTitle ?? "Consulta general"} · ${lead.lastCustomerMessage}`,
          meta: lead.priority,
          actionLabel: "Abrir mensajes",
          actionHref: `/mensajes?lead=${lead.id}`,
        })),
        ...snapshot.myDay.dueNow.map((task) => ({
          id: `task-${task.id}`,
          title: task.title,
          description: task.details,
          meta: task.priority,
          actionLabel: task.leadId ? "Ver lead" : "Abrir agenda",
          actionHref: task.leadId ? `/mensajes?lead=${task.leadId}` : "/agenda",
        })),
      ].slice(0, 8),
    [snapshot.myDay.dueNow, snapshot.myDay.leadsToAnswer]
  );

  async function runAction(kind: "followups" | "visits") {
    setBusyAction(kind);
    setFeedback(null);
    if (kind === "followups") {
      setFollowUpResults([]);
    }

    const response = await fetch(
      kind === "followups" ? "/api/admin/follow-ups/run" : "/api/admin/visits/reminders/run",
      { method: "POST" }
    );

    const payload = await response.json().catch(() => null);
    setBusyAction(null);

    if (!response.ok) {
      setFeedback(payload?.error ?? "No se pudo ejecutar la accion.");
      return;
    }

    if (kind === "followups") {
      const results = Array.isArray(payload?.results) ? (payload.results as FollowUpResult[]) : [];
      const sentCount = results.filter((item) => item.status === "sent").length;
      const errorCount = results.filter((item) => item.status === "error").length;
      setFollowUpResults(results);
      setFeedback(
        errorCount > 0
          ? `Se enviaron ${sentCount} WhatsApp y ${errorCount} quedaron con error.`
          : `Se enviaron ${sentCount} WhatsApp.`
      );
    } else {
      setFeedback(`Se enviaron ${payload?.processed ?? 0} recordatorios de visita.`);
    }

    router.refresh();
  }

  const followUpLabel =
    snapshot.counters.automaticFollowUps > 0
      ? `Recontactar ${snapshot.counters.automaticFollowUps}`
      : "Sin recontactos";

  return (
    <Card className="rounded-[28px] border-0 bg-card shadow-sm">
      <CardHeader className="gap-3 pb-3 md:flex-row md:items-start md:justify-between">
        <div>
          <CardTitle className="text-xl">Hoy</CardTitle>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Lo primero para no perder consultas, visitas ni pagos.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            className="rounded-2xl"
            onClick={() => runAction("followups")}
            disabled={busyAction !== null || snapshot.counters.automaticFollowUps === 0}
          >
            {busyAction === "followups" ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <MessageCircleMore className="size-4" />
            )}
            {followUpLabel}
          </Button>
          <Button
            variant="outline"
            className="rounded-2xl"
            onClick={() => runAction("visits")}
            disabled={busyAction !== null}
          >
            {busyAction === "visits" ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <CalendarClock className="size-4" />
            )}
            Recordar visitas
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        <section className="grid gap-3 md:grid-cols-5">
          <MiniStat label="Por hacer" value={String(snapshot.counters.pendingTasks)} />
          <MiniStat label="Visitas hoy" value={String(snapshot.counters.visitsToday)} />
          <MiniStat label="Leads urgentes" value={String(snapshot.counters.urgentLeads)} />
          <MiniStat label="Recontactos" value={String(snapshot.counters.automaticFollowUps)} />
          <MiniStat label="IA atendio" value={String(snapshot.counters.aiResolved)} />
        </section>

        {feedback ? (
          <div className="rounded-2xl border bg-background px-4 py-3 text-sm text-muted-foreground">
            {feedback}
          </div>
        ) : null}

        {snapshot.myDay.automaticFollowUps.length > 0 ? (
          <section className="rounded-[24px] border bg-background p-3.5">
            <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <MessageCircleMore className="size-4 text-primary" />
                  <h3 className="font-semibold">A quién va a recontactar</h3>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  Si apretás el botón, Props envía estos WhatsApp reales ahora.
                </p>
              </div>
              <span className="w-fit rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                {snapshot.myDay.automaticFollowUps.length} contacto{snapshot.myDay.automaticFollowUps.length === 1 ? "" : "s"}
              </span>
            </div>

            <div className="mt-3 grid gap-2 xl:grid-cols-2">
              {snapshot.myDay.automaticFollowUps.slice(0, 4).map((lead) => (
                <FollowUpPreviewCard key={lead.id} lead={lead} />
              ))}
            </div>

            {snapshot.myDay.automaticFollowUps.length > 4 ? (
              <p className="mt-2 text-xs text-muted-foreground">
                Hay {snapshot.myDay.automaticFollowUps.length - 4} recontactos más listos. Abrí Mensajes para revisar el resto antes de enviar.
              </p>
            ) : null}
          </section>
        ) : null}

        {followUpResults.length > 0 ? (
          <TodayList
            title="Resultado del ultimo envio"
            icon={<CheckCheck className="size-4 text-primary" />}
            items={followUpResults.map((result) => {
              const lead = snapshot.myDay.automaticFollowUps.find((item) => item.id === result.leadId);
              return {
                id: result.leadId,
                title: lead?.fullName ?? "Lead",
                description:
                  result.status === "sent"
                    ? "WhatsApp enviado correctamente."
                    : result.error ?? "No se pudo enviar el seguimiento.",
                meta: result.status === "sent" ? "Enviado" : "Error",
                actionLabel: lead ? "Abrir lead" : undefined,
                actionHref: lead ? `/mensajes?lead=${lead.id}` : undefined,
              };
            })}
            empty="Todavia no se ejecuto ningun seguimiento."
          />
        ) : null}

        <div className="grid gap-3 xl:grid-cols-[1.3fr_0.9fr]">
          <TodayList
            title="Hacer ahora"
            icon={<ListChecks className="size-4 text-primary" />}
            items={actionItems}
            empty="No hay tareas urgentes ni conversaciones para responder ahora."
          />

          <TodayList
            title="Visitas de hoy"
            icon={<CalendarClock className="size-4 text-primary" />}
            items={
              snapshot.myDay.visitsToday.length > 0
                ? snapshot.myDay.visitsToday.map((visit) => ({
                    id: visit.id,
                    title: visit.leadName,
                    description: `${visit.propertyTitle ?? "Propiedad"} · ${formatShortDate(
                      visit.scheduledFor.slice(0, 10)
                    )}`,
                    meta: visit.status,
                    actionLabel: "Abrir agenda",
                    actionHref: "/agenda",
                  }))
                : []
            }
            empty="No hay visitas programadas para hoy."
          />
        </div>

        <details className="rounded-[24px] border bg-background">
          <summary className="cursor-pointer px-4 py-3 text-sm font-medium text-muted-foreground">
            Automatizaciones y revisiones
          </summary>
          <div className="grid gap-3 border-t p-3 xl:grid-cols-2">
            <TodayList
              title="Recontactos listos"
              icon={<MessageCircleMore className="size-4 text-primary" />}
              items={
                snapshot.myDay.automaticFollowUps.length > 0
                  ? snapshot.myDay.automaticFollowUps.map((lead) => ({
                      id: lead.id,
                      title: lead.fullName,
                      description: `${deriveFollowUpReason(lead)}${lead.propertyTitle ? ` · ${lead.propertyTitle}` : ""}`,
                      meta: "WhatsApp real",
                      actionLabel: "Abrir lead",
                      actionHref: `/mensajes?lead=${lead.id}`,
                      preview: buildAutomaticFollowUpMessage({ lead, property: null }),
                    }))
                  : []
              }
              empty="No hay leads con seguimiento automatico listo para salir."
            />

            <TodayList
              title="IA ya resolvio"
              icon={<CheckCheck className="size-4 text-primary" />}
              items={
                snapshot.myDay.aiResolved.length > 0
                  ? snapshot.myDay.aiResolved.map((lead) => ({
                      id: lead.id,
                      title: lead.fullName,
                      description: `${lead.propertyTitle ?? "Consulta general"} · ${lead.lastCustomerMessage}`,
                      meta: deriveChannelLabel(lead.source),
                      actionLabel: "Ver conversacion",
                      actionHref: `/mensajes?lead=${lead.id}`,
                    }))
                  : []
              }
              empty="No hay conversaciones web resueltas por IA para revisar."
            />
          </div>
        </details>
      </CardContent>
    </Card>
  );
}

function deriveChannelLabel(source: string) {
  const normalized = source.toLowerCase();
  if (normalized.includes("whatsapp")) return "WhatsApp";
  if (normalized.includes("instagram")) return "Instagram";
  if (normalized.includes("web") || normalized.includes("marketplace") || normalized.includes("catalog")) {
    return "Web";
  }
  return "CRM";
}

function deriveFollowUpReason(lead: CrmLeadSummary) {
  if (lead.stage === "Visita") {
    return "Pidio avanzar con una visita y falta retomar la coordinacion.";
  }
  if (lead.stage === "Seguimiento") {
    return "Quedo pendiente reactivar la conversacion comercial.";
  }
  if (lead.desiredOperation === "Alquiler") {
    return "Consulto por alquiler y ya corresponde retomarlo.";
  }
  if (lead.desiredOperation === "Venta") {
    return "Consulto por compra y ya corresponde retomarlo.";
  }
  return "Es un lead pendiente que ya esta listo para recontactar.";
}

function FollowUpPreviewCard({ lead }: { lead: CrmLeadSummary }) {
  const message = buildAutomaticFollowUpMessage({ lead, property: null });

  return (
    <article className="rounded-2xl border bg-card p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-semibold">{lead.fullName}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {lead.phone ? `WhatsApp: ${formatPhoneForPreview(lead.phone)}` : "Sin WhatsApp cargado"}
          </p>
        </div>
        <span className="shrink-0 rounded-full bg-muted px-2.5 py-1 text-xs font-medium">
          {lead.stage}
        </span>
      </div>
      <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">
        {deriveFollowUpReason(lead)}
        {lead.propertyTitle ? ` · ${lead.propertyTitle}` : ""}
      </p>
      <div className="mt-3 rounded-xl border border-dashed bg-background px-3 py-2 text-sm text-muted-foreground">
        <span className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground/80">
          Mensaje que se enviará
        </span>
        <span className="line-clamp-3">{message}</span>
      </div>
      <Link
        href={`/mensajes?lead=${lead.id}`}
        className="mt-2 inline-flex h-8 items-center gap-1 rounded-xl px-2 text-sm font-medium text-primary transition hover:bg-primary/5"
      >
        Revisar conversación
        <ArrowRight className="size-4" />
      </Link>
    </article>
  );
}

function formatPhoneForPreview(phone: string) {
  const digits = phone.replace(/\D/g, "");
  if (digits.length <= 4) return phone;
  return `${digits.slice(0, -4)} ${digits.slice(-4)}`;
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[20px] border bg-background p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-semibold">{value}</p>
    </div>
  );
}

function TodayList({
  title,
  icon,
  items,
  empty,
}: {
  title: string;
  icon: ReactNode;
  items: TodayItem[];
  empty: string;
}) {
  return (
    <div className="rounded-[24px] border bg-background p-3.5">
      <div className="flex items-center gap-2">
        {icon}
        <h3 className="font-semibold">{title}</h3>
      </div>
      <div className="mt-3 space-y-2.5">
        {items.length > 0 ? (
          items.map((item) => (
            <div key={item.id} className="rounded-2xl border p-2.5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-medium">{item.title}</p>
                  <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{item.description}</p>
                  {item.preview ? (
                    <div className="mt-3 rounded-xl bg-muted/50 px-3 py-2 text-sm text-muted-foreground">
                      <span className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                        Mensaje sugerido
                      </span>
                      {item.preview}
                    </div>
                  ) : null}
                  {item.actionHref && item.actionLabel ? (
                    <Link
                      href={item.actionHref}
                      className="mt-2 inline-flex h-8 items-center gap-1 rounded-xl px-2 text-sm font-medium text-primary transition hover:bg-primary/5"
                    >
                      {item.actionLabel}
                      <ArrowRight className="size-4" />
                    </Link>
                  ) : null}
                </div>
                <span className="shrink-0 rounded-full bg-muted px-2.5 py-1 text-xs font-medium">
                  {item.meta}
                </span>
              </div>
            </div>
          ))
        ) : (
          <p className="text-sm text-muted-foreground">{empty}</p>
        )}
      </div>
    </div>
  );
}
