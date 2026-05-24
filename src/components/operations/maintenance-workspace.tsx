"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, CheckCircle2, Plus, Search, Send, Wrench } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { MaintenanceTicketSummary } from "@/lib/operations-types";
import type { LeaseRosterItem } from "@/lib/props-data";
import { cn, formatMoney } from "@/lib/utils";

const statusOptions = ["Nuevo", "En revision", "Proveedor asignado", "Esperando aprobacion", "Resuelto", "Cancelado"];
const priorityOptions = ["Alta", "Media", "Baja"];

export function MaintenanceWorkspace({
  tickets,
  leases,
}: {
  tickets: MaintenanceTicketSummary[];
  leases: LeaseRosterItem[];
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [feedback, setFeedback] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    contractId: leases[0]?.contractId ?? "",
    title: "",
    description: "",
    priority: "Media",
    payer: "A definir",
    supplierName: "",
    estimatedCost: "",
    ownerApprovalRequired: false,
    nextStep: "",
  });

  const filteredTickets = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return tickets;
    return tickets.filter((ticket) =>
      [
        ticket.title,
        ticket.description,
        ticket.propertyTitle,
        ticket.propertyLocation,
        ticket.tenantName,
        ticket.ownerName,
        ticket.supplierName,
      ]
        .join(" ")
        .toLowerCase()
        .includes(normalized)
    );
  }, [query, tickets]);

  const activeTickets = tickets.filter((ticket) => !["Resuelto", "Cancelado"].includes(ticket.status));
  const approvalPending = tickets.filter((ticket) => ticket.ownerApprovalRequired && !ticket.ownerApprovedAt);
  const highPriority = activeTickets.filter((ticket) => ticket.priority === "Alta");

  async function createTicket() {
    setSaving(true);
    setFeedback(null);

    const response = await fetch("/api/admin/maintenance-tickets", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        ...form,
        estimatedCost: Number(form.estimatedCost || 0),
      }),
    });
    const payload = await response.json().catch(() => null);
    setSaving(false);

    if (!response.ok) {
      setFeedback(payload?.error ?? "No se pudo crear el reclamo.");
      return;
    }

    setFeedback("Reclamo creado y tarea operativa agregada para el equipo.");
    setForm((current) => ({
      ...current,
      title: "",
      description: "",
      supplierName: "",
      estimatedCost: "",
      nextStep: "",
    }));
    router.refresh();
  }

  async function updateTicket(ticketId: string, status: string) {
    setFeedback(null);
    const response = await fetch("/api/admin/maintenance-tickets", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ticketId, status }),
    });
    const payload = await response.json().catch(() => null);

    if (!response.ok) {
      setFeedback(payload?.error ?? "No se pudo actualizar el reclamo.");
      return;
    }

    setFeedback("Reclamo actualizado.");
    router.refresh();
  }

  function buildOwnerMessage(ticket: MaintenanceTicketSummary) {
    return [
      `Hola ${ticket.ownerName || "te escribimos"}, te avisamos sobre un reclamo en ${ticket.propertyTitle || "tu propiedad"}.`,
      `Tema: ${ticket.title}.`,
      ticket.estimatedCost > 0 ? `Costo estimado: ${formatMoney(ticket.estimatedCost, "ARS")}.` : null,
      ticket.nextStep ? `Proximo paso: ${ticket.nextStep}.` : null,
      ticket.ownerApprovalRequired && !ticket.ownerApprovedAt
        ? "Necesitamos tu autorizacion para avanzar."
        : "Te mantenemos al tanto del avance.",
    ]
      .filter(Boolean)
      .join("\n");
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Mantenimiento"
        description="Reclamos, proveedores, costos, autorizaciones y seguimiento por propiedad."
      />

      <section className="grid gap-3 md:grid-cols-3">
        <MiniCard label="Reclamos abiertos" value={String(activeTickets.length)} icon={Wrench} />
        <MiniCard label="Alta prioridad" value={String(highPriority.length)} icon={AlertTriangle} />
        <MiniCard label="Esperan propietario" value={String(approvalPending.length)} icon={Send} />
      </section>

      <section className="grid gap-4 xl:grid-cols-[0.85fr_1.15fr]">
        <Card className="rounded-[28px] border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plus className="size-5 text-primary" />
              Nuevo reclamo
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Cada reclamo crea una tarea para que no quede perdido en WhatsApp.
            </p>
          </CardHeader>
          <CardContent className="space-y-3">
            <select
              className="flex h-11 w-full rounded-2xl border bg-background px-3 text-sm outline-none"
              value={form.contractId}
              onChange={(event) => setForm((prev) => ({ ...prev, contractId: event.target.value }))}
            >
              {leases.map((lease) => (
                <option key={lease.contractId} value={lease.contractId}>
                  {lease.tenantName} - {lease.propertyTitle}
                </option>
              ))}
            </select>

            <Input
              value={form.title}
              onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))}
              placeholder="Ej. Perdida de agua en cocina"
              className="rounded-2xl"
            />
            <Textarea
              value={form.description}
              onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
              placeholder="Detalle del problema, fotos recibidas, urgencia o contexto..."
              className="min-h-28 rounded-2xl"
            />

            <div className="grid gap-3 md:grid-cols-2">
              <select
                className="flex h-11 w-full rounded-2xl border bg-background px-3 text-sm outline-none"
                value={form.priority}
                onChange={(event) => setForm((prev) => ({ ...prev, priority: event.target.value }))}
              >
                {priorityOptions.map((item) => (
                  <option key={item}>{item}</option>
                ))}
              </select>
              <select
                className="flex h-11 w-full rounded-2xl border bg-background px-3 text-sm outline-none"
                value={form.payer}
                onChange={(event) => setForm((prev) => ({ ...prev, payer: event.target.value }))}
              >
                {["A definir", "Propietario", "Inquilino", "Inmobiliaria"].map((item) => (
                  <option key={item}>{item}</option>
                ))}
              </select>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <Input
                value={form.supplierName}
                onChange={(event) => setForm((prev) => ({ ...prev, supplierName: event.target.value }))}
                placeholder="Proveedor asignado"
                className="rounded-2xl"
              />
              <Input
                value={form.estimatedCost}
                onChange={(event) => setForm((prev) => ({ ...prev, estimatedCost: event.target.value }))}
                placeholder="Costo estimado"
                className="rounded-2xl"
              />
            </div>

            <button
              type="button"
              className="flex w-full items-start gap-3 rounded-2xl border bg-muted/20 p-3 text-left"
              onClick={() =>
                setForm((prev) => ({ ...prev, ownerApprovalRequired: !prev.ownerApprovalRequired }))
              }
            >
              <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border bg-background">
                {form.ownerApprovalRequired ? <CheckCircle2 className="size-4 text-primary" /> : null}
              </span>
              <span>
                <span className="block font-medium">Requiere autorizacion del propietario</span>
                <span className="text-sm text-muted-foreground">
                  Props lo marca como alerta hasta que se apruebe.
                </span>
              </span>
            </button>

            <Input
              value={form.nextStep}
              onChange={(event) => setForm((prev) => ({ ...prev, nextStep: event.target.value }))}
              placeholder="Proximo paso"
              className="rounded-2xl"
            />

            {feedback ? <p className="rounded-2xl border bg-background p-3 text-sm text-muted-foreground">{feedback}</p> : null}
            <Button className="w-full rounded-2xl" disabled={saving || !form.title.trim()} onClick={createTicket}>
              {saving ? "Guardando..." : "Crear reclamo"}
            </Button>
          </CardContent>
        </Card>

        <Card className="rounded-[28px] border-0 shadow-sm">
          <CardHeader>
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <CardTitle>Seguimiento operativo</CardTitle>
                <p className="mt-1 text-sm text-muted-foreground">
                  Ordenado por prioridad para resolver antes lo urgente.
                </p>
              </div>
              <div className="relative w-full lg:max-w-sm">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Buscar reclamo, propiedad o persona..."
                  className="h-11 rounded-2xl pl-10"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {filteredTickets.length > 0 ? (
              filteredTickets.map((ticket) => (
                <article key={ticket.id} className="rounded-2xl border bg-background p-4">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={cn(
                            "rounded-full px-2 py-1 text-xs font-semibold",
                            ticket.priority === "Alta"
                              ? "bg-red-500/10 text-red-700"
                              : ticket.priority === "Media"
                                ? "bg-amber-500/10 text-amber-700"
                                : "bg-emerald-500/10 text-emerald-700"
                          )}
                        >
                          {ticket.priority}
                        </span>
                        <span className="rounded-full bg-muted px-2 py-1 text-xs font-medium">
                          {ticket.status}
                        </span>
                      </div>
                      <h3 className="mt-2 font-semibold">{ticket.title}</h3>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {ticket.propertyTitle || "Sin propiedad"} - {ticket.tenantName || "Sin inquilino"}
                      </p>
                    </div>
                    <select
                      className="h-9 rounded-2xl border bg-background px-3 text-sm outline-none"
                      value={ticket.status}
                      onChange={(event) => void updateTicket(ticket.id, event.target.value)}
                    >
                      {statusOptions.map((item) => (
                        <option key={item}>{item}</option>
                      ))}
                    </select>
                  </div>

                  <p className="mt-3 line-clamp-2 text-sm text-muted-foreground">
                    {ticket.description || ticket.nextStep}
                  </p>

                  <div className="mt-3 grid gap-2 text-sm md:grid-cols-4">
                    <Info label="Proveedor" value={ticket.supplierName || "Sin asignar"} />
                    <Info label="Costo" value={ticket.estimatedCost > 0 ? formatMoney(ticket.estimatedCost, "ARS") : "A definir"} />
                    <Info label="Paga" value={ticket.payer} />
                    <Info label="Autorizacion" value={ticket.ownerApprovalRequired ? ticket.ownerApprovedAt ? "Aprobada" : "Pendiente" : "No requiere"} />
                  </div>

                  <div className="mt-3 rounded-2xl border border-dashed bg-muted/20 p-3 text-sm">
                    <p className="font-medium">Mensaje sugerido al propietario</p>
                    <p className="mt-1 whitespace-pre-line text-muted-foreground">{buildOwnerMessage(ticket)}</p>
                  </div>
                </article>
              ))
            ) : (
              <div className="rounded-2xl border border-dashed bg-background p-4 text-sm text-muted-foreground">
                No hay reclamos con ese filtro.
              </div>
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

function MiniCard({ label, value, icon: Icon }: { label: string; value: string; icon: LucideIcon }) {
  return (
    <Card className="rounded-[24px] border-0 shadow-sm">
      <CardContent className="flex items-center gap-3 pt-4">
        <div className="flex size-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <Icon className="size-5" />
        </div>
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="text-2xl font-semibold">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-muted/40 p-3">
      <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">{label}</p>
      <p className="mt-1 font-medium">{value}</p>
    </div>
  );
}
