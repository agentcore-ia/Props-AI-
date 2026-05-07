"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  CalendarClock,
  CheckCheck,
  Clock3,
  Loader2,
  MessageCircleMore,
  RefreshCcw,
} from "lucide-react";
import { useState } from "react";
import type { ReactNode } from "react";

import type { TodayWorkspaceSnapshot } from "@/lib/crm-types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatShortDate } from "@/lib/utils";

export function TodayPanel({ snapshot }: { snapshot: TodayWorkspaceSnapshot }) {
  const router = useRouter();
  const [busyAction, setBusyAction] = useState<null | "followups" | "visits">(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  async function runAction(kind: "followups" | "visits") {
    setBusyAction(kind);
    setFeedback(null);

    const response = await fetch(
      kind === "followups" ? "/api/admin/follow-ups/run" : "/api/admin/visits/reminders/run",
      {
        method: "POST",
      }
    );

    const payload = await response.json().catch(() => null);
    setBusyAction(null);

    if (!response.ok) {
      setFeedback(payload?.error ?? "No se pudo ejecutar la automatización.");
      return;
    }

    setFeedback(
      kind === "followups"
        ? `Se enviaron ${payload?.processed ?? 0} seguimientos automáticos.`
        : `Se enviaron ${payload?.processed ?? 0} recordatorios de visita.`
    );
    router.refresh();
  }

  const followUpLabel =
    snapshot.counters.automaticFollowUps > 0
      ? `Enviar ${snapshot.counters.automaticFollowUps} seguimientos automáticos`
      : "No hay seguimientos automáticos pendientes";

  return (
    <Card className="rounded-[30px] border-0 bg-card shadow-sm">
      <CardHeader className="gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <CardTitle className="text-xl">Qué tengo que hacer hoy</CardTitle>
          <p className="mt-2 text-sm text-muted-foreground">
            Lo urgente primero: contactos humanos, tareas operativas y visitas del día.
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
            Enviar recordatorios de visitas
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="rounded-2xl border bg-background px-4 py-3 text-sm text-muted-foreground">
          Los seguimientos automáticos envían mensajes reales a leads pendientes que ya están listos para retomar. Las tareas operativas de contacto manual siguen quedando abajo.
        </div>

        <section className="grid gap-4 md:grid-cols-5">
          <MiniStat label="Tareas pendientes" value={String(snapshot.counters.pendingTasks)} />
          <MiniStat label="Visitas de hoy" value={String(snapshot.counters.visitsToday)} />
          <MiniStat label="Leads urgentes" value={String(snapshot.counters.urgentLeads)} />
          <MiniStat
            label="Seguimientos automáticos"
            value={String(snapshot.counters.automaticFollowUps)}
          />
          <MiniStat label="IA ya atendió" value={String(snapshot.counters.aiResolved)} />
        </section>

        {feedback ? (
          <div className="rounded-2xl border bg-background px-4 py-3 text-sm text-muted-foreground">
            {feedback}
          </div>
        ) : null}

        <div className="grid gap-4 xl:grid-cols-3">
          <TodayList
            title="Requieren contacto humano"
            icon={<Clock3 className="size-4 text-primary" />}
            items={
              snapshot.myDay.leadsToAnswer.length > 0
                ? snapshot.myDay.leadsToAnswer.map((lead) => ({
                    id: lead.id,
                    title: lead.fullName,
                    description: `${lead.propertyTitle ?? "Consulta general"} · ${lead.lastCustomerMessage}`,
                    meta: lead.priority,
                    actionLabel: "Abrir mensajes",
                    actionHref: `/mensajes?lead=${lead.id}`,
                  }))
                : []
            }
            empty="No hay conversaciones que necesiten respuesta manual ahora."
          />

          <TodayList
            title="Tareas operativas"
            icon={<RefreshCcw className="size-4 text-primary" />}
            items={
              snapshot.myDay.dueNow.length > 0
                ? snapshot.myDay.dueNow.map((task) => ({
                    id: task.id,
                    title: task.title,
                    description: task.details,
                    meta: task.priority,
                    actionLabel: task.leadId ? "Ver lead" : "Abrir agenda",
                    actionHref: task.leadId ? `/mensajes?lead=${task.leadId}` : "/agenda",
                  }))
                : []
            }
            empty="No hay tareas operativas activas para hoy."
          />

          <TodayList
            title="IA ya resolvió"
            icon={<CheckCheck className="size-4 text-primary" />}
            items={
              snapshot.myDay.aiResolved.length > 0
                ? snapshot.myDay.aiResolved.map((lead) => ({
                    id: lead.id,
                    title: lead.fullName,
                    description: `${lead.propertyTitle ?? "Consulta general"} · ${lead.lastCustomerMessage}`,
                    meta: deriveChannelLabel(lead.source),
                    actionLabel: "Ver conversación",
                    actionHref: `/mensajes?lead=${lead.id}`,
                  }))
                : []
            }
            empty="No hay conversaciones web resueltas por IA para revisar."
          />
        </div>

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

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[24px] border bg-background p-4">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-3 text-3xl font-semibold">{value}</p>
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
  items: Array<{
    id: string;
    title: string;
    description: string;
    meta: string;
    actionLabel?: string;
    actionHref?: string;
  }>;
  empty: string;
}) {
  return (
    <div className="rounded-[28px] border bg-background p-4">
      <div className="flex items-center gap-2">
        {icon}
        <h3 className="font-semibold">{title}</h3>
      </div>
      <div className="mt-4 space-y-3">
        {items.length > 0 ? (
          items.map((item) => (
            <div key={item.id} className="rounded-2xl border p-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-medium">{item.title}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{item.description}</p>
                  {item.actionHref && item.actionLabel ? (
                    <Link
                      href={item.actionHref}
                      className="mt-3 inline-flex h-8 items-center gap-1 rounded-xl px-2 text-sm font-medium text-primary transition hover:bg-primary/5"
                    >
                      {item.actionLabel}
                      <ArrowRight className="size-4" />
                    </Link>
                  ) : null}
                </div>
                <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium">
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
