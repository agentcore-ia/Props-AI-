"use client";

import { useMemo, useState } from "react";
import { AlertCircle, ImageIcon, MessageSquareQuote, TrendingUp } from "lucide-react";

import type { Agency, Property } from "@/lib/mock-data";
import type { CurrentUserContext } from "@/lib/auth/current-user";
import type { CrmLeadSummary, VisitAppointmentSummary } from "@/lib/crm-types";
import { derivePropertyHealth } from "@/lib/crm-insights";
import { EmptyState } from "@/components/layout/empty-state";
import { PageHeader } from "@/components/layout/page-header";
import { PropertyCard } from "@/components/props/property-card";
import { PropertyFormDialog } from "@/components/props/property-form-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export function PropertiesWorkspace({
  agencies,
  properties,
  leads,
  visits,
  currentUser,
}: {
  agencies: Agency[];
  properties: Property[];
  leads: CrmLeadSummary[];
  visits: VisitAppointmentSummary[];
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

  const filteredLeads = useMemo(() => {
    if (filter === "all") return leads;
    return leads.filter((lead) => lead.agencySlug === filter);
  }, [filter, leads]);

  const filteredVisits = useMemo(() => {
    if (filter === "all") return visits;
    const propertyIds = new Set(filteredProperties.map((property) => property.id));
    return visits.filter((visit) => visit.propertyId && propertyIds.has(visit.propertyId));
  }, [filter, filteredProperties, visits]);

  const healthItems = useMemo(
    () => derivePropertyHealth(filteredProperties, filteredLeads, filteredVisits),
    [filteredLeads, filteredProperties, filteredVisits]
  );

  return (
    <div className="space-y-8">
      <PageHeader
        title="Propiedades"
        description="Gestiona publicaciones, edita fichas y revisa que necesita cada propiedad para convertir mejor."
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

      {healthItems.length > 0 ? (
        <section className="rounded-[30px] border bg-card p-5 shadow-sm">
          <div className="flex items-center gap-2">
            <TrendingUp className="size-5 text-primary" />
            <div>
              <h3 className="text-lg font-semibold">Salud comercial de publicaciones</h3>
              <p className="text-sm text-muted-foreground">
                Detecta rapido que ficha necesita mejores fotos, ajuste de precio o mas seguimiento.
              </p>
            </div>
          </div>
          <div className="mt-5 grid gap-4 xl:grid-cols-3">
            {healthItems.slice(0, 6).map((item) => (
              <article key={item.propertyId} className="rounded-[24px] border bg-background p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium">{item.title}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{item.location}</p>
                  </div>
                  <Badge className={`border-0 ${item.healthTone}`}>{item.healthLabel}</Badge>
                </div>
                <div className="mt-4 grid gap-3 text-sm text-muted-foreground sm:grid-cols-3">
                  <div className="rounded-2xl border p-3">
                    <div className="flex items-center gap-2">
                      <MessageSquareQuote className="size-4 text-primary" />
                      Leads
                    </div>
                    <p className="mt-2 font-medium text-foreground">{item.leadsCount}</p>
                  </div>
                  <div className="rounded-2xl border p-3">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="size-4 text-primary" />
                      Visitas
                    </div>
                    <p className="mt-2 font-medium text-foreground">{item.visitsCount}</p>
                  </div>
                  <div className="rounded-2xl border p-3">
                    <div className="flex items-center gap-2">
                      <ImageIcon className="size-4 text-primary" />
                      Fotos
                    </div>
                    <p className="mt-2 font-medium text-foreground">{item.imageCount}</p>
                  </div>
                </div>
                <div className="mt-4 rounded-2xl border bg-muted/20 p-4 text-sm text-muted-foreground">
                  <div className="mb-2 flex items-center gap-2 font-medium text-foreground">
                    <AlertCircle className="size-4 text-primary" />
                    Recomendacion
                  </div>
                  <ul className="space-y-1">
                    {item.recommendations.map((recommendation) => (
                      <li key={recommendation}>- {recommendation}</li>
                    ))}
                  </ul>
                </div>
              </article>
            ))}
          </div>
        </section>
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
          title="Todavia no hay propiedades cargadas"
          description="Cuando publiques una propiedad, la vas a ver aca junto con su seguimiento comercial y contractual."
        />
      )}
    </div>
  );
}
