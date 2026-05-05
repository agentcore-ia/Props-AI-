"use client";

import { useState } from "react";
import { Loader2, RefreshCcw } from "lucide-react";
import { useRouter } from "next/navigation";

import type {
  RentalAdjustmentSummary,
  RentalDashboardSummary,
} from "@/lib/rental-types";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { formatArsCurrency, formatShortDate } from "@/lib/utils";

export function RentAutomationPanel({
  summary,
  recentAdjustments,
}: {
  summary: RentalDashboardSummary;
  recentAdjustments: RentalAdjustmentSummary[];
}) {
  const router = useRouter();
  const [running, setRunning] = useState(false);
  const [runMessage, setRunMessage] = useState<string | null>(null);

  async function handleRunNow() {
    setRunning(true);
    setRunMessage(null);

    const response = await fetch("/api/admin/rent-adjustments/run", {
      method: "POST",
    });

    const payload = await response.json().catch(() => null);

    if (!response.ok) {
      setRunning(false);
      setRunMessage(payload?.error ?? "No se pudo ejecutar la automatización.");
      return;
    }

    setRunning(false);
    setRunMessage(`Se procesaron ${payload?.processed ?? 0} contratos.`);
    router.refresh();
  }

  return (
    <section className="space-y-4">
      <div className="grid gap-4 md:grid-cols-4">
        {[
          ["Contratos activos", String(summary.totalActiveContracts)],
          ["Vencen hoy", String(summary.dueToday)],
          ["Próximos 7 días", String(summary.dueThisWeek)],
          ["Avisos fallidos", String(summary.failedNotifications)],
        ].map(([label, value]) => (
          <Card key={label} className="rounded-[28px] border-0 shadow-sm">
            <CardContent className="p-5">
              <p className="text-sm text-muted-foreground">{label}</p>
              <p className="mt-3 text-3xl font-semibold">{value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="rounded-[28px] border bg-card p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h3 className="text-lg font-semibold">Aumentos automáticos de alquiler</h3>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
              Props calcula los aumentos por IPC o ICL, actualiza el contrato y deja listo el aviso
              al inquilino por WhatsApp.
            </p>
          </div>
          <Button className="rounded-2xl" onClick={handleRunNow} disabled={running}>
            {running ? <Loader2 className="size-4 animate-spin" /> : <RefreshCcw className="size-4" />}
            Ejecutar aumentos de hoy
          </Button>
        </div>

        {runMessage ? (
          <div className="mt-4 rounded-2xl border bg-muted/30 px-4 py-3 text-sm">{runMessage}</div>
        ) : null}

        <div className="mt-5 grid gap-3">
          {recentAdjustments.length > 0 ? (
            recentAdjustments.slice(0, 5).map((adjustment) => (
              <div
                key={adjustment.id}
                className="flex flex-col gap-3 rounded-[22px] border bg-background px-4 py-4 md:flex-row md:items-center md:justify-between"
              >
                <div>
                  <p className="font-medium">
                    {adjustment.indexType} aplicado el {formatShortDate(adjustment.appliedOn)}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {formatArsCurrency(adjustment.previousRent)} → {formatArsCurrency(adjustment.newRent)}
                  </p>
                </div>
                <div className="text-sm text-muted-foreground">
                  <p>{adjustment.sourceLabel}</p>
                  <p className="mt-1">Aviso: {adjustment.notificationStatus}</p>
                </div>
              </div>
            ))
          ) : (
            <div className="rounded-[22px] border border-dashed bg-muted/20 px-4 py-8 text-sm text-muted-foreground">
              Todavía no hubo aumentos procesados. Cuando llegue una fecha de ajuste, vas a ver el historial acá.
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
