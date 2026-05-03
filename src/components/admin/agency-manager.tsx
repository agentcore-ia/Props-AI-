"use client";

import { useMemo, useState } from "react";
import { ExternalLink, Plus, ShieldCheck } from "lucide-react";

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
import { usePropsStore } from "@/lib/store/use-props-store";

const initialForm = {
  name: "",
  slug: "",
  email: "",
  phone: "",
  ownerName: "",
  ownerEmail: "",
  city: "",
};

export function AgencyManager() {
  const { agencies, properties, createAgency } = usePropsStore();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(initialForm);

  const summary = useMemo(
    () => ({
      active: agencies.filter((agency) => agency.status === "Activa").length,
      onboarding: agencies.filter((agency) => agency.status === "En onboarding").length,
    }),
    [agencies]
  );

  return (
    <div className="space-y-8">
      <PageHeader
        title="Inmobiliarias"
        description="Panel admin multi-tenant para crear clientes, provisionar su subdominio y administrar cuantas propiedades publican."
        action={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger render={<Button className="rounded-2xl" />}>
              <Plus className="size-4" />
              Nueva inmobiliaria
            </DialogTrigger>
            <DialogContent className="max-w-2xl rounded-[28px] p-0">
              <div className="p-6">
                <DialogHeader>
                  <DialogTitle>Crear inmobiliaria</DialogTitle>
                  <DialogDescription>
                    Al crear el usuario, queda provisionado su catalogo bajo el subdominio correspondiente.
                  </DialogDescription>
                </DialogHeader>

                <div className="mt-6 grid gap-4 md:grid-cols-2">
                  {[
                    ["name", "Nombre de la inmobiliaria", "Gentile Propiedades"],
                    ["slug", "Subdominio", "gentile"],
                    ["email", "Email comercial", "hola@gentile.com.ar"],
                    ["phone", "Telefono", "+54 11 5555 1001"],
                    ["ownerName", "Admin / owner", "Marina Gentile"],
                    ["ownerEmail", "Email del owner", "marina@gentile.com.ar"],
                    ["city", "Ciudad", "CABA"],
                  ].map(([key, label, placeholder]) => (
                    <div key={key} className={key === "name" ? "space-y-2 md:col-span-2" : "space-y-2"}>
                      <label className="text-sm font-medium">{label}</label>
                      <Input
                        placeholder={placeholder}
                        value={form[key as keyof typeof form]}
                        onChange={(event) =>
                          setForm((prev) => ({ ...prev, [key]: event.target.value }))
                        }
                      />
                    </div>
                  ))}
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpen(false)}>
                  Cancelar
                </Button>
                <Button
                  onClick={() => {
                    createAgency(form);
                    setForm(initialForm);
                    setOpen(false);
                  }}
                >
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
        {agencies.map((agency) => {
          const propertyCount = properties.filter((property) => property.tenantSlug === agency.slug).length;

          return (
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
                      Subdominio: {agency.slug}.props.com.ar · {propertyCount} propiedades
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <div className="rounded-2xl border bg-background px-4 py-3 text-sm">
                    {agency.city} · {agency.phone}
                  </div>
                  <a
                    href={`http://${agency.slug}.localhost:3002`}
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
          );
        })}
      </section>
    </div>
  );
}
