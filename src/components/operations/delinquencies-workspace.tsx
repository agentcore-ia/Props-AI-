"use client";

import { useMemo, useState } from "react";
import {
  AlertTriangle,
  Bot,
  Download,
  Mail,
  MessageCircle,
  Search,
  Send,
  Sparkles,
} from "lucide-react";

import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { DelinquentTenantSummary } from "@/lib/operations-types";
import { cn, formatMoney } from "@/lib/utils";

type NotifyResult = {
  ok: boolean;
  sent: number;
  failed: Array<{ tenantName: string; error: string }>;
};

function riskClass(risk: DelinquentTenantSummary["risk"]) {
  if (risk === "Alta") return "border-red-200 bg-red-50 text-red-700";
  if (risk === "Media") return "border-amber-200 bg-amber-50 text-amber-700";
  return "border-blue-200 bg-blue-50 text-blue-700";
}

function csvEscape(value: string | number | null) {
  const text = String(value ?? "");
  return `"${text.replace(/"/g, '""')}"`;
}

function buildMailTo(item: DelinquentTenantSummary) {
  const subject = `Alquiler pendiente - ${item.propertyTitle}`;
  return `mailto:${item.tenantEmail ?? ""}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(item.suggestedMessage)}`;
}

export function DelinquenciesWorkspace({
  delinquencies,
}: {
  delinquencies: DelinquentTenantSummary[];
}) {
  const [query, setQuery] = useState("");
  const [riskFilter, setRiskFilter] = useState<"Todas" | DelinquentTenantSummary["risk"]>("Todas");
  const [sendingIds, setSendingIds] = useState<string[]>([]);
  const [result, setResult] = useState<NotifyResult | null>(null);

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return delinquencies.filter((item) => {
      const matchesRisk = riskFilter === "Todas" || item.risk === riskFilter;
      const matchesQuery =
        !normalized ||
        [item.tenantName, item.propertyTitle, item.propertyLocation, item.ownerName ?? ""]
          .join(" ")
          .toLowerCase()
          .includes(normalized);

      return matchesRisk && matchesQuery;
    });
  }, [delinquencies, query, riskFilter]);

  const totals = useMemo(() => {
    const debt = delinquencies.reduce((sum, item) => sum + item.totalDebtAmount, 0);
    const lateFees = delinquencies.reduce((sum, item) => sum + item.lateFeeAmount, 0);
    const highRisk = delinquencies.filter((item) => item.risk === "Alta").length;
    const withPhone = delinquencies.filter((item) => item.tenantPhone).length;
    const avgDaysLate = delinquencies.length
      ? Math.round(delinquencies.reduce((sum, item) => sum + item.daysLate, 0) / delinquencies.length)
      : 0;

    return { debt, lateFees, highRisk, withPhone, avgDaysLate };
  }, [delinquencies]);

  function downloadCsv() {
    const header = [
      "Inquilino",
      "Propiedad",
      "Propietario",
      "Periodo",
      "Alquiler esperado",
      "Cobrado",
      "Punitorios",
      "Total pendiente",
      "Dias de atraso",
      "Riesgo IA",
      "Accion sugerida",
    ];
    const rows = filtered.map((item) => [
      item.tenantName,
      item.propertyTitle,
      item.ownerName ?? "",
      item.collectionMonth,
      item.expectedRent,
      item.collectedAmount,
      item.lateFeeAmount,
      item.totalDebtAmount,
      item.daysLate,
      item.risk,
      item.suggestedAction,
    ]);
    const csv = [header, ...rows].map((row) => row.map(csvEscape).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `morosos-props-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  async function notify(contractIds: string[]) {
    setSendingIds(contractIds);
    setResult(null);
    const response = await fetch("/api/admin/delinquencies/notify", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ contractIds }),
    });
    const payload = (await response.json().catch(() => null)) as NotifyResult | null;
    setSendingIds([]);
    setResult(
      response.ok && payload
        ? payload
        : { ok: false, sent: 0, failed: [{ tenantName: "Envio", error: "No se pudo enviar el aviso." }] }
    );
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Morosos"
        description="Control de alquileres pendientes con prioridad IA, deuda por contrato y avisos listos para WhatsApp."
        action={
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" className="rounded-2xl" onClick={downloadCsv}>
              <Download className="size-4" />
              Exportar CSV
            </Button>
            <Button
              className="rounded-2xl"
              disabled={filtered.length === 0 || sendingIds.length > 0}
              onClick={() => void notify(filtered.map((item) => item.contractId))}
            >
              <Send className="size-4" />
              Avisar {filtered.length} por WhatsApp
            </Button>
          </div>
        }
      />

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Deuda total" value={formatMoney(totals.debt, "ARS")} hint="alquileres pendientes + punitorios" />
        <MetricCard label="Punitorios" value={formatMoney(totals.lateFees, "ARS")} hint="calculados segun contrato" />
        <MetricCard label="Inquilinos en mora" value={String(delinquencies.length)} hint={`${totals.withPhone} con WhatsApp cargado`} />
        <MetricCard label="Prioridad alta" value={String(totals.highRisk)} hint="requieren contacto humano" />
      </section>

      <Card className="rounded-[28px] border-0 shadow-sm">
        <CardContent className="space-y-4 p-4">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex flex-wrap gap-2">
              {(["Todas", "Alta", "Media", "Baja"] as const).map((risk) => (
                <Button
                  key={risk}
                  type="button"
                  variant={riskFilter === risk ? "default" : "outline"}
                  className="rounded-full"
                  onClick={() => setRiskFilter(risk)}
                >
                  {risk === "Todas" ? "Todos" : `Riesgo ${risk}`}
                </Button>
              ))}
            </div>

            <div className="relative w-full xl:max-w-sm">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Buscar por inquilino, propiedad o propietario..."
                className="h-11 rounded-2xl pl-10"
              />
            </div>
          </div>

          <div className="rounded-3xl border bg-muted/20 p-3">
            <div className="flex items-start gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <Sparkles className="size-5" />
              </div>
              <div>
                <p className="font-semibold">Lectura IA de cobranza</p>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">
                  Props ordena por riesgo, sugiere la accion y prepara un mensaje amable o firme segun atraso,
                  deuda y estado de pago. Los avisos por WhatsApp usan la instancia conectada de la inmobiliaria.
                </p>
              </div>
            </div>
          </div>

          {result ? (
            <div
              className={cn(
                "rounded-2xl border px-4 py-3 text-sm",
                result.failed.length ? "border-amber-200 bg-amber-50 text-amber-800" : "border-emerald-200 bg-emerald-50 text-emerald-800"
              )}
            >
              Se enviaron {result.sent} avisos.
              {result.failed.length ? ` Fallaron ${result.failed.length}: ${result.failed.map((item) => `${item.tenantName} (${item.error})`).join(", ")}` : null}
            </div>
          ) : null}
        </CardContent>
      </Card>

      <section className="grid gap-3">
        {filtered.length > 0 ? (
          filtered.map((item) => (
            <article key={item.contractId} className="rounded-[28px] border bg-card p-4 shadow-sm">
              <div className="space-y-4">
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline" className={cn("h-6 rounded-full border", riskClass(item.risk))}>
                      Riesgo {item.risk}
                    </Badge>
                    <Badge variant="outline" className="h-6 rounded-full">
                      {item.collectionStatus}
                    </Badge>
                    <span className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                      {item.collectionMonth}
                    </span>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold tracking-tight">{item.tenantName}</h3>
                    <p className="text-sm text-muted-foreground">
                      {item.propertyTitle} · {item.propertyLocation}
                    </p>
                  </div>
                  <div className="grid gap-2 text-sm sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
                    <DataPoint label="Alquiler" value={formatMoney(item.expectedRent, item.currency)} />
                    <DataPoint label="Cobrado" value={formatMoney(item.collectedAmount, item.currency)} />
                    <DataPoint label="Saldo alquiler" value={formatMoney(item.rentDebtAmount, item.currency)} />
                    <DataPoint
                      label="Punitorios"
                      value={
                        item.lateFeeDailyAmount > 0
                          ? `${formatMoney(item.lateFeeAmount, item.currency)} (${formatMoney(item.lateFeeDailyAmount, item.currency)}/dia)`
                          : "Sin punitorio"
                      }
                    />
                    <DataPoint label="Total" value={formatMoney(item.totalDebtAmount, item.currency)} strong />
                    <DataPoint label="Atraso" value={`${item.daysLate} dias`} />
                  </div>
                </div>

                <div className="rounded-3xl border bg-background p-4">
                  <div className="mb-2 flex items-center gap-2 text-sm font-semibold">
                    <Bot className="size-4 text-primary" />
                    Recomendacion IA
                  </div>
                  <p className="text-sm leading-6 text-muted-foreground">{item.aiReason}</p>
                  <p className="mt-3 text-sm font-medium">{item.suggestedAction}</p>
                </div>

                <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                  <Button
                    className="rounded-2xl"
                    disabled={!item.tenantPhone || sendingIds.includes(item.contractId)}
                    onClick={() => void notify([item.contractId])}
                  >
                    <MessageCircle className="size-4" />
                    {sendingIds.includes(item.contractId) ? "Enviando..." : "Avisar"}
                  </Button>
                  <Button
                    variant="outline"
                    className="rounded-2xl"
                    disabled={!item.tenantEmail}
                    render={<a href={buildMailTo(item)} />}
                  >
                    <Mail className="size-4" />
                    Preparar email
                  </Button>
                </div>
              </div>

              <div className="mt-4 rounded-3xl border border-dashed bg-muted/20 p-4">
                <p className="mb-2 text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                  Mensaje sugerido
                </p>
                <p className="text-sm leading-6 text-muted-foreground">{item.suggestedMessage}</p>
              </div>
            </article>
          ))
        ) : (
          <div className="rounded-[28px] border border-dashed bg-card p-8 text-center">
            <AlertTriangle className="mx-auto size-8 text-muted-foreground" />
            <p className="mt-3 font-semibold">No hay morosos con estos filtros.</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Cuando un alquiler quede pendiente o parcial, Props lo va a mostrar aca con prioridad y mensaje sugerido.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}

function MetricCard({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <Card className="rounded-[28px] border-0 shadow-sm">
      <CardContent className="p-5">
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="mt-3 text-3xl font-semibold tracking-tight">{value}</p>
        <p className="mt-2 text-sm text-muted-foreground">{hint}</p>
      </CardContent>
    </Card>
  );
}

function DataPoint({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="min-w-0 rounded-2xl border bg-background px-3 py-2">
      <p className="truncate text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
        {label}
      </p>
      <p
        className={cn(
          "mt-1 break-words text-sm leading-5",
          strong ? "font-semibold text-foreground" : "text-muted-foreground"
        )}
      >
        {value}
      </p>
    </div>
  );
}
