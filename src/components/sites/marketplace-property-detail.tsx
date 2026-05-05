import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import {
  ArrowLeft,
  Bath,
  BedDouble,
  Building2,
  CalendarDays,
  CarFront,
  ChartColumnIncreasing,
  MapPin,
  PawPrint,
  Ruler,
  Sparkles,
} from "lucide-react";

import type { Agency, Property } from "@/lib/mock-data";
import { CatalogInquiryForm } from "@/components/sites/catalog-inquiry-form";
import { PropertyGallery } from "@/components/sites/property-gallery";
import { PublicCustomerChat } from "@/components/sites/public-customer-chat";
import { PublicUserActions } from "@/components/sites/public-user-actions";
import { buildPublicListings } from "@/lib/public-marketplace";
import {
  buildGoogleMapsEmbedUrl,
  buildGoogleMapsExternalUrl,
  formatMoney,
} from "@/lib/utils";

export function MarketplacePropertyDetail({
  agency,
  property,
  allAgencies,
  relatedProperties,
  currentUser,
}: {
  agency: Agency | null;
  property: Property | null;
  allAgencies: Agency[];
  relatedProperties: Property[];
  currentUser: {
    fullName: string | null;
    email: string | null;
    role: "superadmin" | "agency_admin" | "agent" | "customer";
  } | null;
}) {
  if (!agency || !property) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
        <div className="rounded-[32px] border bg-white p-8 text-center shadow-sm">
          <h1 className="text-2xl font-semibold">Propiedad no encontrada</h1>
          <p className="mt-3 text-sm text-slate-600">
            La publicacion que buscas no existe o ya no esta disponible.
          </p>
          <Link
            href="/"
            className="mt-6 inline-flex rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white"
          >
            Volver al marketplace
          </Link>
        </div>
      </div>
    );
  }

  const [listing] = buildPublicListings([property], [agency]);
  const relatedListings = buildPublicListings(relatedProperties, allAgencies).slice(0, 3);
  const address = listing.exactAddress || listing.location;

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,rgba(237,242,255,0.88)_0%,rgba(247,249,252,1)_24%,rgba(255,255,255,1)_100%)]">
      <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/88 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1480px] flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6 xl:px-8">
          <div className="flex min-w-0 items-center gap-3 sm:gap-4">
            <Link
              href="/"
              className="inline-flex shrink-0 items-center gap-2 text-sm font-medium text-slate-500 transition-colors hover:text-slate-950"
            >
              <ArrowLeft className="size-4" />
              <span className="hidden sm:inline">Volver a explorar</span>
              <span className="sm:hidden">Volver</span>
            </Link>
            <div className="hidden h-6 w-px bg-slate-200 sm:block" />
            <Link href="/" className="hidden text-xl font-semibold tracking-tight text-slate-950 sm:block">
              Props
            </Link>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href={listing.catalogHref}
              className="hidden rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 transition-colors hover:text-slate-950 sm:inline-flex"
            >
              Ver catalogo de {agency.name}
            </Link>
            <PublicUserActions currentUser={currentUser} />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1480px] space-y-8 px-4 py-6 sm:px-6 xl:px-8">
        <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-5">
            <div className="flex flex-wrap items-center gap-3">
              <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">
                {listing.featuredLabel ?? "Disponible"}
              </span>
              <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-600">
                {listing.operation}
              </span>
              <span className="rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-blue-700">
                {listing.propertyType}
              </span>
              <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-600">
                {listing.currency}
              </span>
            </div>

            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-4xl">
                <h1 className="text-3xl font-semibold tracking-tight text-slate-950 sm:text-5xl">
                  {listing.title}
                </h1>
                <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-slate-500">
                  <span className="inline-flex items-center gap-2">
                    <MapPin className="size-4" />
                    {listing.location}
                  </span>
                  <span className="inline-flex items-center gap-2">
                    <Building2 className="size-4" />
                    {agency.name}
                  </span>
                </div>
              </div>

              <div className="rounded-[24px] border border-slate-200 bg-white px-4 py-4 shadow-[0_20px_60px_-40px_rgba(15,23,42,0.25)]">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Precio</p>
                <p className="mt-2 text-3xl font-semibold text-slate-950">
                  {formatMoney(listing.price, listing.currency)}
                </p>
                <p className="mt-1 text-sm text-slate-500">
                  {listing.currency} {listing.pricePerSquareMeter} / m2
                </p>
              </div>
            </div>

            <PropertyGallery title={listing.title} images={listing.images} />

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <SpecCard icon={<BedDouble className="size-4" />} label="Dormitorios" value={`${listing.bedrooms}`} hint={`${listing.suites} en suite`} />
              <SpecCard icon={<Bath className="size-4" />} label="Banos" value={`${listing.bathrooms}`} hint="configuracion actual" />
              <SpecCard icon={<Ruler className="size-4" />} label="Construccion" value={`${listing.area} m2`} hint={`${listing.lotArea} m2 totales`} />
              <SpecCard icon={<CalendarDays className="size-4" />} label="Disponible" value={listing.availableFrom || "Inmediata"} hint="fecha estimada" />
            </div>
          </div>

          <div className="space-y-5 xl:sticky xl:top-24 xl:h-fit">
            <section className="rounded-[26px] border border-slate-200 bg-white p-5 shadow-[0_28px_90px_-58px_rgba(15,23,42,0.25)] sm:p-6">
              <div className="flex items-start gap-4">
                <div className="flex size-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
                  <Sparkles className="size-6" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-500">Inmobiliaria responsable</p>
                  <h2 className="mt-1 text-2xl font-semibold text-slate-950">{agency.ownerName}</h2>
                  <p className="mt-2 text-sm text-slate-500">{agency.tagline}</p>
                </div>
              </div>

              <div className="mt-5 space-y-2 text-sm text-slate-600">
                <p>{agency.email}</p>
                <p>{agency.phone}</p>
                <p>{agency.city}</p>
              </div>

              <div className="mt-6 rounded-[24px] border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Resumen de la oportunidad</p>
                <p className="mt-2 text-sm leading-7 text-slate-600">{listing.summary}</p>
              </div>
            </section>

            <PublicCustomerChat
              tenantSlug={agency.slug}
              propertyId={property.id}
              propertyTitle={property.title}
              currentUser={currentUser}
            />

            <CatalogInquiryForm
              tenantSlug={agency.slug}
              propertyId={property.id}
              compact
              title="Solicitar mas informacion"
              description="Deja tus datos para coordinar visita, resolver dudas o recibir propiedades similares."
            />
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
          <div className="space-y-6">
            <section className="rounded-[26px] border border-slate-200 bg-white p-5 shadow-[0_28px_90px_-58px_rgba(15,23,42,0.22)] sm:p-6">
              <p className="text-sm font-medium text-slate-500">Acerca de esta propiedad</p>
              <h2 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">
                Una ficha clara para acelerar la decision
              </h2>
              <div className="mt-5 space-y-4 text-sm leading-8 text-slate-600 sm:text-base">
                <p>{listing.description}</p>
                <p>{listing.summary}</p>
              </div>
            </section>

            <section className="rounded-[26px] border border-slate-200 bg-white p-5 shadow-[0_28px_90px_-58px_rgba(15,23,42,0.22)] sm:p-6">
              <p className="text-sm font-medium text-slate-500">Condiciones y requisitos</p>
              <h2 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">
                Informacion clave antes de consultar
              </h2>
              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                <DetailTile icon={<PawPrint className="size-4" />} label="Mascotas" value={listing.petsPolicy || "Consultar"} />
                <DetailTile icon={<CarFront className="size-4" />} label="Cocheras" value={String(listing.parkingSpots)} />
                <DetailTile
                  icon={<ChartColumnIncreasing className="size-4" />}
                  label="Expensas"
                  value={
                    listing.expenses && listing.expensesCurrency
                      ? formatMoney(listing.expenses, listing.expensesCurrency)
                      : "No informadas"
                  }
                />
                <DetailTile
                  icon={<CalendarDays className="size-4" />}
                  label="Disponible desde"
                  value={listing.availableFrom || "Inmediata"}
                />
              </div>

              <div className="mt-5 rounded-[22px] border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Requisitos</p>
                <p className="mt-2 text-sm leading-7 text-slate-600">
                  {listing.requirements || "La inmobiliaria no cargo requisitos adicionales por el momento."}
                </p>
              </div>
            </section>

            <section className="rounded-[26px] border border-slate-200 bg-white p-5 shadow-[0_28px_90px_-58px_rgba(15,23,42,0.22)] sm:p-6">
              <p className="text-sm font-medium text-slate-500">Amenities y ventajas</p>
              <h2 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">
                Lo mas importante en una sola vista
              </h2>
              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                {listing.amenities.map((amenity) => (
                  <div
                    key={amenity}
                    className="rounded-[22px] border border-slate-200 bg-slate-50 px-4 py-4 text-sm font-medium text-slate-700"
                  >
                    {amenity}
                  </div>
                ))}
              </div>
            </section>
          </div>

          <div className="space-y-6">
            <section className="rounded-[26px] border border-slate-200 bg-slate-950 p-5 text-white shadow-[0_28px_90px_-58px_rgba(15,23,42,0.34)] sm:p-6">
              <p className="text-sm font-medium uppercase tracking-[0.18em] text-blue-100">
                Lectura de inversion
              </p>
              <h2 className="mt-2 text-3xl font-semibold tracking-tight">
                Indicadores para comparar rapido
              </h2>
              <div className="mt-6 grid gap-3 sm:grid-cols-3">
                <DarkMetric label="Yield" value={`${listing.yieldPercent}%`} />
                <DarkMetric label="Apreciacion" value={`${listing.appreciationPercent}%`} />
                <DarkMetric label="Score" value={`${listing.investmentScore}`} />
              </div>
              <div className="mt-5 rounded-[24px] border border-white/10 bg-white/5 p-4">
                <p className="inline-flex items-center gap-2 text-sm font-medium text-white/88">
                  <ChartColumnIncreasing className="size-4" />
                  Lectura de valor
                </p>
                <p className="mt-3 text-sm leading-7 text-white/75">
                  Esta propiedad combina {listing.propertyType.toLowerCase()}, ubicacion en {listing.neighborhood} y un precio por metro competitivo para el rango actual del marketplace.
                </p>
              </div>
            </section>

            <section className="rounded-[26px] border border-slate-200 bg-white p-5 shadow-[0_28px_90px_-58px_rgba(15,23,42,0.22)] sm:p-6">
              <p className="text-sm font-medium text-slate-500">Ubicacion</p>
              <h2 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">
                Direccion cargada para mapa y visita
              </h2>
              <div className="mt-6 overflow-hidden rounded-[28px] border border-slate-200 bg-white">
                <iframe
                  title={`Mapa de ${listing.title}`}
                  src={buildGoogleMapsEmbedUrl(address)}
                  className="h-[280px] w-full border-0 sm:h-[340px]"
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                />
              </div>
              <p className="mt-3 text-sm leading-7 text-slate-500">{address}</p>
              <a
                href={buildGoogleMapsExternalUrl(address)}
                target="_blank"
                rel="noreferrer"
                className="mt-4 inline-flex rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
              >
                Abrir en Google Maps
              </a>
            </section>
          </div>
        </section>

        {relatedListings.length > 0 ? (
          <section className="space-y-6">
            <div>
              <p className="text-sm font-medium text-slate-500">Continuar explorando</p>
              <h2 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">
                Propiedades relacionadas
              </h2>
            </div>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {relatedListings.map((item) => (
                <Link
                  key={item.id}
                  href={item.routeHref}
                  className="overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-[0_24px_70px_-52px_rgba(15,23,42,0.24)] transition-transform hover:-translate-y-1"
                >
                  <div className="relative h-44 overflow-hidden sm:h-52">
                    <Image src={item.image} alt={item.title} fill className="object-cover" />
                  </div>
                  <div className="space-y-2 p-4 sm:p-5">
                    <p className="text-lg font-semibold text-slate-950 sm:text-xl">
                      {formatMoney(item.price, item.currency)}
                    </p>
                    <h3 className="line-clamp-2 text-base font-semibold text-slate-900 sm:text-lg">{item.title}</h3>
                    <p className="line-clamp-2 text-sm text-slate-500">{item.location}</p>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        ) : null}
      </main>
    </div>
  );
}

function SpecCard({
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
    <div className="rounded-[24px] border border-slate-200 bg-white px-4 py-4 shadow-[0_20px_50px_-40px_rgba(15,23,42,0.2)]">
      <div className="flex size-10 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
        {icon}
      </div>
      <p className="mt-4 text-xs uppercase tracking-[0.18em] text-slate-400">{label}</p>
      <p className="mt-2 text-xl font-semibold text-slate-950">{value}</p>
      <p className="mt-1 text-sm text-slate-500">{hint}</p>
    </div>
  );
}

function DetailTile({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-[22px] border border-slate-200 bg-slate-50 px-4 py-4">
      <div className="inline-flex items-center gap-2 text-sm font-medium text-slate-500">
        {icon}
        {label}
      </div>
      <p className="mt-2 text-base font-semibold text-slate-950">{value}</p>
    </div>
  );
}

function DarkMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[22px] border border-white/10 bg-white/5 px-4 py-4">
      <p className="text-xs uppercase tracking-[0.18em] text-white/45">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-white">{value}</p>
    </div>
  );
}
