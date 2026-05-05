import Image from "next/image";
import Link from "next/link";
import { ChevronRight, MapPin } from "lucide-react";

import type { Property } from "@/lib/mock-data";
import { formatMoney } from "@/lib/utils";

export function TenantPropertyCard({ property }: { property: Property }) {
  return (
    <Link
      href={`/propiedad/${property.id}`}
      className="group block h-full overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-[0_24px_70px_-44px_rgba(15,23,42,0.32)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_30px_80px_-42px_rgba(37,99,235,0.35)]"
    >
      <div className="relative h-48 overflow-hidden sm:h-60">
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

      <div className="flex min-h-[192px] flex-col gap-3 p-4 sm:p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h3 className="line-clamp-2 text-xl font-semibold tracking-tight text-slate-950 sm:text-2xl">
              {property.title}
            </h3>
            <div className="mt-2 flex items-center gap-2 text-sm text-slate-500">
              <MapPin className="size-4 shrink-0" />
              <span>{property.location}</span>
            </div>
          </div>
          <div className="shrink-0 text-right">
            <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Precio</p>
            <p className="mt-1 text-base font-semibold text-slate-950 sm:text-xl">
              {formatMoney(property.price, property.currency)}
            </p>
          </div>
        </div>

        <div className="mt-auto flex items-center justify-between border-t border-slate-100 pt-4">
          <span className="text-sm font-medium text-slate-500">Ver detalle completo</span>
          <span className="inline-flex items-center gap-1 text-sm font-semibold text-blue-700">
            Explorar
            <ChevronRight className="size-4" />
          </span>
        </div>
      </div>
    </Link>
  );
}
