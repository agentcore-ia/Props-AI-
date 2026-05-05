"use client";

import { useDeferredValue, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import dynamic from "next/dynamic";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  BadgeDollarSign,
  Bath,
  BedDouble,
  Building2,
  CalendarDays,
  CarFront,
  ChartColumnIncreasing,
  Filter,
  Heart,
  Layers3,
  LayoutGrid,
  Map,
  MapPin,
  PawPrint,
  Radar,
  Search,
  Sparkles,
  Star,
} from "lucide-react";

import type { Agency, Property } from "@/lib/mock-data";
import { PublicUserActions } from "@/components/sites/public-user-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  buildGoogleMapsExternalUrl,
  cn,
  formatMoney,
} from "@/lib/utils";
import {
  buildPublicListings,
  type MarketplaceSection,
  type PublicListing,
} from "@/lib/public-marketplace";

const PublicMarketplaceMap = dynamic(
  () =>
    import("@/components/sites/public-marketplace-map").then(
      (module) => module.PublicMarketplaceMap
    ),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-[540px] items-center justify-center rounded-[28px] border border-white/70 bg-white text-sm text-slate-500 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.35)]">
        Cargando mapa interactivo...
      </div>
    ),
  }
);

const navItems: Array<{ id: MarketplaceSection; label: string }> = [
  { id: "explorar", label: "Explorar" },
  { id: "mapa", label: "Mapa" },
  { id: "favoritos", label: "Favoritos" },
  { id: "inversiones", label: "Inversiones" },
];

const quickFilters = ["CABA", "Nordelta", "Venta", "Alquiler", "Balcon", "Mascotas"];

export function PublicMarketplace({
  agencies,
  properties,
  initialSection = "explorar",
  currentUser,
}: {
  agencies: Agency[];
  properties: Property[];
  initialSection?: MarketplaceSection;
  currentUser: {
    fullName: string | null;
    email: string | null;
    role: "superadmin" | "agency_admin" | "agent" | "customer";
  } | null;
}) {
  const [section, setSection] = useState<MarketplaceSection>(initialSection);
  const [query, setQuery] = useState("");
  const [operationFilter, setOperationFilter] = useState<"all" | Property["operation"]>("all");
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);
  const [comparisonIds, setComparisonIds] = useState<string[]>([]);
  const [selectedMapListingId, setSelectedMapListingId] = useState<string | null>(null);
  const deferredQuery = useDeferredValue(query);

  const listings = useMemo(() => buildPublicListings(properties, agencies), [agencies, properties]);

  const filteredListings = useMemo(() => {
    const normalized = deferredQuery.trim().toLowerCase();

    return listings.filter((listing) => {
      if (operationFilter !== "all" && listing.operation !== operationFilter) {
        return false;
      }

      if (!normalized) {
        return true;
      }

      const searchable = [
        listing.title,
        listing.location,
        listing.exactAddress,
        listing.description,
        listing.operation,
        listing.status,
        listing.propertyType,
        listing.agencyName,
        listing.agencyCity,
        listing.neighborhood,
        listing.requirements,
        listing.petsPolicy,
        ...listing.amenities,
      ]
        .join(" ")
        .toLowerCase();

      return searchable.includes(normalized);
    });
  }, [deferredQuery, listings, operationFilter]);

  useEffect(() => {
    if (!filteredListings.length) {
      setSelectedMapListingId(null);
      return;
    }

    if (!selectedMapListingId || !filteredListings.some((listing) => listing.id === selectedMapListingId)) {
      setSelectedMapListingId(filteredListings[0].id);
    }
  }, [filteredListings, selectedMapListingId]);

  const selectedMapListing =
    filteredListings.find((listing) => listing.id === selectedMapListingId) ?? filteredListings[0] ?? null;

  const favorites = useMemo(
    () => listings.filter((listing) => favoriteIds.includes(listing.id)),
    [favoriteIds, listings]
  );

  const comparison = useMemo(
    () => listings.filter((listing) => comparisonIds.includes(listing.id)).slice(0, 3),
    [comparisonIds, listings]
  );

  const investmentLeaders = useMemo(
    () =>
      [...filteredListings]
        .sort(
          (a, b) =>
            b.investmentScore - a.investmentScore ||
            b.appreciationPercent - a.appreciationPercent
        )
        .slice(0, 4),
    [filteredListings]
  );

  const aggregated = useMemo(() => {
    const total = filteredListings.length;
    const sales = filteredListings.filter((listing) => listing.operation === "Venta").length;
    const rentals = filteredListings.filter((listing) => listing.operation === "Alquiler").length;
    const avgYield =
      total > 0
        ? (
            filteredListings.reduce((acc, listing) => acc + listing.yieldPercent, 0) / total
          ).toFixed(1)
        : "0.0";

    return { total, sales, rentals, avgYield };
  }, [filteredListings]);

  function toggleFavorite(id: string) {
    setFavoriteIds((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id]
    );
  }

  function toggleComparison(id: string) {
    setComparisonIds((current) => {
      if (current.includes(id)) {
        return current.filter((item) => item !== id);
      }

      if (current.length >= 3) {
        return [...current.slice(1), id];
      }

      return [...current, id];
    });
  }

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,rgba(237,242,255,0.9)_0%,rgba(246,248,252,1)_24%,rgba(255,255,255,1)_100%)]">
      <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/85 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1480px] items-center justify-between gap-4 px-4 py-4 sm:px-6 xl:px-8">
          <div className="flex items-center gap-8">
            <Link href="/" className="text-2xl font-semibold tracking-tight text-slate-950">
              Props
            </Link>

            <nav className="hidden items-center gap-1 rounded-full border border-slate-200 bg-slate-50 p-1 md:flex">
              {navItems.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setSection(item.id)}
                  className={cn(
                    "rounded-full px-4 py-2 text-sm font-medium transition-colors",
                    section === item.id
                      ? "bg-white text-slate-950 shadow-sm"
                      : "text-slate-500 hover:text-slate-950"
                  )}
                >
                  {item.label}
                </button>
              ))}
            </nav>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-500 sm:block">
              {favoriteIds.length} favoritos · {comparisonIds.length}/3 comparacion
            </div>
            <PublicUserActions currentUser={currentUser} />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1480px] px-4 py-6 sm:px-6 xl:px-8">
        <section className="overflow-hidden rounded-[34px] border border-slate-200 bg-white shadow-[0_28px_90px_-55px_rgba(15,23,42,0.32)]">
          <div className="grid gap-0 xl:grid-cols-[1.08fr_0.92fr]">
            <div className="px-5 py-7 sm:px-8 sm:py-10">
              <div className="inline-flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-blue-700">
                <Building2 className="size-3.5" />
                Marketplace para comprar y alquilar
              </div>
              <h1 className="mt-5 max-w-4xl text-4xl font-semibold tracking-tight text-slate-950 sm:text-5xl xl:text-6xl">
                Busca mejor, compara mejor y pregunta antes de contactar
              </h1>
              <p className="mt-4 max-w-3xl text-base leading-8 text-slate-600 sm:text-lg">
                Props reune publicaciones de distintas inmobiliarias para ayudarte a descubrir,
                entender condiciones reales y tomar una decision con mas contexto.
              </p>

              <div className="mt-8 rounded-[28px] border border-slate-200 bg-slate-50 p-3">
                <div className="flex flex-col gap-3 lg:flex-row">
                  <div className="relative flex-1">
                    <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                    <Input
                      value={query}
                      onChange={(event) => setQuery(event.target.value)}
                      placeholder="Buscar por ciudad, barrio, inmobiliaria, direccion o requisito"
                      className="h-12 rounded-2xl border-0 bg-white pl-11 shadow-none ring-1 ring-slate-200"
                    />
                  </div>
                  <Button className="h-12 rounded-2xl px-6" onClick={() => setSection("explorar")}>
                    Buscar
                  </Button>
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  {quickFilters.map((item) => (
                    <button
                      key={item}
                      type="button"
                      onClick={() => setQuery(item)}
                      className="rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-600 transition-colors hover:border-blue-200 hover:text-blue-700"
                    >
                      {item}
                    </button>
                  ))}
                </div>
              </div>

              <div className="mt-8 grid gap-3 sm:grid-cols-4">
                <StatCard label="Propiedades activas" value={String(aggregated.total)} />
                <StatCard label="En venta" value={String(aggregated.sales)} />
                <StatCard label="En alquiler" value={String(aggregated.rentals)} />
                <StatCard label="Yield medio" value={`${aggregated.avgYield}% anual`} />
              </div>
            </div>

            <div className="relative min-h-[320px] overflow-hidden bg-slate-950">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(96,165,250,0.24),transparent_30%),radial-gradient(circle_at_bottom_right,rgba(14,165,233,0.18),transparent_30%)]" />
              <div className="absolute inset-0 opacity-70">
                <Image
                  src={
                    filteredListings[0]?.image ??
                    listings[0]?.image ??
                    "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80"
                  }
                  alt="Marketplace Props"
                  fill
                  className="object-cover opacity-40"
                />
              </div>
              <div className="relative flex h-full flex-col justify-between p-6 text-white sm:p-8">
                <div className="flex flex-wrap gap-3">
                  <InfoPill icon={<LayoutGrid className="size-4" />} text="Explorador" />
                  <InfoPill icon={<Map className="size-4" />} text="Mapa con direccion" />
                  <InfoPill icon={<Heart className="size-4" />} text="Favoritos y comparacion" />
                </div>

                <div className="space-y-4">
                  <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-medium uppercase tracking-[0.2em] backdrop-blur-md">
                    <Sparkles className="size-3.5" />
                    Experiencia guiada para compradores e inquilinos
                  </div>
                  <h2 className="max-w-xl text-3xl font-semibold leading-tight sm:text-4xl">
                    La IA te ayuda a entender requisitos, costos y disponibilidad desde la ficha
                  </h2>
                  <p className="max-w-lg text-sm leading-7 text-white/78 sm:text-base">
                    Guarda favoritos, retoma conversaciones y llega mejor preparado al contacto con
                    cada inmobiliaria.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-6 flex flex-col gap-4 rounded-[30px] border border-slate-200 bg-white px-4 py-4 shadow-[0_24px_70px_-52px_rgba(15,23,42,0.25)] lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" onClick={() => setOperationFilter("all")} className={pillClass(operationFilter === "all")}>
              Todo
            </button>
            <button type="button" onClick={() => setOperationFilter("Venta")} className={pillClass(operationFilter === "Venta")}>
              Venta
            </button>
            <button type="button" onClick={() => setOperationFilter("Alquiler")} className={pillClass(operationFilter === "Alquiler")}>
              Alquiler
            </button>
            <button type="button" className={pillClass(false)}>
              <Filter className="mr-2 size-4" />
              Filtros
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button type="button" onClick={() => setSection("explorar")} className={iconToggleClass(section === "explorar")}>
              <LayoutGrid className="size-4" />
            </button>
            <button type="button" onClick={() => setSection("mapa")} className={iconToggleClass(section === "mapa")}>
              <Map className="size-4" />
            </button>
            <button type="button" onClick={() => setSection("favoritos")} className={iconToggleClass(section === "favoritos")}>
              <Heart className="size-4" />
            </button>
            <button type="button" onClick={() => setSection("inversiones")} className={iconToggleClass(section === "inversiones")}>
              <ChartColumnIncreasing className="size-4" />
            </button>
          </div>
        </section>

        {section === "explorar" ? (
          <section className="mt-10 space-y-6">
            <SectionHeading
              eyebrow="Explorador"
              title="Propiedades destacadas"
              description={`${filteredListings.length} resultados para explorar, ordenar y abrir en detalle.`}
            />
            <div className="grid gap-5 md:grid-cols-2 2xl:grid-cols-3">
              {filteredListings.map((listing) => (
                <MarketplacePropertyCard
                  key={listing.id}
                  listing={listing}
                  isFavorite={favoriteIds.includes(listing.id)}
                  isInComparison={comparisonIds.includes(listing.id)}
                  onToggleFavorite={toggleFavorite}
                  onToggleComparison={toggleComparison}
                />
              ))}
            </div>
          </section>
        ) : null}

        {section === "mapa" ? (
          <section className="mt-10 grid gap-6 xl:grid-cols-[380px_1fr]">
            <div className="space-y-4">
              <SectionHeading
                eyebrow="Vista mapa"
                title={`${filteredListings.length} propiedades en contexto`}
                description="Explora todas las publicaciones sobre el mapa y selecciona una para ver su direccion exacta y abrir la ficha."
              />
              <div className="max-h-[640px] space-y-4 overflow-y-auto pr-1">
                {filteredListings.map((listing) => (
                  <CompactMapListing
                    key={listing.id}
                    listing={listing}
                    isFavorite={favoriteIds.includes(listing.id)}
                    isSelected={selectedMapListing?.id === listing.id}
                    onToggleFavorite={toggleFavorite}
                    onSelect={() => setSelectedMapListingId(listing.id)}
                  />
                ))}
              </div>
            </div>

            <div className="overflow-hidden rounded-[34px] border border-slate-200 bg-[linear-gradient(180deg,rgba(222,246,247,0.9)_0%,rgba(228,236,247,0.96)_100%)] p-5 shadow-[0_32px_90px_-60px_rgba(15,23,42,0.32)] sm:p-6">
              <div className="grid gap-4 xl:grid-cols-[1fr_320px]">
                <PublicMarketplaceMap
                  listings={filteredListings}
                  selectedListingId={selectedMapListing?.id ?? null}
                  onSelect={setSelectedMapListingId}
                />

                {selectedMapListing ? (
                  <aside className="rounded-[28px] border border-white/70 bg-white/92 p-5 shadow-lg backdrop-blur">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-blue-700">
                        Ubicacion exacta
                      </p>
                      <h3 className="mt-2 text-2xl font-semibold text-slate-950">
                        {selectedMapListing.title}
                      </h3>
                      <p className="mt-2 text-sm leading-7 text-slate-600">
                        {selectedMapListing.exactAddress || selectedMapListing.location}
                      </p>
                    </div>

                    <div className="mt-4 rounded-[24px] border border-slate-200 bg-slate-50 p-4">
                      <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Precio</p>
                      <p className="mt-2 text-2xl font-semibold text-slate-950">
                        {formatMoney(selectedMapListing.price, selectedMapListing.currency)}
                      </p>
                      <p className="mt-1 text-sm text-slate-500">
                        {selectedMapListing.operation} · {selectedMapListing.propertyType}
                      </p>
                    </div>

                    <div className="mt-4 grid gap-3 text-sm text-slate-600">
                      <div className="inline-flex items-center gap-2">
                        <CalendarDays className="size-4 text-slate-400" />
                        Disponible desde: {selectedMapListing.availableFrom || "Inmediata"}
                      </div>
                      <div className="inline-flex items-center gap-2">
                        <PawPrint className="size-4 text-slate-400" />
                        Mascotas: {selectedMapListing.petsPolicy || "Consultar"}
                      </div>
                      <div className="inline-flex items-center gap-2">
                        <CarFront className="size-4 text-slate-400" />
                        Cocheras: {selectedMapListing.parkingSpots}
                      </div>
                    </div>

                    {selectedMapListing.requirements ? (
                      <div className="mt-4 rounded-[22px] border border-slate-200 bg-white p-4">
                        <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Requisitos</p>
                        <p className="mt-2 text-sm leading-7 text-slate-600">
                          {selectedMapListing.requirements}
                        </p>
                      </div>
                    ) : null}

                    <a
                      href={buildGoogleMapsExternalUrl(
                        selectedMapListing.exactAddress || selectedMapListing.location
                      )}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-4 inline-flex w-full items-center justify-center rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-slate-800"
                    >
                      Abrir en Google Maps
                    </a>
                  </aside>
                ) : null}
              </div>
            </div>
          </section>
        ) : null}

        {section === "favoritos" ? (
          <section className="mt-10 space-y-8">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <SectionHeading
                eyebrow="Favoritos y comparacion"
                title="Tus propiedades seleccionadas"
                description="Guarda favoritas y compara hasta 3 opciones para tomar mejores decisiones."
              />
              <div className="rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm font-medium text-blue-700">
                {comparisonIds.length}/3 seleccionadas para comparar
              </div>
            </div>

            {favorites.length > 0 ? (
              <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                {favorites.map((listing) => (
                  <MarketplacePropertyCard
                    key={listing.id}
                    listing={listing}
                    isFavorite
                    isInComparison={comparisonIds.includes(listing.id)}
                    onToggleFavorite={toggleFavorite}
                    onToggleComparison={toggleComparison}
                  />
                ))}
              </div>
            ) : (
              <EmptyPanel
                title="Todavia no agregaste favoritos"
                description="Desde Explorar o Mapa puedes guardar propiedades y traerlas aqui para compararlas."
              />
            )}

            {comparison.length > 0 ? (
              <section className="overflow-hidden rounded-[32px] border border-slate-200 bg-white shadow-[0_28px_90px_-58px_rgba(15,23,42,0.28)]">
                <div className="flex flex-col gap-3 border-b border-slate-200 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                  <div>
                    <p className="text-sm font-medium text-slate-500">Analisis comparativo</p>
                    <h3 className="mt-1 text-3xl font-semibold tracking-tight text-slate-950">
                      Tabla comparativa
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => setComparisonIds([])}
                    className="text-sm font-medium text-slate-500 transition-colors hover:text-slate-950"
                  >
                    Limpiar seleccion
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="min-w-full border-separate border-spacing-0">
                    <thead>
                      <tr className="bg-slate-50">
                        <th className="w-44 px-5 py-4 text-left text-sm font-semibold text-slate-500 sm:px-6">
                          Criterio
                        </th>
                        {comparison.map((listing) => (
                          <th key={listing.id} className="min-w-[280px] px-5 py-4 text-left sm:px-6">
                            <div className="space-y-3">
                              <div className="relative h-28 overflow-hidden rounded-[22px] border border-slate-200">
                                <Image src={listing.image} alt={listing.title} fill className="object-cover" />
                              </div>
                              <div>
                                <p className="text-lg font-semibold text-slate-950">{listing.title}</p>
                                <p className="text-sm text-slate-500">{listing.location}</p>
                              </div>
                            </div>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {comparisonRows(comparison).map((row) => (
                        <tr key={row.label} className="border-t border-slate-200">
                          <td className="px-5 py-4 text-sm font-medium text-slate-500 sm:px-6">
                            {row.label}
                          </td>
                          {row.values.map((value, index) => (
                            <td key={`${row.label}-${index}`} className="px-5 py-4 text-sm text-slate-800 sm:px-6">
                              {value}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            ) : null}
          </section>
        ) : null}

        {section === "inversiones" ? (
          <section className="mt-10 space-y-8">
            <SectionHeading
              eyebrow="Inversiones"
              title="Oportunidades priorizadas por retorno"
              description="Cruza precio por metro, rendimiento anual y apreciacion estimada para detectar mejores oportunidades."
            />

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <InvestmentMetric
                icon={<BadgeDollarSign className="size-5" />}
                label="Precio de referencia"
                value={
                  selectedMapListing
                    ? formatMoney(selectedMapListing.price, selectedMapListing.currency)
                    : "-"
                }
                hint="segun la propiedad seleccionada"
              />
              <InvestmentMetric
                icon={<Radar className="size-5" />}
                label="Yield promedio"
                value={`${aggregated.avgYield}%`}
                hint="retorno anual estimado"
              />
              <InvestmentMetric
                icon={<ChartColumnIncreasing className="size-5" />}
                label="Top score"
                value={String(investmentLeaders[0]?.investmentScore ?? 0)}
                hint="potencial compuesto"
              />
              <InvestmentMetric
                icon={<Layers3 className="size-5" />}
                label="Agencias participando"
                value={String(agencies.length)}
                hint="oferta diversificada"
              />
            </div>

            <div className="grid gap-5 xl:grid-cols-[1.05fr_0.95fr]">
              <section className="rounded-[32px] border border-slate-200 bg-white p-5 shadow-[0_28px_90px_-58px_rgba(15,23,42,0.28)] sm:p-6">
                <div>
                  <p className="text-sm font-medium text-slate-500">Ranking de oportunidades</p>
                  <h3 className="mt-1 text-2xl font-semibold text-slate-950">Propiedades lideres</h3>
                </div>
                <div className="mt-6 space-y-4">
                  {investmentLeaders.map((listing, index) => (
                    <div
                      key={listing.id}
                      className="grid gap-4 rounded-[26px] border border-slate-200 bg-slate-50 p-4 md:grid-cols-[120px_1fr_auto]"
                    >
                      <div className="relative h-24 overflow-hidden rounded-[18px]">
                        <Image src={listing.image} alt={listing.title} fill className="object-cover" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                          <span>#{index + 1}</span>
                          <span>{listing.agencyName}</span>
                        </div>
                        <p className="mt-2 text-xl font-semibold text-slate-950">{listing.title}</p>
                        <p className="mt-1 text-sm text-slate-500">{listing.location}</p>
                        <div className="mt-3 flex flex-wrap gap-2">
                          <MetricBadge label={`${listing.yieldPercent}% yield`} />
                          <MetricBadge label={`${listing.appreciationPercent}% apreciacion`} />
                          <MetricBadge label={`${listing.currency} ${listing.pricePerSquareMeter}/m2`} />
                        </div>
                      </div>
                      <div className="flex flex-col items-start gap-2 md:items-end">
                        <div className="rounded-2xl bg-slate-950 px-3 py-2 text-sm font-semibold text-white">
                          Score {listing.investmentScore}
                        </div>
                        <Link
                          href={listing.routeHref}
                          className="text-sm font-semibold text-blue-700 transition-colors hover:text-blue-800"
                        >
                          Ver ficha
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              <section className="rounded-[32px] border border-slate-200 bg-slate-950 p-5 text-white shadow-[0_28px_90px_-58px_rgba(15,23,42,0.36)] sm:p-6">
                <p className="text-sm font-medium uppercase tracking-[0.2em] text-blue-100">
                  Lectura rapida del mercado
                </p>
                <h3 className="mt-2 text-3xl font-semibold tracking-tight">
                  Barrios y oportunidades con mejor contexto
                </h3>
                <div className="mt-6 space-y-4">
                  {investmentLeaders.slice(0, 3).map((listing) => (
                    <div key={listing.id} className="rounded-[24px] border border-white/10 bg-white/5 p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="text-lg font-semibold">{listing.neighborhood}</p>
                          <p className="mt-1 text-sm text-white/65">{listing.agencyName}</p>
                        </div>
                        <Star className="size-5 text-amber-300" />
                      </div>
                      <p className="mt-3 text-sm leading-7 text-white/80">{listing.summary}</p>
                      <div className="mt-4 grid gap-2 sm:grid-cols-3">
                        <MetricBadge dark label={`${listing.yieldPercent}% yield`} />
                        <MetricBadge dark label={`Score ${listing.investmentScore}`} />
                        <MetricBadge dark label={`${listing.yearBuilt}`} />
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            </div>
          </section>
        ) : null}
      </main>
    </div>
  );
}

function MarketplacePropertyCard({
  listing,
  isFavorite,
  isInComparison,
  onToggleFavorite,
  onToggleComparison,
}: {
  listing: PublicListing;
  isFavorite: boolean;
  isInComparison: boolean;
  onToggleFavorite: (id: string) => void;
  onToggleComparison: (id: string) => void;
}) {
  return (
    <article className="overflow-hidden rounded-[30px] border border-slate-200 bg-white shadow-[0_28px_80px_-52px_rgba(15,23,42,0.28)] transition-transform duration-300 hover:-translate-y-1.5">
      <div className="relative h-64 overflow-hidden sm:h-72">
        <Link href={listing.routeHref} className="block h-full">
          <Image
            src={listing.image}
            alt={listing.title}
            fill
            className="object-cover transition-transform duration-500 hover:scale-[1.03]"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/55 via-transparent to-transparent" />
        </Link>
        <div className="absolute left-4 top-4 flex flex-wrap items-center gap-2">
          {listing.featuredLabel ? (
            <span className="rounded-full bg-emerald-600/92 px-3 py-1 text-xs font-semibold text-white">
              {listing.featuredLabel}
            </span>
          ) : null}
          <span className="rounded-full bg-white/92 px-3 py-1 text-xs font-semibold text-slate-900">
            {listing.operation}
          </span>
          <span className="rounded-full bg-slate-900/78 px-3 py-1 text-xs font-medium text-white">
            {listing.currency}
          </span>
        </div>
        <button
          type="button"
          onClick={() => onToggleFavorite(listing.id)}
          className={cn(
            "absolute right-4 top-4 flex size-11 items-center justify-center rounded-full border backdrop-blur-sm transition-colors",
            isFavorite
              ? "border-transparent bg-slate-950 text-white"
              : "border-white/80 bg-white/88 text-slate-700"
          )}
        >
          <Heart className={cn("size-4", isFavorite ? "fill-current" : "")} />
        </button>
      </div>

      <div className="space-y-4 p-5 sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-3xl font-semibold tracking-tight text-slate-950">
              {formatMoney(listing.price, listing.currency)}
            </p>
            <h3 className="mt-2 text-xl font-semibold text-slate-900">{listing.title}</h3>
            <div className="mt-2 flex items-start gap-2 text-sm text-slate-500">
              <MapPin className="mt-0.5 size-4 shrink-0" />
              <span>{listing.location}</span>
            </div>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-right">
            <p className="text-xs uppercase tracking-[0.18em] text-slate-400">m2</p>
            <p className="mt-1 text-sm font-semibold text-slate-950">{listing.area}</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-4 border-y border-slate-100 py-3 text-sm text-slate-600">
          <div className="inline-flex items-center gap-2">
            <BedDouble className="size-4" />
            {listing.bedrooms}
          </div>
          <div className="inline-flex items-center gap-2">
            <Bath className="size-4" />
            {listing.bathrooms}
          </div>
          <div className="inline-flex items-center gap-2">
            <Layers3 className="size-4" />
            {listing.propertyType}
          </div>
        </div>

        <div className="rounded-[22px] border border-slate-200 bg-slate-50 p-4">
          <div className="grid gap-2 text-sm text-slate-600">
            <div>
              <span className="font-medium text-slate-900">Direccion:</span>{" "}
              {listing.exactAddress || listing.location}
            </div>
            <div>
              <span className="font-medium text-slate-900">Mascotas:</span>{" "}
              {listing.petsPolicy || "Consultar"}
            </div>
            <div>
              <span className="font-medium text-slate-900">Requisitos:</span>{" "}
              {listing.requirements || "Consultar con la inmobiliaria"}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Inmobiliaria</p>
            <p className="mt-1 font-semibold text-slate-950">{listing.agencyName}</p>
          </div>
          <button
            type="button"
            onClick={() => onToggleComparison(listing.id)}
            className={cn(
              "rounded-full border px-4 py-2 text-sm font-medium transition-colors",
              isInComparison
                ? "border-slate-950 bg-slate-950 text-white"
                : "border-slate-200 bg-white text-slate-600 hover:text-slate-950"
            )}
          >
            {isInComparison ? "Comparando" : "Comparar"}
          </button>
        </div>

        <div className="flex items-center justify-between pt-1">
          <Link
            href={listing.routeHref}
            className="inline-flex items-center gap-1 text-sm font-semibold text-blue-700 transition-colors hover:text-blue-800"
          >
            Ver detalle
            <ArrowRight className="size-4" />
          </Link>
          <Link
            href={listing.catalogHref}
            className="text-sm font-medium text-slate-500 transition-colors hover:text-slate-900"
          >
            Catalogo de la inmobiliaria
          </Link>
        </div>
      </div>
    </article>
  );
}

function CompactMapListing({
  listing,
  isFavorite,
  isSelected,
  onToggleFavorite,
  onSelect,
}: {
  listing: PublicListing;
  isFavorite: boolean;
  isSelected: boolean;
  onToggleFavorite: (id: string) => void;
  onSelect: () => void;
}) {
  return (
    <article
      className={cn(
        "rounded-[28px] border bg-white p-4 shadow-[0_20px_55px_-42px_rgba(15,23,42,0.22)] transition-colors",
        isSelected ? "border-slate-950 ring-2 ring-slate-950/10" : "border-slate-200"
      )}
    >
      <button type="button" onClick={onSelect} className="block w-full text-left">
        <div className="grid gap-4 sm:grid-cols-[120px_1fr]">
          <div className="relative h-28 overflow-hidden rounded-[20px]">
            <Image src={listing.image} alt={listing.title} fill className="object-cover" />
          </div>
          <div className="min-w-0">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xl font-semibold text-slate-950">
                  {formatMoney(listing.price, listing.currency)}
                </p>
                <h3 className="mt-1 font-semibold text-slate-900">{listing.title}</h3>
              </div>
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  onToggleFavorite(listing.id);
                }}
                className={cn(
                  "flex size-10 items-center justify-center rounded-full border",
                  isFavorite
                    ? "border-transparent bg-slate-950 text-white"
                    : "border-slate-200 bg-white text-slate-600"
                )}
              >
                <Heart className={cn("size-4", isFavorite ? "fill-current" : "")} />
              </button>
            </div>
            <p className="mt-2 text-sm text-slate-500">{listing.location}</p>
            <div className="mt-3 flex flex-wrap gap-3 text-sm text-slate-600">
              <span>{listing.bedrooms} dorm.</span>
              <span>{listing.bathrooms} banos</span>
              <span>{listing.area} m2</span>
            </div>
          </div>
        </div>
      </button>
    </article>
  );
}

function SectionHeading({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <div>
      <p className="text-sm font-medium text-slate-500">{eyebrow}</p>
      <h2 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
        {title}
      </h2>
      <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600 sm:text-base">
        {description}
      </p>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[24px] border border-slate-200 bg-slate-50 px-4 py-4">
      <p className="text-xs uppercase tracking-[0.18em] text-slate-400">{label}</p>
      <p className="mt-2 text-lg font-semibold text-slate-950">{value}</p>
    </div>
  );
}

function InfoPill({ icon, text }: { icon: ReactNode; text: string }) {
  return (
    <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-medium text-white backdrop-blur-md">
      {icon}
      {text}
    </div>
  );
}

function EmptyPanel({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-[34px] border border-dashed border-slate-200 bg-white px-6 py-16 text-center">
      <h3 className="text-2xl font-semibold text-slate-950">{title}</h3>
      <p className="mx-auto mt-3 max-w-xl text-sm leading-7 text-slate-600">{description}</p>
    </div>
  );
}

function InvestmentMetric({
  icon,
  label,
  value,
  hint,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_20px_55px_-42px_rgba(15,23,42,0.2)]">
      <div className="flex size-11 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
        {icon}
      </div>
      <p className="mt-4 text-sm font-medium text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-slate-950">{value}</p>
      <p className="mt-2 text-sm text-slate-500">{hint}</p>
    </div>
  );
}

function MetricBadge({ label, dark = false }: { label: string; dark?: boolean }) {
  return (
    <span
      className={cn(
        "rounded-full px-3 py-1 text-xs font-medium",
        dark ? "bg-white/10 text-white/88" : "bg-blue-50 text-blue-700"
      )}
    >
      {label}
    </span>
  );
}

function comparisonRows(listings: PublicListing[]) {
  return [
    {
      label: "Precio",
      values: listings.map((listing) => formatMoney(listing.price, listing.currency)),
    },
    {
      label: "Precio / m2",
      values: listings.map((listing) => `${listing.currency} ${listing.pricePerSquareMeter}`),
    },
    {
      label: "Superficie total",
      values: listings.map((listing) => `${listing.area} m2`),
    },
    {
      label: "Dormitorios",
      values: listings.map((listing) => String(listing.bedrooms)),
    },
    {
      label: "Disponible desde",
      values: listings.map((listing) => listing.availableFrom || "Inmediata"),
    },
    {
      label: "Mascotas",
      values: listings.map((listing) => listing.petsPolicy || "Consultar"),
    },
  ];
}

function pillClass(active: boolean) {
  return cn(
    "inline-flex h-11 items-center rounded-full border px-4 text-sm font-medium transition-colors",
    active
      ? "border-slate-950 bg-slate-950 text-white"
      : "border-slate-200 bg-white text-slate-600 hover:text-slate-950"
  );
}

function iconToggleClass(active: boolean) {
  return cn(
    "inline-flex size-11 items-center justify-center rounded-2xl border transition-colors",
    active
      ? "border-slate-950 bg-slate-950 text-white"
      : "border-slate-200 bg-white text-slate-600 hover:text-slate-950"
  );
}
