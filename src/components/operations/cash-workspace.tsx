"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { CashMovementSummary } from "@/lib/operations-types";
import { formatMoney } from "@/lib/utils";

export function CashWorkspace({ movements }: { movements: CashMovementSummary[] }) {
  const router = useRouter();
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

  return (
    <div className="space-y-6">
      <PageHeader title="Caja" description="Lleva ingresos, egresos y transferencias de la operacion diaria en una sola vista." />

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

function EmptyBox({ text }: { text: string }) {
  return <div className="rounded-2xl border border-dashed bg-background p-4 text-sm text-muted-foreground">{text}</div>;
}
