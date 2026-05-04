"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CalendarDays,
  FileImage,
  FileText,
  ImagePlus,
  Loader2,
  Plus,
  Sparkles,
  UploadCloud,
} from "lucide-react";

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
  currency: "USD",
  location: "",
  exactAddress: "",
  description: "",
  propertyType: "Departamento",
  bedrooms: "",
  bathrooms: "",
  area: "",
  parkingSpots: "",
  furnished: false,
  expenses: "",
  expensesCurrency: "ARS",
  availableFrom: "",
  petsPolicy: "",
  requirements: "",
  amenities: "",
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

function SectionTitle({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary/70">{eyebrow}</p>
      <p className="mt-1 text-base font-semibold">{title}</p>
      <p className="mt-1 text-sm text-muted-foreground">{description}</p>
    </div>
  );
}

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
  const [contractFile, setContractFile] = useState<File | null>(null);

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
    body.set("currency", form.currency);
    body.set("location", form.location);
    body.set("exactAddress", form.exactAddress);
    body.set("description", form.description);
    body.set("propertyType", form.propertyType);
    body.set("bedrooms", form.bedrooms);
    body.set("bathrooms", form.bathrooms);
    body.set("area", form.area);
    body.set("parkingSpots", form.parkingSpots);
    body.set("furnished", String(form.furnished));
    body.set("expenses", form.expenses);
    body.set("expensesCurrency", form.expensesCurrency);
    body.set("availableFrom", form.availableFrom);
    body.set("petsPolicy", form.petsPolicy);
    body.set("requirements", form.requirements);
    body.set("amenities", form.amenities);
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

    if (contractFile) {
      body.set("contractFile", contractFile);
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
    setContractFile(null);
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
          setContractFile(null);
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
      <DialogContent className="h-[min(92vh,980px)] w-[min(96vw,1360px)] max-w-[min(96vw,1360px)] overflow-x-hidden overflow-y-auto rounded-[32px] p-0 sm:max-w-[min(96vw,1360px)]">
        <div className="p-6 lg:p-8">
          <DialogHeader>
            <DialogTitle>Nueva propiedad</DialogTitle>
            <DialogDescription>
              Carga la publicación en un flujo más ágil: datos clave, imágenes reales, información útil para respuestas con IA y, si es alquiler, contrato listo para automatización.
            </DialogDescription>
          </DialogHeader>

          <div className="mt-6 grid gap-6 xl:grid-cols-[1.45fr_0.95fr]">
            <div className="space-y-6">
              <section className="rounded-[28px] border bg-card p-5">
                <SectionTitle
                  eyebrow="Base"
                  title="Datos comerciales y operativos"
                  description="Carga la información que va a leer el equipo, el marketplace y la IA de Props."
                />

                <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-12">
                  <div className="space-y-2 xl:col-span-5">
                    <label className="text-sm font-medium">Inmobiliaria</label>
                    <select
                      className="flex h-11 w-full rounded-xl border bg-background px-3 text-sm outline-none"
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

                  <div className="space-y-2 xl:col-span-7">
                    <label className="text-sm font-medium">Título</label>
                    <Input
                      placeholder="Torre Libertad 4B"
                      value={form.title}
                      onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))}
                    />
                  </div>

                  <div className="space-y-2 xl:col-span-3">
                    <label className="text-sm font-medium">Precio publicado</label>
                    <Input
                      placeholder="250000"
                      value={form.price}
                      onChange={(event) => setForm((prev) => ({ ...prev, price: event.target.value }))}
                    />
                  </div>

                  <div className="space-y-2 xl:col-span-2">
                    <label className="text-sm font-medium">Moneda</label>
                    <select
                      className="flex h-11 w-full rounded-xl border bg-background px-3 text-sm outline-none"
                      value={form.currency}
                      onChange={(event) => setForm((prev) => ({ ...prev, currency: event.target.value }))}
                    >
                      <option value="USD">USD</option>
                      <option value="ARS">ARS</option>
                    </select>
                  </div>

                  <div className="space-y-2 xl:col-span-3">
                    <label className="text-sm font-medium">Operación</label>
                    <select
                      className="flex h-11 w-full rounded-xl border bg-background px-3 text-sm outline-none"
                      value={form.operation}
                      onChange={(event) =>
                        setForm((prev) => ({ ...prev, operation: event.target.value as Property["operation"] }))
                      }
                    >
                      <option value="Venta">Venta</option>
                      <option value="Alquiler">Alquiler</option>
                    </select>
                  </div>

                  <div className="space-y-2 xl:col-span-4">
                    <label className="text-sm font-medium">Estado</label>
                    <select
                      className="flex h-11 w-full rounded-xl border bg-background px-3 text-sm outline-none"
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

                  <div className="space-y-2 xl:col-span-12">
                    <label className="text-sm font-medium">Ubicación visible</label>
                    <Input
                      placeholder="Belgrano, CABA"
                      value={form.location}
                      onChange={(event) => setForm((prev) => ({ ...prev, location: event.target.value }))}
                    />
                  </div>

                  <div className="space-y-2 xl:col-span-12">
                    <label className="text-sm font-medium">Dirección exacta</label>
                    <Input
                      placeholder="Av. del Libertador 2450, Belgrano, Ciudad Autónoma de Buenos Aires, Argentina"
                      value={form.exactAddress}
                      onChange={(event) => setForm((prev) => ({ ...prev, exactAddress: event.target.value }))}
                    />
                    <p className="text-xs text-muted-foreground">
                      Escríbela completa para que Google Maps la interprete bien y podamos mostrar la propiedad en el mapa.
                    </p>
                  </div>

                  <div className="space-y-2 xl:col-span-3">
                    <label className="text-sm font-medium">Tipo de propiedad</label>
                    <select
                      className="flex h-11 w-full rounded-xl border bg-background px-3 text-sm outline-none"
                      value={form.propertyType}
                      onChange={(event) => setForm((prev) => ({ ...prev, propertyType: event.target.value }))}
                    >
                      <option value="Departamento">Departamento</option>
                      <option value="Casa">Casa</option>
                      <option value="PH">PH</option>
                      <option value="Loft">Loft</option>
                      <option value="Townhouse">Townhouse</option>
                      <option value="Oficina">Oficina</option>
                      <option value="Local">Local</option>
                    </select>
                  </div>

                  <div className="space-y-2 xl:col-span-2">
                    <label className="text-sm font-medium">Dormitorios</label>
                    <Input
                      placeholder="3"
                      value={form.bedrooms}
                      onChange={(event) => setForm((prev) => ({ ...prev, bedrooms: event.target.value }))}
                    />
                  </div>

                  <div className="space-y-2 xl:col-span-2">
                    <label className="text-sm font-medium">Baños</label>
                    <Input
                      placeholder="2"
                      value={form.bathrooms}
                      onChange={(event) => setForm((prev) => ({ ...prev, bathrooms: event.target.value }))}
                    />
                  </div>

                  <div className="space-y-2 xl:col-span-2">
                    <label className="text-sm font-medium">m² cubiertos</label>
                    <Input
                      placeholder="148"
                      value={form.area}
                      onChange={(event) => setForm((prev) => ({ ...prev, area: event.target.value }))}
                    />
                  </div>

                  <div className="space-y-2 xl:col-span-3">
                    <label className="text-sm font-medium">Cocheras</label>
                    <Input
                      placeholder="1"
                      value={form.parkingSpots}
                      onChange={(event) => setForm((prev) => ({ ...prev, parkingSpots: event.target.value }))}
                    />
                  </div>

                  <div className="space-y-2 xl:col-span-4">
                    <label className="text-sm font-medium">Expensas</label>
                    <Input
                      placeholder="185000"
                      value={form.expenses}
                      onChange={(event) => setForm((prev) => ({ ...prev, expenses: event.target.value }))}
                    />
                  </div>

                  <div className="space-y-2 xl:col-span-2">
                    <label className="text-sm font-medium">Moneda expensas</label>
                    <select
                      className="flex h-11 w-full rounded-xl border bg-background px-3 text-sm outline-none"
                      value={form.expensesCurrency}
                      onChange={(event) => setForm((prev) => ({ ...prev, expensesCurrency: event.target.value }))}
                    >
                      <option value="ARS">ARS</option>
                      <option value="USD">USD</option>
                    </select>
                  </div>

                  <div className="space-y-2 xl:col-span-3">
                    <label className="text-sm font-medium">Disponible desde</label>
                    <Input
                      type="date"
                      value={form.availableFrom}
                      onChange={(event) => setForm((prev) => ({ ...prev, availableFrom: event.target.value }))}
                    />
                  </div>

                  <div className="space-y-2 xl:col-span-3">
                    <label className="text-sm font-medium">Amoblado</label>
                    <label className="flex h-11 items-center gap-2 rounded-xl border px-3 text-sm">
                      <input
                        type="checkbox"
                        checked={form.furnished}
                        onChange={(event) => setForm((prev) => ({ ...prev, furnished: event.target.checked }))}
                      />
                      Se entrega amoblado
                    </label>
                  </div>

                  <div className="space-y-2 xl:col-span-6">
                    <label className="text-sm font-medium">Política de mascotas</label>
                    <Input
                      placeholder="Sí / No / Solo mascotas pequeñas / Consultar"
                      value={form.petsPolicy}
                      onChange={(event) => setForm((prev) => ({ ...prev, petsPolicy: event.target.value }))}
                    />
                  </div>

                  <div className="space-y-2 xl:col-span-6">
                    <label className="text-sm font-medium">Amenities</label>
                    <Input
                      placeholder="Balcón, SUM, pileta, cochera, laundry"
                      value={form.amenities}
                      onChange={(event) => setForm((prev) => ({ ...prev, amenities: event.target.value }))}
                    />
                  </div>

                  <div className="space-y-2 xl:col-span-12">
                    <label className="text-sm font-medium">Requisitos / condiciones para ingresar</label>
                    <Textarea
                      placeholder="Garantía propietaria o seguro de caución, ingresos demostrables, depósito, plazo mínimo, restricciones, documentación requerida..."
                      rows={4}
                      value={form.requirements}
                      onChange={(event) => setForm((prev) => ({ ...prev, requirements: event.target.value }))}
                    />
                  </div>

                  <div className="space-y-2 xl:col-span-12">
                    <label className="text-sm font-medium">Descripción</label>
                    <Textarea
                      placeholder="Detalles destacados, amenities, target de cliente y contexto comercial..."
                      rows={5}
                      value={form.description}
                      onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
                    />
                  </div>
                </div>
              </section>

              {isRental ? (
                <section className="rounded-[28px] border bg-card p-5">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <SectionTitle
                      eyebrow="Alquiler"
                      title="Contrato y aumentos"
                      description="Deja listo el contrato, la frecuencia del ajuste y el documento que luego interpreta Props AI."
                    />
                    <label className="flex items-center gap-2 rounded-2xl border px-4 py-2 text-sm font-medium">
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
                    <div className="mt-5 grid gap-4 lg:grid-cols-[1.2fr_0.95fr]">
                      <div className="grid gap-4 md:grid-cols-2">
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
                          <label className="text-sm font-medium">Índice</label>
                          <select
                            className="flex h-11 w-full rounded-xl border bg-background px-3 text-sm outline-none"
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
                          <label className="text-sm font-medium">Cada cuántos meses aumenta</label>
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
                          <label className="text-sm font-medium">Próximo aumento</label>
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
                            rows={4}
                            placeholder="Cláusulas, observaciones del alquiler o recordatorios del equipo..."
                            value={form.notes}
                            onChange={(event) => setForm((prev) => ({ ...prev, notes: event.target.value }))}
                          />
                        </div>
                      </div>

                      <aside className="space-y-4 rounded-[24px] border bg-muted/25 p-4">
                        <div className="rounded-[20px] border bg-background p-4">
                          <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                            <CalendarDays className="size-4 text-primary" />
                            Aviso automático al inquilino
                          </div>
                          <p className="mt-2 text-sm text-muted-foreground">
                            Cuando llegue la fecha, Props calculará el aumento por {form.indexType} y enviará el nuevo valor por WhatsApp usando n8n.
                          </p>
                        </div>

                        <label className="flex cursor-pointer flex-col gap-3 rounded-[22px] border border-dashed bg-background px-4 py-5 text-sm transition hover:bg-muted/40">
                          <div className="flex items-center gap-2 font-medium">
                            <FileText className="size-4 text-primary" />
                            Adjuntar contrato
                          </div>
                          <p className="text-muted-foreground">
                            Guarda el PDF, DOCX o TXT con las cláusulas y deja el texto listo para Props AI.
                          </p>
                          <input
                            className="hidden"
                            type="file"
                            accept=".pdf,.docx,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
                            onChange={(event) => setContractFile(event.target.files?.[0] ?? null)}
                          />
                          <span className="rounded-2xl border px-3 py-2 text-center font-medium">
                            {contractFile ? contractFile.name : "Elegir contrato"}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            Hasta 12 MB. La IA podrá usar el texto extraído del archivo.
                          </span>
                        </label>

                        <div className="rounded-[22px] border bg-background p-4 text-sm">
                          <div className="flex items-center gap-2 font-medium">
                            <Sparkles className="size-4 text-primary" />
                            Contexto inteligente
                          </div>
                          <p className="mt-2 text-muted-foreground">
                            Una vez guardado, el copiloto interno puede resumir el contrato, detectar fechas de ajuste y ayudarte a redactar mensajes al inquilino.
                          </p>
                        </div>
                      </aside>
                    </div>
                  ) : null}
                </section>
              ) : null}
            </div>

            <aside className="space-y-6">
              <section className="rounded-[28px] border bg-card p-5">
                <SectionTitle
                  eyebrow="Visual"
                  title="Galería de publicación"
                  description="Sube fotos reales con preview para web, marketplace y subdominio de la inmobiliaria."
                />

                <div className="mt-5 space-y-4">
                  <label className="flex cursor-pointer flex-col items-center justify-center rounded-[24px] border border-dashed bg-muted/30 px-6 py-8 text-center transition hover:bg-muted/50">
                    <div className="mb-3 flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                      <UploadCloud className="size-5" />
                    </div>
                    <p className="font-medium">Arrastra o elige imágenes reales</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Hasta 10 MB por imagen. Se suben a storage y quedan listas para el marketplace.
                    </p>
                    <input
                      className="hidden"
                      type="file"
                      accept="image/png,image/jpeg,image/webp,image/avif"
                      multiple
                      onChange={(event) => setImageFiles(Array.from(event.target.files ?? []))}
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
                    <div className="grid gap-3 sm:grid-cols-2">
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
                  ) : (
                    <div className="flex min-h-44 items-center justify-center rounded-[24px] border border-dashed bg-muted/25">
                      <div className="text-center">
                        <div className="mx-auto mb-3 flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                          <ImagePlus className="size-5" />
                        </div>
                        <p className="font-medium">Todavía no cargaste imágenes</p>
                        <p className="text-sm text-muted-foreground">
                          La primera foto será la portada en el CRM y el marketplace.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </section>

              <section className="rounded-[28px] border bg-card p-5">
                <SectionTitle
                  eyebrow="Publicación"
                  title="Salida automática"
                  description="Al guardar, la propiedad se vincula al CRM, al marketplace general y al subdominio de la inmobiliaria."
                />

                <div className="mt-5 rounded-[24px] border border-dashed bg-muted/30 p-5">
                  <div className="flex items-start gap-3">
                    <div className="rounded-2xl bg-primary/10 p-3 text-primary">
                      <ImagePlus className="size-5" />
                    </div>
                    <div>
                      <p className="font-medium">Publicación enlazada automáticamente</p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Cuando guardes esta propiedad y la vincules a una inmobiliaria, aparecerá en el CRM, en {form.tenantSlug || "el subdominio del cliente"} y en el marketplace público.
                      </p>
                    </div>
                  </div>
                </div>
              </section>
            </aside>
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
