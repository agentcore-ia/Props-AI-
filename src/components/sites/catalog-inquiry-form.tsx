"use client";

import { useState } from "react";
import { Loader2, MessageSquarePlus, PhoneCall } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export function CatalogInquiryForm({
  tenantSlug,
  propertyId,
  title = "Quiero que me contacten",
  description = "Deja tus datos y el equipo comercial te responde con opciones ajustadas a tu necesidad.",
  compact = false,
  currentUser,
}: {
  tenantSlug: string;
  propertyId?: null | string;
  title?: string;
  description?: string;
  compact?: boolean;
  currentUser?: {
    fullName: string | null;
    email: string | null;
    role: "superadmin" | "agency_admin" | "agent" | "customer";
  } | null;
}) {
  const isLoggedCustomer = currentUser?.role === "customer";
  const [form, setForm] = useState({
    name: currentUser?.fullName ?? "",
    email: currentUser?.email ?? "",
    phone: "",
    budget: "",
    message: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setSuccess(null);
    setError(null);

    try {
      const response = await fetch("/api/public/inquiries", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          tenantSlug,
          propertyId,
          ...form,
        }),
      });

      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        setError(payload?.error ?? "No se pudo enviar la consulta.");
        setSubmitting(false);
        return;
      }

      setForm({
        name: currentUser?.fullName ?? "",
        email: currentUser?.email ?? "",
        phone: "",
        budget: "",
        message: "",
      });
      setSuccess("Consulta enviada. Te van a responder a la brevedad.");
    } catch {
      setError("No se pudo enviar la consulta. Proba nuevamente.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className={
        compact
          ? "rounded-[26px] border border-slate-200 bg-white p-5 shadow-[0_18px_50px_-38px_rgba(15,23,42,0.35)]"
          : "rounded-[30px] border border-slate-200 bg-white p-6 shadow-[0_24px_80px_-48px_rgba(15,23,42,0.3)]"
      }
    >
      <div className="flex items-start gap-3">
        <div className="mt-1 flex size-11 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
          {compact ? <PhoneCall className="size-5" /> : <MessageSquarePlus className="size-5" />}
        </div>
        <div>
          <h3 className="text-xl font-semibold text-slate-950">{title}</h3>
          <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="mt-5 space-y-3">
        <div className="grid gap-3 sm:grid-cols-2">
          {!isLoggedCustomer ? (
            <>
              <Input
                placeholder="Nombre"
                value={form.name}
                onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                className="h-11 rounded-2xl border-slate-200 bg-slate-50 px-4"
              />
              <Input
                type="email"
                placeholder="Email"
                value={form.email}
                onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
                className="h-11 rounded-2xl border-slate-200 bg-slate-50 px-4"
              />
              <Input
                placeholder="Telefono"
                value={form.phone}
                onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))}
                className="h-11 rounded-2xl border-slate-200 bg-slate-50 px-4"
              />
            </>
          ) : null}
          <Input
            placeholder="Presupuesto estimado"
            value={form.budget}
            onChange={(event) => setForm((current) => ({ ...current, budget: event.target.value }))}
            className="h-11 rounded-2xl border-slate-200 bg-slate-50 px-4"
          />
        </div>

        <Textarea
          placeholder="Contanos que necesitas, zona deseada, cantidad de ambientes o cualquier detalle clave."
          value={form.message}
          onChange={(event) => setForm((current) => ({ ...current, message: event.target.value }))}
          className="min-h-32 rounded-[24px] border-slate-200 bg-slate-50 px-4 py-3"
        />

        {error ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        {success ? (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            {success}
          </div>
        ) : null}

        <Button type="submit" className="h-11 w-full rounded-2xl" disabled={submitting}>
          {submitting ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
          Enviar consulta
        </Button>
      </form>
    </div>
  );
}
