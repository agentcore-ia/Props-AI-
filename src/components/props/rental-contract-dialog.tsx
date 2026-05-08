"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  BadgeInfo,
  CalendarDays,
  CircleDollarSign,
  FileText,
  Loader2,
  Sparkles,
  UploadCloud,
} from "lucide-react";

import type { Property } from "@/lib/mock-data";
import { Button, buttonVariants } from "@/components/ui/button";
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
import { formatArsCurrency, formatMoney, formatShortDate } from "@/lib/utils";

function getInitialForm(property: Property) {
  return {
    tenantName: property.rentalContract?.tenantName ?? "",
    tenantPhone: property.rentalContract?.tenantPhone ?? "",
    tenantEmail: property.rentalContract?.tenantEmail ?? "",
    ownerName: property.rentalContract?.ownerName ?? "",
    ownerPhone: property.rentalContract?.ownerPhone ?? "",
    ownerEmail: property.rentalContract?.ownerEmail ?? "",
    managementFeePercent: String(property.rentalContract?.managementFeePercent ?? 8),
    monthlyOwnerCosts: String(property.rentalContract?.monthlyOwnerCosts ?? 0),
    ownerNotes: property.rentalContract?.ownerNotes ?? "",
    currentRent: property.rentalContract?.currentRent
      ? String(property.rentalContract.currentRent)
      : String(property.price),
    indexType: property.rentalContract?.indexType ?? "IPC",
    adjustmentFrequencyMonths: property.rentalContract?.adjustmentFrequencyMonths
      ? String(property.rentalContract.adjustmentFrequencyMonths)
      : "6",
    contractStartDate: property.rentalContract?.contractStartDate ?? "",
    nextAdjustmentDate: property.rentalContract?.nextAdjustmentDate ?? "",
    notes: property.rentalContract?.notes ?? "",
    autoNotify: property.rentalContract?.autoNotify ?? true,
    status: property.rentalContract?.status ?? "Activo",
  };
}

function getReviewReasons(notes: string) {
  return notes
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.startsWith("[Revision requerida]"))
    .map((line) => line.replace("[Revision requerida]", "").trim());
}

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

export function RentalContractDialog({ property }: { property: Property }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [form, setForm] = useState(() => getInitialForm(property));
  const [contractFile, setContractFile] = useState<File | null>(null);
  const reviewReasons = useMemo(
    () => getReviewReasons(property.rentalContract?.notes ?? ""),
    [property.rentalContract?.notes]
  );
  const requiresReview =
    property.rentalContract?.status === "Pausado" && reviewReasons.length > 0;

  const acceptedFormats = useMemo(
    () =>
      [
        ".pdf",
        ".doc",
        ".docx",
        ".txt",
        "application/pdf",
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "text/plain",
      ].join(","),
    []
  );

  async function handleSave() {
    setSubmitting(true);
    setError(null);

    const body = new FormData();
    body.set("propertyId", property.id);
    body.set("tenantName", form.tenantName);
    body.set("tenantPhone", form.tenantPhone);
    body.set("tenantEmail", form.tenantEmail);
    body.set("ownerName", form.ownerName);
    body.set("ownerPhone", form.ownerPhone);
    body.set("ownerEmail", form.ownerEmail);
    body.set("managementFeePercent", form.managementFeePercent);
    body.set("monthlyOwnerCosts", form.monthlyOwnerCosts);
    body.set("ownerNotes", form.ownerNotes);
    body.set("currentRent", form.currentRent);
    body.set("indexType", form.indexType);
    body.set("adjustmentFrequencyMonths", form.adjustmentFrequencyMonths);
    body.set("contractStartDate", form.contractStartDate);
    body.set("nextAdjustmentDate", form.nextAdjustmentDate);
    body.set("notes", form.notes);
    body.set("autoNotify", String(form.autoNotify));
    body.set("status", form.status);

    if (contractFile) {
      body.set("contractFile", contractFile);
    }

    const response = await fetch("/api/admin/rental-contracts", {
      method: "POST",
      body,
    });

    const payload = await response.json().catch(() => null);

    if (!response.ok) {
      setSubmitting(false);
      setError(payload?.error ?? "No se pudo guardar el contrato.");
      return;
    }

    setWarning(payload?.warning ?? null);

    setSubmitting(false);
    setOpen(false);
    setContractFile(null);
    router.refresh();
  }

  async function handleConfirmAutomation() {
    if (!property.rentalContract) return;

    setSubmitting(true);
    setError(null);
    setWarning(null);

    const response = await fetch("/api/admin/rental-contracts", {
      method: "PATCH",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        contractId: property.rentalContract.id,
        tenantName: form.tenantName,
        tenantPhone: form.tenantPhone,
        tenantEmail: form.tenantEmail || null,
        ownerName: form.ownerName || null,
        ownerPhone: form.ownerPhone || null,
        ownerEmail: form.ownerEmail || null,
        managementFeePercent: Number(form.managementFeePercent),
        monthlyOwnerCosts: Number(form.monthlyOwnerCosts),
        ownerNotes: form.ownerNotes,
        currentRent: Number(form.currentRent),
        indexType: form.indexType,
        adjustmentFrequencyMonths: Number(form.adjustmentFrequencyMonths),
        contractStartDate: form.contractStartDate,
        nextAdjustmentDate: form.nextAdjustmentDate,
        autoNotify: form.autoNotify,
        notes: form.notes,
      }),
    });

    const payload = await response.json().catch(() => null);

    if (!response.ok) {
      setSubmitting(false);
      setError(payload?.error ?? "No se pudo confirmar el contrato.");
      return;
    }

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
          setWarning(null);
          setContractFile(null);
          setForm(getInitialForm(property));
        }
      }}
    >
      <DialogTrigger render={<Button variant="outline" className="rounded-2xl" />}>
        {requiresReview
          ? "Revisar contrato"
          : property.rentalContract
          ? "Editar contrato"
          : "Configurar alquiler"}
      </DialogTrigger>
      <DialogContent className="h-[min(92vh,940px)] w-[min(96vw,1280px)] max-w-[min(96vw,1280px)] overflow-x-hidden overflow-y-auto rounded-[32px] p-0 sm:max-w-[min(96vw,1280px)]">
        <div className="p-6 lg:p-8">
          <DialogHeader>
            <DialogTitle>Contrato de alquiler</DialogTitle>
            <DialogDescription>
              Completa el contacto del inquilino y adjunta el contrato. Props analiza el documento para detectar
              alquiler, fechas, índice y próximos ajustes automáticamente.
            </DialogDescription>
          </DialogHeader>

          <div className="mt-6 grid gap-6 xl:grid-cols-[1.35fr_0.95fr]">
            <div className="space-y-6">
              <section className="rounded-[28px] border bg-card p-5">
                <SectionTitle
                  eyebrow="Base"
                  title="Datos del inquilino y automatización"
                  description="Lo mínimo operativo para guardar el alquiler y dejar listos los avisos automáticos."
                />

                <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-12">
                  <div className="space-y-2 xl:col-span-5">
                    <label className="text-sm font-medium">Nombre del inquilino</label>
                    <Input
                      placeholder="María Gómez"
                      value={form.tenantName}
                      onChange={(event) => setForm((prev) => ({ ...prev, tenantName: event.target.value }))}
                    />
                  </div>
                  <div className="space-y-2 xl:col-span-4">
                    <label className="text-sm font-medium">WhatsApp del inquilino</label>
                    <Input
                      placeholder="+54 11 5555 1234"
                      value={form.tenantPhone}
                      onChange={(event) => setForm((prev) => ({ ...prev, tenantPhone: event.target.value }))}
                    />
                  </div>
                  <div className="space-y-2 xl:col-span-3">
                    <label className="text-sm font-medium">Email del inquilino</label>
                    <Input
                      placeholder="Opcional"
                      value={form.tenantEmail}
                      onChange={(event) => setForm((prev) => ({ ...prev, tenantEmail: event.target.value }))}
                    />
                  </div>

                  <div className="space-y-2 xl:col-span-3">
                    <label className="text-sm font-medium">Alquiler actual (ARS)</label>
                    <Input
                      placeholder="800000"
                      value={form.currentRent}
                      onChange={(event) => setForm((prev) => ({ ...prev, currentRent: event.target.value }))}
                    />
                  </div>

                  <div className="space-y-2 xl:col-span-3">
                    <label className="text-sm font-medium">Índice preferido</label>
                    <select
                      className="flex h-11 w-full rounded-xl border bg-background px-3 text-sm outline-none"
                      value={form.indexType}
                      onChange={(event) => setForm((prev) => ({ ...prev, indexType: event.target.value as "IPC" | "ICL" }))}
                    >
                      <option value="IPC">IPC</option>
                      <option value="ICL">ICL</option>
                    </select>
                  </div>

                  <div className="space-y-2 xl:col-span-3">
                    <label className="text-sm font-medium">Frecuencia en meses</label>
                    <Input
                      placeholder="6"
                      value={form.adjustmentFrequencyMonths}
                      onChange={(event) =>
                        setForm((prev) => ({ ...prev, adjustmentFrequencyMonths: event.target.value }))
                      }
                    />
                    <p className="text-xs text-muted-foreground">
                      Si el contrato dice otra cosa, Props prioriza el documento.
                    </p>
                  </div>

                  <div className="space-y-2 xl:col-span-3">
                    <label className="text-sm font-medium">Inicio del contrato</label>
                    <Input
                      type="date"
                      value={form.contractStartDate}
                      onChange={(event) =>
                        setForm((prev) => ({ ...prev, contractStartDate: event.target.value }))
                      }
                    />
                  </div>

                  <div className="space-y-2 xl:col-span-3">
                    <label className="text-sm font-medium">Próximo aumento</label>
                    <Input
                      type="date"
                      value={form.nextAdjustmentDate}
                      onChange={(event) =>
                        setForm((prev) => ({ ...prev, nextAdjustmentDate: event.target.value }))
                      }
                    />
                  </div>

                  <div className="space-y-2 xl:col-span-3">
                    <label className="text-sm font-medium">Estado del contrato</label>
                    <select
                      className="flex h-11 w-full rounded-xl border bg-background px-3 text-sm outline-none"
                      value={form.status}
                      onChange={(event) =>
                        setForm((prev) => ({
                          ...prev,
                          status: event.target.value as "Activo" | "Pausado" | "Finalizado",
                        }))
                      }
                    >
                      <option value="Activo">Activo</option>
                      <option value="Pausado">Pausado</option>
                      <option value="Finalizado">Finalizado</option>
                    </select>
                  </div>

                  <div className="space-y-2 xl:col-span-3">
                    <label className="text-sm font-medium">Aviso automático</label>
                    <label className="flex h-11 items-center gap-2 rounded-xl border px-3 text-sm">
                      <input
                        type="checkbox"
                        checked={form.autoNotify}
                        onChange={(event) => setForm((prev) => ({ ...prev, autoNotify: event.target.checked }))}
                      />
                      Enviar WhatsApp automático
                    </label>
                  </div>

                  <div className="space-y-2 xl:col-span-12">
                    <label className="text-sm font-medium">Notas internas</label>
                    <Textarea
                      rows={4}
                      placeholder="Observaciones, restricciones o contexto del contrato..."
                      value={form.notes}
                      onChange={(event) => setForm((prev) => ({ ...prev, notes: event.target.value }))}
                    />
                  </div>
                </div>
              </section>

              <section className="rounded-[28px] border bg-card p-5">
                <SectionTitle
                  eyebrow="Propietario"
                  title="Liquidacion al propietario"
                  description="Define a quien se le liquida y que retencion aplica la inmobiliaria cada mes."
                />

                <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-12">
                  <div className="space-y-2 xl:col-span-4">
                    <label className="text-sm font-medium">Nombre del propietario</label>
                    <Input
                      placeholder="Carlos Perez"
                      value={form.ownerName}
                      onChange={(event) => setForm((prev) => ({ ...prev, ownerName: event.target.value }))}
                    />
                  </div>
                  <div className="space-y-2 xl:col-span-4">
                    <label className="text-sm font-medium">WhatsApp del propietario</label>
                    <Input
                      placeholder="+54 11 5555 8888"
                      value={form.ownerPhone}
                      onChange={(event) => setForm((prev) => ({ ...prev, ownerPhone: event.target.value }))}
                    />
                  </div>
                  <div className="space-y-2 xl:col-span-4">
                    <label className="text-sm font-medium">Email del propietario</label>
                    <Input
                      placeholder="propietario@email.com"
                      value={form.ownerEmail}
                      onChange={(event) => setForm((prev) => ({ ...prev, ownerEmail: event.target.value }))}
                    />
                  </div>
                  <div className="space-y-2 xl:col-span-3">
                    <label className="text-sm font-medium">Comision (%)</label>
                    <Input
                      placeholder="8"
                      value={form.managementFeePercent}
                      onChange={(event) =>
                        setForm((prev) => ({ ...prev, managementFeePercent: event.target.value }))
                      }
                    />
                  </div>
                  <div className="space-y-2 xl:col-span-3">
                    <label className="text-sm font-medium">Gastos fijos mensuales</label>
                    <Input
                      placeholder="0"
                      value={form.monthlyOwnerCosts}
                      onChange={(event) =>
                        setForm((prev) => ({ ...prev, monthlyOwnerCosts: event.target.value }))
                      }
                    />
                  </div>
                  <div className="space-y-2 xl:col-span-6">
                    <label className="text-sm font-medium">Notas para liquidacion</label>
                    <Input
                      placeholder="Ej: sumar seguro, administracion y gastos bancarios."
                      value={form.ownerNotes}
                      onChange={(event) => setForm((prev) => ({ ...prev, ownerNotes: event.target.value }))}
                    />
                  </div>
                </div>
              </section>

              <section className="rounded-[28px] border bg-card p-5">
                <SectionTitle
                  eyebrow="Contexto"
                  title="Qué toma automáticamente Props"
                  description="La propiedad ya aporta precio y el contrato define fechas, monto y cláusulas para la IA."
                />

                <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {requiresReview ? (
                    <div className="rounded-[24px] border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 md:col-span-2 xl:col-span-3">
                      <p className="font-semibold">Revisión requerida antes de automatizar</p>
                      <ul className="mt-2 space-y-1">
                        {reviewReasons.map((reason) => (
                          <li key={reason}>- {reason}</li>
                        ))}
                      </ul>
                      <p className="mt-3 text-amber-700">
                        Confirma estos datos y activa recién cuando estén correctos.
                      </p>
                    </div>
                  ) : null}

                  <div className="rounded-[24px] border bg-muted/20 p-4">
                    <div className="flex items-center gap-2 text-sm font-medium">
                      <CircleDollarSign className="size-4 text-primary" />
                      Precio publicado
                    </div>
                    <p className="mt-2 text-2xl font-semibold">{formatMoney(property.price, property.currency)}</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Se usa como base cuando el contrato no explicita el alquiler actual.
                    </p>
                  </div>

                  <div className="rounded-[24px] border bg-muted/20 p-4">
                    <div className="flex items-center gap-2 text-sm font-medium">
                      <CalendarDays className="size-4 text-primary" />
                      Fechas del contrato
                    </div>
                    <p className="mt-2 text-sm text-muted-foreground">
                      Inicio de contrato y próximo aumento se detectan leyendo el documento adjunto.
                    </p>
                    {property.rentalContract?.nextAdjustmentDate ? (
                      <p className="mt-3 text-sm font-medium">
                        Último próximo aumento detectado: {formatShortDate(property.rentalContract.nextAdjustmentDate)}
                      </p>
                    ) : null}
                  </div>

                  <div className="rounded-[24px] border bg-muted/20 p-4">
                    <div className="flex items-center gap-2 text-sm font-medium">
                      <Sparkles className="size-4 text-primary" />
                      IA del contrato
                    </div>
                    <p className="mt-2 text-sm text-muted-foreground">
                      Props resume cláusulas, requisitos, índice y próximos pasos a partir del texto extraído.
                    </p>
                  </div>
                </div>

                {property.rentalContract ? (
                  <div className="mt-5 rounded-[24px] border bg-background p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary/70">
                      Datos detectados / confirmados
                    </p>
                    <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                      <div>
                        <p className="text-xs text-muted-foreground">Alquiler actual</p>
                        <p className="mt-1 font-semibold">
                          {formatArsCurrency(property.rentalContract.currentRent)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Índice</p>
                        <p className="mt-1 font-semibold">{property.rentalContract.indexType}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Frecuencia</p>
                        <p className="mt-1 font-semibold">
                          Cada {property.rentalContract.adjustmentFrequencyMonths} meses
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Próximo aumento</p>
                        <p className="mt-1 font-semibold">
                          {formatShortDate(property.rentalContract.nextAdjustmentDate)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Inicio del contrato</p>
                        <p className="mt-1 font-semibold">
                          {formatShortDate(property.rentalContract.contractStartDate)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Fecha base del cálculo</p>
                        <p className="mt-1 font-semibold">
                          {formatShortDate(property.rentalContract.rentReferenceDate)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Estado</p>
                        <p className="mt-1 font-semibold">{property.rentalContract.status}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Notificación automática</p>
                        <p className="mt-1 font-semibold">
                          {property.rentalContract.autoNotify ? "Activa" : "Pausada"}
                        </p>
                      </div>
                    </div>

                    {property.rentalContract.contractText ? (
                      <div className="mt-4 rounded-[20px] border bg-muted/20 p-4 text-sm leading-6 text-muted-foreground">
                        <p className="mb-2 font-medium text-foreground">Texto leído del contrato</p>
                        <p>{property.rentalContract.contractText.slice(0, 520)}...</p>
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </section>
            </div>

            <aside className="space-y-6">
              <section className="rounded-[28px] border bg-card p-5">
                <SectionTitle
                  eyebrow="Archivo"
                  title="Contrato adjunto"
                  description="Adjunta el documento real para que quede guardado y listo para que la IA lo lea."
                />

                <div className="mt-5 space-y-4">
                  <label className="flex cursor-pointer flex-col rounded-[24px] border border-dashed bg-muted/30 px-5 py-6 transition hover:bg-muted/50">
                    <div className="mb-3 flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                      <UploadCloud className="size-5" />
                    </div>
                    <p className="font-medium">{contractFile ? "Reemplazar contrato" : "Subir nuevo contrato"}</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Formatos: PDF, DOC, DOCX o TXT. Hasta 12 MB.
                    </p>
                    <input
                      className="hidden"
                      type="file"
                      accept={acceptedFormats}
                      onChange={(event) => setContractFile(event.target.files?.[0] ?? null)}
                    />
                    <span className="mt-4 rounded-2xl border px-3 py-2 text-center font-medium">
                      {contractFile ? contractFile.name : "Elegir contrato"}
                    </span>
                  </label>

                  <div className="rounded-[22px] border bg-background p-4 text-sm">
                    <div className="flex items-center gap-2 font-medium">
                      <BadgeInfo className="size-4 text-primary" />
                      Qué se detecta automáticamente
                    </div>
                    <ul className="mt-3 space-y-2 text-muted-foreground">
                      <li>Inicio del contrato y próxima fecha de ajuste.</li>
                      <li>Monto del alquiler si figura en el documento.</li>
                      <li>Índice, frecuencia y cláusulas útiles para la IA.</li>
                    </ul>
                  </div>

                  {property.rentalContract?.contractFileName ? (
                    <div className="rounded-[22px] border bg-background p-4">
                      <div className="flex items-start gap-3">
                        <div className="mt-0.5 rounded-2xl bg-primary/10 p-2 text-primary">
                          <FileText className="size-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-medium">{property.rentalContract.contractFileName}</p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {property.rentalContract.contractFileMimeType ?? "documento"} ·{" "}
                            {property.rentalContract.contractFileSizeBytes
                              ? `${Math.round(property.rentalContract.contractFileSizeBytes / 1024)} KB`
                              : "sin tamaño"}
                          </p>
                        </div>
                      </div>
                      <div className="mt-4 flex flex-wrap gap-2">
                        <Link
                          href={`/api/admin/rental-contracts/${property.rentalContract.id}/document`}
                          target="_blank"
                          className={buttonVariants({ size: "sm", variant: "outline", className: "rounded-2xl" })}
                        >
                          Ver contrato
                        </Link>
                      </div>
                      {property.rentalContract.contractText ? (
                        <div className="mt-4 rounded-2xl border bg-muted/35 p-3 text-xs leading-6 text-muted-foreground">
                          <p className="mb-1 font-medium text-foreground">Contexto legible para la IA</p>
                          <p>{property.rentalContract.contractText.slice(0, 380)}...</p>
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              </section>
            </aside>
          </div>

          {error ? (
            <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          ) : null}

          {warning ? (
            <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              {warning}
            </div>
          ) : null}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          {requiresReview ? (
            <Button onClick={handleConfirmAutomation} disabled={submitting}>
              {submitting ? <Loader2 className="size-4 animate-spin" /> : null}
              Confirmar y activar automatización
            </Button>
          ) : null}
          <Button onClick={handleSave} disabled={submitting}>
            {submitting ? <Loader2 className="size-4 animate-spin" /> : null}
            Guardar contrato
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
