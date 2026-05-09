"use client";

import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatMoney } from "@/lib/utils";
import type { OwnerRosterSummary } from "@/lib/operations-types";
import type { OwnerSettlementSummary } from "@/lib/rental-types";

export function OwnersWorkspace({
  owners,
  settlements,
}: {
  owners: OwnerRosterSummary[];
  settlements: OwnerSettlementSummary[];
}) {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Propietarios"
        description="Vista simple para seguir propietarios activos, alquiler administrado y ultima liquidacion emitida."
      />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MiniCard label="Propietarios activos" value={String(owners.length)} />
        <MiniCard label="Con liquidacion emitida" value={String(settlements.length)} />
        <MiniCard
          label="Neto ultimo ciclo"
          value={formatMoney(settlements.reduce((sum, item) => sum + item.ownerPayoutAmount, 0), "ARS")}
        />
        <MiniCard
          label="Comision administrada"
          value={formatMoney(settlements.reduce((sum, item) => sum + item.managementFeeAmount, 0), "ARS")}
        />
      </section>

      <section className="grid gap-4 2xl:grid-cols-[1.1fr_0.9fr]">
        <Card className="rounded-[28px] border-0 shadow-sm">
          <CardHeader>
            <CardTitle>Relacion con propietarios</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {owners.length > 0 ? (
              owners.map((owner) => (
                <div key={owner.contractId} className="rounded-2xl border bg-background p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold">{owner.ownerName}</p>
                      <p className="text-sm text-muted-foreground">
                        {owner.propertyTitle} · {owner.propertyLocation}
                      </p>
                    </div>
                    <div className="text-right text-sm text-muted-foreground">
                      <p>Comision {owner.managementFeePercent}%</p>
                      <p>Gastos fijos {formatMoney(owner.monthlyOwnerCosts, "ARS")}</p>
                    </div>
                  </div>
                  <div className="mt-3 grid gap-2 text-sm text-muted-foreground md:grid-cols-3">
                    <p>{owner.ownerPhone || "Sin WhatsApp"}</p>
                    <p>{owner.ownerEmail || "Sin email"}</p>
                    <p>
                      Ultima liquidacion:{" "}
                      {owner.latestSettlementMonth
                        ? `${owner.latestSettlementMonth} · ${formatMoney(owner.latestOwnerPayoutAmount ?? 0, "ARS")}`
                        : "todavia sin emitir"}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <EmptyBox text="Todavia no hay propietarios configurados en contratos de alquiler." />
            )}
          </CardContent>
        </Card>

        <Card className="rounded-[28px] border-0 shadow-sm">
          <CardHeader>
            <CardTitle>Liquidaciones recientes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {settlements.length > 0 ? (
              settlements.map((settlement) => (
                <div key={settlement.id} className="rounded-2xl border bg-background p-4">
                  <p className="font-semibold">{settlement.ownerName}</p>
                  <p className="text-sm text-muted-foreground">
                    {settlement.propertyTitle} · {settlement.settlementMonth}
                  </p>
                  <div className="mt-3 grid gap-2 text-sm md:grid-cols-2">
                    <p>Neto: {formatMoney(settlement.ownerPayoutAmount, "ARS")}</p>
                    <p>Estado: {settlement.status}</p>
                  </div>
                </div>
              ))
            ) : (
              <EmptyBox text="Todavia no hay liquidaciones emitidas para propietarios." />
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
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

function EmptyBox({ text }: { text: string }) {
  return <div className="rounded-2xl border border-dashed bg-background p-4 text-sm text-muted-foreground">{text}</div>;
}
