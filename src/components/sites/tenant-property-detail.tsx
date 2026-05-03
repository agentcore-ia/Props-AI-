"use client";

import Image from "next/image";
import Link from "next/link";
import { MapPin } from "lucide-react";

import { Button } from "@/components/ui/button";
import { usePropsStore } from "@/lib/store/use-props-store";
import { formatCurrency } from "@/lib/utils";

export function TenantPropertyDetail({
  tenantSlug,
  propertyId,
}: {
  tenantSlug: string;
  propertyId: string;
}) {
  const { agencies, properties } = usePropsStore();
  const agency = agencies.find((item) => item.slug === tenantSlug);
  const property = properties.find(
    (item) => item.tenantSlug === tenantSlug && item.id === propertyId
  );

  if (!agency || !property) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
        <div className="rounded-[32px] border bg-white p-8 text-center shadow-sm">
          <h1 className="text-2xl font-semibold">Propiedad no encontrada</h1>
          <p className="mt-3 text-sm text-slate-600">
            La publicacion que buscas no existe para este catalogo.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-5 sm:px-6">
          <div>
            <p className="text-sm uppercase tracking-[0.28em] text-blue-600">{agency.name}</p>
            <h1 className="mt-2 text-3xl font-semibold">{property.title}</h1>
          </div>
          <Link href="/">
            <Button variant="outline" className="rounded-2xl">
              Volver al catalogo
            </Button>
          </Link>
        </div>
      </header>

      <main className="mx-auto grid max-w-7xl gap-6 px-4 py-8 sm:px-6 xl:grid-cols-[1.2fr_0.8fr]">
        <section className="space-y-4">
          <div className="relative h-[460px] overflow-hidden rounded-[32px] border bg-white">
            <Image src={property.images[0]} alt={property.title} fill className="object-cover" />
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {property.images.slice(1).map((image) => (
              <div key={image} className="relative h-36 overflow-hidden rounded-[24px] border bg-white">
                <Image src={image} alt={property.title} fill className="object-cover" />
              </div>
            ))}
          </div>
        </section>

        <aside className="rounded-[32px] border bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
              {property.operation}
            </span>
            <span className="text-3xl font-semibold">{formatCurrency(property.price)}</span>
          </div>

          <div className="mt-6 flex items-center gap-2 text-sm text-slate-600">
            <MapPin className="size-4" />
            <span>{property.location}</span>
          </div>

          <p className="mt-6 text-sm leading-7 text-slate-600">{property.description}</p>

          <div className="mt-8 rounded-[24px] border bg-slate-50 p-5">
            <p className="font-semibold">Contacto</p>
            <p className="mt-2 text-sm text-slate-600">{agency.ownerName}</p>
            <p className="mt-1 text-sm text-slate-600">{agency.phone}</p>
            <p className="mt-1 text-sm text-slate-600">{agency.email}</p>
          </div>

          <Button className="mt-8 w-full rounded-2xl">Contactar por esta propiedad</Button>
        </aside>
      </main>
    </div>
  );
}
