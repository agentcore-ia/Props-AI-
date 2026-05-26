"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarDays, Mail, Phone, Search } from "lucide-react";

import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export type AppContactRequest = {
  id: string;
  fullName: string;
  agencyName: string;
  email: string;
  phone: string;
  message: string;
  source: string;
  status: string;
  notes: string;
  createdAt: string;
};

const statuses = ["Nuevo", "Contactado", "Demo agendada", "Cerrado", "Descartado"];

export function AppContactRequestsWorkspace({ requests }: { requests: AppContactRequest[] }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("Todos");
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  const filteredRequests = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return requests.filter((request) => {
      const matchesStatus = filter === "Todos" || request.status === filter;
      const lookup = [
        request.fullName,
        request.agencyName,
        request.email,
        request.phone,
        request.message,
        request.notes,
      ]
        .join(" ")
        .toLowerCase();

      return matchesStatus && (!normalizedQuery || lookup.includes(normalizedQuery));
    });
  }, [filter, query, requests]);

  const pendingCount = requests.filter((request) => request.status === "Nuevo").length;
  const contactedCount = requests.filter((request) => request.status === "Contactado").length;
  const demoCount = requests.filter((request) => request.status === "Demo agendada").length;

  async function updateStatus(requestId: string, status: string) {
    setUpdatingId(requestId);
    setFeedback(null);

    const response = await fetch(`/api/admin/app-contact-requests/${requestId}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ status }),
    });

    const payload = await response.json().catch(() => null);

    if (!response.ok) {
      setFeedback(payload?.error ?? "No se pudo actualizar la solicitud.");
      setUpdatingId(null);
      return;
    }

    setFeedback("Solicitud actualizada.");
    setUpdatingId(null);
    router.refresh();
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Solicitudes"
        description="Contactos que llegan desde el formulario público de app.props.com.ar."
      />

      <section className="grid gap-3 lg:grid-cols-3">
        <MetricCard label="Nuevas" value={pendingCount} tone="blue" />
        <MetricCard label="Contactadas" value={contactedCount} tone="slate" />
        <MetricCard label="Demo agendada" value={demoCount} tone="green" />
      </section>

      <section className="rounded-[28px] border bg-card p-4 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative w-full lg:max-w-md">
            <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Buscar por nombre, email o celular..."
              className="h-11 rounded-2xl pl-11"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {["Todos", ...statuses].map((status) => (
              <button
                key={status}
                type="button"
                onClick={() => setFilter(status)}
                className={cn(
                  "rounded-full border px-4 py-2 text-sm font-semibold transition",
                  filter === status
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-background text-muted-foreground hover:text-foreground"
                )}
              >
                {status}
              </button>
            ))}
          </div>
        </div>
      </section>

      {feedback ? (
        <div className="rounded-2xl border bg-card px-4 py-3 text-sm text-muted-foreground">
          {feedback}
        </div>
      ) : null}

      <section className="grid gap-3">
        {filteredRequests.length > 0 ? (
          filteredRequests.map((request) => (
            <article key={request.id} className="rounded-[28px] border bg-card p-5 shadow-sm">
              <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-xl font-semibold">{request.fullName}</h2>
                    <StatusBadge status={request.status} />
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {request.agencyName && request.agencyName !== "Sin informar"
                      ? request.agencyName
                      : "Contacto desde landing"}
                  </p>

                  <div className="mt-4 grid gap-2 text-sm text-muted-foreground md:grid-cols-3">
                    <Info icon={Mail} text={request.email} />
                    <Info icon={Phone} text={request.phone} />
                    <Info icon={CalendarDays} text={formatDate(request.createdAt)} />
                  </div>

                  <div className="mt-4 rounded-2xl border bg-background px-4 py-3 text-sm leading-6">
                    {request.message}
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 xl:justify-end">
                  <Button
                    variant="outline"
                    className="rounded-2xl"
                    disabled={updatingId === request.id}
                    onClick={() => updateStatus(request.id, "Contactado")}
                  >
                    Marcar contactado
                  </Button>
                  <Button
                    className="rounded-2xl"
                    disabled={updatingId === request.id}
                    onClick={() => updateStatus(request.id, "Demo agendada")}
                  >
                    Demo agendada
                  </Button>
                  <Button
                    variant="outline"
                    className="rounded-2xl"
                    disabled={updatingId === request.id}
                    onClick={() => updateStatus(request.id, "Descartado")}
                  >
                    Descartar
                  </Button>
                </div>
              </div>
            </article>
          ))
        ) : (
          <div className="rounded-[28px] border border-dashed bg-card p-8 text-center text-muted-foreground">
            No hay solicitudes con ese filtro.
          </div>
        )}
      </section>
    </div>
  );
}

function MetricCard({ label, value, tone }: { label: string; value: number; tone: "blue" | "green" | "slate" }) {
  return (
    <div className="rounded-[28px] border bg-card p-5 shadow-sm">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p
        className={cn(
          "mt-2 text-3xl font-semibold",
          tone === "blue" && "text-primary",
          tone === "green" && "text-emerald-600",
          tone === "slate" && "text-foreground"
        )}
      >
        {value}
      </p>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  return (
    <span className="rounded-full bg-muted px-3 py-1 text-xs font-semibold text-muted-foreground">
      {status}
    </span>
  );
}

function Info({ icon: Icon, text }: { icon: typeof Mail; text: string }) {
  return (
    <div className="flex min-w-0 items-center gap-2">
      <Icon className="size-4 shrink-0" />
      <span className="truncate">{text}</span>
    </div>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("es-AR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}
