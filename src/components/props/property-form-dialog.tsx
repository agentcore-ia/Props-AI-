"use client";

import { useState } from "react";
import { ImagePlus, Plus } from "lucide-react";

import type { Agency, Property } from "@/lib/mock-data";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { usePropsStore } from "@/lib/store/use-props-store";

const initialState = {
  tenantSlug: "",
  title: "",
  price: "",
  location: "",
  description: "",
  status: "Disponible" as Property["status"],
  operation: "Venta" as Property["operation"],
  image: "",
};

export function PropertyFormDialog({ agencies }: { agencies: Agency[] }) {
  const { createProperty } = usePropsStore();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    ...initialState,
    tenantSlug: agencies[0]?.slug ?? "",
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button className="rounded-2xl" />}>
        <Plus className="size-4" />
        Nueva propiedad
      </DialogTrigger>
      <DialogContent className="max-w-2xl rounded-[28px] p-0">
        <div className="p-6">
          <DialogHeader>
            <DialogTitle>Nueva propiedad</DialogTitle>
            <DialogDescription>
              Carga una propiedad y se publicara automaticamente en el catalogo del cliente elegido.
            </DialogDescription>
          </DialogHeader>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-medium">Inmobiliaria</label>
              <select
                className="flex h-10 w-full rounded-lg border bg-background px-3 text-sm outline-none"
                value={form.tenantSlug}
                onChange={(event) => setForm((prev) => ({ ...prev, tenantSlug: event.target.value }))}
              >
                {agencies.map((agency) => (
                  <option key={agency.id} value={agency.slug}>
                    {agency.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-medium">Titulo</label>
              <Input
                placeholder="Torre Libertad 4B"
                value={form.title}
                onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Precio</label>
              <Input
                placeholder="250000"
                value={form.price}
                onChange={(event) => setForm((prev) => ({ ...prev, price: event.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Operacion</label>
              <select
                className="flex h-10 w-full rounded-lg border bg-background px-3 text-sm outline-none"
                value={form.operation}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, operation: event.target.value as Property["operation"] }))
                }
              >
                <option value="Venta">Venta</option>
                <option value="Alquiler">Alquiler</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Estado</label>
              <select
                className="flex h-10 w-full rounded-lg border bg-background px-3 text-sm outline-none"
                value={form.status}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, status: event.target.value as Property["status"] }))
                }
              >
                <option value="Disponible">Disponible</option>
                <option value="Reservada">Reservada</option>
                <option value="Vendida">Vendida</option>
                <option value="Alquilada">Alquilada</option>
              </select>
            </div>

            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-medium">Ubicacion</label>
              <Input
                placeholder="Belgrano, CABA"
                value={form.location}
                onChange={(event) => setForm((prev) => ({ ...prev, location: event.target.value }))}
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-medium">Imagen principal</label>
              <Input
                placeholder="https://..."
                value={form.image}
                onChange={(event) => setForm((prev) => ({ ...prev, image: event.target.value }))}
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-medium">Descripcion</label>
              <Textarea
                placeholder="Detalles destacados, amenities y contexto comercial..."
                rows={5}
                value={form.description}
                onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
              />
            </div>

            <div className="md:col-span-2">
              <div className="flex min-h-28 items-center justify-center rounded-[24px] border border-dashed bg-muted/40">
                <div className="text-center">
                  <div className="mx-auto mb-3 flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                    <ImagePlus className="size-5" />
                  </div>
                  <p className="font-medium">Subpagina enlazada automaticamente</p>
                  <p className="text-sm text-muted-foreground">
                    Al guardar, la propiedad quedara visible en {form.tenantSlug || "el subdominio del cliente"}.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <Button
            onClick={() => {
              createProperty({
                tenantSlug: form.tenantSlug,
                title: form.title,
                price: Number(form.price) || 0,
                description: form.description,
                status: form.status,
                operation: form.operation,
                location: form.location,
                image: form.image,
              });
              setForm({
                ...initialState,
                tenantSlug: agencies[0]?.slug ?? "",
              });
              setOpen(false);
            }}
          >
            Guardar y publicar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
