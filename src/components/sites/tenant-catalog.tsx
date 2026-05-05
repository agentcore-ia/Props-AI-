"use client";

import { useDeferredValue, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Building2, Camera, Globe, Mail, MapPin, Phone, Search } from "lucide-react";

import type { Agency, Property } from "@/lib/mock-data";
import { CatalogAssistant } from "@/components/sites/catalog-assistant";
import { CatalogInquiryForm } from "@/components/sites/catalog-inquiry-form";
import { TenantPropertyCard } from "@/components/sites/tenant-property-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const quickSearches = [
  "Palermo",
  "Venta con balcon",
  "Alquiler amoblado",
  "Casa con jardin",
];

export function TenantCatalog({
  agency,
  properties,
}: {
  agency: Agency | null;
  properties: Property[];
}) {
  const [operationFilter, setOperationFilter] = useState<"all" | Property["operation"]>("all");
  const [searchValue, setSearchValue] = useState("");
  const deferredSearch = useDeferredValue(searchValue);

  const filteredProperties = useMemo(() => {
    const query = deferredSearch.trim().toLowerCase();

    return properties.filter((property) => {
      const matchesOperation =
        operationFilter === "all" ? true : property.operation === operationFilter;

      if (!matchesOperation) {
        return false;
      }

      if (!query) {
        return true;
      }

      const searchable =
        `${property.title} ${property.location} ${property.exactAddress} ${property.description} ${property.operation} ${property.status} ${property.requirements} ${property.petsPolicy} ${property.amenities.join(" ")}`.toLowerCase();
      return searchable.includes(query);
    });
  }, [deferredSearch, operationFilter, properties]);

  const stats = {
    sale: properties.filter((property) => property.operation === "Venta").length,
    rent: properties.filter((property) => property.operation === "Alquiler").length,
  };
  const socialLinks = [
    agency?.websiteUrl ? { label: "Sitio web", href: agency.websiteUrl, icon: <Globe className="size-4" /> } : null,
    agency?.instagramUrl ? { label: "Instagram", href: agency.instagramUrl, icon: <Camera className="size-4" /> } : null,
    agency?.facebookUrl ? { label: "Facebook", href: agency.facebookUrl, icon: <Building2 className="size-4" /> } : null,
  ].filter(Boolean) as Array<{ label: string; href: string; icon: React.ReactNode }>;
  const initials = agency?.name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");

  if (!agency) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
        <div className="max-w-xl rounded-[32px] border bg-white p-8 text-center shadow-sm">
          <h1 className="text-2xl font-semibold">Inmobiliaria no encontrada</h1>
          <p className="mt-3 text-sm text-slate-600">
            Este subdominio todavia no fue provisionado o no existe en el entorno actual.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,rgba(239,246,255,0.95)_0%,rgba(248,250,252,1)_24%,rgba(255,255,255,1)_100%)]">
      <header className="border-b border-slate-200/80 bg-white/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1440px] flex-col gap-8 px-4 py-6 sm:px-6 lg:py-8 xl:px-8">
          <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
            <section className="overflow-hidden rounded-[32px] border border-slate-200 bg-white shadow-[0_24px_80px_-48px_rgba(15,23,42,0.45)]">
              <div className="grid gap-0 lg:grid-cols-[1.08fr_0.92fr]">
                <div className="flex flex-col justify-between px-5 py-6 sm:px-7 sm:py-7">
                  <div>
                    <div className="flex items-start gap-4">
                      <div className="flex size-16 shrink-0 items-center justify-center rounded-[22px] bg-blue-50 text-lg font-semibold text-blue-700 ring-1 ring-blue-100">
                        {initials || "PR"}
                      </div>
                      <div className="min-w-0">
                        <div className="inline-flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-blue-700">
                          <Building2 className="size-3.5" />
                          Perfil inmobiliario
                        </div>
                        <h1 className="mt-4 text-4xl font-semibold tracking-tight text-slate-950 md:text-5xl">
                          {agency.name}
                        </h1>
                        <p className="mt-3 max-w-2xl text-base leading-7 text-slate-600 md:text-lg">
                          {agency.tagline || `${agency.ownerName} y su equipo comercial te acompañan a encontrar la propiedad indicada.`}
                        </p>
                      </div>
                    </div>

                    <div className="mt-6 grid gap-3 sm:grid-cols-2">
                      <ProfileInfo
                        icon={<MapPin className="size-4" />}
                        label="Ubicación"
                        value={agency.city}
                      />
                      <ProfileInfo
                        icon={<Mail className="size-4" />}
                        label="Email"
                        value={agency.email}
                      />
                      <ProfileInfo
                        icon={<Phone className="size-4" />}
                        label="Teléfono"
                        value={agency.phone}
                      />
                      <ProfileInfo
                        icon={<Building2 className="size-4" />}
                        label="Asesor principal"
                        value={agency.ownerName}
                      />
                    </div>

                    {socialLinks.length > 0 ? (
                      <div className="mt-4 flex flex-wrap gap-2">
                        {socialLinks.map((link) => (
                          <a
                            key={link.label}
                            href={link.href}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 transition-colors hover:border-blue-200 hover:text-blue-700"
                          >
                            {link.icon}
                            {link.label}
                          </a>
                        ))}
                      </div>
                    ) : null}
                  </div>

                  <div className="mt-8 rounded-[28px] border border-slate-200 bg-slate-50 p-3">
                    <div className="relative">
                      <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                      <Input
                        value={searchValue}
                        onChange={(event) => setSearchValue(event.target.value)}
                        placeholder="Buscar por barrio, tipologia, amenities o nombre..."
                        className="h-12 rounded-2xl border-0 bg-white pl-11 shadow-none ring-1 ring-slate-200"
                      />
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {quickSearches.map((prompt) => (
                        <button
                          key={prompt}
                          type="button"
                          onClick={() => setSearchValue(prompt)}
                          className="rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-600 transition-colors hover:border-blue-200 hover:text-blue-700"
                        >
                          {prompt}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="relative min-h-[300px] overflow-hidden bg-slate-100 lg:min-h-full">
                  <Image
                    src={
                      properties[0]?.image ??
                      "https://images.unsplash.com/photo-1494526585095-c41746248156?auto=format&fit=crop&w=1200&q=80"
                    }
                    alt={agency.name}
                    fill
                    className="object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-slate-950/10 to-transparent" />
                  <div className="absolute bottom-0 left-0 right-0 p-5 text-white sm:p-6">
                    <p className="text-xs font-semibold uppercase tracking-[0.24em] text-white/75">
                      Portafolio activo
                    </p>
                    <p className="mt-3 text-2xl font-semibold">
                      {stats.sale} en venta · {stats.rent} en alquiler
                    </p>
                    <p className="mt-2 max-w-sm text-sm text-white/80">
                      Explora publicaciones actualizadas y consulta directo con la inmobiliaria desde cada ficha.
                    </p>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <Link
                        href={`mailto:${agency.email}`}
                        className="inline-flex items-center rounded-full bg-white/90 px-4 py-2 text-sm font-semibold text-slate-950 transition-colors hover:bg-white"
                      >
                        Escribir por email
                      </Link>
                      <a
                        href={`https://wa.me/${agency.phone.replace(/\D/g, "")}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center rounded-full border border-white/35 bg-white/10 px-4 py-2 text-sm font-semibold text-white backdrop-blur-sm transition-colors hover:bg-white/15"
                      >
                        WhatsApp
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <CatalogAssistant tenantSlug={agency.slug} properties={properties} />
          </div>

          <section className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-[28px] border border-slate-200 bg-white px-5 py-4 shadow-[0_18px_45px_-32px_rgba(15,23,42,0.25)]">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Ciudad</p>
              <p className="mt-2 text-lg font-semibold text-slate-950">{agency.city}</p>
            </div>
            <div className="rounded-[28px] border border-slate-200 bg-white px-5 py-4 shadow-[0_18px_45px_-32px_rgba(15,23,42,0.25)]">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400">En venta</p>
              <p className="mt-2 text-lg font-semibold text-slate-950">{stats.sale}</p>
            </div>
            <div className="rounded-[28px] border border-slate-200 bg-white px-5 py-4 shadow-[0_18px_45px_-32px_rgba(15,23,42,0.25)]">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400">En alquiler</p>
              <p className="mt-2 text-lg font-semibold text-slate-950">{stats.rent}</p>
            </div>
          </section>
        </div>
      </header>

      <main className="mx-auto grid max-w-[1440px] gap-8 px-4 py-8 sm:px-6 xl:grid-cols-[1fr_360px] xl:px-8">
        <section className="space-y-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500">Portafolio disponible</p>
              <h2 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">
                Propiedades listas para explorar
              </h2>
            </div>

            <div className="flex flex-wrap gap-2">
              {[
                { value: "all", label: "Todo" },
                { value: "Venta", label: "Venta" },
                { value: "Alquiler", label: "Alquiler" },
              ].map((option) => (
                <Button
                  key={option.value}
                  variant={operationFilter === option.value ? "default" : "outline"}
                  className="h-11 rounded-full px-5"
                  onClick={() =>
                    setOperationFilter(option.value as "all" | Property["operation"])
                  }
                >
                  {option.label}
                </Button>
              ))}
            </div>
          </div>

          {filteredProperties.length > 0 ? (
            <section className="grid gap-5 md:grid-cols-2 2xl:grid-cols-3">
              {filteredProperties.map((property) => (
                <TenantPropertyCard key={property.id} property={property} />
              ))}
            </section>
          ) : (
            <div className="rounded-[34px] border border-dashed border-slate-200 bg-white px-6 py-16 text-center">
              <p className="text-sm font-medium uppercase tracking-[0.2em] text-slate-400">
                Sin resultados
              </p>
              <h3 className="mt-3 text-2xl font-semibold text-slate-950">
                No encontramos propiedades con esos filtros
              </h3>
              <p className="mx-auto mt-3 max-w-xl text-sm leading-7 text-slate-600">
                Proba cambiar el tipo de operacion, limpiar el buscador o pedirle ayuda al asistente IA para refinar la busqueda.
              </p>
            </div>
          )}
        </section>

        <div className="xl:sticky xl:top-6 xl:h-fit">
          <CatalogInquiryForm tenantSlug={agency.slug} />
        </div>
      </main>
    </div>
  );
}

function ProfileInfo({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-[22px] border border-slate-200 bg-slate-50 px-4 py-4">
      <div className="inline-flex items-center gap-2 text-sm font-medium text-slate-500">
        {icon}
        {label}
      </div>
      <p className="mt-2 text-sm font-semibold text-slate-950 sm:text-base">{value}</p>
    </div>
  );
}
