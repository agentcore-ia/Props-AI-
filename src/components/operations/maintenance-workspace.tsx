"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  CheckCircle2,
  Clipboard,
  ClipboardCheck,
  MessageCircleMore,
  Plus,
  Search,
  Send,
  UserRoundCheck,
  Wrench,
} from "lucide-react";
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
const filterOptions = [
  { key: "todos", label: "Todos" },
  { key: "abiertos", label: "Abiertos" },
  { key: "urgentes", label: "Urgentes" },
  { key: "proveedor", label: "Con proveedor" },
  { key: "propietario", label: "Esperan propietario" },
  { key: "resueltos", label: "Resueltos" },
] as const;

type FilterKey = (typeof filterOptions)[number]["key"];

export function MaintenanceWorkspace({
  tickets,
  leases,
}: {
  tickets: MaintenanceTicketSummary[];
  leases: LeaseRosterItem[];
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [leaseQuery, setLeaseQuery] = useState("");
  const [filter, setFilter] = useState<FilterKey>("abiertos");
  const [feedback, setFeedback] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [updatingTicketId, setUpdatingTicketId] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
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

  const activeTickets = tickets.filter((ticket) => !["Resuelto", "Cancelado"].includes(ticket.status));
  const approvalPending = tickets.filter((ticket) => ticket.ownerApprovalRequired && !ticket.ownerApprovedAt);
  const highPriority = activeTickets.filter((ticket) => ticket.priority === "Alta");
  const withSupplier = activeTickets.filter((ticket) => ticket.supplierName);
  const selectedLease = leases.find((lease) => lease.contractId === form.contractId) ?? leases[0] ?? null;
  const filteredLeases = useMemo(() => {
    const normalized = normalizeSearch(leaseQuery);
    if (!normalized) return leases.slice(0, 6);
    return leases
      .filter((lease) =>
        normalizeSearch(
          [
            lease.propertyTitle,
            lease.propertyLocation,
            lease.tenantName,
            lease.ownerName,
            lease.tenantPhone,
          ].join(" ")
        ).includes(normalized)
      )
      .slice(0, 8);
  }, [leaseQuery, leases]);

  const filteredTickets = useMemo(() => {
    const normalized = normalizeSearch(query);
    return tickets
      .filter((ticket) => {
        if (filter === "abiertos") return !["Resuelto", "Cancelado"].includes(ticket.status);
        if (filter === "urgentes") return ticket.priority === "Alta" && !["Resuelto", "Cancelado"].includes(ticket.status);
        if (filter === "proveedor") return Boolean(ticket.supplierName) && !["Resuelto", "Cancelado"].includes(ticket.status);
        if (filter === "propietario") return ticket.ownerApprovalRequired && !ticket.ownerApprovedAt;
        if (filter === "resueltos") return ["Resuelto", "Cancelado"].includes(ticket.status);
        return true;
      })
      .filter((ticket) => {
        if (!normalized) return true;
        return normalizeSearch(
          [
            ticket.title,
            ticket.description,
            ticket.propertyTitle,
            ticket.propertyLocation,
            ticket.tenantName,
            ticket.ownerName,
            ticket.supplierName,
            ticket.nextStep,
          ].join(" ")
        ).includes(normalized);
      })
      .sort((a, b) => ticketScore(b) - ticketScore(a));
  }, [filter, query, tickets]);

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

    setFeedback("Reclamo creado. También quedó una tarea para que el equipo lo siga.");
    setForm((current) => ({
      ...current,
      title: "",
      description: "",
      supplierName: "",
      estimatedCost: "",
      nextStep: "",
      ownerApprovalRequired: false,
    }));
    router.refresh();
  }

  async function updateTicket(ticketId: string, update: Record<string, unknown>, successMessage = "Reclamo actualizado.") {
    setUpdatingTicketId(ticketId);
    setFeedback(null);
    const response = await fetch("/api/admin/maintenance-tickets", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ticketId, ...update }),
    });
    const payload = await response.json().catch(() => null);
    setUpdatingTicketId(null);

    if (!response.ok) {
      setFeedback(payload?.error ?? "No se pudo actualizar el reclamo.");
      return;
    }

    setFeedback(successMessage);
    router.refresh();
  }

  async function copyMessage(key: string, message: string) {
    await navigator.clipboard.writeText(message);
    setCopiedKey(key);
    window.setTimeout(() => setCopiedKey(null), 1800);
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Reclamos"
        description="Seguimiento simple de problemas por propiedad: inquilino, proveedor, costo, autorización y próximo paso."
      />

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <MiniCard label="Abiertos" value={String(activeTickets.length)} icon={Wrench} />
        <MiniCard label="Urgentes" value={String(highPriority.length)} icon={AlertTriangle} />
        <MiniCard label="Con proveedor" value={String(withSupplier.length)} icon={UserRoundCheck} />
        <MiniCard label="Esperan propietario" value={String(approvalPending.length)} icon={Send} />
      </section>

      <section className="grid gap-4 xl:grid-cols-[380px_minmax(0,1fr)]">
        <Card className="rounded-[28px] border-0 shadow-sm">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2">
              <Plus className="size-5 text-primary" />
              Crear reclamo
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Cargalo en menos de un minuto. Props lo transforma en seguimiento operativo.
            </p>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="rounded-2xl border bg-muted/15 p-3">
              <label className="grid gap-1.5 text-sm">
                <span className="font-medium">¿De qué propiedad viene el reclamo?</span>
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={leaseQuery}
                    onChange={(event) => setLeaseQuery(event.target.value)}
                    placeholder="Buscar propiedad, dirección o inquilino..."
                    className="h-11 rounded-2xl pl-10"
                  />
                </div>
              </label>

              {selectedLease ? (
                <div className="mt-3 rounded-xl border bg-background p-3 text-sm">
                  <p className="font-semibold">{selectedLease.propertyTitle}</p>
                  <p className="mt-1 text-muted-foreground">
                    {selectedLease.propertyLocation} · {selectedLease.tenantName}
                  </p>
                </div>
              ) : null}

              <div className="mt-3 max-h-48 space-y-2 overflow-y-auto pr-1">
                {filteredLeases.length > 0 ? (
                  filteredLeases.map((lease) => {
                    const active = lease.contractId === form.contractId;
                    return (
                      <button
                        key={lease.contractId}
                        type="button"
                        className={cn(
                          "w-full rounded-xl border px-3 py-2 text-left text-sm transition",
                          active ? "border-primary bg-primary/5" : "bg-background hover:bg-muted"
                        )}
                        onClick={() => {
                          setForm((prev) => ({ ...prev, contractId: lease.contractId }));
                          setLeaseQuery(`${lease.propertyTitle} ${lease.propertyLocation}`);
                        }}
                      >
                        <span className="block font-medium">{lease.propertyTitle}</span>
                        <span className="block text-xs text-muted-foreground">
                          {lease.propertyLocation} · Inquilino: {lease.tenantName}
                        </span>
                      </button>
                    );
                  })
                ) : (
                  <p className="rounded-xl border border-dashed bg-background p-3 text-sm text-muted-foreground">
                    No encontramos propiedades con esa búsqueda.
                  </p>
                )}
              </div>
            </div>

            <Input
              value={form.title}
              onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))}
              placeholder="Ej. Pérdida de agua en cocina"
              className="rounded-2xl"
            />
            <Textarea
              value={form.description}
              onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
              placeholder="Qué pasó, qué mandó el inquilino, si hay fotos, urgencia..."
              className="min-h-24 rounded-2xl"
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
                placeholder="Proveedor"
                className="rounded-2xl"
              />
              <Input
                inputMode="numeric"
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
                <span className="block font-medium">Necesita autorización del propietario</span>
                <span className="text-sm text-muted-foreground">
                  Lo deja marcado como pendiente hasta aprobar.
                </span>
              </span>
            </button>

            <Input
              value={form.nextStep}
              onChange={(event) => setForm((prev) => ({ ...prev, nextStep: event.target.value }))}
              placeholder="Próximo paso: pedir presupuesto, coordinar visita técnica..."
              className="rounded-2xl"
            />

            {feedback ? (
              <p className="rounded-2xl border bg-background p-3 text-sm text-muted-foreground">{feedback}</p>
            ) : null}
            <Button className="w-full rounded-2xl" disabled={saving || !form.title.trim()} onClick={createTicket}>
              {saving ? "Guardando..." : "Crear reclamo"}
            </Button>
          </CardContent>
        </Card>

        <Card className="rounded-[28px] border-0 shadow-sm">
          <CardHeader className="pb-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <CardTitle>Reclamos en curso</CardTitle>
                <p className="mt-1 text-sm text-muted-foreground">
                  Buscá por inquilino, proveedor, propiedad o problema.
                </p>
              </div>
              <div className="relative w-full lg:max-w-md">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Buscar inquilino, proveedor, propiedad..."
                  className="h-11 rounded-2xl pl-10"
                />
              </div>
            </div>
            <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
              {filterOptions.map((item) => (
                <button
                  key={item.key}
                  type="button"
                  className={cn(
                    "shrink-0 rounded-full border px-3 py-1.5 text-sm font-medium transition",
                    filter === item.key ? "border-primary bg-primary text-primary-foreground" : "bg-background hover:bg-muted"
                  )}
                  onClick={() => setFilter(item.key)}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {filteredTickets.length > 0 ? (
              filteredTickets.map((ticket) => (
                <TicketCard
                  key={ticket.id}
                  ticket={ticket}
                  copiedKey={copiedKey}
                  updating={updatingTicketId === ticket.id}
                  onCopy={copyMessage}
                  onUpdate={updateTicket}
                />
              ))
            ) : (
              <div className="rounded-2xl border border-dashed bg-background p-5 text-sm text-muted-foreground">
                No hay reclamos con ese filtro. Si el problema vino por WhatsApp, cargalo como reclamo para que no se pierda.
              </div>
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

function TicketCard({
  ticket,
  copiedKey,
  updating,
  onCopy,
  onUpdate,
}: {
  ticket: MaintenanceTicketSummary;
  copiedKey: string | null;
  updating: boolean;
  onCopy: (key: string, message: string) => void | Promise<void>;
  onUpdate: (ticketId: string, update: Record<string, unknown>, successMessage?: string) => void | Promise<void>;
}) {
  const ownerMessage = buildOwnerMessage(ticket);
  const tenantMessage = buildTenantMessage(ticket);
  const supplierMessage = buildSupplierMessage(ticket);

  return (
    <article className="rounded-[24px] border bg-background p-4">
      <div className="grid gap-4 2xl:grid-cols-[minmax(0,1fr)_260px]">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <PriorityBadge priority={ticket.priority} />
            <span className="rounded-full bg-muted px-2 py-1 text-xs font-medium">{ticket.status}</span>
            <span className="rounded-full border bg-card px-2 py-1 text-xs text-muted-foreground">
              {ticket.payer}
            </span>
          </div>

          <h3 className="mt-2 text-lg font-semibold">{ticket.title}</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {ticket.propertyTitle || "Sin propiedad"} · {ticket.propertyLocation || "Sin ubicación"}
          </p>

          <div className="mt-3 grid gap-2 text-sm md:grid-cols-2 xl:grid-cols-4">
            <Info label="Inquilino" value={ticket.tenantName || "Sin dato"} />
            <Info label="Propietario" value={ticket.ownerName || "Sin dato"} />
            <Info label="Proveedor" value={ticket.supplierName || "Sin asignar"} />
            <Info
              label="Costo"
              value={ticket.estimatedCost > 0 ? formatMoney(ticket.estimatedCost, "ARS") : "A definir"}
            />
          </div>

          <div className="mt-3 rounded-2xl border bg-muted/20 p-3 text-sm">
            <p className="font-medium">Qué hay que resolver</p>
            <p className="mt-1 text-muted-foreground">{ticket.description || "Sin detalle cargado."}</p>
            <p className="mt-3 font-medium">Próximo paso</p>
            <p className="mt-1 text-muted-foreground">{ticket.nextStep || suggestNextStep(ticket)}</p>
          </div>

          <div className="mt-3 grid gap-2 lg:grid-cols-3">
            <MessageSuggestion
              title="Mensaje al proveedor"
              description={ticket.supplierName ? "Para pedir disponibilidad o presupuesto." : "Primero asigná un proveedor; igual podés copiar el pedido."}
              message={supplierMessage}
              copied={copiedKey === `${ticket.id}-supplier`}
              onCopy={() => onCopy(`${ticket.id}-supplier`, supplierMessage)}
            />
            <MessageSuggestion
              title="Mensaje al inquilino"
              description="Para avisar que el reclamo quedó tomado."
              message={tenantMessage}
              copied={copiedKey === `${ticket.id}-tenant`}
              onCopy={() => onCopy(`${ticket.id}-tenant`, tenantMessage)}
            />
            <MessageSuggestion
              title="Mensaje al propietario"
              description="Para pedir autorización o informar avance."
              message={ownerMessage}
              copied={copiedKey === `${ticket.id}-owner`}
              onCopy={() => onCopy(`${ticket.id}-owner`, ownerMessage)}
            />
          </div>
        </div>

        <div className="rounded-2xl border bg-card p-3">
          <p className="text-sm font-semibold">Acciones rápidas</p>
          <div className="mt-3 space-y-2">
            <select
              className="h-10 w-full rounded-2xl border bg-background px-3 text-sm outline-none"
              value={ticket.status}
              disabled={updating}
              onChange={(event) => onUpdate(ticket.id, { status: event.target.value })}
            >
              {statusOptions.map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
            <Button
              variant="outline"
              className="w-full justify-start rounded-2xl"
              disabled={updating || ticket.status === "Proveedor asignado"}
              onClick={() =>
                onUpdate(
                  ticket.id,
                  { status: "Proveedor asignado" },
                  "Reclamo marcado con proveedor asignado."
                )
              }
            >
              <UserRoundCheck className="size-4" />
              Proveedor asignado
            </Button>
            <Button
              variant="outline"
              className="w-full justify-start rounded-2xl"
              disabled={updating || ticket.status === "Esperando aprobacion"}
              onClick={() =>
                onUpdate(
                  ticket.id,
                  { status: "Esperando aprobacion", ownerApprovalRequired: true },
                  "Reclamo marcado como pendiente de propietario."
                )
              }
            >
              <Send className="size-4" />
              Esperar propietario
            </Button>
            <Button
              className="w-full justify-start rounded-2xl"
              disabled={updating || ticket.status === "Resuelto"}
              onClick={() => onUpdate(ticket.id, { status: "Resuelto" }, "Reclamo resuelto.")}
            >
              <CheckCircle2 className="size-4" />
              Marcar resuelto
            </Button>
          </div>

          <div className="mt-3 rounded-xl border border-dashed bg-background p-3 text-xs text-muted-foreground">
            {ticket.ownerApprovalRequired && !ticket.ownerApprovedAt
              ? "Falta autorización del propietario antes de avanzar con el gasto."
              : ticket.supplierName
                ? `Sugerencia: escribirle a ${ticket.supplierName} y pedir disponibilidad.`
                : "Sugerencia: asignar proveedor y pedir presupuesto."}
          </div>
        </div>
      </div>
    </article>
  );
}

function buildOwnerMessage(ticket: MaintenanceTicketSummary) {
  return [
    `Hola ${ticket.ownerName || "te escribimos"}, te avisamos sobre un reclamo en ${ticket.propertyTitle || "tu propiedad"}.`,
    `Tema: ${ticket.title}.`,
    ticket.estimatedCost > 0 ? `Costo estimado: ${formatMoney(ticket.estimatedCost, "ARS")}.` : null,
    ticket.nextStep ? `Próximo paso: ${ticket.nextStep}.` : null,
    ticket.ownerApprovalRequired && !ticket.ownerApprovedAt
      ? "Necesitamos tu autorización para avanzar."
      : "Te mantenemos al tanto del avance.",
  ]
    .filter(Boolean)
    .join("\n");
}

function buildTenantMessage(ticket: MaintenanceTicketSummary) {
  return [
    `Hola ${ticket.tenantName || ""}, ya registramos tu reclamo: ${ticket.title}.`,
    ticket.nextStep ? `Próximo paso: ${ticket.nextStep}.` : "El equipo lo va a revisar y te avisa el próximo paso.",
    ticket.supplierName ? `Proveedor asignado: ${ticket.supplierName}.` : null,
    "Te mantenemos informado por este medio.",
  ]
    .filter(Boolean)
    .join("\n");
}

function buildSupplierMessage(ticket: MaintenanceTicketSummary) {
  return [
    `Hola ${ticket.supplierName || ""}, necesitamos revisar un reclamo en ${ticket.propertyTitle || "una propiedad"}.`,
    ticket.propertyLocation ? `Ubicación: ${ticket.propertyLocation}.` : null,
    `Problema: ${ticket.title}.`,
    ticket.description ? `Detalle: ${ticket.description}.` : null,
    ticket.estimatedCost > 0 ? `Tenemos una referencia de costo de ${formatMoney(ticket.estimatedCost, "ARS")}.` : null,
    "¿Podés pasarnos disponibilidad y presupuesto estimado?",
  ]
    .filter(Boolean)
    .join("\n");
}

function suggestNextStep(ticket: MaintenanceTicketSummary) {
  if (!ticket.supplierName) return "Asignar proveedor y pedir presupuesto.";
  if (ticket.ownerApprovalRequired && !ticket.ownerApprovedAt) return "Enviar mensaje al propietario para aprobar el gasto.";
  if (ticket.status === "Proveedor asignado") return "Coordinar visita técnica con inquilino y proveedor.";
  return "Actualizar estado cuando haya avance.";
}

function normalizeSearch(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function ticketScore(ticket: MaintenanceTicketSummary) {
  const activeBoost = ["Resuelto", "Cancelado"].includes(ticket.status) ? 0 : 1000;
  const priorityBoost = ticket.priority === "Alta" ? 300 : ticket.priority === "Media" ? 150 : 50;
  const approvalBoost = ticket.ownerApprovalRequired && !ticket.ownerApprovedAt ? 120 : 0;
  return activeBoost + priorityBoost + approvalBoost + new Date(ticket.updatedAt).getTime() / 100000000;
}

function PriorityBadge({ priority }: { priority: MaintenanceTicketSummary["priority"] }) {
  return (
    <span
      className={cn(
        "rounded-full px-2 py-1 text-xs font-semibold",
        priority === "Alta"
          ? "bg-red-500/10 text-red-700"
          : priority === "Media"
            ? "bg-amber-500/10 text-amber-700"
            : "bg-emerald-500/10 text-emerald-700"
      )}
    >
      {priority}
    </span>
  );
}

function MessageSuggestion({
  title,
  description,
  message,
  copied,
  onCopy,
}: {
  title: string;
  description: string;
  message: string;
  copied: boolean;
  onCopy: () => void | Promise<void>;
}) {
  return (
    <div className="rounded-2xl border bg-card p-3 text-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-semibold">{title}</p>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">{description}</p>
        </div>
        <MessageCircleMore className="size-4 shrink-0 text-primary" />
      </div>
      <p className="mt-2 line-clamp-3 text-xs leading-5 text-muted-foreground">{message}</p>
      <Button variant="outline" size="sm" className="mt-3 rounded-xl" onClick={onCopy}>
        {copied ? <ClipboardCheck className="size-4" /> : <Clipboard className="size-4" />}
        {copied ? "Copiado" : "Copiar"}
      </Button>
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
      <p className="mt-1 truncate font-medium">{value}</p>
    </div>
  );
}
