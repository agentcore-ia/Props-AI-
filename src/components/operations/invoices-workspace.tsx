"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { SupplierInvoiceSummary, SupplierSummary } from "@/lib/operations-types";
import { formatMoney } from "@/lib/utils";

export function InvoicesWorkspace({
  suppliers,
  invoices,
}: {
  suppliers: SupplierSummary[];
  invoices: SupplierInvoiceSummary[];
}) {
  const router = useRouter();
  const [form, setForm] = useState({
    supplierId: suppliers[0]?.id ?? "",
    invoiceNumber: "",
    concept: "",
    totalAmount: "",
    dueDate: "",
  });
  const [feedback, setFeedback] = useState<string | null>(null);

  async function createInvoice() {
    setFeedback(null);
    const response = await fetch("/api/admin/supplier-invoices", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        supplierId: form.supplierId || null,
        invoiceNumber: form.invoiceNumber,
        concept: form.concept,
        totalAmount: Number(form.totalAmount),
        dueDate: form.dueDate || null,
      }),
    });
    const payload = await response.json().catch(() => null);
    if (!response.ok) {
      setFeedback(payload?.error ?? "No se pudo emitir la factura.");
      return;
    }
    setFeedback("Factura registrada.");
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Facturas" description="Controla facturas de proveedores y obligaciones operativas pendientes de pago." />

      <section className="grid gap-4 xl:grid-cols-[0.8fr_1.2fr]">
        <Card className="rounded-[28px] border-0 shadow-sm">
          <CardHeader><CardTitle>Nueva factura</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <select
              className="flex h-11 w-full rounded-xl border bg-background px-3 text-sm outline-none"
              value={form.supplierId}
              onChange={(e) => setForm((p) => ({ ...p, supplierId: e.target.value }))}
            >
              <option value="">Sin proveedor</option>
              {suppliers.map((supplier) => (
                <option key={supplier.id} value={supplier.id}>{supplier.name}</option>
              ))}
            </select>
            <Input placeholder="Numero de factura" value={form.invoiceNumber} onChange={(e) => setForm((p) => ({ ...p, invoiceNumber: e.target.value }))} />
            <Input placeholder="Concepto" value={form.concept} onChange={(e) => setForm((p) => ({ ...p, concept: e.target.value }))} />
            <Input placeholder="Importe" value={form.totalAmount} onChange={(e) => setForm((p) => ({ ...p, totalAmount: e.target.value }))} />
            <Input type="date" value={form.dueDate} onChange={(e) => setForm((p) => ({ ...p, dueDate: e.target.value }))} />
            <Button className="rounded-2xl" onClick={createInvoice}>Guardar factura</Button>
            {feedback ? <p className="text-sm text-muted-foreground">{feedback}</p> : null}
          </CardContent>
        </Card>

        <Card className="rounded-[28px] border-0 shadow-sm">
          <CardHeader><CardTitle>Facturas recientes</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {invoices.length > 0 ? (
              invoices.map((invoice) => (
                <div key={invoice.id} className="rounded-2xl border bg-background p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold">{invoice.concept}</p>
                      <p className="text-sm text-muted-foreground">
                        {invoice.supplierName} · {invoice.invoiceNumber || "Sin numero"}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">{formatMoney(invoice.totalAmount, "ARS")}</p>
                      <p className="text-sm text-muted-foreground">{invoice.status}</p>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <EmptyBox text="Todavia no hay facturas cargadas." />
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

function EmptyBox({ text }: { text: string }) {
  return <div className="rounded-2xl border border-dashed bg-background p-4 text-sm text-muted-foreground">{text}</div>;
}
