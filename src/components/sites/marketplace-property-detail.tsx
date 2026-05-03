import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import {
  ArrowLeft,
  Bath,
  BedDouble,
  Building2,
  CalendarRange,
  ChartColumnIncreasing,
  MapPin,
  Ruler,
  Sparkles,
} from "lucide-react";

import type { Agency, Property } from "@/lib/mock-data";
import { CatalogInquiryForm } from "@/components/sites/catalog-inquiry-form";
import { buildPublicListings } from "@/lib/public-marketplace";
import { formatCurrency } from "@/lib/utils";

export function MarketplacePropertyDetail({
  agency,
  property,
  allAgencies,
  relatedProperties,
}: {
  agency: Agency | null;
  property: Property | null;
  allAgencies: Agency[];
  relatedProperties: Property[];
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

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,rgba(237,242,255,0.88)_0%,rgba(247,249,252,1)_24%,rgba(255,255,255,1)_100%)]">
      <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/88 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1480px] items-center justify-between gap-4 px-4 py-4 sm:px-6 xl:px-8">
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 transition-colors hover:text-slate-950"
            >
              <ArrowLeft className="size-4" />
              Volver a explorar
            </Link>
            <div className="hidden h-6 w-px bg-slate-200 sm:block" />
            <Link href="/" className="hidden text-xl font-semibold tracking-tight text-slate-950 sm:block">
              Props
            </Link>
            <nav className="hidden items-center gap-1 rounded-full border border-slate-200 bg-slate-50 p-1 lg:flex">
              <Link href="/?view=explorar" className="rounded-full bg-white px-4 py-2 text-sm font-medium text-slate-950 shadow-sm">
                Explorar
              </Link>
              <Link href="/?view=mapa" className="rounded-full px-4 py-2 text-sm font-medium text-slate-500 transition-colors hover:text-slate-950">
                Mapa
              </Link>
              <Link href="/?view=favoritos" className="rounded-full px-4 py-2 text-sm font-medium text-slate-500 transition-colors hover:text-slate-950">
                Favoritos
              </Link>
              <Link href="/?view=inversiones" className="rounded-full px-4 py-2 text-sm font-medium text-slate-500 transition-colors hover:text-slate-950">
                Inversiones
              </Link>
            </nav>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href={listing.catalogHref}
              className="hidden rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 transition-colors hover:text-slate-950 sm:inline-flex"
            >
              Ver catalogo de {agency.name}
            </Link>
            <Link
              href="https://app.props.com.ar"
              className="inline-flex h-11 items-center rounded-2xl bg-slate-950 px-5 text-sm font-semibold text-white transition-colors hover:bg-slate-800"
            >
              Dashboard
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1480px] space-y-10 px-4 py-8 sm:px-6 xl:px-8">
        <section className="grid gap-8 xl:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-6">
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
            </div>

            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-4xl">
                <h1 className="text-4xl font-semibold tracking-tight text-slate-950 sm:text-5xl">
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

              <div className="rounded-[28px] border border-slate-200 bg-white px-5 py-4 shadow-[0_20px_60px_-40px_rgba(15,23,42,0.25)]">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Precio</p>
                <p className="mt-2 text-3xl font-semibold text-slate-950">
                  {formatCurrency(listing.price)}
                </p>
                <p className="mt-1 text-sm text-slate-500">US$ {listing.pricePerSquareMeter} / m²</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="relative h-[320px] overflow-hidden rounded-[32px] border border-slate-200 bg-white sm:h-[460px] xl:h-[560px]">
                <Image src={listing.images[0]} alt={listing.title} fill className="object-cover" />
              </div>

              <div className="grid gap-4 sm:grid-cols-4">
                {listing.images.slice(1, 4).map((image, index) => (
                  <div
                    key={`${image}-${index}`}
                    className="relative h-28 overflow-hidden rounded-[24px] border border-slate-200 bg-white sm:h-36"
                  >
                    <Image src={image} alt={listing.title} fill className="object-cover" />
                  </div>
                ))}
                <div className="flex items-center justify-center rounded-[24px] border border-dashed border-slate-300 bg-slate-50 text-center">
                  <div>
                    <p className="text-2xl font-semibold text-slate-900">+{Math.max(0, listing.images.length - 3)}</p>
                    <p className="text-sm text-slate-500">Mas vistas</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <SpecCard icon={<BedDouble className="size-4" />} label="Dormitorios" value={`${listing.bedrooms}`} hint={`${listing.suites} en suite`} />
              <SpecCard icon={<Bath className="size-4" />} label="Baños" value={`${listing.bathrooms}`} hint="terminaciones premium" />
              <SpecCard icon={<Ruler className="size-4" />} label="Construccion" value={`${listing.area} m²`} hint={`${listing.lotArea} m² totales`} />
              <SpecCard icon={<CalendarRange className="size-4" />} label="Año" value={`${listing.yearBuilt}`} hint="ultimo refresh comercial" />
            </div>
          </div>

          <div className="space-y-6 xl:sticky xl:top-24 xl:h-fit">
            <section className="rounded-[30px] border border-slate-200 bg-white p-6 shadow-[0_28px_90px_-58px_rgba(15,23,42,0.25)]">
              <div className="flex items-start gap-4">
                <div className="flex size-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
                  <Sparkles className="size-6" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-500">Asesor responsable</p>
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
                <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Lectura comercial</p>
                <p className="mt-2 text-sm leading-7 text-slate-600">{listing.summary}</p>
              </div>
            </section>

            <CatalogInquiryForm
              tenantSlug={agency.slug}
              propertyId={property.id}
              compact
              title="Solicitar mas informacion"
              description="Deja tus datos para coordinar visita, resolver dudas comerciales o recibir propiedades similares."
            />
          </div>
        </section>

        <section className="grid gap-8 xl:grid-cols-[1.05fr_0.95fr]">
          <div className="space-y-8">
            <section className="rounded-[30px] border border-slate-200 bg-white p-6 shadow-[0_28px_90px_-58px_rgba(15,23,42,0.22)]">
              <p className="text-sm font-medium text-slate-500">Acerca de esta propiedad</p>
              <h2 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">
                Una ficha clara para acelerar la decision
              </h2>
              <div className="mt-5 space-y-4 text-sm leading-8 text-slate-600 sm:text-base">
                <p>{listing.description}</p>
                <p>{listing.summary}</p>
                <p>
                  La publicacion se integra al ecosistema de {agency.name} y queda disponible para consulta directa, seguimiento comercial y recorrido por propiedades relacionadas del mismo marketplace.
                </p>
              </div>
            </section>

            <section className="rounded-[30px] border border-slate-200 bg-white p-6 shadow-[0_28px_90px_-58px_rgba(15,23,42,0.22)]">
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

          <div className="space-y-8">
            <section className="rounded-[30px] border border-slate-200 bg-slate-950 p-6 text-white shadow-[0_28px_90px_-58px_rgba(15,23,42,0.34)]">
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
                  Posicionamiento comercial
                </p>
                <p className="mt-3 text-sm leading-7 text-white/75">
                  Esta propiedad combina {listing.propertyType.toLowerCase()}, ubicacion en {listing.neighborhood} y un precio por metro competitivo para el rango actual del marketplace.
                </p>
              </div>
            </section>

            <section className="rounded-[30px] border border-slate-200 bg-white p-6 shadow-[0_28px_90px_-58px_rgba(15,23,42,0.22)]">
              <p className="text-sm font-medium text-slate-500">Ubicacion</p>
              <h2 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">
                Contexto visual del activo
              </h2>
              <div className="relative mt-6 h-[320px] overflow-hidden rounded-[28px] border border-slate-200 bg-[linear-gradient(135deg,rgba(222,246,247,0.82)_0%,rgba(228,236,247,0.92)_100%)]">
                <div className="absolute inset-0 opacity-70 [background-image:linear-gradient(rgba(255,255,255,0.68)_2px,transparent_2px),linear-gradient(90deg,rgba(255,255,255,0.68)_2px,transparent_2px)] [background-size:72px_72px]" />
                <div
                  className="absolute flex h-14 w-14 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-slate-950 text-white shadow-xl"
                  style={{ left: `${listing.mapX}%`, top: `${listing.mapY}%` }}
                >
                  <MapPin className="size-5" />
                </div>
              </div>
              <p className="mt-3 text-sm leading-7 text-slate-500">
                {listing.location}. La ubicacion exacta se comparte durante el proceso de contacto para preservar privacidad y calificacion del lead.
              </p>
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
            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {relatedListings.map((item) => (
                <Link
                  key={item.id}
                  href={item.routeHref}
                  className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_24px_70px_-52px_rgba(15,23,42,0.24)] transition-transform hover:-translate-y-1"
                >
                  <div className="relative h-56 overflow-hidden">
                    <Image src={item.image} alt={item.title} fill className="object-cover" />
                  </div>
                  <div className="space-y-3 p-5">
                    <p className="text-xl font-semibold text-slate-950">{formatCurrency(item.price)}</p>
                    <h3 className="text-lg font-semibold text-slate-900">{item.title}</h3>
                    <p className="text-sm text-slate-500">{item.location}</p>
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

function DarkMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[22px] border border-white/10 bg-white/5 px-4 py-4">
      <p className="text-xs uppercase tracking-[0.18em] text-white/45">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-white">{value}</p>
    </div>
  );
}
