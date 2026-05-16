"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  ArrowRight,
  Banknote,
  CalendarClock,
  CircleDollarSign,
  FileClock,
  Home,
  Landmark,
  RefreshCcw,
  Search,
  UserRound,
  WalletCards,
  type LucideIcon,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { OwnerRosterSummary, RentalCollectionSummary, TenantRosterSummary } from "@/lib/operations-types";
import type { LeaseRosterItem } from "@/lib/props-data";
import type { OwnerSettlementSummary } from "@/lib/rental-types";
import { cn, formatMoney, formatShortDate } from "@/lib/utils";

type OperationsOverviewProps = {
  leases: LeaseRosterItem[];
  owners: OwnerRosterSummary[];
  tenants: TenantRosterSummary[];
  collections: RentalCollectionSummary[];
  settlements: OwnerSettlementSummary[];
  delinquentCount: number;
};

type ControlTab = "contratos" | "propiedades" | "inquilinos" | "propietarios";

type ControlRow = {
  id: string;
  dueLabel: string;
  dueHint: string;
  primary: string;
  secondary: string;
  collectionLabel: string;
  collectionHint: string;
  settlementLabel: string;
  settlementHint: string;
  href: string;
  searchable: string;
};

const tabs: Array<{ key: ControlTab; label: string }> = [
  { key: "contratos", label: "Contratos" },
  { key: "propiedades", label: "Propiedades" },
  { key: "inquilinos", label: "Inquilinos" },
  { key: "propietarios", label: "Propietarios" },
];

const statusTone: Record<string, string> = {
  Cobrada: "bg-emerald-50 text-emerald-700 border-emerald-200",
  Pendiente: "bg-amber-50 text-amber-700 border-amber-200",
  Parcial: "bg-blue-50 text-blue-700 border-blue-200",
  Mora: "bg-rose-50 text-rose-700 border-rose-200",
  Borrador: "bg-slate-50 text-slate-700 border-slate-200",
  Emitida: "bg-blue-50 text-blue-700 border-blue-200",
  Pagada: "bg-emerald-50 text-emerald-700 border-emerald-200",
};

function uniqueBy<T>(items: T[], getKey: (item: T) => string) {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = getKey(item);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function normalizeSearch(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function getDaysUntil(value: string) {
  const today = new Date();
  const target = new Date(`${value}T00:00:00`);
  if (Number.isNaN(target.getTime())) return null;
  today.setHours(0, 0, 0, 0);
  return Math.ceil((target.getTime() - today.getTime()) / 86_400_000);
}

function getCollectionHint(collection?: RentalCollectionSummary) {
  if (!collection) return "Sin cobranza cargada";
  const remaining = Math.max(0, collection.expectedRent - collection.collectedAmount);
  if (collection.status === "Cobrada") return `Cobrado ${formatMoney(collection.collectedAmount, "ARS")}`;
  if (remaining > 0) return `Saldo ${formatMoney(remaining, "ARS")}`;
  return collection.collectionMonth;
}

function getSettlementHint(settlement?: OwnerSettlementSummary) {
  if (!settlement) return "Sin liquidacion emitida";
  return `${settlement.settlementMonth} · ${formatMoney(settlement.ownerPayoutAmount, "ARS")}`;
}

function OperationsActionCard({
  href,
  title,
  description,
  value,
  icon: Icon,
}: {
  href: string;
  title: string;
  description: string;
  value: string;
  icon: LucideIcon;
}) {
  return (
    <Link
      href={href}
      className="group rounded-[24px] border bg-background p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex size-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <Icon className="size-5" />
        </div>
        <ArrowRight className="size-4 text-muted-foreground transition group-hover:translate-x-0.5 group-hover:text-primary" />
      </div>
      <p className="mt-4 text-sm font-medium text-muted-foreground">{title}</p>
      <p className="mt-1 text-2xl font-semibold tracking-tight">{value}</p>
      <p className="mt-1.5 text-sm leading-5 text-muted-foreground">{description}</p>
    </Link>
  );
}

function StatusBadge({ label }: { label: string }) {
  return (
    <span className={cn("rounded-full border px-2 py-0.5 text-xs font-medium", statusTone[label] ?? "bg-muted text-muted-foreground")}>
      {label}
    </span>
  );
}

export function OperationsOverview({
  leases,
  owners,
  tenants,
  collections,
  settlements,
  delinquentCount,
}: OperationsOverviewProps) {
  const [activeTab, setActiveTab] = useState<ControlTab>("contratos");
  const [search, setSearch] = useState("");

  const latestCollectionByContract = useMemo(() => {
    const map = new Map<string, RentalCollectionSummary>();
    collections.forEach((collection) => {
      if (!map.has(collection.contractId)) map.set(collection.contractId, collection);
    });
    return map;
  }, [collections]);

  const latestSettlementByContract = useMemo(() => {
    const map = new Map<string, OwnerSettlementSummary>();
    settlements.forEach((settlement) => {
      if (!map.has(settlement.contractId)) map.set(settlement.contractId, settlement);
    });
    return map;
  }, [settlements]);

  const activeLeases = leases.filter((lease) => lease.status === "Activo");
  const propertyRows = uniqueBy(activeLeases, (lease) => lease.propertyId);
  const pendingCollections = collections.filter((collection) => collection.status !== "Cobrada").length;
  const pendingSettlements = settlements.filter((settlement) => settlement.status !== "Pagada").length;
  const contractsToReview = activeLeases.filter((lease) => {
    const days = getDaysUntil(lease.nextAdjustmentDate);
    return days !== null && days >= 0 && days <= 45;
  }).length;

  const actionCards = [
    {
      href: "/caja",
      title: "Estado de caja",
      value: `${pendingCollections} pendientes`,
      description: "Cobros, egresos y movimientos del dia.",
      icon: WalletCards,
    },
    {
      href: "/morosos",
      title: "Reporte de morosos",
      value: String(delinquentCount),
      description: "Deudas con punitorios y mensajes sugeridos.",
      icon: CircleDollarSign,
    },
    {
      href: "/propietarios",
      title: "Liquidaciones pendientes",
      value: String(pendingSettlements),
      description: "Propietarios con liquidacion por cerrar.",
      icon: FileClock,
    },
    {
      href: "/cobranzas",
      title: "Proximo periodo",
      value: "Preparar",
      description: "Cobranzas y avisos del mes entrante.",
      icon: CalendarClock,
    },
    {
      href: "/alquileres",
      title: "Contratos a revisar",
      value: String(contractsToReview),
      description: "Ajustes, vencimientos y datos incompletos.",
      icon: RefreshCcw,
    },
    {
      href: "/transferencias",
      title: "Pagos a propietarios",
      value: "Controlar",
      description: "Pagos a propietarios y comprobantes.",
      icon: Landmark,
    },
  ];

  const rows = useMemo<ControlRow[]>(() => {
    if (activeTab === "propiedades") {
      return propertyRows.map((lease) => {
        const collection = latestCollectionByContract.get(lease.contractId);
        const settlement = latestSettlementByContract.get(lease.contractId);
        return {
          id: `property-${lease.propertyId}`,
          dueLabel: lease.status,
          dueHint: `Ajuste ${formatShortDate(lease.nextAdjustmentDate)}`,
          primary: lease.propertyTitle,
          secondary: lease.exactAddress || lease.propertyLocation,
          collectionLabel: lease.tenantName || "Sin inquilino",
          collectionHint: getCollectionHint(collection),
          settlementLabel: lease.ownerName || "Sin propietario",
          settlementHint: getSettlementHint(settlement),
          href: "/propiedades",
          searchable: `${lease.propertyTitle} ${lease.propertyLocation} ${lease.exactAddress} ${lease.tenantName} ${lease.ownerName ?? ""}`,
        };
      });
    }

    if (activeTab === "inquilinos") {
      return tenants.map((tenant) => {
        const collection = latestCollectionByContract.get(tenant.contractId);
        return {
          id: `tenant-${tenant.contractId}-${tenant.tenantName}`,
          dueLabel: tenant.latestCollectionStatus ?? "Sin estado",
          dueHint: tenant.latestCollectionMonth ?? "Sin periodo cargado",
          primary: tenant.tenantName,
          secondary: tenant.propertyTitle,
          collectionLabel: collection?.status ?? "Sin cobranza",
          collectionHint: getCollectionHint(collection),
          settlementLabel: formatMoney(tenant.currentRent, "ARS"),
          settlementHint: `Proximo ajuste ${formatShortDate(tenant.nextAdjustmentDate)}`,
          href: "/inquilinos",
          searchable: `${tenant.tenantName} ${tenant.propertyTitle} ${tenant.propertyLocation}`,
        };
      });
    }

    if (activeTab === "propietarios") {
      return owners.map((owner) => {
        const settlement = latestSettlementByContract.get(owner.contractId);
        return {
          id: `owner-${owner.contractOwnerId ?? owner.contractId}-${owner.ownerName}`,
          dueLabel: owner.latestSettlementMonth ?? "Sin liquidar",
          dueHint: owner.latestOwnerPayoutAmount ? formatMoney(owner.latestOwnerPayoutAmount, "ARS") : "Sin pago registrado",
          primary: owner.ownerName,
          secondary: owner.propertyTitle,
          collectionLabel: `${owner.participationPercent}% participacion`,
          collectionHint: `Alquiler ${formatMoney(owner.currentRent, "ARS")}`,
          settlementLabel: settlement?.status ?? "Pendiente",
          settlementHint: getSettlementHint(settlement),
          href: "/propietarios",
          searchable: `${owner.ownerName} ${owner.propertyTitle} ${owner.propertyLocation}`,
        };
      });
    }

    return activeLeases.map((lease) => {
      const collection = latestCollectionByContract.get(lease.contractId);
      const settlement = latestSettlementByContract.get(lease.contractId);
      const days = getDaysUntil(lease.nextAdjustmentDate);
      const dueHint =
        days === null
          ? "Fecha sin validar"
          : days < 0
            ? `Vencido hace ${Math.abs(days)} dias`
            : `Faltan ${days} dias`;

      return {
        id: `lease-${lease.contractId}`,
        dueLabel: formatShortDate(lease.nextAdjustmentDate),
        dueHint,
        primary: lease.propertyTitle,
        secondary: lease.exactAddress || lease.propertyLocation,
        collectionLabel: lease.tenantName,
        collectionHint: collection ? `${collection.status} · ${getCollectionHint(collection)}` : "Sin cobranza cargada",
        settlementLabel: lease.ownerName ?? "Sin propietario",
        settlementHint: getSettlementHint(settlement),
        href: "/alquileres",
        searchable: `${lease.propertyTitle} ${lease.propertyLocation} ${lease.exactAddress} ${lease.tenantName} ${lease.ownerName ?? ""}`,
      };
    });
  }, [
    activeLeases,
    activeTab,
    latestCollectionByContract,
    latestSettlementByContract,
    owners,
    propertyRows,
    tenants,
  ]);

  const filteredRows = rows.filter((row) => normalizeSearch(row.searchable).includes(normalizeSearch(search)));
  const counts: Record<ControlTab, number> = {
    contratos: activeLeases.length,
    propiedades: propertyRows.length,
    inquilinos: tenants.length,
    propietarios: owners.length,
  };

  return (
    <section className="space-y-4">
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {actionCards.map((card) => (
          <OperationsActionCard key={card.title} {...card} />
        ))}
      </div>

      <Card className="overflow-hidden rounded-[28px] border bg-card shadow-sm">
        <CardContent className="space-y-4 p-4 md:p-5">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex flex-wrap gap-2">
              {tabs.map((tab) => (
                <Button
                  key={tab.key}
                  type="button"
                  variant={activeTab === tab.key ? "default" : "outline"}
                  className="rounded-full"
                  onClick={() => setActiveTab(tab.key)}
                >
                  {tab.label}: {counts[tab.key]}
                </Button>
              ))}
            </div>

            <div className="relative w-full xl:max-w-md">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Buscar contrato, propiedad, inquilino o propietario..."
                className="h-11 rounded-2xl bg-background pl-10"
              />
            </div>
          </div>

          <div className="rounded-[24px] border bg-muted/20 p-3">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div className="flex items-start gap-3">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <Home className="size-5" />
                </div>
                <div>
                  <h3 className="font-semibold">Mesa operativa</h3>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">
                    Un resumen accionable de contratos, cobranzas y liquidaciones para operar sin abrir cinco pantallas.
                  </p>
                </div>
              </div>
              <Badge variant="outline" className="h-7 rounded-full bg-background px-3">
                {filteredRows.length} en vista
              </Badge>
            </div>
          </div>

          <div className="overflow-hidden rounded-[24px] border">
            <div className="hidden grid-cols-[1.2fr_1.7fr_1.6fr_1.6fr_80px] bg-muted/50 px-4 py-3 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground xl:grid">
              <span>Vence</span>
              <span>Direccion</span>
              <span>Cobranza</span>
              <span>Liquidacion</span>
              <span />
            </div>

            <div className="max-h-[420px] overflow-auto">
              {filteredRows.length === 0 ? (
                <div className="p-6 text-sm text-muted-foreground">No encontramos resultados con ese filtro.</div>
              ) : (
                filteredRows.slice(0, 20).map((row) => (
                  <div
                    key={row.id}
                    className="grid gap-3 border-t bg-background p-4 first:border-t-0 xl:grid-cols-[1.2fr_1.7fr_1.6fr_1.6fr_80px] xl:items-center"
                  >
                    <div>
                      <p className="font-medium">{row.dueLabel}</p>
                      <p className="mt-1 text-sm text-muted-foreground">{row.dueHint}</p>
                    </div>

                    <div>
                      <p className="line-clamp-1 font-semibold">{row.primary}</p>
                      <p className="mt-1 line-clamp-1 text-sm text-muted-foreground">{row.secondary}</p>
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <UserRound className="size-4 text-muted-foreground" />
                        <p className="line-clamp-1 font-medium">{row.collectionLabel}</p>
                      </div>
                      <p className="mt-1 line-clamp-1 text-sm text-muted-foreground">{row.collectionHint}</p>
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <Banknote className="size-4 text-muted-foreground" />
                        <p className="line-clamp-1 font-medium">{row.settlementLabel}</p>
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                        <span className="line-clamp-1">{row.settlementHint}</span>
                        {statusTone[row.settlementLabel] ? <StatusBadge label={row.settlementLabel} /> : null}
                      </div>
                    </div>

                    <Link
                      href={row.href}
                      className="inline-flex h-8 w-fit items-center justify-center gap-1.5 rounded-full border px-2.5 text-sm font-medium transition-colors hover:bg-muted"
                    >
                      Abrir
                      <ArrowRight className="size-3.5" />
                    </Link>
                  </div>
                ))
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
