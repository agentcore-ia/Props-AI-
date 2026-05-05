import Link from "next/link";
import type { ReactNode } from "react";
import {
  ArrowLeft,
  Building2,
  CalendarDays,
  Camera,
  CarFront,
  CheckCircle2,
  Globe,
  MapPin,
  MessageSquareMore,
  PawPrint,
  Phone,
} from "lucide-react";

import type { Agency, Property } from "@/lib/mock-data";
import { CatalogInquiryForm } from "@/components/sites/catalog-inquiry-form";
import { PropertyGallery } from "@/components/sites/property-gallery";
import { TenantPropertyCard } from "@/components/sites/tenant-property-card";
import {
  buildGoogleMapsEmbedUrl,
  buildGoogleMapsExternalUrl,
  formatMoney,
} from "@/lib/utils";

const highlights = [
  "Acompanamiento comercial personalizado",
  "Visitas coordinadas con respuesta agil",
  "Analisis de opcion segun necesidad y presupuesto",
];

export function TenantPropertyDetail({
  agency,
  property,
  relatedProperties,
}: {
  agency: Agency | null;
  property: Property | null;
  relatedProperties: Property[];
}) {
  if (!agency || !property) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
        <div className="rounded-[32px] border bg-white p-8 text-center shadow-sm">
          <h1 className="text-2xl font-semibold">Propiedad no encontrada</h1>
          <p className="mt-3 text-sm text-slate-600">
            La publicacion que buscas no existe para este portafolio.
          </p>
        </div>
      </div>
    );
  }

  const address = property.exactAddress || property.location;
  const socialLinks = [
    agency.websiteUrl ? { label: "Sitio web", href: agency.websiteUrl, icon: <Globe className="size-4" /> } : null,
    agency.instagramUrl ? { label: "Instagram", href: agency.instagramUrl, icon: <Camera className="size-4" /> } : null,
    agency.facebookUrl ? { label: "Facebook", href: agency.facebookUrl, icon: <Building2 className="size-4" /> } : null,
  ].filter(Boolean) as Array<{ label: string; href: string; icon: ReactNode }>;

  return (
    <div className="min-h-screen overflow-x-hidden bg-[linear-gradient(180deg,rgba(241,245,249,0.95)_0%,rgba(255,255,255,1)_28%,rgba(255,255,255,1)_100%)]">
      <header className="border-b border-slate-200 bg-white/85 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1440px] min-w-0 flex-col gap-4 px-4 py-5 sm:px-6 xl:px-8">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 transition-colors hover:text-slate-900"
          >
            <ArrowLeft className="size-4" />
            Volver al portafolio
          </Link>

          <div className="flex min-w-0 flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="min-w-0 max-w-3xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-blue-700">
                <Building2 className="size-3.5" />
                {agency.name}
              </div>
              <h1 className="mt-4 break-words text-3xl font-semibold leading-tight tracking-tight text-slate-950 sm:text-4xl">
                {property.title}
              </h1>
              <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-slate-500">
                <span className="rounded-full bg-white px-3 py-1 font-semibold text-slate-700 ring-1 ring-slate-200">
                  {property.operation}
                </span>
                <span className="rounded-full bg-slate-900 px-3 py-1 font-semibold text-white">
                  {property.status}
                </span>
                <span className="inline-flex items-center gap-2">
                  <MapPin className="size-4" />
                  {property.location}
                </span>
              </div>
            </div>

            <div className="w-full rounded-[28px] border border-slate-200 bg-white px-5 py-4 shadow-[0_18px_45px_-32px_rgba(15,23,42,0.25)] sm:w-auto">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Valor publicado</p>
              <p className="mt-2 text-3xl font-semibold text-slate-950">
                {formatMoney(property.price, property.currency)}
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1440px] overflow-x-hidden space-y-8 px-4 py-6 sm:px-6 xl:px-8">
        <section className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)] xl:items-start">
          <div className="min-w-0 space-y-4">
            <PropertyGallery title={property.title} images={property.images} />
          </div>

          <div className="min-w-0 space-y-6">
            <section className="rounded-[26px] border border-slate-200 bg-white p-5 shadow-[0_24px_80px_-48px_rgba(15,23,42,0.3)] sm:p-6">
              <h2 className="text-2xl font-semibold text-slate-950">Resumen comercial</h2>
              <p className="mt-4 text-sm leading-7 text-slate-600">{property.description}</p>

              <div className="mt-6 grid gap-3">
                {highlights.map((highlight) => (
                  <div key={highlight} className="flex items-start gap-3">
                    <CheckCircle2 className="mt-0.5 size-4 text-emerald-600" />
                    <p className="text-sm text-slate-600">{highlight}</p>
                  </div>
                ))}
              </div>

              <div className="mt-6 grid grid-cols-2 gap-3">
                <InfoTile label="Mascotas" value={property.petsPolicy || "Consultar"} icon={<PawPrint className="size-4" />} />
                <InfoTile label="Cocheras" value={String(property.parkingSpots)} icon={<CarFront className="size-4" />} />
                <InfoTile
                  label="Expensas"
                  value={
                    property.expenses && property.expensesCurrency
                      ? formatMoney(property.expenses, property.expensesCurrency)
                      : "No informadas"
                  }
                  icon={<CalendarDays className="size-4" />}
                />
                <InfoTile
                  label="Disponible desde"
                  value={property.availableFrom || "Inmediata"}
                  icon={<CalendarDays className="size-4" />}
                />
              </div>

              <div className="mt-5 rounded-[22px] border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Requisitos</p>
                <p className="mt-2 text-sm leading-7 text-slate-600">
                  {property.requirements || "Sin requisitos especiales cargados por la inmobiliaria."}
                </p>
              </div>
            </section>

            <section className="rounded-[30px] border border-slate-200 bg-slate-950 p-6 text-white shadow-[0_24px_80px_-48px_rgba(15,23,42,0.55)]">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.24em] text-blue-100">
                    Asesor asignado
                  </p>
                  <h3 className="mt-3 text-2xl font-semibold">{agency.ownerName}</h3>
                </div>
                <div className="flex size-11 items-center justify-center rounded-2xl bg-white/10">
                  <MessageSquareMore className="size-5" />
                </div>
              </div>

              <div className="mt-5 space-y-3 text-sm text-white/80">
                <p>{agency.email}</p>
                <p className="inline-flex items-center gap-2">
                  <Phone className="size-4" />
                  {agency.phone}
                </p>
                <p>{agency.city}</p>
              </div>

              <div className="mt-5 flex flex-wrap gap-2">
                <Link
                  href={`/${agency.slug}`}
                  className="inline-flex items-center rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-950 transition-colors hover:bg-blue-50"
                >
                  Ver perfil y propiedades
                </Link>
                {socialLinks.map((item) => (
                  <a
                    key={item.label}
                    href={item.href}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-2 text-xs font-semibold text-white/85 transition-colors hover:bg-white/10"
                  >
                    {item.icon}
                    {item.label}
                  </a>
                ))}
              </div>
            </section>

            <CatalogInquiryForm
              tenantSlug={agency.slug}
              propertyId={property.id}
              compact
              title="Solicitar mas informacion"
              description="Consulta disponibilidad, coordinacion de visita o condiciones comerciales de esta propiedad."
            />
          </div>
        </section>

        <section className="rounded-[26px] border border-slate-200 bg-white p-5 shadow-[0_24px_70px_-48px_rgba(15,23,42,0.22)] sm:p-6">
          <p className="text-sm font-medium text-slate-500">Ubicacion</p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">
            Direccion cargada para llegar mejor a la visita
          </h2>
          <div className="mt-6 overflow-hidden rounded-[28px] border border-slate-200 bg-white">
            <iframe
              title={`Mapa de ${property.title}`}
              src={buildGoogleMapsEmbedUrl(address)}
              className="h-[280px] w-full border-0 sm:h-[360px]"
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

        {relatedProperties.length > 0 ? (
          <section className="space-y-6">
            <div>
              <p className="text-sm font-medium text-slate-500">Mas propiedades de la inmobiliaria</p>
              <h2 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">
                Propiedades relacionadas
              </h2>
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {relatedProperties.map((item) => (
                <TenantPropertyCard key={item.id} property={item} />
              ))}
            </div>
          </section>
        ) : null}
      </main>
    </div>
  );
}

function InfoTile({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: ReactNode;
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
