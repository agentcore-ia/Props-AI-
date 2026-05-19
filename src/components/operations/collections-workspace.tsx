"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowRight,
  CalendarPlus,
  CheckCircle2,
  CircleDollarSign,
  Download,
  Printer,
  ReceiptText,
  type LucideIcon,
} from "lucide-react";

import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { RentalCollectionSummary } from "@/lib/operations-types";
import type { LeaseRosterItem } from "@/lib/props-data";
import { formatMoney } from "@/lib/utils";

export function CollectionsWorkspace({
  leases,
  collections,
}: {
  leases: LeaseRosterItem[];
  collections: RentalCollectionSummary[];
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentMonth = new Date().toISOString().slice(0, 7);
  const requestedContractId = searchParams.get("contract");
  const initialContractId =
    leases.find((lease) => lease.contractId === requestedContractId)?.contractId ?? leases[0]?.contractId ?? "";
  const initialLease = leases.find((lease) => lease.contractId === initialContractId);
  const [form, setForm] = useState({
    contractId: initialContractId,
    collectionMonth: currentMonth,
    collectedAmount: initialLease ? String(initialLease.currentRent) : "",
    paymentMethod: "Transferencia",
    paymentDate: new Date().toISOString().slice(0, 10),
    generateSettlement: true,
  });
  const [feedback, setFeedback] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [preparingPeriod, setPreparingPeriod] = useState(false);

  const selectedLease = leases.find((lease) => lease.contractId === form.contractId) ?? null;
  const collectedAmount = Number(form.collectedAmount || 0);
  const expectedRent = selectedLease?.currentRent ?? 0;
  const collectionStatus =
    collectedAmount >= expectedRent ? "Cobrada" : collectedAmount > 0 ? "Parcial" : "Pendiente";

  async function registerCollection() {
    setSaving(true);
    setFeedback(null);

    const response = await fetch("/api/admin/rental-collections", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        contractId: form.contractId,
        collectionMonth: form.collectionMonth,
        collectedAmount,
        paymentMethod: form.paymentMethod,
        paymentDate: form.paymentDate,
      }),
    });
    const payload = await response.json().catch(() => null);

    if (!response.ok) {
      setSaving(false);
      setFeedback(payload?.error ?? "No se pudo registrar la cobranza.");
      return;
    }

    if (form.generateSettlement) {
      const settlementResponse = await fetch("/api/admin/owner-settlements", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          contractId: form.contractId,
          settlementMonth: form.collectionMonth,
        }),
      });
      const settlementPayload = await settlementResponse.json().catch(() => null);
      setSaving(false);

      if (!settlementResponse.ok) {
        setFeedback(
          `Cobranza registrada, pero no pudimos generar la liquidacion: ${
            settlementPayload?.error ?? "revisala desde Propietarios."
          }`
        );
        router.refresh();
        return;
      }

      setFeedback(
        `Cobranza registrada y ${settlementPayload?.processed ?? 0} liquidacion${
          settlementPayload?.processed === 1 ? "" : "es"
        } generada${settlementPayload?.processed === 1 ? "" : "s"} para propietario.`
      );
      router.refresh();
      return;
    }

    setSaving(false);
    setFeedback("Cobranza registrada. La liquidacion queda pendiente para generar cuando quieras.");
    router.refresh();
  }

  async function preparePeriod() {
    setPreparingPeriod(true);
    setFeedback(null);

    const response = await fetch("/api/admin/rental-periods/prepare", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ month: form.collectionMonth }),
    });
    const payload = await response.json().catch(() => null);
    setPreparingPeriod(false);

    if (!response.ok) {
      setFeedback(payload?.error ?? "No se pudo preparar el periodo.");
      return;
    }

    setFeedback(
      `Periodo ${payload?.month ?? form.collectionMonth} preparado: ${payload?.created ?? 0} cobranza${
        payload?.created === 1 ? "" : "s"
      } nueva${payload?.created === 1 ? "" : "s"} y ${payload?.skipped ?? 0} ya existente${
        payload?.skipped === 1 ? "" : "s"
      }.`
    );
    router.refresh();
  }

  function exportCollectionsCsv() {
    const rows = [
      ["Periodo", "Inquilino", "Propiedad", "Esperado", "Cobrado", "Saldo", "Metodo", "Estado", "Fecha de pago"],
      ...collections.map((item) => [
        item.collectionMonth,
        item.tenantName,
        item.propertyTitle,
        String(item.expectedRent),
        String(item.collectedAmount),
        String(Math.max(0, item.expectedRent - item.collectedAmount)),
        item.paymentMethod,
        item.status,
        item.paymentDate ?? "",
      ]),
    ];
    downloadCsv(`cobranzas-props-${new Date().toISOString().slice(0, 10)}.csv`, rows);
  }

  function printCollectionReceipt(item: RentalCollectionSummary) {
    const balance = Math.max(0, item.expectedRent - item.collectedAmount);
    const html = `
      <html>
        <head>
          <title>Recibo de cobranza - ${item.tenantName}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 32px; color: #0f172a; }
            .box { border: 1px solid #cbd5e1; border-radius: 18px; padding: 24px; }
            h1 { margin: 0 0 8px; font-size: 24px; }
            p { margin: 6px 0; }
            .muted { color: #64748b; }
            .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-top: 24px; }
            .metric { border: 1px solid #e2e8f0; border-radius: 14px; padding: 14px; }
            .label { font-size: 11px; letter-spacing: .16em; text-transform: uppercase; color: #64748b; }
            .value { margin-top: 8px; font-size: 20px; font-weight: 700; }
          </style>
        </head>
        <body>
          <div class="box">
            <p class="label">Props - recibo de cobranza</p>
            <h1>${item.tenantName}</h1>
            <p class="muted">${item.propertyTitle} - ${item.propertyLocation}</p>
            <p>Periodo: <strong>${item.collectionMonth}</strong></p>
            <p>Metodo: <strong>${item.paymentMethod}</strong></p>
            <p>Fecha de pago: <strong>${item.paymentDate ?? "Pendiente"}</strong></p>
            <div class="grid">
              <div class="metric"><div class="label">Alquiler esperado</div><div class="value">${formatMoney(item.expectedRent, "ARS")}</div></div>
              <div class="metric"><div class="label">Cobrado</div><div class="value">${formatMoney(item.collectedAmount, "ARS")}</div></div>
              <div class="metric"><div class="label">Saldo</div><div class="value">${formatMoney(balance, "ARS")}</div></div>
              <div class="metric"><div class="label">Estado</div><div class="value">${item.status}</div></div>
            </div>
            <p class="muted" style="margin-top:24px;">Emitido desde Props Control Inmobiliario.</p>
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
      <PageHeader
        title="Cobros de alquiler"
        description="Un flujo simple: registras el pago del inquilino y Props deja lista la liquidacion del propietario."
      />

      <section className="grid gap-3 lg:grid-cols-3">
        <div className="rounded-[24px] border bg-card p-4 shadow-sm lg:col-span-2">
          <p className="font-semibold">Abrir periodo de cobranza</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Crea las cobranzas pendientes del mes para todos los contratos activos que todavia no tengan registro.
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row lg:flex-col">
          <Button className="rounded-2xl" disabled={preparingPeriod} onClick={preparePeriod}>
            <CalendarPlus className="size-4" />
            {preparingPeriod ? "Preparando..." : `Preparar ${form.collectionMonth}`}
          </Button>
          <Button variant="outline" className="rounded-2xl" onClick={exportCollectionsCsv}>
            <Download className="size-4" />
            Exportar cobranzas
          </Button>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
        <Card className="rounded-[28px] border-0 shadow-sm">
          <CardHeader>
            <CardTitle>Cobrar alquiler</CardTitle>
            <p className="text-sm text-muted-foreground">
              Elegi el contrato, confirma el monto y Props puede generar la liquidacion en el mismo paso.
            </p>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid gap-3 rounded-2xl border bg-muted/20 p-3 text-sm md:grid-cols-3">
              <Step icon={CircleDollarSign} title="1. Cobro" text="Registras lo que pago el inquilino." />
              <Step icon={ReceiptText} title="2. Liquidacion" text="Props calcula neto, comision y gastos." />
              <Step icon={CheckCircle2} title="3. Pago" text="Despues confirmas la transferencia." />
            </div>

            <select
              className="flex h-11 w-full rounded-xl border bg-background px-3 text-sm outline-none"
              value={form.contractId}
              onChange={(event) => {
                const lease = leases.find((item) => item.contractId === event.target.value);
                setForm((prev) => ({
                  ...prev,
                  contractId: event.target.value,
                  collectedAmount: lease ? String(lease.currentRent) : prev.collectedAmount,
                }));
              }}
            >
              {leases.map((lease) => (
                <option key={lease.contractId} value={lease.contractId}>
                  {lease.tenantName} · {lease.propertyTitle}
                </option>
              ))}
            </select>

            {selectedLease ? (
              <div className="rounded-2xl border bg-background p-4">
                <p className="text-sm font-semibold">{selectedLease.tenantName}</p>
                <p className="mt-1 text-sm text-muted-foreground">{selectedLease.propertyTitle}</p>
                <div className="mt-3 grid gap-2 text-sm md:grid-cols-3">
                  <Info label="Alquiler" value={formatMoney(selectedLease.currentRent, "ARS")} />
                  <Info label="Propietario" value={selectedLease.ownerName ?? "Sin configurar"} />
                  <Info label="Comision" value={`${selectedLease.managementFeePercent}%`} />
                </div>
              </div>
            ) : null}

            <div className="grid gap-3 md:grid-cols-2">
              <label className="space-y-1 text-sm font-medium">
                Periodo
                <Input
                  type="month"
                  value={form.collectionMonth}
                  onChange={(event) => setForm((prev) => ({ ...prev, collectionMonth: event.target.value }))}
                />
              </label>
              <label className="space-y-1 text-sm font-medium">
                Fecha de pago
                <Input
                  type="date"
                  value={form.paymentDate}
                  onChange={(event) => setForm((prev) => ({ ...prev, paymentDate: event.target.value }))}
                />
              </label>
            </div>

            <Input
              placeholder="Monto cobrado"
              value={form.collectedAmount}
              onChange={(event) => setForm((prev) => ({ ...prev, collectedAmount: event.target.value }))}
            />
            <Input
              placeholder="Metodo de pago"
              value={form.paymentMethod}
              onChange={(event) => setForm((prev) => ({ ...prev, paymentMethod: event.target.value }))}
            />

            <button
              type="button"
              className="flex w-full items-start gap-3 rounded-2xl border bg-primary/5 p-4 text-left transition hover:bg-primary/10"
              onClick={() =>
                setForm((prev) => ({ ...prev, generateSettlement: !prev.generateSettlement }))
              }
            >
              <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border bg-background">
                {form.generateSettlement ? <CheckCircle2 className="size-4 text-primary" /> : null}
              </span>
              <span>
                <span className="block font-semibold">Generar liquidacion al propietario automaticamente</span>
                <span className="mt-1 block text-sm text-muted-foreground">
                  Recomendado. Si el cobro es parcial, liquida sobre el monto realmente cobrado.
                </span>
              </span>
            </button>

            <div className="rounded-2xl border bg-background p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                Resultado esperado
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
                <span className="rounded-full bg-muted px-3 py-1">{collectionStatus}</span>
                <span className="text-muted-foreground">
                  Cobrado {formatMoney(collectedAmount, "ARS")} de {formatMoney(expectedRent, "ARS")}
                </span>
              </div>
            </div>

            <Button className="h-11 rounded-2xl" disabled={saving || !form.contractId} onClick={registerCollection}>
              {saving ? "Guardando..." : form.generateSettlement ? "Registrar cobro y liquidar" : "Registrar cobro"}
              {!saving ? <ArrowRight className="size-4" /> : null}
            </Button>
            {feedback ? <p className="text-sm text-muted-foreground">{feedback}</p> : null}
          </CardContent>
        </Card>

        <Card className="rounded-[28px] border-0 shadow-sm">
          <CardHeader>
            <CardTitle>Ultimos cobros</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {collections.length > 0 ? (
              collections.map((item) => (
                <div key={item.id} className="rounded-2xl border bg-background p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold">{item.tenantName}</p>
                      <p className="text-sm text-muted-foreground">
                        {item.propertyTitle} · {item.collectionMonth}
                      </p>
                    </div>
                    <p className="rounded-full bg-muted px-3 py-1 text-sm font-medium">{item.status}</p>
                  </div>
                  <div className="mt-3 grid gap-2 text-sm md:grid-cols-3">
                    <p>Esperado: {formatMoney(item.expectedRent, "ARS")}</p>
                    <p>Cobrado: {formatMoney(item.collectedAmount, "ARS")}</p>
                    <p>{item.paymentMethod}</p>
                  </div>
                  <div className="mt-3 flex justify-end">
                    <Button variant="outline" size="sm" className="rounded-2xl" onClick={() => printCollectionReceipt(item)}>
                      <Printer className="size-4" />
                      Imprimir recibo
                    </Button>
                  </div>
                </div>
              ))
            ) : (
              <EmptyBox text="Todavia no hay cobranzas registradas." />
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

function downloadCsv(fileName: string, rows: string[][]) {
  const csv = rows
    .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
    .join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}

function Step({
  icon: Icon,
  title,
  text,
}: {
  icon: LucideIcon;
  title: string;
  text: string;
}) {
  return (
    <div className="rounded-xl bg-background p-3">
      <Icon className="size-4 text-primary" />
      <p className="mt-2 font-semibold">{title}</p>
      <p className="mt-1 text-muted-foreground">{text}</p>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-muted/40 p-3">
      <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">{label}</p>
      <p className="mt-1 font-semibold">{value}</p>
    </div>
  );
}

function EmptyBox({ text }: { text: string }) {
  return <div className="rounded-2xl border border-dashed bg-background p-4 text-sm text-muted-foreground">{text}</div>;
}
