"use client";

import { useState } from "react";
import { Loader2, Send, Sparkles } from "lucide-react";

type FormState = {
  fullName: string;
  agencyName: string;
  email: string;
  phone: string;
  message: string;
};

const initialForm: FormState = {
  fullName: "",
  agencyName: "",
  email: "",
  phone: "",
  message: "",
};

const fieldClass =
  "w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100";

export function AppControlContactForm() {
  const [form, setForm] = useState<FormState>(initialForm);
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState<null | { kind: "success" | "error"; message: string }>(null);

  function updateField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setStatus(null);

    try {
      const response = await fetch("/api/public/app-contact", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(form),
      });

      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        setStatus({
          kind: "error",
          message: payload?.error ?? "No pudimos enviar la consulta. Probá nuevamente.",
        });
        return;
      }

      setForm(initialForm);
      setStatus({
        kind: "success",
        message: "Consulta enviada. El equipo de Props te va a contactar a la brevedad.",
      });
    } catch {
      setStatus({
        kind: "error",
        message: "No pudimos enviar la consulta. Revisá tu conexión y probá nuevamente.",
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      id="contacto"
      className="rounded-[34px] border border-slate-200 bg-white p-5 shadow-[0_24px_90px_-60px_rgba(15,23,42,0.45)] sm:p-7"
    >
      <div className="flex items-start gap-3">
        <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
          <Sparkles className="size-5" />
        </div>
        <div>
          <p className="text-sm font-black uppercase tracking-[0.22em] text-blue-600">Hablar con Props</p>
          <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">
            Querés implementar Props en tu inmobiliaria?
          </h2>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            Dejanos tus datos y te contactamos para activar el sistema, cargar tu operación y dejar listas
            las automatizaciones clave.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="mt-6 space-y-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="space-y-2">
            <span className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">Nombre</span>
            <input
              required
              value={form.fullName}
              onChange={(event) => updateField("fullName", event.target.value)}
              placeholder="Tu nombre"
              className={fieldClass}
            />
          </label>
          <label className="space-y-2">
            <span className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">Inmobiliaria</span>
            <input
              required
              value={form.agencyName}
              onChange={(event) => updateField("agencyName", event.target.value)}
              placeholder="Nombre de la inmobiliaria"
              className={fieldClass}
            />
          </label>
          <label className="space-y-2">
            <span className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">Email</span>
            <input
              required
              type="email"
              value={form.email}
              onChange={(event) => updateField("email", event.target.value)}
              placeholder="mail@inmobiliaria.com"
              className={fieldClass}
            />
          </label>
          <label className="space-y-2">
            <span className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">WhatsApp</span>
            <input
              required
              value={form.phone}
              onChange={(event) => updateField("phone", event.target.value)}
              placeholder="Ej: 11 2345 6789"
              className={fieldClass}
            />
          </label>
        </div>

        <label className="block space-y-2">
          <span className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">Qué querés resolver</span>
          <textarea
            required
            value={form.message}
            onChange={(event) => updateField("message", event.target.value)}
            placeholder="Ej: quiero automatizar aumentos, avisos de morosos y liquidaciones a propietarios."
            className={`${fieldClass} min-h-32 resize-none leading-6`}
          />
        </label>

        {status ? (
          <div
            className={
              status.kind === "success"
                ? "rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800"
                : "rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-800"
            }
          >
            {status.message}
          </div>
        ) : null}

        <button
          type="submit"
          disabled={submitting}
          className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 px-5 py-4 text-base font-black text-white shadow-xl shadow-blue-600/20 transition hover:-translate-y-0.5 hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {submitting ? <Loader2 className="size-5 animate-spin" /> : <Send className="size-5" />}
          {submitting ? "Enviando..." : "Quiero que me contacten"}
        </button>
      </form>
    </div>
  );
}
