"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarDays, FileImage, ImagePlus, Loader2, Plus, UploadCloud } from "lucide-react";

import type { Agency, Property } from "@/lib/mock-data";
import type { CurrentUserContext } from "@/lib/auth/current-user";
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

const initialState = {
  tenantSlug: "",
  title: "",
  price: "",
  location: "",
  description: "",
  status: "Disponible" as Property["status"],
  operation: "Venta" as Property["operation"],
  manualImageUrl: "",
  rentEnabled: false,
  tenantName: "",
  tenantPhone: "",
  tenantEmail: "",
  currentRent: "",
  indexType: "IPC" as "IPC" | "ICL",
  adjustmentFrequencyMonths: "6",
  contractStartDate: "",
  nextAdjustmentDate: "",
  notes: "",
  autoNotify: true,
};

export function PropertyFormDialog({
  agencies,
  currentUser,
}: {
  agencies: Agency[];
  currentUser: CurrentUserContext;
}) {
  const router = useRouter();
  const defaultSlug =
    currentUser.profile.role === "agency_admin"
      ? currentUser.profile.agency_slug ?? agencies[0]?.slug ?? ""
      : agencies[0]?.slug ?? "";

  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    ...initialState,
    tenantSlug: defaultSlug,
  });
  const [imageFiles, setImageFiles] = useState<File[]>([]);

  const previews = useMemo(
    () => imageFiles.map((file) => ({ name: file.name, url: URL.createObjectURL(file) })),
    [imageFiles]
  );

  useEffect(() => {
    return () => {
      for (const preview of previews) {
        URL.revokeObjectURL(preview.url);
      }
    };
  }, [previews]);

  const isRental = form.operation === "Alquiler";

  async function handleCreateProperty() {
    setSubmitting(true);
    setError(null);

    const body = new FormData();
    body.set("tenantSlug", form.tenantSlug);
    body.set("title", form.title);
    body.set("price", form.price);
    body.set("location", form.location);
    body.set("description", form.description);
    body.set("status", form.status);
    body.set("operation", form.operation);
    body.set("manualImageUrl", form.manualImageUrl);
    body.set(
      "rentalContract",
      JSON.stringify({
        enabled: isRental && form.rentEnabled,
        tenantName: form.tenantName,
        tenantPhone: form.tenantPhone,
        tenantEmail: form.tenantEmail,
        currentRent: form.currentRent,
        indexType: form.indexType,
        adjustmentFrequencyMonths: form.adjustmentFrequencyMonths,
        contractStartDate: form.contractStartDate,
        nextAdjustmentDate: form.nextAdjustmentDate,
        notes: form.notes,
        autoNotify: form.autoNotify,
      })
    );

    for (const file of imageFiles) {
      body.append("images", file);
    }

    const response = await fetch("/api/admin/properties", {
      method: "POST",
      body,
    });

    const payload = await response.json().catch(() => null);

    if (!response.ok) {
      setSubmitting(false);
      setError(payload?.error ?? "No se pudo guardar la propiedad.");
      return;
    }

    setForm({
      ...initialState,
      tenantSlug: defaultSlug,
    });
    setImageFiles([]);
    setSubmitting(false);
    setOpen(false);
    router.refresh();
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (!nextOpen) {
          setError(null);
          setImageFiles([]);
          setForm({
            ...initialState,
            tenantSlug: defaultSlug,
          });
        }
      }}
    >
      <DialogTrigger render={<Button className="rounded-2xl" />}>
        <Plus className="size-4" />
        Nueva propiedad
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto rounded-[28px] p-0">
        <div className="p-6">
          <DialogHeader>
            <DialogTitle>Nueva propiedad</DialogTitle>
            <DialogDescription>
              Carga una propiedad con fotos reales, y si es alquiler podés dejar listo el contrato y su automatización de aumentos.
            </DialogDescription>
          </DialogHeader>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-medium">Inmobiliaria</label>
              <select
                className="flex h-10 w-full rounded-lg border bg-background px-3 text-sm outline-none"
                value={form.tenantSlug}
                disabled={currentUser.profile.role === "agency_admin"}
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
              <label className="text-sm font-medium">Precio publicado</label>
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

            <div className="space-y-3 md:col-span-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">Imagenes de la propiedad</label>
                <span className="text-xs text-muted-foreground">Hasta 10 MB por imagen</span>
              </div>
              <label className="flex cursor-pointer flex-col items-center justify-center rounded-[24px] border border-dashed bg-muted/30 px-6 py-8 text-center transition hover:bg-muted/50">
                <div className="mb-3 flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <UploadCloud className="size-5" />
                </div>
                <p className="font-medium">Arrastrá o elegí imágenes reales</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Se suben a tu storage y quedan listas para el marketplace y el subdominio de la inmobiliaria.
                </p>
                <input
                  className="hidden"
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/avif"
                  multiple
                  onChange={(event) =>
                    setImageFiles(Array.from(event.target.files ?? []))
                  }
                />
              </label>

              <div className="space-y-2">
                <label className="text-sm font-medium">O URL externa opcional</label>
                <Input
                  placeholder="https://..."
                  value={form.manualImageUrl}
                  onChange={(event) => setForm((prev) => ({ ...prev, manualImageUrl: event.target.value }))}
                />
              </div>

              {previews.length > 0 ? (
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  {previews.map((preview, index) => (
                    <div key={`${preview.name}-${index}`} className="overflow-hidden rounded-[22px] border bg-card">
                      <div className="relative h-36">
                        <Image src={preview.url} alt={preview.name} fill className="object-cover" unoptimized />
                      </div>
                      <div className="flex items-center gap-2 px-3 py-2 text-xs text-muted-foreground">
                        <FileImage className="size-3.5" />
                        <span className="truncate">{preview.name}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : null}
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

            {isRental ? (
              <div className="md:col-span-2 rounded-[28px] border bg-muted/30 p-5">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="font-semibold">Contrato de alquiler</p>
                    <p className="text-sm text-muted-foreground">
                      Si ya hay inquilino, dejá configurado el contrato y los aumentos automáticos.
                    </p>
                  </div>
                  <label className="flex items-center gap-2 text-sm font-medium">
                    <input
                      type="checkbox"
                      checked={form.rentEnabled}
                      onChange={(event) =>
                        setForm((prev) => ({ ...prev, rentEnabled: event.target.checked }))
                      }
                    />
                    Tiene contrato activo
                  </label>
                </div>

                {form.rentEnabled ? (
                  <div className="mt-5 grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Nombre del inquilino</label>
                      <Input
                        placeholder="Juan Perez"
                        value={form.tenantName}
                        onChange={(event) => setForm((prev) => ({ ...prev, tenantName: event.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">WhatsApp del inquilino</label>
                      <Input
                        placeholder="+54 11 5555 1234"
                        value={form.tenantPhone}
                        onChange={(event) => setForm((prev) => ({ ...prev, tenantPhone: event.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Email del inquilino</label>
                      <Input
                        placeholder="juan@email.com"
                        value={form.tenantEmail}
                        onChange={(event) => setForm((prev) => ({ ...prev, tenantEmail: event.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Alquiler actual (ARS)</label>
                      <Input
                        placeholder="850000"
                        value={form.currentRent}
                        onChange={(event) => setForm((prev) => ({ ...prev, currentRent: event.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Indice</label>
                      <select
                        className="flex h-10 w-full rounded-lg border bg-background px-3 text-sm outline-none"
                        value={form.indexType}
                        onChange={(event) =>
                          setForm((prev) => ({ ...prev, indexType: event.target.value as "IPC" | "ICL" }))
                        }
                      >
                        <option value="IPC">IPC</option>
                        <option value="ICL">ICL</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Cada cuantos meses aumenta</label>
                      <Input
                        placeholder="6"
                        value={form.adjustmentFrequencyMonths}
                        onChange={(event) =>
                          setForm((prev) => ({
                            ...prev,
                            adjustmentFrequencyMonths: event.target.value,
                          }))
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Inicio del contrato</label>
                      <Input
                        type="date"
                        value={form.contractStartDate}
                        onChange={(event) =>
                          setForm((prev) => ({ ...prev, contractStartDate: event.target.value }))
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Proximo aumento</label>
                      <Input
                        type="date"
                        value={form.nextAdjustmentDate}
                        onChange={(event) =>
                          setForm((prev) => ({ ...prev, nextAdjustmentDate: event.target.value }))
                        }
                      />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <label className="text-sm font-medium">Notas internas</label>
                      <Textarea
                        rows={3}
                        placeholder="Observaciones del contrato, cláusulas o recordatorios..."
                        value={form.notes}
                        onChange={(event) => setForm((prev) => ({ ...prev, notes: event.target.value }))}
                      />
                    </div>
                    <div className="md:col-span-2 rounded-[22px] border bg-background px-4 py-3 text-sm text-muted-foreground">
                      <div className="flex items-center gap-2 font-medium text-foreground">
                        <CalendarDays className="size-4" />
                        Aviso automático al inquilino
                      </div>
                      <p className="mt-1">
                        Cuando llegue la fecha, Props va a calcular el aumento por {form.indexType} y le enviará el nuevo valor por WhatsApp usando n8n.
                      </p>
                    </div>
                  </div>
                ) : null}
              </div>
            ) : null}

            <div className="md:col-span-2">
              <div className="flex min-h-28 items-center justify-center rounded-[24px] border border-dashed bg-muted/40">
                <div className="text-center">
                  <div className="mx-auto mb-3 flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                    <ImagePlus className="size-5" />
                  </div>
                  <p className="font-medium">Publicacion enlazada automaticamente</p>
                  <p className="text-sm text-muted-foreground">
                    Al guardar, la propiedad quedará visible en {form.tenantSlug || "el subdominio del cliente"} y en el marketplace general.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {error ? (
            <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          ) : null}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <Button onClick={handleCreateProperty} disabled={submitting}>
            {submitting ? <Loader2 className="size-4 animate-spin" /> : null}
            Guardar y publicar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
