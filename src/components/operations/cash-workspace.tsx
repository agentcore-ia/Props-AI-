"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Download, Printer } from "lucide-react";

import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { CashMovementSummary, OwnerTransferSummary, RentalCollectionSummary } from "@/lib/operations-types";
import type { OwnerSettlementSummary } from "@/lib/rental-types";
import { formatMoney } from "@/lib/utils";

export function CashWorkspace({
  movements,
  collections,
  settlements,
  transfers,
}: {
  movements: CashMovementSummary[];
  collections: RentalCollectionSummary[];
  settlements: OwnerSettlementSummary[];
  transfers: OwnerTransferSummary[];
}) {
  const router = useRouter();
  const currentMonth = new Date().toISOString().slice(0, 7);
  const [reportMonth, setReportMonth] = useState(currentMonth);
  const [form, setForm] = useState({
    occurredOn: new Date().toISOString().slice(0, 10),
    kind: "Ingreso",
    category: "",
    amount: "",
    reference: "",
    notes: "",
  });
  const [feedback, setFeedback] = useState<string | null>(null);

  async function registerMovement() {
    setFeedback(null);
    const response = await fetch("/api/admin/cash-movements", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        occurredOn: form.occurredOn,
        kind: form.kind,
        category: form.category,
        amount: Number(form.amount),
        reference: form.reference,
        notes: form.notes,
      }),
    });
    const payload = await response.json().catch(() => null);
    if (!response.ok) {
      setFeedback(payload?.error ?? "No se pudo registrar el movimiento.");
      return;
    }
    setFeedback("Movimiento de caja registrado.");
    router.refresh();
  }

  const balance = movements.reduce((sum, item) => {
    if (item.kind === "Ingreso") return sum + item.amount;
    return sum - item.amount;
  }, 0);

  const report = useMemo(() => {
    const periodCollections = collections.filter((item) => item.collectionMonth === reportMonth);
    const periodSettlements = settlements.filter((item) => item.settlementMonth === reportMonth);
    const periodTransfers = transfers.filter((item) => item.transferDate?.slice(0, 7) === reportMonth);
    const periodMovements = movements.filter((item) => item.occurredOn.slice(0, 7) === reportMonth);
    const collected = periodCollections.reduce((sum, item) => sum + item.collectedAmount, 0);
    const expected = periodCollections.reduce((sum, item) => sum + item.expectedRent, 0);
    const ownerPayout = periodSettlements.reduce((sum, item) => sum + item.ownerPayoutAmount, 0);
    const ownerTransferred = periodTransfers.reduce((sum, item) => sum + item.amount, 0);
    const managementFees = periodSettlements.reduce((sum, item) => sum + item.managementFeeAmount, 0);
    const cashIncome = periodMovements.filter((item) => item.kind === "Ingreso").reduce((sum, item) => sum + item.amount, 0);
    const cashOutcome = periodMovements.filter((item) => item.kind !== "Ingreso").reduce((sum, item) => sum + item.amount, 0);

    return {
      periodCollections,
      periodSettlements,
      periodTransfers,
      periodMovements,
      collected,
      expected,
      pendingRent: Math.max(0, expected - collected),
      ownerPayout,
      ownerTransferred,
      pendingOwnerPayout: Math.max(0, ownerPayout - ownerTransferred),
      managementFees,
      cashIncome,
      cashOutcome,
      netCash: cashIncome + collected - cashOutcome - ownerTransferred,
    };
  }, [collections, movements, reportMonth, settlements, transfers]);

  function exportAccountingReport() {
    const rows = [
      ["Periodo", reportMonth],
      ["Alquiler esperado", String(report.expected)],
      ["Alquiler cobrado", String(report.collected)],
      ["Saldo alquiler", String(report.pendingRent)],
      ["Honorarios administracion", String(report.managementFees)],
      ["Neto propietarios liquidado", String(report.ownerPayout)],
      ["Transferido propietarios", String(report.ownerTransferred)],
      ["Pendiente propietarios", String(report.pendingOwnerPayout)],
      ["Ingresos caja", String(report.cashIncome)],
      ["Egresos caja", String(report.cashOutcome)],
      ["Flujo neto estimado", String(report.netCash)],
      [],
      ["Tipo", "Fecha/Periodo", "Nombre", "Propiedad/Referencia", "Monto", "Estado"],
      ...report.periodCollections.map((item) => [
        "Cobranza",
        item.collectionMonth,
        item.tenantName,
        item.propertyTitle,
        String(item.collectedAmount),
        item.status,
      ]),
      ...report.periodSettlements.map((item) => [
        "Liquidacion",
        item.settlementMonth,
        item.ownerName,
        item.propertyTitle,
        String(item.ownerPayoutAmount),
        item.status,
      ]),
      ...report.periodTransfers.map((item) => [
        "Pago propietario",
        item.transferDate ?? "",
        item.ownerName,
        item.propertyTitle,
        String(item.amount),
        item.status,
      ]),
      ...report.periodMovements.map((item) => [
        "Caja",
        item.occurredOn,
        item.category || item.kind,
        item.reference,
        String(item.amount),
        item.kind,
      ]),
    ];
    downloadCsv(`reporte-contable-props-${reportMonth}.csv`, rows);
  }

  function printAccountingReport() {
    const html = `
      <html>
        <head>
          <title>Reporte contable Props - ${reportMonth}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 32px; color: #0f172a; }
            h1 { margin: 0 0 8px; }
            .muted { color: #64748b; }
            .grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-top: 24px; }
            .metric { border: 1px solid #e2e8f0; border-radius: 14px; padding: 14px; }
            .label { font-size: 11px; letter-spacing: .16em; text-transform: uppercase; color: #64748b; }
            .value { margin-top: 8px; font-size: 20px; font-weight: 700; }
          </style>
        </head>
        <body>
          <p class="label">Props - reporte contable</p>
          <h1>Periodo ${reportMonth}</h1>
          <p class="muted">Resumen operativo de cobranzas, liquidaciones, pagos a propietarios y caja.</p>
          <div class="grid">
            <div class="metric"><div class="label">Cobrado</div><div class="value">${formatMoney(report.collected, "ARS")}</div></div>
            <div class="metric"><div class="label">Saldo alquiler</div><div class="value">${formatMoney(report.pendingRent, "ARS")}</div></div>
            <div class="metric"><div class="label">Honorarios</div><div class="value">${formatMoney(report.managementFees, "ARS")}</div></div>
            <div class="metric"><div class="label">Neto propietarios</div><div class="value">${formatMoney(report.ownerPayout, "ARS")}</div></div>
            <div class="metric"><div class="label">Transferido</div><div class="value">${formatMoney(report.ownerTransferred, "ARS")}</div></div>
            <div class="metric"><div class="label">Flujo neto</div><div class="value">${formatMoney(report.netCash, "ARS")}</div></div>
          </div>
          <script>window.print(); window.close();</script>
        </body>
      </html>
    `;
    const printWindow = window.open("", "_blank", "width=900,height=700");
    printWindow?.document.write(html);
    printWindow?.document.close();
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Caja" description="Lleva ingresos, egresos y transferencias de la operacion diaria en una sola vista." />

      <section className="rounded-[28px] border bg-card p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary/75">
              Reporte contable
            </p>
            <h2 className="mt-2 text-xl font-semibold">Cierre del periodo</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Resume alquileres cobrados, saldos, honorarios, liquidaciones, pagos a propietarios y caja.
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input type="month" value={reportMonth} onChange={(e) => setReportMonth(e.target.value)} />
            <Button variant="outline" className="rounded-2xl" onClick={exportAccountingReport}>
              <Download className="size-4" />
              Exportar
            </Button>
            <Button variant="outline" className="rounded-2xl" onClick={printAccountingReport}>
              <Printer className="size-4" />
              Imprimir
            </Button>
          </div>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <ReportMetric label="Alquiler cobrado" value={formatMoney(report.collected, "ARS")} />
          <ReportMetric label="Saldo alquiler" value={formatMoney(report.pendingRent, "ARS")} />
          <ReportMetric label="Honorarios" value={formatMoney(report.managementFees, "ARS")} />
          <ReportMetric label="Flujo neto estimado" value={formatMoney(report.netCash, "ARS")} />
          <ReportMetric label="Liquidado a propietarios" value={formatMoney(report.ownerPayout, "ARS")} />
          <ReportMetric label="Transferido" value={formatMoney(report.ownerTransferred, "ARS")} />
          <ReportMetric label="Pendiente propietarios" value={formatMoney(report.pendingOwnerPayout, "ARS")} />
          <ReportMetric
            label="Movimientos auditables"
            value={String(
              report.periodCollections.length +
                report.periodSettlements.length +
                report.periodTransfers.length +
                report.periodMovements.length
            )}
          />
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[0.85fr_1.15fr]">
        <Card className="rounded-[28px] border-0 shadow-sm">
          <CardHeader>
            <CardTitle>Nuevo movimiento</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Input type="date" value={form.occurredOn} onChange={(e) => setForm((p) => ({ ...p, occurredOn: e.target.value }))} />
            <select
              className="flex h-11 w-full rounded-xl border bg-background px-3 text-sm outline-none"
              value={form.kind}
              onChange={(e) => setForm((p) => ({ ...p, kind: e.target.value }))}
            >
              <option value="Ingreso">Ingreso</option>
              <option value="Egreso">Egreso</option>
              <option value="Transferencia">Transferencia</option>
            </select>
            <Input placeholder="Categoria" value={form.category} onChange={(e) => setForm((p) => ({ ...p, category: e.target.value }))} />
            <Input placeholder="Monto" value={form.amount} onChange={(e) => setForm((p) => ({ ...p, amount: e.target.value }))} />
            <Input placeholder="Referencia" value={form.reference} onChange={(e) => setForm((p) => ({ ...p, reference: e.target.value }))} />
            <Input placeholder="Notas" value={form.notes} onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))} />
            <Button className="rounded-2xl" onClick={registerMovement}>Registrar movimiento</Button>
            {feedback ? <p className="text-sm text-muted-foreground">{feedback}</p> : null}
          </CardContent>
        </Card>

        <Card className="rounded-[28px] border-0 shadow-sm">
          <CardHeader>
            <CardTitle>Libro de caja</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="rounded-2xl border bg-background p-4">
              <p className="text-sm text-muted-foreground">Saldo operativo</p>
              <p className="mt-2 text-3xl font-semibold">{formatMoney(balance, "ARS")}</p>
            </div>
            {movements.length > 0 ? (
              movements.map((movement) => (
                <div key={movement.id} className="rounded-2xl border bg-background p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold">{movement.category || movement.kind}</p>
                      <p className="text-sm text-muted-foreground">{movement.reference || "Sin referencia"}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">{formatMoney(movement.amount, "ARS")}</p>
                      <p className="text-sm text-muted-foreground">{movement.kind}</p>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <EmptyBox text="Todavia no hay movimientos de caja." />
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

function ReportMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border bg-background p-4">
      <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">{label}</p>
      <p className="mt-2 text-xl font-semibold">{value}</p>
    </div>
  );
}

function downloadCsv(fileName: string, rows: Array<string[]>) {
  const csv = rows
    .map((row) => row.map((cell) => `"${String(cell ?? "").replace(/"/g, '""')}"`).join(","))
    .join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}

function EmptyBox({ text }: { text: string }) {
  return <div className="rounded-2xl border border-dashed bg-background p-4 text-sm text-muted-foreground">{text}</div>;
}
