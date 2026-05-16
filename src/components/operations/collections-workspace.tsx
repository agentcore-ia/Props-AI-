"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  CheckCircle2,
  CircleDollarSign,
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
  const currentMonth = new Date().toISOString().slice(0, 7);
  const [form, setForm] = useState({
    contractId: leases[0]?.contractId ?? "",
    collectionMonth: currentMonth,
    collectedAmount: leases[0] ? String(leases[0].currentRent) : "",
    paymentMethod: "Transferencia",
    paymentDate: new Date().toISOString().slice(0, 10),
    generateSettlement: true,
  });
  const [feedback, setFeedback] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

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

  return (
    <div className="space-y-6">
      <PageHeader
        title="Cobranzas"
        description="Un flujo simple: registras el pago del inquilino y Props deja lista la liquidacion del propietario."
      />

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
