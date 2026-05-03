"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

import type { Property } from "@/lib/mock-data";
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

  async function handleSave() {
    setSubmitting(true);
    setError(null);

    const response = await fetch("/api/admin/rental-contracts", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        propertyId: property.id,
        ...form,
        currentRent: Number(form.currentRent),
        adjustmentFrequencyMonths: Number(form.adjustmentFrequencyMonths),
      }),
    });

    const payload = await response.json().catch(() => null);

    if (!response.ok) {
      setSubmitting(false);
      setError(payload?.error ?? "No se pudo guardar el contrato.");
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
          setForm(getInitialForm(property));
        }
      }}
    >
      <DialogTrigger render={<Button variant="outline" className="rounded-2xl" />}>
        {property.rentalContract ? "Editar contrato" : "Configurar alquiler"}
      </DialogTrigger>
      <DialogContent className="max-w-2xl rounded-[28px] p-0">
        <div className="p-6">
          <DialogHeader>
            <DialogTitle>Contrato de alquiler</DialogTitle>
            <DialogDescription>
              Definí el índice, la frecuencia del aumento y el canal automático para avisarle al inquilino.
            </DialogDescription>
          </DialogHeader>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
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
                rows={3}
                value={form.notes}
                onChange={(event) => setForm((prev) => ({ ...prev, notes: event.target.value }))}
              />
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
          <Button onClick={handleSave} disabled={submitting}>
            {submitting ? <Loader2 className="size-4 animate-spin" /> : null}
            Guardar contrato
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
