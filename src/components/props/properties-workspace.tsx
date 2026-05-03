"use client";

import { useMemo, useState } from "react";

import { EmptyState } from "@/components/layout/empty-state";
import { PageHeader } from "@/components/layout/page-header";
import { PropertyCard } from "@/components/props/property-card";
import { PropertyFormDialog } from "@/components/props/property-form-dialog";
import { Button } from "@/components/ui/button";
import { usePropsStore } from "@/lib/store/use-props-store";

export function PropertiesWorkspace() {
  const { agencies, properties } = usePropsStore();
  const [filter, setFilter] = useState<string>("all");

  const filteredProperties = useMemo(() => {
    if (filter === "all") return properties;
    return properties.filter((property) => property.tenantSlug === filter);
  }, [filter, properties]);

  return (
    <div className="space-y-8">
      <PageHeader
        title="Propiedades"
        description="Inventario multi-tenant. Cada propiedad queda asociada a una inmobiliaria y se publica automaticamente en su catalogo."
        action={<PropertyFormDialog agencies={agencies} />}
      />

      <div className="flex flex-wrap gap-2">
        <Button
          variant={filter === "all" ? "default" : "outline"}
          className="rounded-2xl"
          onClick={() => setFilter("all")}
        >
          Todas
        </Button>
        {agencies.map((agency) => (
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

      {filteredProperties.length > 0 ? (
        <section className="grid gap-4 lg:grid-cols-2 2xl:grid-cols-3">
          {filteredProperties.map((property) => (
            <PropertyCard key={property.id} property={property} />
          ))}
        </section>
      ) : (
        <EmptyState
          title="No hay propiedades para este cliente"
          description="Cuando cargues una propiedad y la vincules a una inmobiliaria, aparecera en el dashboard y en su subpagina publica."
        />
      )}
    </div>
  );
}
