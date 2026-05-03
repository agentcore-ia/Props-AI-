"use client";

import { useDeferredValue, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Building2, MapPin, Search } from "lucide-react";

import type { Agency, Property } from "@/lib/mock-data";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatCurrency } from "@/lib/utils";

export function PublicMarketplace({
  agencies,
  properties,
}: {
  agencies: Agency[];
  properties: Property[];
}) {
  const [query, setQuery] = useState("");
  const [operationFilter, setOperationFilter] = useState<"all" | Property["operation"]>("all");
  const deferredQuery = useDeferredValue(query);

  const agencyBySlug = useMemo(
    () => new Map(agencies.map((agency) => [agency.slug, agency])),
    [agencies]
  );

  const filteredProperties = useMemo(() => {
    const normalized = deferredQuery.trim().toLowerCase();

    return properties.filter((property) => {
      if (operationFilter !== "all" && property.operation !== operationFilter) {
        return false;
      }

      if (!normalized) {
        return true;
      }

      const agency = agencyBySlug.get(property.tenantSlug);
      const searchable = [
        property.title,
        property.location,
        property.description,
        property.operation,
        property.status,
        agency?.name,
        agency?.city,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return searchable.includes(normalized);
    });
  }, [agencyBySlug, deferredQuery, operationFilter, properties]);

  const stats = {
    agencies: agencies.length,
    properties: properties.length,
    sale: properties.filter((property) => property.operation === "Venta").length,
    rent: properties.filter((property) => property.operation === "Alquiler").length,
  };

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,rgba(239,246,255,0.95)_0%,rgba(248,250,252,1)_26%,rgba(255,255,255,1)_100%)]">
      <header className="border-b border-slate-200/80 bg-white/80 backdrop-blur-xl">
        <div className="mx-auto max-w-[1440px] px-4 py-6 sm:px-6 lg:py-8 xl:px-8">
          <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
            <section className="overflow-hidden rounded-[32px] border border-slate-200 bg-white shadow-[0_24px_80px_-48px_rgba(15,23,42,0.42)]">
              <div className="grid gap-0 lg:grid-cols-[1.02fr_0.98fr]">
                <div className="px-5 py-6 sm:px-7 sm:py-7">
                  <div className="inline-flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-blue-700">
                    <Building2 className="size-3.5" />
                    Props.com.ar
                  </div>

                  <h1 className="mt-4 text-4xl font-semibold tracking-tight text-slate-950 md:text-5xl">
                    Todas las propiedades publicadas en Props
                  </h1>
                  <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600 md:text-lg">
                    Explora propiedades de distintas inmobiliarias en un solo lugar y luego continua la conversacion en el catalogo de cada cliente.
                  </p>

                  <div className="mt-8 rounded-[28px] border border-slate-200 bg-slate-50 p-3">
                    <div className="relative">
                      <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                      <Input
                        value={query}
                        onChange={(event) => setQuery(event.target.value)}
                        placeholder="Buscar por barrio, inmobiliaria, operacion o tipologia..."
                        className="h-12 rounded-2xl border-0 bg-white pl-11 shadow-none ring-1 ring-slate-200"
                      />
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2">
                      {[
                        { value: "all", label: "Todo" },
                        { value: "Venta", label: "Venta" },
                        { value: "Alquiler", label: "Alquiler" },
                      ].map((option) => (
                        <Button
                          key={option.value}
                          variant={operationFilter === option.value ? "default" : "outline"}
                          className="h-10 rounded-full px-5"
                          onClick={() =>
                            setOperationFilter(option.value as "all" | Property["operation"])
                          }
                        >
                          {option.label}
                        </Button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="grid gap-px bg-slate-200 lg:grid-cols-2">
                  {[
                    { label: "Inmobiliarias activas", value: stats.agencies },
                    { label: "Propiedades publicadas", value: stats.properties },
                    { label: "En venta", value: stats.sale },
                    { label: "En alquiler", value: stats.rent },
                  ].map((item) => (
                    <div key={item.label} className="bg-white px-5 py-6 sm:px-6">
                      <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
                        {item.label}
                      </p>
                      <p className="mt-3 text-3xl font-semibold text-slate-950">{item.value}</p>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            <section className="rounded-[32px] border border-slate-200 bg-slate-950 p-6 text-white shadow-[0_24px_80px_-48px_rgba(15,23,42,0.55)]">
              <p className="text-xs uppercase tracking-[0.24em] text-blue-100">
                Acceso profesional
              </p>
              <h2 className="mt-4 text-3xl font-semibold">Panel para inmobiliarias</h2>
              <p className="mt-4 text-sm leading-7 text-white/75">
                Cada inmobiliaria opera desde su dashboard privado en `app.props.com.ar` y publica automaticamente en su propio subdominio.
              </p>

              <div className="mt-8 space-y-3">
                <Link
                  href="https://app.props.com.ar"
                  className="flex items-center justify-between rounded-[24px] border border-white/10 bg-white/5 px-5 py-4 transition-colors hover:bg-white/10"
                >
                  <div>
                    <p className="text-sm font-semibold text-white">Entrar al dashboard</p>
                    <p className="mt-1 text-xs text-white/60">
                      Gestion de propiedades, leads, mensajes e IA
                    </p>
                  </div>
                  <ArrowRight className="size-4 text-white/70" />
                </Link>
              </div>
            </section>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1440px] px-4 py-8 sm:px-6 xl:px-8">
        <div className="mb-6">
          <p className="text-sm font-medium text-slate-500">Marketplace publico</p>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">
            Propiedades listas para descubrir
          </h2>
        </div>

        {filteredProperties.length > 0 ? (
          <section className="grid gap-5 md:grid-cols-2 2xl:grid-cols-3">
            {filteredProperties.map((property) => {
              const agency = agencyBySlug.get(property.tenantSlug);
              const propertyUrl = `https://${property.tenantSlug}.props.com.ar/propiedad/${property.id}`;
              const agencyUrl = `https://${property.tenantSlug}.props.com.ar`;

              return (
                <article
                  key={property.id}
                  className="overflow-hidden rounded-[30px] border border-slate-200 bg-white shadow-[0_24px_70px_-44px_rgba(15,23,42,0.32)]"
                >
                  <Link href={propertyUrl} className="group block">
                    <div className="relative h-64 overflow-hidden sm:h-72">
                      <Image
                        src={property.image}
                        alt={property.title}
                        fill
                        className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-950/55 via-transparent to-transparent" />
                      <div className="absolute left-4 top-4 flex flex-wrap items-center gap-2 sm:left-5 sm:top-5">
                        <span className="rounded-full bg-white/92 px-3 py-1 text-xs font-semibold text-slate-900">
                          {property.operation}
                        </span>
                        <span className="rounded-full bg-slate-900/75 px-3 py-1 text-xs font-medium text-white backdrop-blur-sm">
                          {property.status}
                        </span>
                      </div>
                    </div>
                  </Link>

                  <div className="flex min-h-[270px] flex-col gap-4 p-5 sm:p-6">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <h3 className="text-2xl font-semibold tracking-tight text-slate-950">
                          {property.title}
                        </h3>
                        <div className="mt-2 flex items-center gap-2 text-sm text-slate-500">
                          <MapPin className="size-4 shrink-0" />
                          <span>{property.location}</span>
                        </div>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Precio</p>
                        <p className="mt-1 text-lg font-semibold text-slate-950 sm:text-xl">
                          {formatCurrency(property.price)}
                        </p>
                      </div>
                    </div>

                    <p className="line-clamp-3 text-sm leading-7 text-slate-600">
                      {property.description}
                    </p>

                    <div className="rounded-[22px] border border-slate-200 bg-slate-50 px-4 py-3">
                      <p className="text-xs uppercase tracking-[0.18em] text-slate-400">
                        Inmobiliaria
                      </p>
                      <div className="mt-2 flex items-center justify-between gap-3">
                        <div>
                          <p className="font-semibold text-slate-950">
                            {agency?.name ?? property.tenantSlug}
                          </p>
                          <p className="text-sm text-slate-500">{agency?.city ?? "Catalogo Props"}</p>
                        </div>
                        <Link
                          href={agencyUrl}
                          className="text-sm font-semibold text-blue-700 transition-colors hover:text-blue-800"
                        >
                          Ver catalogo
                        </Link>
                      </div>
                    </div>

                    <div className="mt-auto flex items-center justify-between border-t border-slate-100 pt-4">
                      <span className="text-sm font-medium text-slate-500">Abrir detalle</span>
                      <Link
                        href={propertyUrl}
                        className="inline-flex items-center gap-1 text-sm font-semibold text-blue-700"
                      >
                        Explorar
                        <ArrowRight className="size-4" />
                      </Link>
                    </div>
                  </div>
                </article>
              );
            })}
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
              Proba cambiar el tipo de operacion o usar una busqueda mas amplia.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
