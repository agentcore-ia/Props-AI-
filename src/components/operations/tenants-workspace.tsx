"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Edit3, Save, Search, X } from "lucide-react";

import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { TenantRosterSummary } from "@/lib/operations-types";
import { formatMoney, formatShortDate } from "@/lib/utils";

export function TenantsWorkspace({ tenants }: { tenants: TenantRosterSummary[] }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    tenantName: "",
    tenantPhone: "",
    tenantEmail: "",
  });
  const [savingId, setSavingId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const filteredTenants = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return tenants;

    return tenants.filter((tenant) =>
      [tenant.tenantName, tenant.propertyTitle, tenant.propertyLocation]
        .join(" ")
        .toLowerCase()
        .includes(normalized)
    );
  }, [query, tenants]);

  function startEdit(tenant: TenantRosterSummary) {
    setEditingId(tenant.contractId);
    setForm({
      tenantName: tenant.tenantName,
      tenantPhone: tenant.tenantPhone,
      tenantEmail: tenant.tenantEmail ?? "",
    });
    setMessage(null);
  }

  function cancelEdit() {
    setEditingId(null);
    setMessage(null);
  }

  async function saveTenant(contractId: string) {
    setSavingId(contractId);
    setMessage(null);

    const response = await fetch("/api/admin/tenants", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        contractId,
        tenantName: form.tenantName,
        tenantPhone: form.tenantPhone,
        tenantEmail: form.tenantEmail || null,
      }),
    });
    const payload = (await response.json().catch(() => null)) as { error?: string } | null;
    setSavingId(null);

    if (!response.ok) {
      setMessage({
        type: "error",
        text: payload?.error ?? "No se pudieron guardar los datos del inquilino.",
      });
      return;
    }

    setEditingId(null);
    setMessage({ type: "success", text: "Datos del inquilino actualizados." });
    router.refresh();
  }

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
            tenants.filter(
              (tenant) =>
                new Date(tenant.nextAdjustmentDate).getTime() <=
                Date.now() + 15 * 24 * 60 * 60 * 1000
            ).length
          )}
        />
        <MiniCard
          label="Contratos pausados"
          value={String(tenants.filter((tenant) => tenant.contractStatus === "Pausado").length)}
        />
      </section>

      <Card className="rounded-[28px] border-0 shadow-sm">
        <CardHeader>
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <CardTitle>Base de inquilinos</CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">
                {filteredTenants.length} de {tenants.length} inquilinos
              </p>
            </div>
            <div className="relative w-full lg:max-w-sm">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Buscar por inquilino o propiedad..."
                className="h-11 rounded-2xl pl-10"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {message ? (
            <div
              className={`rounded-2xl border px-4 py-3 text-sm ${
                message.type === "success"
                  ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                  : "border-red-200 bg-red-50 text-red-700"
              }`}
            >
              {message.text}
            </div>
          ) : null}

          {filteredTenants.length > 0 ? (
            filteredTenants.map((tenant) => (
              <div key={tenant.contractId} className="rounded-2xl border bg-background p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold">{tenant.tenantName}</p>
                    <p className="text-sm text-muted-foreground">
                      {tenant.propertyTitle} - {tenant.propertyLocation}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-start justify-end gap-3">
                    <div className="text-right text-sm text-muted-foreground">
                      <p>{tenant.tenantPhone}</p>
                      <p>{tenant.tenantEmail || "Sin email"}</p>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      className="rounded-2xl"
                      onClick={() => startEdit(tenant)}
                    >
                      <Edit3 className="size-4" />
                      Editar
                    </Button>
                  </div>
                </div>

                {editingId === tenant.contractId ? (
                  <div className="mt-4 rounded-2xl border bg-muted/20 p-3">
                    <div className="grid gap-3 md:grid-cols-3">
                      <label className="space-y-1 text-sm">
                        <span className="font-medium">Nombre</span>
                        <Input
                          value={form.tenantName}
                          onChange={(event) =>
                            setForm((prev) => ({ ...prev, tenantName: event.target.value }))
                          }
                          placeholder="Nombre del inquilino"
                          className="rounded-2xl"
                        />
                      </label>
                      <label className="space-y-1 text-sm">
                        <span className="font-medium">WhatsApp</span>
                        <Input
                          value={form.tenantPhone}
                          onChange={(event) =>
                            setForm((prev) => ({ ...prev, tenantPhone: event.target.value }))
                          }
                          placeholder="Numero de contacto"
                          className="rounded-2xl"
                        />
                      </label>
                      <label className="space-y-1 text-sm">
                        <span className="font-medium">Email opcional</span>
                        <Input
                          value={form.tenantEmail}
                          onChange={(event) =>
                            setForm((prev) => ({ ...prev, tenantEmail: event.target.value }))
                          }
                          placeholder="mail@ejemplo.com"
                          className="rounded-2xl"
                        />
                      </label>
                    </div>
                    <div className="mt-3 flex flex-wrap justify-end gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        className="rounded-2xl"
                        onClick={cancelEdit}
                        disabled={savingId === tenant.contractId}
                      >
                        <X className="size-4" />
                        Cancelar
                      </Button>
                      <Button
                        type="button"
                        className="rounded-2xl"
                        onClick={() => void saveTenant(tenant.contractId)}
                        disabled={savingId === tenant.contractId}
                      >
                        <Save className="size-4" />
                        {savingId === tenant.contractId ? "Guardando..." : "Guardar cambios"}
                      </Button>
                    </div>
                  </div>
                ) : null}

                <div className="mt-3 grid gap-2 text-sm md:grid-cols-4">
                  <p>Alquiler: {formatMoney(tenant.currentRent, "ARS")}</p>
                  <p>Proximo ajuste: {formatShortDate(tenant.nextAdjustmentDate)}</p>
                  <p>Contrato: {tenant.contractStatus}</p>
                  <p>
                    Cobranza:{" "}
                    {tenant.latestCollectionStatus
                      ? `${tenant.latestCollectionStatus} - ${tenant.latestCollectionMonth ?? ""}`
                      : "sin registrar"}
                  </p>
                </div>
              </div>
            ))
          ) : (
            <EmptyBox
              text={
                tenants.length
                  ? "No encontramos inquilinos con esa busqueda."
                  : "Todavia no hay inquilinos activos en alquileres."
              }
            />
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
