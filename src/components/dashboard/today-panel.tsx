"use client";

import { useRouter } from "next/navigation";
import { CheckCheck, Clock3, Loader2, MessageCircleMore, RefreshCcw, CalendarClock } from "lucide-react";
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
      setFeedback(payload?.error ?? "No se pudo ejecutar la automatizacion.");
      return;
    }

    setFeedback(
      kind === "followups"
        ? `Seguimientos ejecutados: ${payload?.processed ?? 0}.`
        : `Recordatorios de visita ejecutados: ${payload?.processed ?? 0}.`
    );
    router.refresh();
  }

  return (
    <Card className="rounded-[30px] border-0 bg-card shadow-sm">
      <CardHeader className="gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <CardTitle className="text-xl">Que tengo que hacer hoy</CardTitle>
          <p className="mt-2 text-sm text-muted-foreground">
            Una vista corta para responder primero lo urgente y no dejar consultas sin avanzar.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            className="rounded-2xl"
            onClick={() => runAction("followups")}
            disabled={busyAction !== null}
          >
            {busyAction === "followups" ? <Loader2 className="size-4 animate-spin" /> : <MessageCircleMore className="size-4" />}
            Ejecutar seguimientos
          </Button>
          <Button
            variant="outline"
            className="rounded-2xl"
            onClick={() => runAction("visits")}
            disabled={busyAction !== null}
          >
            {busyAction === "visits" ? <Loader2 className="size-4 animate-spin" /> : <CalendarClock className="size-4" />}
            Enviar recordatorios
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <section className="grid gap-4 md:grid-cols-4">
          <MiniStat label="Tareas pendientes" value={String(snapshot.counters.pendingTasks)} />
          <MiniStat label="Visitas de hoy" value={String(snapshot.counters.visitsToday)} />
          <MiniStat label="Leads urgentes" value={String(snapshot.counters.urgentLeads)} />
          <MiniStat label="Seguimientos por salir" value={String(snapshot.counters.automaticFollowUps)} />
        </section>

        {feedback ? (
          <div className="rounded-2xl border bg-background px-4 py-3 text-sm text-muted-foreground">
            {feedback}
          </div>
        ) : null}

        <div className="grid gap-4 xl:grid-cols-3">
          <TodayList
            title="Responder ahora"
            icon={<Clock3 className="size-4 text-primary" />}
            items={
              snapshot.myDay.leadsToAnswer.length > 0
                ? snapshot.myDay.leadsToAnswer.map((lead) => ({
                    id: lead.id,
                    title: lead.fullName,
                    description: `${lead.propertyTitle ?? "Consulta general"} · ${lead.lastCustomerMessage}`,
                    meta: lead.priority,
                  }))
                : []
            }
            empty="No hay consultas abiertas para responder ahora."
          />

          <TodayList
            title="Tareas vencidas o de hoy"
            icon={<RefreshCcw className="size-4 text-primary" />}
            items={
              snapshot.myDay.dueNow.length > 0
                ? snapshot.myDay.dueNow.map((task) => ({
                    id: task.id,
                    title: task.title,
                    description: task.details,
                    meta: task.priority,
                  }))
                : []
            }
            empty="No hay tareas operativas vencidas."
          />

          <TodayList
            title="Visitas de hoy"
            icon={<CheckCheck className="size-4 text-primary" />}
            items={
              snapshot.myDay.visitsToday.length > 0
                ? snapshot.myDay.visitsToday.map((visit) => ({
                    id: visit.id,
                    title: visit.leadName,
                    description: `${visit.propertyTitle ?? "Propiedad"} · ${formatShortDate(visit.scheduledFor.slice(0, 10))}`,
                    meta: visit.status,
                  }))
                : []
            }
            empty="No hay visitas programadas para hoy."
          />
        </div>
      </CardContent>
    </Card>
  );
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
  items: Array<{ id: string; title: string; description: string; meta: string }>;
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
                </div>
                <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium">{item.meta}</span>
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
