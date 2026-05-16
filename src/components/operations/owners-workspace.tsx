"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, CheckCircle2, Search, Send } from "lucide-react";

import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { OwnerRosterSummary } from "@/lib/operations-types";
import type { OwnerSettlementItemSummary, OwnerSettlementSummary } from "@/lib/rental-types";
import { formatMoney } from "@/lib/utils";

export function OwnersWorkspace({
  owners,
  settlements,
  settlementItems,
}: {
  owners: OwnerRosterSummary[];
  settlements: OwnerSettlementSummary[];
  settlementItems: OwnerSettlementItemSummary[];
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [savingContractId, setSavingContractId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const currentMonth = new Date().toISOString().slice(0, 7);

  const filteredOwners = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return owners;

    return owners.filter((owner) =>
      [owner.ownerName, owner.propertyTitle, owner.propertyLocation]
        .join(" ")
        .toLowerCase()
        .includes(normalized)
    );
  }, [owners, query]);

  const pendingOwners = owners.filter((owner) => owner.latestSettlementMonth !== currentMonth);
  const totalLastPayout = settlements.reduce((sum, item) => sum + item.ownerPayoutAmount, 0);
  const totalManagementFee = settlements.reduce((sum, item) => sum + item.managementFeeAmount, 0);

  async function createSettlement(owner: OwnerRosterSummary) {
    setSavingContractId(owner.contractId);
    setFeedback(null);

    const response = await fetch("/api/admin/owner-settlements", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        contractId: owner.contractId,
        settlementMonth: currentMonth,
      }),
    });
    const payload = await response.json().catch(() => null);
    setSavingContractId(null);

    if (!response.ok) {
      setFeedback(payload?.error ?? "No se pudo generar la liquidacion.");
      return;
    }

    setFeedback(
      `Liquidacion generada para ${payload?.processed ?? 0} propietario${
        payload?.processed === 1 ? "" : "s"
      } de ${owner.propertyTitle}.`
    );
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Liquidaciones a propietarios"
        description="Genera en un clic cuanto corresponde pagarle a cada propietario despues de cobrar el alquiler."
      />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MiniCard label="Propietarios activos" value={String(owners.length)} />
        <MiniCard label="Pendientes este mes" value={String(pendingOwners.length)} />
        <MiniCard label="Neto liquidado" value={formatMoney(totalLastPayout, "ARS")} />
        <MiniCard label="Comision administrada" value={formatMoney(totalManagementFee, "ARS")} />
      </section>

      <section className="grid gap-4 2xl:grid-cols-[1.1fr_0.9fr]">
        <Card className="rounded-[28px] border-0 shadow-sm">
          <CardHeader>
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <CardTitle>Liquidar este mes</CardTitle>
                <p className="mt-1 text-sm text-muted-foreground">
                  Props calcula participacion, comision y gastos. Vos solo revisas y confirmas.
                </p>
              </div>
              <div className="relative w-full lg:max-w-sm">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Buscar por propietario o propiedad..."
                  className="h-11 rounded-2xl pl-10"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {feedback ? (
              <div className="rounded-2xl border bg-primary/5 p-3 text-sm text-muted-foreground">
                {feedback}
              </div>
            ) : null}

            {filteredOwners.length > 0 ? (
              filteredOwners.map((owner) => {
                const preview = getOwnerPreview(owner);
                const alreadySettled = owner.latestSettlementMonth === currentMonth;
                const saving = savingContractId === owner.contractId;

                return (
                  <div
                    key={`${owner.contractId}-${owner.contractOwnerId ?? owner.ownerName}`}
                    className="rounded-2xl border bg-background p-4"
                  >
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-semibold">{owner.ownerName}</p>
                          {alreadySettled ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700">
                              <CheckCircle2 className="size-3" />
                              Liquidado
                            </span>
                          ) : (
                            <span className="rounded-full bg-amber-50 px-2 py-1 text-xs font-medium text-amber-700">
                              Pendiente
                            </span>
                          )}
                        </div>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {owner.propertyTitle} · {owner.propertyLocation}
                        </p>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <Button
                          className="rounded-2xl"
                          disabled={saving}
                          onClick={() => createSettlement(owner)}
                        >
                          {saving ? "Generando..." : alreadySettled ? "Recalcular" : "Generar liquidacion"}
                        </Button>
                        <Link
                          href="/transferencias"
                          className="inline-flex h-8 items-center justify-center gap-1.5 rounded-2xl border px-2.5 text-sm font-medium transition hover:bg-muted"
                        >
                          Pagar
                          <ArrowRight className="size-3.5" />
                        </Link>
                      </div>
                    </div>

                    <div className="mt-4 grid gap-2 text-sm md:grid-cols-4">
                      <Info label="Participacion" value={`${owner.participationPercent}%`} />
                      <Info label="Base" value={formatMoney(preview.gross, "ARS")} />
                      <Info label="Descuentos" value={formatMoney(preview.discounts, "ARS")} />
                      <Info label="Neto a pagar" value={formatMoney(preview.payout, "ARS")} strong />
                    </div>
                  </div>
                );
              })
            ) : (
              <EmptyBox
                text={
                  owners.length
                    ? "No encontramos propietarios con esa busqueda."
                    : "Todavia no hay propietarios configurados en contratos de alquiler."
                }
              />
            )}
          </CardContent>
        </Card>

        <Card className="rounded-[28px] border-0 shadow-sm">
          <CardHeader>
            <CardTitle>Liquidaciones listas</CardTitle>
            <p className="text-sm text-muted-foreground">
              Ultimos calculos emitidos. Desde aca el siguiente paso es registrar la transferencia.
            </p>
          </CardHeader>
          <CardContent className="space-y-3">
            {settlements.length > 0 ? (
              settlements.map((settlement) => {
                const items = settlementItems.filter((item) => item.settlementId === settlement.id);
                return (
                  <div key={settlement.id} className="rounded-2xl border bg-background p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold">{settlement.ownerName}</p>
                        <p className="text-sm text-muted-foreground">
                          {settlement.propertyTitle} · {settlement.settlementMonth}
                        </p>
                      </div>
                      <span className="rounded-full bg-muted px-3 py-1 text-sm">{settlement.status}</span>
                    </div>
                    <div className="mt-3 grid gap-2 text-sm md:grid-cols-2">
                      <Info label="Neto" value={formatMoney(settlement.ownerPayoutAmount, "ARS")} strong />
                      <Info label="Comision" value={formatMoney(settlement.managementFeeAmount, "ARS")} />
                    </div>
                    {items.length > 0 ? (
                      <div className="mt-3 rounded-xl border bg-muted/20 p-3 text-sm text-muted-foreground">
                        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-primary/70">
                          Ajustes particulares
                        </p>
                        <div className="space-y-1">
                          {items.slice(0, 4).map((item) => (
                            <div key={item.id} className="flex items-center justify-between gap-3">
                              <span>
                                {item.label} · {item.effect}
                              </span>
                              <span>{formatMoney(item.amount, "ARS")}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : null}
                    <Link
                      href="/transferencias"
                      className="mt-3 inline-flex items-center gap-2 text-sm font-medium text-primary"
                    >
                      Registrar pago al propietario
                      <Send className="size-3.5" />
                    </Link>
                  </div>
                );
              })
            ) : (
              <EmptyBox text="Todavia no hay liquidaciones emitidas para propietarios." />
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

function getOwnerPreview(owner: OwnerRosterSummary) {
  const ratio = owner.participationPercent / 100;
  const gross = owner.currentRent * ratio;
  const managementFee = gross * (owner.managementFeePercent / 100);
  const fixedCosts = owner.monthlyOwnerCosts * ratio;
  const discounts = managementFee + fixedCosts;
  const payout = Math.max(0, gross - discounts);
  return { gross, discounts, payout };
}

function MiniCard({ label, value }: { label: string; value: string }) {
  return (
    <Card className="rounded-[24px] border-0 shadow-sm">
      <CardContent className="pt-4">
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="mt-3 text-3xl font-semibold">{value}</p>
      </CardContent>
    </Card>
  );
}

function Info({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="rounded-xl bg-muted/40 p-3">
      <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">{label}</p>
      <p className={strong ? "mt-1 font-semibold text-primary" : "mt-1 font-semibold"}>{value}</p>
    </div>
  );
}

function EmptyBox({ text }: { text: string }) {
  return <div className="rounded-2xl border border-dashed bg-background p-4 text-sm text-muted-foreground">{text}</div>;
}
