"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { FileText, Loader2 } from "lucide-react";

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

function getInitialForm(property: Property) {
  return {
    tenantName: property.rentalContract?.tenantName ?? "",
    tenantPhone: property.rentalContract?.tenantPhone ?? "",
    tenantEmail: property.rentalContract?.tenantEmail ?? "",
    currentRent: property.rentalContract?.currentRent ? String(property.rentalContract.currentRent) : "",
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

export function RentalContractDialog({ property }: { property: Property }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState(() => getInitialForm(property));
  const [contractFile, setContractFile] = useState<File | null>(null);

  async function handleSave() {
    setSubmitting(true);
    setError(null);

    const body = new FormData();
    body.set("propertyId", property.id);
    body.set("tenantName", form.tenantName);
    body.set("tenantPhone", form.tenantPhone);
    body.set("tenantEmail", form.tenantEmail);
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
      <DialogContent className="max-w-4xl rounded-[28px] p-0">
        <div className="p-6">
          <DialogHeader>
            <DialogTitle>Contrato de alquiler</DialogTitle>
            <DialogDescription>
              Define el índice, la frecuencia del aumento y adjunta el contrato para que Props AI lo pueda leer.
            </DialogDescription>
          </DialogHeader>

          <div className="mt-6 grid gap-6 lg:grid-cols-[1.4fr_0.95fr]">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium">Nombre del inquilino</label>
                <Input
                  value={form.tenantName}
                  onChange={(event) => setForm((prev) => ({ ...prev, tenantName: event.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">WhatsApp del inquilino</label>
                <Input
                  value={form.tenantPhone}
                  onChange={(event) => setForm((prev) => ({ ...prev, tenantPhone: event.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Email del inquilino</label>
                <Input
                  value={form.tenantEmail}
                  onChange={(event) => setForm((prev) => ({ ...prev, tenantEmail: event.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Alquiler actual (ARS)</label>
                <Input
                  value={form.currentRent}
                  onChange={(event) => setForm((prev) => ({ ...prev, currentRent: event.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Índice</label>
                <select
                  className="flex h-10 w-full rounded-lg border bg-background px-3 text-sm outline-none"
                  value={form.indexType}
                  onChange={(event) => setForm((prev) => ({ ...prev, indexType: event.target.value as "IPC" | "ICL" }))}
                >
                  <option value="IPC">IPC</option>
                  <option value="ICL">ICL</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Frecuencia en meses</label>
                <Input
                  value={form.adjustmentFrequencyMonths}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, adjustmentFrequencyMonths: event.target.value }))
                  }
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Inicio del contrato</label>
                <Input
                  type="date"
                  value={form.contractStartDate}
                  onChange={(event) => setForm((prev) => ({ ...prev, contractStartDate: event.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Próximo aumento</label>
                <Input
                  type="date"
                  value={form.nextAdjustmentDate}
                  onChange={(event) => setForm((prev) => ({ ...prev, nextAdjustmentDate: event.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Estado del contrato</label>
                <select
                  className="flex h-10 w-full rounded-lg border bg-background px-3 text-sm outline-none"
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
              <div className="space-y-2">
                <label className="text-sm font-medium">Aviso automático</label>
                <label className="flex h-10 items-center gap-2 rounded-lg border px-3 text-sm">
                  <input
                    type="checkbox"
                    checked={form.autoNotify}
                    onChange={(event) => setForm((prev) => ({ ...prev, autoNotify: event.target.checked }))}
                  />
                  Enviar WhatsApp automático al inquilino
                </label>
              </div>
              <div className="space-y-2 md:col-span-2">
                <label className="text-sm font-medium">Notas</label>
                <Textarea
                  rows={4}
                  value={form.notes}
                  onChange={(event) => setForm((prev) => ({ ...prev, notes: event.target.value }))}
                />
              </div>
            </div>

            <aside className="space-y-4 rounded-[28px] border bg-muted/25 p-5">
              <div>
                <p className="text-sm font-semibold">Contrato adjunto</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Guarda el PDF, DOCX o TXT del alquiler para consultarlo luego y dárselo como contexto a la IA.
                </p>
              </div>

              <label className="flex cursor-pointer flex-col gap-3 rounded-[24px] border border-dashed bg-background px-4 py-5 text-sm transition hover:bg-muted/40">
                <span className="font-medium">Subir nuevo archivo</span>
                <span className="text-muted-foreground">Formatos: PDF, DOCX o TXT. Hasta 12 MB.</span>
                <input
                  className="hidden"
                  type="file"
                  accept=".pdf,.docx,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
                  onChange={(event) => setContractFile(event.target.files?.[0] ?? null)}
                />
                <span className="rounded-2xl border px-3 py-2 text-center font-medium">
                  {contractFile ? contractFile.name : "Elegir contrato"}
                </span>
              </label>

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
                      <p className="mb-1 font-medium text-foreground">Resumen legible para IA</p>
                      <p>{property.rentalContract.contractText.slice(0, 380)}...</p>
                    </div>
                  ) : null}
                </div>
              ) : null}
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
