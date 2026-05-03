"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ExternalLink, Loader2, Plus, ShieldCheck } from "lucide-react";

import type { AgencySummary } from "@/lib/props-data";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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

const initialForm = {
  name: "",
  slug: "",
  email: "",
  phone: "",
  ownerName: "",
  ownerEmail: "",
  city: "",
  password: "",
};

export function AgencyManager({ agencies }: { agencies: AgencySummary[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<null | {
    email: string;
    password: string;
    slug: string;
  }>(null);
  const [form, setForm] = useState(initialForm);

  const summary = useMemo(
    () => ({
      active: agencies.filter((agency) => agency.status === "Activa").length,
      onboarding: agencies.filter((agency) => agency.status === "En onboarding").length,
    }),
    [agencies]
  );

  async function handleCreateAgency() {
    setSubmitting(true);
    setError(null);
    setSuccess(null);

    const response = await fetch("/api/admin/agencies", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify(form),
    });

    const payload = await response.json().catch(() => null);

    if (!response.ok) {
      setSubmitting(false);
      setError(payload?.error ?? "No se pudo crear la inmobiliaria.");
      return;
    }

    setSuccess({
      email: payload.credentials.email,
      password: payload.credentials.password,
      slug: payload.agency.slug,
    });
    setForm(initialForm);
    setSubmitting(false);
    router.refresh();
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Inmobiliarias"
        description="Panel admin multi-tenant para crear clientes, provisionar su subdominio y administrar cuantas propiedades publican."
        action={
          <Dialog
            open={open}
            onOpenChange={(nextOpen) => {
              setOpen(nextOpen);
              if (!nextOpen) {
                setError(null);
                setSuccess(null);
                setForm(initialForm);
              }
            }}
          >
            <DialogTrigger render={<Button className="rounded-2xl" />}>
              <Plus className="size-4" />
              Nueva inmobiliaria
            </DialogTrigger>
            <DialogContent className="max-w-2xl rounded-[28px] p-0">
              <div className="p-6">
                <DialogHeader>
                  <DialogTitle>Crear inmobiliaria</DialogTitle>
                  <DialogDescription>
                    Se crea el usuario real en Supabase, su perfil de acceso y el catalogo bajo el subdominio correspondiente.
                  </DialogDescription>
                </DialogHeader>

                <div className="mt-6 grid gap-4 md:grid-cols-2">
                  {[
                    ["name", "Nombre de la inmobiliaria", "Gentile Propiedades"],
                    ["slug", "Subdominio", "gentile"],
                    ["email", "Email comercial", "hola@gentile.com.ar"],
                    ["phone", "Telefono", "+54 11 5555 1001"],
                    ["ownerName", "Admin / owner", "Marina Gentile"],
                    ["ownerEmail", "Email de acceso", "marina@gentile.com.ar"],
                    ["city", "Ciudad", "CABA"],
                    ["password", "Password inicial", "Minimo 8 caracteres"],
                  ].map(([key, label, placeholder]) => (
                    <div key={key} className={key === "name" ? "space-y-2 md:col-span-2" : "space-y-2"}>
                      <label className="text-sm font-medium">{label}</label>
                      <Input
                        type={key === "password" ? "password" : "text"}
                        placeholder={placeholder}
                        value={form[key as keyof typeof form]}
                        onChange={(event) =>
                          setForm((prev) => ({ ...prev, [key]: event.target.value }))
                        }
                      />
                    </div>
                  ))}
                </div>

                {error ? (
                  <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    {error}
                  </div>
                ) : null}

                {success ? (
                  <div className="mt-5 rounded-3xl border bg-muted/40 p-4">
                    <p className="text-sm font-semibold">Usuario creado correctamente</p>
                    <p className="mt-2 text-sm text-muted-foreground">
                      Acceso: {success.email}
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Password: {success.password}
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Catalogo: {success.slug}.props.com.ar
                    </p>
                  </div>
                ) : null}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpen(false)}>
                  Cerrar
                </Button>
                <Button onClick={handleCreateAgency} disabled={submitting}>
                  {submitting ? <Loader2 className="size-4 animate-spin" /> : null}
                  Crear usuario y subpagina
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        }
      />

      <section className="grid gap-4 md:grid-cols-3">
        <Card className="rounded-[28px] border-0 shadow-sm">
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground">Clientes totales</p>
            <p className="mt-3 text-3xl font-semibold">{agencies.length}</p>
          </CardContent>
        </Card>
        <Card className="rounded-[28px] border-0 shadow-sm">
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground">Activas</p>
            <p className="mt-3 text-3xl font-semibold">{summary.active}</p>
          </CardContent>
        </Card>
        <Card className="rounded-[28px] border-0 shadow-sm">
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground">En onboarding</p>
            <p className="mt-3 text-3xl font-semibold">{summary.onboarding}</p>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4">
        {agencies.map((agency) => (
          <Card key={agency.id} className="rounded-[28px] border-0 shadow-sm">
            <CardContent className="flex flex-col gap-5 p-5 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex gap-4">
                <div className="flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <ShieldCheck className="size-5" />
                </div>
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-3">
                    <h3 className="text-lg font-semibold">{agency.name}</h3>
                    <Badge className="rounded-full border-0 bg-primary/10 text-primary">{agency.plan}</Badge>
                    <Badge className="rounded-full border-0 bg-muted text-foreground">{agency.status}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Admin: {agency.ownerName} · {agency.ownerEmail}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Subdominio: {agency.slug}.props.com.ar · {agency.propertyCount} propiedades
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <div className="rounded-2xl border bg-background px-4 py-3 text-sm">
                  {agency.city} · {agency.phone}
                </div>
                <a
                  href={`https://${agency.slug}.props.com.ar`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 rounded-2xl border bg-background px-4 py-3 text-sm font-medium hover:bg-muted/40"
                >
                  Ver catalogo
                  <ExternalLink className="size-4" />
                </a>
              </div>
            </CardContent>
          </Card>
        ))}
      </section>
    </div>
  );
}
