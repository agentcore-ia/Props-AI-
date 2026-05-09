"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { LeaseRosterItem } from "@/lib/props-data";
import type { RentalCollectionSummary } from "@/lib/operations-types";
import { formatMoney } from "@/lib/utils";

export function CollectionsWorkspace({
  leases,
  collections,
}: {
  leases: LeaseRosterItem[];
  collections: RentalCollectionSummary[];
}) {
  const router = useRouter();
  const [form, setForm] = useState({
    contractId: leases[0]?.contractId ?? "",
    collectedAmount: leases[0] ? String(leases[0].currentRent) : "",
    paymentMethod: "Transferencia",
    paymentDate: new Date().toISOString().slice(0, 10),
  });
  const [feedback, setFeedback] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function registerCollection() {
    setSaving(true);
    setFeedback(null);
    const response = await fetch("/api/admin/rental-collections", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        contractId: form.contractId,
        collectedAmount: Number(form.collectedAmount),
        paymentMethod: form.paymentMethod,
        paymentDate: form.paymentDate,
      }),
    });
    const payload = await response.json().catch(() => null);
    setSaving(false);
    if (!response.ok) {
      setFeedback(payload?.error ?? "No se pudo registrar la cobranza.");
      return;
    }
    setFeedback("Cobranza registrada correctamente.");
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Cobranzas"
        description="Registra pagos de alquiler, identifica mora o cobros parciales y deja la cobranza asentada por mes."
      />

      <section className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
        <Card className="rounded-[28px] border-0 shadow-sm">
          <CardHeader>
            <CardTitle>Registrar cobranza</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
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
            <Input
              type="date"
              value={form.paymentDate}
              onChange={(event) => setForm((prev) => ({ ...prev, paymentDate: event.target.value }))}
            />
            <Button className="rounded-2xl" disabled={saving || !form.contractId} onClick={registerCollection}>
              {saving ? "Guardando..." : "Registrar cobranza"}
            </Button>
            {feedback ? <p className="text-sm text-muted-foreground">{feedback}</p> : null}
          </CardContent>
        </Card>

        <Card className="rounded-[28px] border-0 shadow-sm">
          <CardHeader>
            <CardTitle>Cobranzas recientes</CardTitle>
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
                    <p className="text-sm font-medium">{item.status}</p>
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

function EmptyBox({ text }: { text: string }) {
  return <div className="rounded-2xl border border-dashed bg-background p-4 text-sm text-muted-foreground">{text}</div>;
}
