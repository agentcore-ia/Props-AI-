"use client";

import { useMemo, useState } from "react";

import type { Agency, Property } from "@/lib/mock-data";
import type { CurrentUserContext } from "@/lib/auth/current-user";
import type {
  RentalAdjustmentSummary,
  RentalDashboardSummary,
} from "@/lib/rental-types";
import { EmptyState } from "@/components/layout/empty-state";
import { PageHeader } from "@/components/layout/page-header";
import { PropertyCard } from "@/components/props/property-card";
import { PropertyFormDialog } from "@/components/props/property-form-dialog";
import { RentAutomationPanel } from "@/components/props/rent-automation-panel";
import { Button } from "@/components/ui/button";

export function PropertiesWorkspace({
  agencies,
  properties,
  currentUser,
  rentalSummary,
  recentAdjustments,
}: {
  agencies: Agency[];
  properties: Property[];
  currentUser: CurrentUserContext;
  rentalSummary: RentalDashboardSummary;
  recentAdjustments: RentalAdjustmentSummary[];
}) {
  const [filter, setFilter] = useState<string>(
    currentUser.profile.role === "agency_admin"
      ? currentUser.profile.agency_slug ?? "all"
      : "all"
  );

  const visibleAgencies =
    currentUser.profile.role === "agency_admin"
      ? agencies.filter((agency) => agency.slug === currentUser.profile.agency_slug)
      : agencies;

  const filteredProperties = useMemo(() => {
    if (filter === "all") return properties;
    return properties.filter((property) => property.tenantSlug === filter);
  }, [filter, properties]);

  return (
    <div className="space-y-8">
      <PageHeader
        title="Propiedades"
        description="Gestiona publicaciones, contratos y datos clave del portfolio desde una sola vista."
        action={<PropertyFormDialog agencies={visibleAgencies} currentUser={currentUser} />}
      />

      <RentAutomationPanel summary={rentalSummary} recentAdjustments={recentAdjustments} />

      {currentUser.profile.role !== "agency_admin" ? (
        <div className="flex flex-wrap gap-2">
          <Button
            variant={filter === "all" ? "default" : "outline"}
            className="rounded-2xl"
            onClick={() => setFilter("all")}
          >
            Todas
          </Button>
          {visibleAgencies.map((agency) => (
            <Button
              key={agency.id}
              variant={filter === agency.slug ? "default" : "outline"}
              className="rounded-2xl"
              onClick={() => setFilter(agency.slug)}
            >
              {agency.name}
            </Button>
          ))}
        </div>
      ) : null}

      {filteredProperties.length > 0 ? (
        <section className="grid gap-4 lg:grid-cols-2 2xl:grid-cols-3">
          {filteredProperties.map((property) => (
            <PropertyCard key={property.id} property={property} />
          ))}
        </section>
      ) : (
        <EmptyState
          title="Todavía no hay propiedades cargadas"
          description="Cuando publiques una propiedad, la vas a ver acá junto con su seguimiento comercial y contractual."
        />
      )}
    </div>
  );
}
