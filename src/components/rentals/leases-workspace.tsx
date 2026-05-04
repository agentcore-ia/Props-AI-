"use client";

import { useState, type ReactNode } from "react";
import { Building2, CalendarDays, CircleDollarSign, Loader2, Phone, Send, UserRound } from "lucide-react";

import type { LeaseRosterItem } from "@/lib/props-data";
import { EmptyState } from "@/components/layout/empty-state";
import { PageHeader } from "@/components/layout/page-header";
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
}: {
  leases: LeaseRosterItem[];
}) {
  const [sendingTestId, setSendingTestId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<null | { type: "success" | "error"; message: string }>(null);
  const active = leases.filter((lease) => lease.status === "Activo").length;
  const dueSoon = leases.filter((lease) => {
    if (lease.status !== "Activo") return false;
    const next = new Date(`${lease.nextAdjustmentDate}T00:00:00`).getTime();
    const inSevenDays = Date.now() + 7 * 24 * 60 * 60 * 1000;
    return next <= inSevenDays;
  }).length;
  const autoNotify = leases.filter((lease) => lease.autoNotify).length;

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

  return (
    <div className="space-y-8">
      <PageHeader
        title="Alquileres"
        description="Sigue contratos activos, datos de inquilinos, propiedades alquiladas y proximos ajustes desde una sola vista."
      />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Contratos activos" value={String(active)} hint="alquileres en curso" />
        <MetricCard label="Aumentos proximos" value={String(dueSoon)} hint="vencen en 7 dias" />
        <MetricCard label="Aviso automatico" value={String(autoNotify)} hint="con notificacion habilitada" />
        <MetricCard label="Inquilinos cargados" value={String(leases.length)} hint="base actual del CRM" />
      </section>

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

                <div className="mt-4">
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

function MetricCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <div className="rounded-[28px] border bg-card p-5 shadow-sm">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-3 text-3xl font-semibold">{value}</p>
      <p className="mt-2 text-sm text-muted-foreground">{hint}</p>
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
