import Image from "next/image";
import { MapPin } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Property } from "@/lib/mock-data";
import { cn, formatCurrency } from "@/lib/utils";

const statusStyles: Record<Property["status"], string> = {
  Disponible: "bg-emerald-500/10 text-emerald-700",
  Reservada: "bg-amber-500/10 text-amber-700",
  Vendida: "bg-slate-900/10 text-slate-700",
  Alquilada: "bg-blue-500/10 text-blue-700",
};

export function PropertyCard({ property }: { property: Property }) {
  return (
    <Card className="overflow-hidden rounded-[30px] border-0 bg-card shadow-sm">
      <div className="relative h-56 overflow-hidden">
        <Image
          src={property.image}
          alt={property.title}
          fill
          sizes="(max-width: 768px) 100vw, (max-width: 1536px) 50vw, 33vw"
          className="object-cover transition-transform duration-500 hover:scale-105"
        />
      </div>
      <CardContent className="space-y-4 p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.24em] text-primary/75">
              {property.operation}
            </p>
            <h3 className="text-lg font-semibold">{property.title}</h3>
            <div className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
              <MapPin className="size-4" />
              <span>{property.location}</span>
            </div>
          </div>
          <Badge className={cn("rounded-full border-0", statusStyles[property.status])}>{property.status}</Badge>
        </div>
        <p className="text-sm leading-6 text-muted-foreground">{property.description}</p>
        <div className="border-t pt-4 text-xl font-semibold">{formatCurrency(property.price)}</div>
      </CardContent>
    </Card>
  );
}
