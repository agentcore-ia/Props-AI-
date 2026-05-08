"use client";

import { useState, type ReactNode } from "react";
import { Building2, CalendarDays, CircleDollarSign, Loader2, Phone, Send, UserRound } from "lucide-react";

import type { LeaseRosterItem } from "@/lib/props-data";
import type {
  OwnerSettlementSummary,
  RentalAdjustmentSummary,
  RentalDashboardSummary,
} from "@/lib/rental-types";
import { EmptyState } from "@/components/layout/empty-state";
import { PageHeader } from "@/components/layout/page-header";
import { RentAutomationPanel } from "@/components/props/rent-automation-panel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatMoney, formatShortDate } from "@/lib/utils";

const statusStyles: Record<LeaseRosterItem["status"], string> = {
  Activo: "bg-emerald-500/10 text-emerald-700",
  Pausado: "bg-amber-500/10 text-amber-700",
  Finalizado: "bg-slate-900/10 text-slate-700",
};

export function LeasesWorkspace({
  leases,
  rentalSummary,
  recentAdjustments,
  ownerSettlements,
}: {
  leases: LeaseRosterItem[];
  rentalSummary: RentalDashboardSummary;
  recentAdjustments: RentalAdjustmentSummary[];
  ownerSettlements: OwnerSettlementSummary[];
}) {
  const [sendingTestId, setSendingTestId] = useState<string | null>(null);
  const [generatingSettlementId, setGeneratingSettlementId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<null | { type: "success" | "error"; message: string }>(null);

  async function handleSendTest(contractId: string, tenantName: string) {
    setSendingTestId(contractId);
    setFeedback(null);

    const response = await fetch("/api/admin/rent-adjustments/test", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({ contractId }),
    });

    const payload = await response.json().catch(() => null);

    if (!response.ok) {
      setSendingTestId(null);
      setFeedback({
        type: "error",
        message: payload?.error ?? "No se pudo enviar la prueba.",
      });
      return;
    }

    setSendingTestId(null);
    setFeedback({
      type: "success",
      message: `Prueba enviada a ${tenantName}. Revisa ese WhatsApp para confirmar el aumento simulado.`,
    });
  }

  async function handleGenerateSettlement(contractId?: string, ownerName?: string) {
    setGeneratingSettlementId(contractId ?? "all");
    setFeedback(null);

    const response = await fetch("/api/admin/owner-settlements", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        contractId,
      }),
    });

    const payload = await response.json().catch(() => null);

    if (!response.ok) {
      setGeneratingSettlementId(null);
      setFeedback({
        type: "error",
        message: payload?.error ?? "No se pudo generar la liquidacion.",
      });
      return;
    }

    setGeneratingSettlementId(null);
    setFeedback({
      type: "success",
      message: contractId
        ? `Liquidacion emitida para ${ownerName ?? "el propietario"} en ${payload?.settlementMonth ?? "este mes"}.`
        : `Se emitieron ${payload?.processed ?? 0} liquidaciones de propietarios para ${payload?.settlementMonth ?? "este mes"}.`,
    });
    window.location.reload();
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Alquileres"
        description="Sigue contratos activos, datos de inquilinos, propiedades alquiladas y proximos ajustes desde una sola vista."
      />

      <RentAutomationPanel summary={rentalSummary} recentAdjustments={recentAdjustments} />

      {feedback ? (
        <div
          className={`rounded-2xl border px-4 py-3 text-sm ${
            feedback.type === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
              : "border-red-200 bg-red-50 text-red-700"
          }`}
        >
          {feedback.message}
        </div>
      ) : null}

      {leases.length > 0 ? (
        <>
          <section className="grid gap-4 lg:grid-cols-2 xl:grid-cols-4">
            <MiniInfoCard
              label="Contratos activos"
              value={String(rentalSummary.totalActiveContracts)}
              hint="Contratos hoy en marcha."
            />
            <MiniInfoCard
              label="Ajustan hoy"
              value={String(rentalSummary.dueToday)}
              hint="Conviene revisar y avisar."
            />
            <MiniInfoCard
              label="Ajustan en 7 dias"
              value={String(rentalSummary.dueThisWeek)}
              hint="Planifica avisos y seguimiento."
            />
            <MiniInfoCard
              label="Avisos fallidos"
              value={String(rentalSummary.failedNotifications)}
              hint="Necesitan revision manual."
            />
            <MiniInfoCard
              label="Liquidaciones del mes"
              value={String(rentalSummary.ownerSettlementsThisMonth)}
              hint="Emitidas para propietarios."
            />
            <MiniInfoCard
              label="Pagos a propietarios"
              value={String(rentalSummary.pendingOwnerPayouts)}
              hint="Pendientes de marcar como pagados."
            />
          </section>

          <section className="rounded-[30px] border bg-card p-5 shadow-sm">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary/75">
                  Liquidaciones automaticas
                </p>
                <h2 className="mt-2 text-xl font-semibold">Liquidaciones para propietarios</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Props calcula el neto a transferir segun alquiler, comision y gastos fijos del contrato.
                </p>
              </div>
              <Button
                variant="outline"
                className="rounded-2xl"
                disabled={generatingSettlementId === "all"}
                onClick={() => handleGenerateSettlement()}
              >
                {generatingSettlementId === "all" ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <CircleDollarSign className="size-4" />
                )}
                Generar liquidaciones del mes
              </Button>
            </div>

            <div className="mt-5 grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
              {ownerSettlements.length > 0 ? (
                ownerSettlements.map((settlement) => (
                  <article key={settlement.id} className="rounded-[24px] border bg-background p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary/75">
                          {settlement.settlementMonth}
                        </p>
                        <h3 className="mt-2 font-semibold">{settlement.ownerName}</h3>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {settlement.propertyTitle} · {settlement.propertyLocation}
                        </p>
                      </div>
                      <Badge variant="outline" className="rounded-full">
                        {settlement.status}
                      </Badge>
                    </div>
                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      <InfoMetric label="Alquiler cobrado" value={formatMoney(settlement.rentCollected, "ARS")} />
                      <InfoMetric
                        label={`Comision ${settlement.managementFeePercent}%`}
                        value={formatMoney(settlement.managementFeeAmount, "ARS")}
                      />
                      <InfoMetric label="Gastos fijos" value={formatMoney(settlement.monthlyOwnerCosts, "ARS")} />
                      <InfoMetric label="Neto al propietario" value={formatMoney(settlement.ownerPayoutAmount, "ARS")} />
                    </div>
                    {settlement.otherChargesAmount > 0 || settlement.otherChargesDetail ? (
                      <p className="mt-3 text-sm text-muted-foreground">
                        Otros cargos: {formatMoney(settlement.otherChargesAmount, "ARS")}
                        {settlement.otherChargesDetail ? ` · ${settlement.otherChargesDetail}` : ""}
                      </p>
                    ) : null}
                  </article>
                ))
              ) : (
                <div className="rounded-[24px] border border-dashed bg-background p-5 text-sm text-muted-foreground lg:col-span-2 xl:col-span-3">
                  Todavia no hay liquidaciones emitidas. Configura el propietario en el contrato y genera el cierre del mes desde aca.
                </div>
              )}
            </div>
          </section>

          <section className="hidden overflow-hidden rounded-[30px] border bg-card shadow-sm xl:block">
            <div className="grid grid-cols-[1.1fr_1fr_0.8fr_0.9fr_0.8fr_0.7fr_0.8fr] gap-4 border-b px-6 py-4 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              <span>Inquilino</span>
              <span>Propiedad</span>
              <span>Direccion</span>
              <span>Alquiler actual</span>
              <span>Proximo aumento</span>
              <span>Estado</span>
              <span>Acciones</span>
            </div>

            <div className="divide-y">
              {leases.map((lease) => (
                <div
                  key={lease.contractId}
                  className="grid grid-cols-[1.1fr_1fr_0.8fr_0.9fr_0.8fr_0.7fr_0.8fr] gap-4 px-6 py-5"
                >
                  <div className="space-y-1">
                    <p className="font-semibold">{lease.tenantName}</p>
                    <p className="text-sm text-muted-foreground">{lease.tenantEmail || "Sin email"}</p>
                    <p className="text-sm text-muted-foreground">{lease.tenantPhone}</p>
                  </div>

                  <div className="space-y-1">
                    <p className="font-semibold">{lease.propertyTitle}</p>
                    <p className="text-sm text-muted-foreground">{lease.propertyLocation}</p>
                    <p className="text-sm text-muted-foreground">
                      Propietario: {lease.ownerName || "Sin configurar"}
                    </p>
                  </div>

                  <div className="text-sm leading-6 text-muted-foreground">
                    {lease.exactAddress || "Direccion pendiente"}
                  </div>

                  <div className="space-y-1">
                    <p className="font-semibold">{formatMoney(lease.currentRent, lease.currency)}</p>
                    <p className="text-sm text-muted-foreground">
                      {lease.indexType} cada {lease.adjustmentFrequencyMonths} meses
                    </p>
                  </div>

                  <div className="space-y-1">
                    <p className="font-semibold">{formatShortDate(lease.nextAdjustmentDate)}</p>
                    <p className="text-sm text-muted-foreground">
                      Inicio: {formatShortDate(lease.contractStartDate)}
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Badge className={statusStyles[lease.status]}>{lease.status}</Badge>
                    <p className="text-sm text-muted-foreground">
                      {lease.autoNotify ? "Aviso automatico activo" : "Aviso manual"}
                    </p>
                  </div>

                  <div className="flex items-start">
                    <div className="flex flex-col gap-2">
                      <Button
                        variant="outline"
                        className="rounded-2xl"
                        disabled={sendingTestId === lease.contractId}
                        onClick={() => handleSendTest(lease.contractId, lease.tenantName)}
                      >
                        {sendingTestId === lease.contractId ? (
                          <Loader2 className="size-4 animate-spin" />
                        ) : (
                          <Send className="size-4" />
                        )}
                        Enviar prueba
                      </Button>
                      <Button
                        variant="outline"
                        className="rounded-2xl"
                        disabled={!lease.ownerName || generatingSettlementId === lease.contractId}
                        onClick={() => handleGenerateSettlement(lease.contractId, lease.ownerName ?? undefined)}
                      >
                        {generatingSettlementId === lease.contractId ? (
                          <Loader2 className="size-4 animate-spin" />
                        ) : (
                          <CircleDollarSign className="size-4" />
                        )}
                        Liquidar propietario
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="grid gap-4 xl:hidden">
            {leases.map((lease) => (
              <article key={lease.contractId} className="rounded-[28px] border bg-card p-5 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary/75">
                      {lease.indexType} cada {lease.adjustmentFrequencyMonths} meses
                    </p>
                    <h3 className="mt-2 text-xl font-semibold">{lease.tenantName}</h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {lease.tenantEmail || "Sin email"} · {lease.tenantPhone}
                    </p>
                  </div>
                  <Badge className={statusStyles[lease.status]}>{lease.status}</Badge>
                </div>

                <div className="mt-4 grid gap-3 text-sm text-muted-foreground">
                  <InfoRow icon={<Building2 className="size-4" />} label={lease.propertyTitle} />
                  <InfoRow icon={<UserRound className="size-4" />} label={lease.exactAddress || lease.propertyLocation} />
                  <InfoRow icon={<CircleDollarSign className="size-4" />} label={formatMoney(lease.currentRent, lease.currency)} />
                  <InfoRow icon={<CalendarDays className="size-4" />} label={`Proximo aumento: ${formatShortDate(lease.nextAdjustmentDate)}`} />
                  <InfoRow icon={<Phone className="size-4" />} label={lease.autoNotify ? "Aviso automatico activo" : "Aviso manual"} />
                </div>

                {lease.requirements ? (
                  <div className="mt-4 rounded-[22px] border bg-muted/20 p-4 text-sm leading-6 text-muted-foreground">
                    <span className="font-medium text-foreground">Requisitos del ingreso:</span>{" "}
                    {lease.requirements}
                  </div>
                ) : null}

                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  <div className="rounded-[22px] border bg-background p-4 text-sm text-muted-foreground">
                    <p className="text-xs uppercase tracking-[0.2em] text-primary/75">Documentacion</p>
                    <p className="mt-2 font-medium text-foreground">
                      Contrato y soporte del alquiler
                    </p>
                    <p className="mt-1">
                      Todo queda centralizado aca para revisar fechas, clausulas y siguientes pasos.
                    </p>
                  </div>
                  <div className="rounded-[22px] border bg-background p-4 text-sm text-muted-foreground">
                    <p className="text-xs uppercase tracking-[0.2em] text-primary/75">Propietario</p>
                    <p className="mt-2 font-medium text-foreground">
                      {lease.ownerName || "Todavia sin propietario configurado"}
                    </p>
                    <p className="mt-1">
                      {lease.ownerName
                        ? `Comision ${lease.managementFeePercent}% · Gastos fijos ${formatMoney(lease.monthlyOwnerCosts, "ARS")}`
                        : "Completa nombre, contacto y retencion para emitir la liquidacion mensual."}
                    </p>
                  </div>
                  <div className="rounded-[22px] border bg-background p-4 text-sm text-muted-foreground">
                    <p className="text-xs uppercase tracking-[0.2em] text-primary/75">Historial operativo</p>
                    <p className="mt-2 font-medium text-foreground">
                      {recentAdjustments.find((item) => item.contractId === lease.contractId)
                        ? "Ya tiene ajustes registrados"
                        : "Todavia sin ajustes aplicados"}
                    </p>
                    <p className="mt-1">
                      {recentAdjustments.find((item) => item.contractId === lease.contractId)
                        ? "Puedes revisar el ultimo aviso y volver a probar mensajeria si hace falta."
                        : "Cuando se procese el primer aumento, el historial quedara guardado aca."}
                    </p>
                  </div>
                </div>

                <div className="mt-4">
                  <div className="grid gap-3 md:grid-cols-2">
                    <Button
                      variant="outline"
                      className="w-full rounded-2xl"
                      disabled={sendingTestId === lease.contractId}
                      onClick={() => handleSendTest(lease.contractId, lease.tenantName)}
                    >
                      {sendingTestId === lease.contractId ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <Send className="size-4" />
                      )}
                      Enviar prueba de aumento
                    </Button>
                    <Button
                      variant="outline"
                      className="w-full rounded-2xl"
                      disabled={!lease.ownerName || generatingSettlementId === lease.contractId}
                      onClick={() => handleGenerateSettlement(lease.contractId, lease.ownerName ?? undefined)}
                    >
                      {generatingSettlementId === lease.contractId ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <CircleDollarSign className="size-4" />
                      )}
                      Liquidar propietario
                    </Button>
                  </div>
                </div>
              </article>
            ))}
          </section>
        </>
      ) : (
        <EmptyState
          title="Todavia no hay alquileres cargados"
          description="Cuando una propiedad tenga contrato activo, el inquilino y su cronograma de aumentos apareceran automaticamente en esta seccion."
        />
      )}
    </div>
  );
}

function InfoRow({
  icon,
  label,
}: {
  icon: ReactNode;
  label: string;
}) {
  return (
    <div className="inline-flex items-start gap-2">
      <span className="mt-0.5 text-primary">{icon}</span>
      <span>{label}</span>
    </div>
  );
}

function MiniInfoCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <div className="rounded-[24px] border bg-card p-5 shadow-sm">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-3 text-3xl font-semibold">{value}</p>
      <p className="mt-2 text-sm text-muted-foreground">{hint}</p>
    </div>
  );
}

function InfoMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[18px] border bg-card p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 font-semibold">{value}</p>
    </div>
  );
}
