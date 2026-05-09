"use client";

import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { TenantRosterSummary } from "@/lib/operations-types";
import { formatMoney, formatShortDate } from "@/lib/utils";

export function TenantsWorkspace({ tenants }: { tenants: TenantRosterSummary[] }) {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Inquilinos"
        description="Todos los inquilinos activos con su propiedad, proximo ajuste y estado de cobranza mas reciente."
      />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MiniCard label="Inquilinos activos" value={String(tenants.length)} />
        <MiniCard
          label="Con cobranza registrada"
          value={String(tenants.filter((tenant) => tenant.latestCollectionStatus).length)}
        />
        <MiniCard
          label="Con ajuste proximo"
          value={String(
            tenants.filter((tenant) => new Date(tenant.nextAdjustmentDate).getTime() <= Date.now() + 15 * 24 * 60 * 60 * 1000)
              .length
          )}
        />
        <MiniCard
          label="Contratos pausados"
          value={String(tenants.filter((tenant) => tenant.contractStatus === "Pausado").length)}
        />
      </section>

      <Card className="rounded-[28px] border-0 shadow-sm">
        <CardHeader>
          <CardTitle>Base de inquilinos</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {tenants.length > 0 ? (
            tenants.map((tenant) => (
              <div key={tenant.contractId} className="rounded-2xl border bg-background p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold">{tenant.tenantName}</p>
                    <p className="text-sm text-muted-foreground">
                      {tenant.propertyTitle} · {tenant.propertyLocation}
                    </p>
                  </div>
                  <div className="text-right text-sm text-muted-foreground">
                    <p>{tenant.tenantPhone}</p>
                    <p>{tenant.tenantEmail || "Sin email"}</p>
                  </div>
                </div>
                <div className="mt-3 grid gap-2 text-sm md:grid-cols-4">
                  <p>Alquiler: {formatMoney(tenant.currentRent, "ARS")}</p>
                  <p>Proximo ajuste: {formatShortDate(tenant.nextAdjustmentDate)}</p>
                  <p>Contrato: {tenant.contractStatus}</p>
                  <p>
                    Cobranza:{" "}
                    {tenant.latestCollectionStatus
                      ? `${tenant.latestCollectionStatus} · ${tenant.latestCollectionMonth ?? ""}`
                      : "sin registrar"}
                  </p>
                </div>
              </div>
            ))
          ) : (
            <EmptyBox text="Todavia no hay inquilinos activos en alquileres." />
          )}
        </CardContent>
      </Card>
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
