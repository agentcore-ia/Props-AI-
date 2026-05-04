import Image from "next/image";
import Link from "next/link";
import { CalendarDays, HousePlus, MapPin, MessageCircleWarning } from "lucide-react";

import type { Property } from "@/lib/mock-data";
import { RentalContractDialog } from "@/components/props/rental-contract-dialog";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn, formatArsCurrency, formatMoney, formatShortDate } from "@/lib/utils";

const statusStyles: Record<Property["status"], string> = {
  Disponible: "bg-emerald-500/10 text-emerald-700",
  Reservada: "bg-amber-500/10 text-amber-700",
  Vendida: "bg-slate-900/10 text-slate-700",
  Alquilada: "bg-blue-500/10 text-blue-700",
};

export function PropertyCard({ property }: { property: Property }) {
  const isRental = property.operation === "Alquiler";
  const reviewReasons = (property.rentalContract?.notes ?? "")
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.startsWith("[Revision requerida]"))
    .map((line) => line.replace("[Revision requerida]", "").trim());
  const requiresReview =
    property.rentalContract?.status === "Pausado" && reviewReasons.length > 0;

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
              <p className="text-xl font-semibold">{formatMoney(property.price, property.currency)}</p>
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
                  {requiresReview ? (
                    <div className="rounded-2xl border border-amber-200 bg-amber-50 px-3 py-3 text-sm text-amber-800">
                      <p className="font-medium">Revisión requerida antes de automatizar</p>
                      <ul className="mt-2 space-y-1">
                        {reviewReasons.map((reason) => (
                          <li key={reason}>- {reason}</li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="font-medium">{property.rentalContract.tenantName}</p>
                      <p className="text-sm text-muted-foreground">{property.rentalContract.tenantPhone}</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="outline" className="rounded-full">
                        {property.rentalContract.indexType} cada{" "}
                        {property.rentalContract.adjustmentFrequencyMonths} meses
                      </Badge>
                      <Badge
                        className={cn(
                          "rounded-full border-0",
                          property.rentalContract.status === "Activo"
                            ? "bg-emerald-500/10 text-emerald-700"
                            : property.rentalContract.status === "Pausado"
                            ? "bg-amber-500/10 text-amber-700"
                            : "bg-slate-900/10 text-slate-700"
                        )}
                      >
                        {property.rentalContract.status}
                      </Badge>
                    </div>
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
                  {property.rentalContract.contractFileName ? (
                    <div className="rounded-2xl border px-3 py-3">
                      <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Contrato adjunto</p>
                      <div className="mt-2 flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate font-medium">{property.rentalContract.contractFileName}</p>
                          <p className="text-sm text-muted-foreground">
                            IA lista para leer cláusulas, fechas y aumentos.
                          </p>
                        </div>
                        <Link
                          href={`/api/admin/rental-contracts/${property.rentalContract.id}/document`}
                          target="_blank"
                          className={buttonVariants({ size: "sm", variant: "outline", className: "rounded-2xl" })}
                        >
                          Ver
                        </Link>
                      </div>
                    </div>
                  ) : null}
                </div>
              ) : (
                <div className="flex items-start gap-3 text-sm text-muted-foreground">
                  <MessageCircleWarning className="mt-0.5 size-4 text-primary" />
                  <p>
                    Esta propiedad todavía no tiene contrato activo. Adjunta el contrato para que Props detecte
                    fechas, monto y automatice IPC/ICL con avisos al inquilino.
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
