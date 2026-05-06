"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CalendarCheck2,
  CheckCircle2,
  Loader2,
  MessageSquareShare,
} from "lucide-react";

import type { EmployeeTaskSummary, VisitAppointmentSummary } from "@/lib/crm-types";
import { EmptyState } from "@/components/layout/empty-state";
import { PageHeader } from "@/components/layout/page-header";
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
  const [selectedVisit, setSelectedVisit] = useState<VisitAppointmentSummary | null>(null);
  const [outcomeForm, setOutcomeForm] = useState({
    status: "Realizada",
    outcomeSummary: "",
    objections: "",
    interestLevel: "Media",
    nextAction: "",
  });

  const upcomingVisits = useMemo(
    () => visits.filter((visit) => visit.status === "Programada" || visit.status === "Confirmada"),
    [visits]
  );

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

  async function saveOutcome() {
    if (!selectedVisit) return;
    setBusy(selectedVisit.id);
    setFeedback(null);

    const response = await fetch(`/api/admin/visits/${selectedVisit.id}/outcome`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(outcomeForm),
    });
    const payload = await response.json().catch(() => null);
    setBusy(null);

    if (!response.ok) {
      setFeedback(payload?.error ?? "No se pudo guardar el resultado de la visita.");
      return;
    }

    setSelectedVisit(null);
    setOutcomeForm({
      status: "Realizada",
      outcomeSummary: "",
      objections: "",
      interestLevel: "Media",
      nextAction: "",
    });
    setFeedback("Resultado de visita guardado y seguimiento creado.");
    router.refresh();
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Agenda"
        description="Visitas, recordatorios y tareas operativas para que el equipo sepa exactamente que mover hoy."
        action={
          <Button
            className="rounded-2xl"
            onClick={() => void runVisitReminders()}
            disabled={busy === "visits"}
          >
            {busy === "visits" ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <MessageSquareShare className="size-4" />
            )}
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
            <div>
              <h3 className="text-lg font-semibold">Visitas programadas</h3>
              <p className="text-sm text-muted-foreground">
                Confirmaciones, recordatorios y cierre del seguimiento post-visita.
              </p>
            </div>
          </div>

          <div className="mt-5 space-y-3">
            {visits.length > 0 ? (
              visits.map((visit) => (
                <div key={visit.id} className="rounded-[24px] border bg-background p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium">{visit.leadName}</p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {visit.propertyTitle || "Propiedad"} ·{" "}
                        {visit.propertyLocation || "Sin ubicacion"}
                      </p>
                    </div>
                    <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium">
                      {visit.status}
                    </span>
                  </div>
                  <p className="mt-3 text-sm text-muted-foreground">
                    {formatShortDate(visit.scheduledFor.slice(0, 10))} ·{" "}
                    {new Date(visit.scheduledFor).toLocaleTimeString("es-AR", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                  {visit.notes ? <p className="mt-2 text-sm text-muted-foreground">{visit.notes}</p> : null}

                  <div className="mt-4 flex flex-wrap gap-2">
                    {upcomingVisits.some((item) => item.id === visit.id) ? (
                      <Button
                        variant="outline"
                        className="rounded-2xl"
                        onClick={() => {
                          setSelectedVisit(visit);
                          setOutcomeForm((current) => ({
                            ...current,
                            status: visit.status === "Confirmada" ? "Realizada" : "Confirmada",
                            outcomeSummary: current.outcomeSummary || `Visita con ${visit.leadName}`,
                          }));
                        }}
                      >
                        Confirmar / registrar resultado
                      </Button>
                    ) : (
                      <Button
                        variant="outline"
                        className="rounded-2xl"
                        onClick={() => {
                          setSelectedVisit(visit);
                          setOutcomeForm((current) => ({
                            ...current,
                            status: "Realizada",
                            outcomeSummary: current.outcomeSummary || `Visita con ${visit.leadName}`,
                          }));
                        }}
                      >
                        Cargar post-visita
                      </Button>
                    )}
                  </div>
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
          <p className="mt-1 text-sm text-muted-foreground">
            Responder, seguir, revisar y cerrar sin depender de memoria o planillas.
          </p>
          <div className="mt-5 space-y-3">
            {tasks.length > 0 ? (
              tasks.map((task) => (
                <div key={task.id} className="rounded-[24px] border bg-background p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium">{task.title}</p>
                      <p className="mt-1 text-sm text-muted-foreground">{task.details}</p>
                    </div>
                    <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium">
                      {task.priority}
                    </span>
                  </div>
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                    <p className="text-sm text-muted-foreground">
                      Vence: {formatShortDate(task.dueAt.slice(0, 10))}
                    </p>
                    <Button
                      variant="outline"
                      className="rounded-2xl"
                      onClick={() => void completeTask(task.id)}
                      disabled={busy === task.id}
                    >
                      {busy === task.id ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <CheckCircle2 className="size-4" />
                      )}
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

      <Dialog open={Boolean(selectedVisit)} onOpenChange={(open) => !open && setSelectedVisit(null)}>
        <DialogContent className="max-w-xl rounded-[30px]">
          <DialogHeader>
            <DialogTitle>Registrar post-visita</DialogTitle>
            <DialogDescription>
              Deja resultado, objeciones e interes real para que Props cree el proximo paso automaticamente.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium">Estado</label>
                <select
                  className="h-11 rounded-xl border bg-background px-3 text-sm"
                  value={outcomeForm.status}
                  onChange={(event) =>
                    setOutcomeForm((current) => ({ ...current, status: event.target.value }))
                  }
                >
                  <option value="Confirmada">Confirmada</option>
                  <option value="Realizada">Realizada</option>
                  <option value="Reprogramar">Reprogramar</option>
                  <option value="Cancelada">Cancelada</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Interes real</label>
                <select
                  className="h-11 rounded-xl border bg-background px-3 text-sm"
                  value={outcomeForm.interestLevel}
                  onChange={(event) =>
                    setOutcomeForm((current) => ({
                      ...current,
                      interestLevel: event.target.value,
                    }))
                  }
                >
                  <option value="Alta">Alta</option>
                  <option value="Media">Media</option>
                  <option value="Baja">Baja</option>
                </select>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Resumen de la visita</label>
              <Textarea
                rows={4}
                value={outcomeForm.outcomeSummary}
                onChange={(event) =>
                  setOutcomeForm((current) => ({
                    ...current,
                    outcomeSummary: event.target.value,
                  }))
                }
                placeholder="Ej. Le gusto la ubicacion, quiere revisar expensas y volver con su pareja."
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Objeciones</label>
              <Input
                value={outcomeForm.objections}
                onChange={(event) =>
                  setOutcomeForm((current) => ({
                    ...current,
                    objections: event.target.value,
                  }))
                }
                placeholder="Ej. precio, expensas, mascotas, fecha de mudanza..."
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Siguiente accion</label>
              <Textarea
                rows={3}
                value={outcomeForm.nextAction}
                onChange={(event) =>
                  setOutcomeForm((current) => ({
                    ...current,
                    nextAction: event.target.value,
                  }))
                }
                placeholder="Ej. Enviar requisitos hoy y retomar manana para reservar."
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" className="rounded-2xl" onClick={() => setSelectedVisit(null)}>
                Cancelar
              </Button>
              <Button
                className="rounded-2xl"
                onClick={() => void saveOutcome()}
                disabled={busy === selectedVisit?.id}
              >
                {busy === selectedVisit?.id ? <Loader2 className="size-4 animate-spin" /> : null}
                Guardar resultado
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
