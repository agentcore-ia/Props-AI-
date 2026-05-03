import Link from "next/link";
import { ArrowRight, Building2, Globe2, ShieldCheck } from "lucide-react";

import { Button } from "@/components/ui/button";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(37,99,235,0.14),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(15,23,42,0.08),transparent_24%),#f8fafc]">
      <header className="border-b bg-white/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-5 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex size-11 items-center justify-center rounded-2xl bg-blue-600 text-white">
              <Building2 className="size-5" />
            </div>
            <div>
              <p className="text-lg font-semibold">Props</p>
              <p className="text-sm text-slate-500">CRM inmobiliario multi-tenant</p>
            </div>
          </div>

          <Link href="/dashboard">
            <Button className="rounded-2xl">
              Ir al dashboard
              <ArrowRight className="size-4" />
            </Button>
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
        <section className="grid gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.28em] text-blue-600">props.com.ar</p>
            <h1 className="mt-5 max-w-4xl text-5xl font-semibold tracking-tight text-slate-950">
              Vende tu CRM inmobiliario y entrega un sitio automatico por cliente.
            </h1>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-600">
              Landing para vender el sistema, dashboard para operar y un catalogo publico por subdominio para cada inmobiliaria.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/dashboard">
                <Button size="lg" className="rounded-2xl">
                  app.props.com.ar
                </Button>
              </Link>
              <a
                href="http://gentile.localhost:3002"
                className="inline-flex items-center rounded-2xl border bg-white px-5 py-3 text-sm font-medium"
              >
                gentile.props.com.ar
              </a>
            </div>
          </div>

          <div className="grid gap-4">
            {[
              {
                icon: ShieldCheck,
                title: "Admin multi-tenant",
                text: "Crea usuarios, inmobiliarias y controla sus planes desde un panel central.",
              },
              {
                icon: Globe2,
                title: "Web automatica por cliente",
                text: "Cada inmobiliaria obtiene su subdominio y publica solo sus propiedades.",
              },
              {
                icon: Building2,
                title: "Operacion unificada",
                text: "Propiedades, leads, mensajes e IA trabajan sobre una misma base de producto.",
              },
            ].map((item) => (
              <div key={item.title} className="rounded-[30px] border bg-white p-6 shadow-sm">
                <item.icon className="size-6 text-blue-600" />
                <h2 className="mt-4 text-xl font-semibold">{item.title}</h2>
                <p className="mt-2 text-sm leading-7 text-slate-600">{item.text}</p>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
