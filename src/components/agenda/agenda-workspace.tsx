"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarCheck2, Loader2, MessageSquareShare } from "lucide-react";

import type { EmployeeTaskSummary, VisitAppointmentSummary } from "@/lib/crm-types";
import { EmptyState } from "@/components/layout/empty-state";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { formatShortDate } from "@/lib/utils";

export function AgendaWorkspace({
  visits,
  tasks,
}: {
  visits: VisitAppointmentSummary[];
  tasks: EmployeeTaskSummary[];
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<null | "visits" | string>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  async function runVisitReminders() {
    setBusy("visits");
    setFeedback(null);
    const response = await fetch("/api/admin/visits/reminders/run", { method: "POST" });
    const payload = await response.json().catch(() => null);
    setBusy(null);

    if (!response.ok) {
      setFeedback(payload?.error ?? "No se pudieron enviar los recordatorios.");
      return;
    }

    setFeedback(`Recordatorios enviados: ${payload?.processed ?? 0}.`);
    router.refresh();
  }

  async function completeTask(taskId: string) {
    setBusy(taskId);
    setFeedback(null);
    const response = await fetch(`/api/admin/tasks/${taskId}/complete`, { method: "POST" });
    const payload = await response.json().catch(() => null);
    setBusy(null);

    if (!response.ok) {
      setFeedback(payload?.error ?? "No se pudo marcar la tarea como hecha.");
      return;
    }

    router.refresh();
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Agenda"
        description="Visitas, recordatorios y tareas concretas para que el equipo sepa que mover hoy."
        action={
          <Button className="rounded-2xl" onClick={() => void runVisitReminders()} disabled={busy === "visits"}>
            {busy === "visits" ? <Loader2 className="size-4 animate-spin" /> : <MessageSquareShare className="size-4" />}
            Enviar recordatorios de visitas
          </Button>
        }
      />

      {feedback ? (
        <div className="rounded-2xl border bg-background px-4 py-3 text-sm text-muted-foreground">
          {feedback}
        </div>
      ) : null}

      <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-[30px] border bg-card p-5 shadow-sm">
          <div className="flex items-center gap-2">
            <CalendarCheck2 className="size-5 text-primary" />
            <h3 className="text-lg font-semibold">Visitas programadas</h3>
          </div>

          <div className="mt-5 space-y-3">
            {visits.length > 0 ? (
              visits.map((visit) => (
                <div key={visit.id} className="rounded-[24px] border bg-background p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium">{visit.leadName}</p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {visit.propertyTitle || "Propiedad"} · {visit.propertyLocation || "Sin ubicacion"}
                      </p>
                    </div>
                    <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium">{visit.status}</span>
                  </div>
                  <p className="mt-3 text-sm text-muted-foreground">
                    {formatShortDate(visit.scheduledFor.slice(0, 10))} · {new Date(visit.scheduledFor).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })}
                  </p>
                  {visit.notes ? <p className="mt-2 text-sm text-muted-foreground">{visit.notes}</p> : null}
                </div>
              ))
            ) : (
              <EmptyState
                title="Sin visitas cargadas"
                description="Cuando agendes una visita desde Leads, va a aparecer en esta agenda."
              />
            )}
          </div>
        </div>

        <div className="rounded-[30px] border bg-card p-5 shadow-sm">
          <h3 className="text-lg font-semibold">Tareas operativas</h3>
          <div className="mt-5 space-y-3">
            {tasks.length > 0 ? (
              tasks.map((task) => (
                <div key={task.id} className="rounded-[24px] border bg-background p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium">{task.title}</p>
                      <p className="mt-1 text-sm text-muted-foreground">{task.details}</p>
                    </div>
                    <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium">{task.priority}</span>
                  </div>
                  <div className="mt-3 flex items-center justify-between gap-3">
                    <p className="text-sm text-muted-foreground">
                      Vence: {formatShortDate(task.dueAt.slice(0, 10))}
                    </p>
                    <Button
                      variant="outline"
                      className="rounded-2xl"
                      onClick={() => void completeTask(task.id)}
                      disabled={busy === task.id}
                    >
                      {busy === task.id ? <Loader2 className="size-4 animate-spin" /> : null}
                      Marcar hecha
                    </Button>
                  </div>
                </div>
              ))
            ) : (
              <EmptyState
                title="Sin tareas pendientes"
                description="Las tareas de seguimiento, respuesta y visitas van a ir apareciendo aca."
              />
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
