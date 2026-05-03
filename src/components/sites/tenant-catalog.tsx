"use client";

import Image from "next/image";
import Link from "next/link";
import { MapPin } from "lucide-react";

import { Button } from "@/components/ui/button";
import { usePropsStore } from "@/lib/store/use-props-store";
import { formatCurrency } from "@/lib/utils";

export function TenantCatalog({ tenantSlug }: { tenantSlug: string }) {
  const { agencies, properties } = usePropsStore();
  const agency = agencies.find((item) => item.slug === tenantSlug);
  const tenantProperties = properties.filter((property) => property.tenantSlug === tenantSlug);

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
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(37,99,235,0.12),transparent_28%),#f8fafc]">
      <header className="border-b bg-white/85 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-5 sm:px-6">
          <div>
            <p className="text-sm uppercase tracking-[0.28em] text-blue-600">Props Catalog</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight">{agency.name}</h1>
            <p className="mt-2 text-sm text-slate-600">{agency.tagline}</p>
          </div>
          <Button className="rounded-2xl">Contactar</Button>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <section className="mb-8 grid gap-4 md:grid-cols-3">
          <div className="rounded-[28px] border bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">Ciudad</p>
            <p className="mt-3 text-2xl font-semibold">{agency.city}</p>
          </div>
          <div className="rounded-[28px] border bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">Propiedades publicadas</p>
            <p className="mt-3 text-2xl font-semibold">{tenantProperties.length}</p>
          </div>
          <div className="rounded-[28px] border bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">Contacto</p>
            <p className="mt-3 text-lg font-semibold">{agency.phone}</p>
          </div>
        </section>

        <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {tenantProperties.map((property) => (
            <Link
              key={property.id}
              href={`/propiedad/${property.id}`}
              className="overflow-hidden rounded-[30px] border bg-white shadow-sm transition-transform hover:-translate-y-1"
            >
              <div className="relative h-64">
                <Image src={property.image} alt={property.title} fill className="object-cover" />
              </div>
              <div className="space-y-3 p-5">
                <div className="flex items-center justify-between gap-3">
                  <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                    {property.operation}
                  </span>
                  <span className="text-lg font-semibold">{formatCurrency(property.price)}</span>
                </div>
                <h2 className="text-xl font-semibold">{property.title}</h2>
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <MapPin className="size-4" />
                  <span>{property.location}</span>
                </div>
              </div>
            </Link>
          ))}
        </section>
      </main>
    </div>
  );
}
