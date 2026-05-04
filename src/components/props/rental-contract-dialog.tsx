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
import { formatMoney, formatShortDate } from "@/lib/utils";

function getInitialForm(property: Property) {
  return {
    tenantName: property.rentalContract?.tenantName ?? "",
    tenantPhone: property.rentalContract?.tenantPhone ?? "",
    tenantEmail: property.rentalContract?.tenantEmail ?? "",
    indexType: property.rentalContract?.indexType ?? "IPC",
    adjustmentFrequencyMonths: property.rentalContract?.adjustmentFrequencyMonths
      ? String(property.rentalContract.adjustmentFrequencyMonths)
      : "6",
    notes: property.rentalContract?.notes ?? "",
    autoNotify: property.rentalContract?.autoNotify ?? true,
    status: property.rentalContract?.status ?? "Activo",
  };
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
  const [form, setForm] = useState(() => getInitialForm(property));
  const [contractFile, setContractFile] = useState<File | null>(null);

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
    body.set("indexType", form.indexType);
    body.set("adjustmentFrequencyMonths", form.adjustmentFrequencyMonths);
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

    setSubmitting(false);
    setOpen(false);
    setContractFile(null);
    router.refresh();
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (!nextOpen) {
          setError(null);
          setContractFile(null);
          setForm(getInitialForm(property));
        }
      }}
    >
      <DialogTrigger render={<Button variant="outline" className="rounded-2xl" />}>
        {property.rentalContract ? "Editar contrato" : "Configurar alquiler"}
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
                  eyebrow="Contexto"
                  title="Qué toma automáticamente Props"
                  description="La propiedad ya aporta precio y el contrato define fechas, monto y cláusulas para la IA."
                />

                <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
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
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={submitting}>
            {submitting ? <Loader2 className="size-4 animate-spin" /> : null}
            Guardar contrato
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
