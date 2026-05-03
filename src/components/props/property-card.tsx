import Image from "next/image";
import { CalendarDays, HousePlus, MapPin, MessageCircleWarning } from "lucide-react";

import type { Property } from "@/lib/mock-data";
import { RentalContractDialog } from "@/components/props/rental-contract-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn, formatArsCurrency, formatCurrency, formatShortDate } from "@/lib/utils";

const statusStyles: Record<Property["status"], string> = {
  Disponible: "bg-emerald-500/10 text-emerald-700",
  Reservada: "bg-amber-500/10 text-amber-700",
  Vendida: "bg-slate-900/10 text-slate-700",
  Alquilada: "bg-blue-500/10 text-blue-700",
};

export function PropertyCard({ property }: { property: Property }) {
  const isRental = property.operation === "Alquiler";

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

        <div className="rounded-[24px] border bg-muted/20 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm text-muted-foreground">
                {isRental ? "Precio publicado" : "Valor de publicación"}
              </p>
              <p className="text-xl font-semibold">
                {isRental ? formatArsCurrency(property.price) : formatCurrency(property.price)}
              </p>
            </div>

            {isRental ? (
              <RentalContractDialog property={property} />
            ) : (
              <Button variant="outline" className="rounded-2xl" disabled>
                <HousePlus className="size-4" />
                Venta
              </Button>
            )}
          </div>

          {isRental ? (
            <div className="mt-4 rounded-[20px] bg-background p-4">
              {property.rentalContract ? (
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="font-medium">{property.rentalContract.tenantName}</p>
                      <p className="text-sm text-muted-foreground">{property.rentalContract.tenantPhone}</p>
                    </div>
                    <Badge variant="outline" className="rounded-full">
                      {property.rentalContract.indexType} cada{" "}
                      {property.rentalContract.adjustmentFrequencyMonths} meses
                    </Badge>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-2xl border px-3 py-3">
                      <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Alquiler actual</p>
                      <p className="mt-1 text-lg font-semibold">
                        {formatArsCurrency(property.rentalContract.currentRent)}
                      </p>
                    </div>
                    <div className="rounded-2xl border px-3 py-3">
                      <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Próximo aumento</p>
                      <p className="mt-1 flex items-center gap-2 text-lg font-semibold">
                        <CalendarDays className="size-4 text-primary" />
                        {formatShortDate(property.rentalContract.nextAdjustmentDate)}
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex items-start gap-3 text-sm text-muted-foreground">
                  <MessageCircleWarning className="mt-0.5 size-4 text-primary" />
                  <p>
                    Esta propiedad todavía no tiene contrato activo. Configuralo para automatizar IPC/ICL y avisos al inquilino.
                  </p>
                </div>
              )}
            </div>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
