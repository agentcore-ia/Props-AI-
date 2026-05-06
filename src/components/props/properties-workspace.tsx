"use client";

import { useMemo, useState } from "react";

import type { Agency, Property } from "@/lib/mock-data";
import type { CurrentUserContext } from "@/lib/auth/current-user";
import { EmptyState } from "@/components/layout/empty-state";
import { PageHeader } from "@/components/layout/page-header";
import { PropertyCard } from "@/components/props/property-card";
import { PropertyFormDialog } from "@/components/props/property-form-dialog";
import { Button } from "@/components/ui/button";

export function PropertiesWorkspace({
  agencies,
  properties,
  currentUser,
}: {
  agencies: Agency[];
  properties: Property[];
  currentUser: CurrentUserContext;
}) {
  const [filter, setFilter] = useState<string>(
    currentUser.profile.role !== "superadmin"
      ? currentUser.profile.agency_slug ?? "all"
      : "all"
  );

  const visibleAgencies =
    currentUser.profile.role !== "superadmin"
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
        description="Gestiona publicaciones y mantén actualizado el portafolio de la inmobiliaria."
        action={<PropertyFormDialog agencies={visibleAgencies} currentUser={currentUser} />}
      />

      {currentUser.profile.role === "superadmin" ? (
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
            <PropertyCard
              key={property.id}
              property={property}
              agencies={visibleAgencies}
              currentUser={currentUser}
            />
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
