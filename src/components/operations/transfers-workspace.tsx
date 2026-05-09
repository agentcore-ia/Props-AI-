"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { OwnerTransferSummary, OwnerRosterSummary } from "@/lib/operations-types";
import { formatMoney } from "@/lib/utils";

export function TransfersWorkspace({
  owners,
  transfers,
}: {
  owners: OwnerRosterSummary[];
  transfers: OwnerTransferSummary[];
}) {
  const router = useRouter();
  const [form, setForm] = useState({
    contractId: owners[0]?.contractId ?? "",
    amount: owners[0]?.latestOwnerPayoutAmount ? String(owners[0].latestOwnerPayoutAmount) : "",
    destinationLabel: owners[0]?.ownerEmail || owners[0]?.ownerPhone || "",
    transferDate: new Date().toISOString().slice(0, 10),
  });
  const [feedback, setFeedback] = useState<string | null>(null);

  async function createTransfer() {
    setFeedback(null);
    const response = await fetch("/api/admin/owner-transfers", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        contractId: form.contractId,
        amount: Number(form.amount),
        destinationLabel: form.destinationLabel,
        transferDate: form.transferDate,
      }),
    });
    const payload = await response.json().catch(() => null);
    if (!response.ok) {
      setFeedback(payload?.error ?? "No se pudo registrar la transferencia.");
      return;
    }
    setFeedback("Transferencia registrada.");
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Transferencias" description="Programa y controla giros a propietarios desde las liquidaciones emitidas." />

      <section className="grid gap-4 xl:grid-cols-[0.85fr_1.15fr]">
        <Card className="rounded-[28px] border-0 shadow-sm">
          <CardHeader><CardTitle>Nueva transferencia</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <select
              className="flex h-11 w-full rounded-xl border bg-background px-3 text-sm outline-none"
              value={form.contractId}
              onChange={(e) => {
                const owner = owners.find((item) => item.contractId === e.target.value);
                setForm((prev) => ({
                  ...prev,
                  contractId: e.target.value,
                  amount: owner?.latestOwnerPayoutAmount ? String(owner.latestOwnerPayoutAmount) : prev.amount,
                  destinationLabel: owner?.ownerEmail || owner?.ownerPhone || prev.destinationLabel,
                }));
              }}
            >
              {owners.map((owner) => (
                <option key={owner.contractId} value={owner.contractId}>
                  {owner.ownerName} · {owner.propertyTitle}
                </option>
              ))}
            </select>
            <Input placeholder="Monto" value={form.amount} onChange={(e) => setForm((p) => ({ ...p, amount: e.target.value }))} />
            <Input placeholder="Destino" value={form.destinationLabel} onChange={(e) => setForm((p) => ({ ...p, destinationLabel: e.target.value }))} />
            <Input type="date" value={form.transferDate} onChange={(e) => setForm((p) => ({ ...p, transferDate: e.target.value }))} />
            <Button className="rounded-2xl" disabled={!form.contractId} onClick={createTransfer}>Registrar transferencia</Button>
            {feedback ? <p className="text-sm text-muted-foreground">{feedback}</p> : null}
          </CardContent>
        </Card>

        <Card className="rounded-[28px] border-0 shadow-sm">
          <CardHeader><CardTitle>Transferencias recientes</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {transfers.length > 0 ? (
              transfers.map((transfer) => (
                <div key={transfer.id} className="rounded-2xl border bg-background p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold">{transfer.ownerName}</p>
                      <p className="text-sm text-muted-foreground">
                        {transfer.propertyTitle} · {transfer.destinationLabel || "Sin destino"}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">{formatMoney(transfer.amount, "ARS")}</p>
                      <p className="text-sm text-muted-foreground">{transfer.status}</p>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <EmptyBox text="Todavia no hay transferencias registradas." />
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
