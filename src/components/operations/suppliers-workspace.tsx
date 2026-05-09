"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { SupplierSummary } from "@/lib/operations-types";

export function SuppliersWorkspace({ suppliers }: { suppliers: SupplierSummary[] }) {
  const router = useRouter();
  const [form, setForm] = useState({
    name: "",
    serviceType: "",
    contactName: "",
    phone: "",
    email: "",
    notes: "",
  });
  const [feedback, setFeedback] = useState<string | null>(null);

  async function createSupplier() {
    setFeedback(null);
    const response = await fetch("/api/admin/suppliers", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(form),
    });
    const payload = await response.json().catch(() => null);
    if (!response.ok) {
      setFeedback(payload?.error ?? "No se pudo crear el proveedor.");
      return;
    }
    setFeedback("Proveedor creado.");
    setForm({ name: "", serviceType: "", contactName: "", phone: "", email: "", notes: "" });
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Proveedores" description="Centraliza servicios, mantenimiento, seguros y contactos operativos de la inmobiliaria." />

      <section className="grid gap-4 xl:grid-cols-[0.8fr_1.2fr]">
        <Card className="rounded-[28px] border-0 shadow-sm">
          <CardHeader><CardTitle>Nuevo proveedor</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <Input placeholder="Nombre" value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} />
            <Input placeholder="Servicio" value={form.serviceType} onChange={(e) => setForm((p) => ({ ...p, serviceType: e.target.value }))} />
            <Input placeholder="Contacto" value={form.contactName} onChange={(e) => setForm((p) => ({ ...p, contactName: e.target.value }))} />
            <Input placeholder="Telefono" value={form.phone} onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))} />
            <Input placeholder="Email" value={form.email} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))} />
            <Input placeholder="Notas" value={form.notes} onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))} />
            <Button className="rounded-2xl" onClick={createSupplier}>Guardar proveedor</Button>
            {feedback ? <p className="text-sm text-muted-foreground">{feedback}</p> : null}
          </CardContent>
        </Card>

        <Card className="rounded-[28px] border-0 shadow-sm">
          <CardHeader><CardTitle>Red de proveedores</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {suppliers.length > 0 ? (
              suppliers.map((supplier) => (
                <div key={supplier.id} className="rounded-2xl border bg-background p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold">{supplier.name}</p>
                      <p className="text-sm text-muted-foreground">{supplier.serviceType || "Servicio general"}</p>
                    </div>
                    <p className="text-sm text-muted-foreground">{supplier.status}</p>
                  </div>
                  <div className="mt-3 grid gap-2 text-sm md:grid-cols-3">
                    <p>{supplier.contactName || "Sin contacto"}</p>
                    <p>{supplier.phone || "Sin telefono"}</p>
                    <p>{supplier.email || "Sin email"}</p>
                  </div>
                </div>
              ))
            ) : (
              <EmptyBox text="Todavia no hay proveedores cargados." />
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
