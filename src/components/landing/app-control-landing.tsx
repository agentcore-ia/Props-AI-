import {
  ArrowRight,
  Bot,
  Building2,
  CheckCircle2,
  ClipboardCheck,
  Clock3,
  Home,
  MessageCircle,
  ReceiptText,
  ShieldCheck,
  Sparkles,
  Wrench,
} from "lucide-react";
import Link from "next/link";

const coreFeatures = [
  {
    icon: MessageCircle,
    title: "Mensajes 24/7",
    description:
      "WhatsApp, consultas web y seguimiento comercial en una sola bandeja, con IA que responde y deriva cuando hace falta.",
  },
  {
    icon: Clock3,
    title: "Aumentos automáticos",
    description:
      "Props lee contratos, calcula ajustes por IPC o ICL y deja listo el aviso al inquilino por WhatsApp.",
  },
  {
    icon: ReceiptText,
    title: "Cobros y liquidaciones",
    description:
      "Registrás el alquiler, generás comprobante para el inquilino y liquidás al propietario sin planillas.",
  },
  {
    icon: ClipboardCheck,
    title: "Morosos ordenados",
    description:
      "Prioriza deuda, punitorios, días de atraso y prepara mensajes de cobranza con tono profesional.",
  },
  {
    icon: Home,
    title: "Portafolio online",
    description:
      "Cada inmobiliaria tiene sus propiedades listas para compartir y también puede publicarlas en Props Marketplace.",
  },
  {
    icon: Wrench,
    title: "Reclamos y proveedores",
    description:
      "Centraliza reclamos de inquilinos, proveedor asignado, costos, autorización del propietario y próximos pasos.",
  },
];

const dailyFlow = [
  "Responder consultas que necesitan humano",
  "Recontactar leads listos para avanzar",
  "Registrar pagos y emitir comprobantes",
  "Avisar morosos con mensaje sugerido",
  "Liquidar propietarios y registrar transferencias",
  "Agendar visitas y recordar horarios",
];

const metrics = [
  { value: "24/7", label: "atención automática" },
  { value: "1 panel", label: "para toda la operación" },
  { value: "0 planillas", label: "para cobros y liquidaciones" },
];

export function AppControlLanding() {
  return (
    <main className="min-h-screen overflow-hidden bg-[#f5f8ff] text-slate-950">
      <header className="sticky top-0 z-30 border-b border-white/70 bg-white/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-3">
            <div className="flex size-11 items-center justify-center rounded-2xl bg-slate-950 text-white shadow-lg shadow-slate-950/15">
              <Building2 className="size-5" />
            </div>
            <div>
              <p className="text-xl font-black tracking-tight">PROPS</p>
              <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-500">
                Control inmobiliario
              </p>
            </div>
          </Link>

          <div className="flex items-center gap-2">
            <Link
              href="https://props.com.ar"
              className="hidden rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:text-slate-950 sm:inline-flex"
            >
              Ver marketplace
            </Link>
            <Link
              href="/auth/login"
              className="inline-flex items-center gap-2 rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-slate-950/15 transition hover:-translate-y-0.5 hover:bg-slate-800 sm:px-5"
            >
              Ingresar
              <ArrowRight className="size-4" />
            </Link>
          </div>
        </div>
      </header>

      <section className="relative">
        <div className="absolute inset-x-0 top-0 h-[520px] bg-[radial-gradient(circle_at_20%_20%,rgba(37,99,235,0.22),transparent_32%),radial-gradient(circle_at_80%_10%,rgba(15,23,42,0.12),transparent_28%)]" />
        <div className="relative mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-6 lg:grid-cols-[1.02fr_0.98fr] lg:px-8 lg:py-20">
          <div className="flex flex-col justify-center">
            <div className="mb-6 flex w-fit items-center gap-2 rounded-full border border-blue-200 bg-white/80 px-4 py-2 text-sm font-semibold text-blue-700 shadow-sm">
              <Sparkles className="size-4" />
              Operación diaria, mensajes y alquileres en un solo lugar
            </div>
            <h1 className="max-w-3xl text-4xl font-black tracking-[-0.04em] text-slate-950 sm:text-6xl lg:text-7xl">
              El control inmobiliario que trabaja con tu equipo.
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-600">
              Props centraliza propiedades, consultas, WhatsApp, contratos, cobros, morosos,
              reclamos y liquidaciones para que una inmobiliaria opere más rápido, con menos
              tareas repetidas y más seguimiento comercial.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/auth/login"
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-blue-600 px-6 py-4 text-base font-bold text-white shadow-xl shadow-blue-600/20 transition hover:-translate-y-0.5 hover:bg-blue-700"
              >
                Entrar al sistema
                <ArrowRight className="size-5" />
              </Link>
              <a
                href="https://props.com.ar"
                className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-6 py-4 text-base font-bold text-slate-800 shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300"
              >
                Ver propiedades publicadas
              </a>
            </div>
            <div className="mt-8 grid max-w-2xl gap-3 sm:grid-cols-3">
              {metrics.map((metric) => (
                <div key={metric.label} className="rounded-3xl border border-white bg-white/75 p-4 shadow-sm">
                  <p className="text-2xl font-black">{metric.value}</p>
                  <p className="mt-1 text-sm text-slate-500">{metric.label}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="relative">
            <div className="absolute -right-10 -top-10 size-48 rounded-full bg-blue-500/15 blur-3xl" />
            <div className="relative rounded-[36px] border border-white/80 bg-slate-950 p-3 shadow-[0_30px_120px_-60px_rgba(15,23,42,0.8)]">
              <div className="rounded-[28px] bg-[#0b1220] p-5 text-white">
                <div className="flex items-center justify-between border-b border-white/10 pb-4">
                  <div>
                    <p className="text-sm font-semibold text-blue-300">Hoy en Props</p>
                    <h2 className="mt-1 text-2xl font-black">Qué tengo que hacer</h2>
                  </div>
                  <span className="rounded-full bg-emerald-400/15 px-3 py-1 text-xs font-bold text-emerald-200">
                    En vivo
                  </span>
                </div>

                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  {dailyFlow.slice(0, 4).map((item, index) => (
                    <div key={item} className="rounded-3xl border border-white/10 bg-white/[0.04] p-4">
                      <p className="text-sm text-slate-400">Prioridad {index + 1}</p>
                      <p className="mt-2 font-semibold leading-6">{item}</p>
                    </div>
                  ))}
                </div>

                <div className="mt-5 rounded-3xl bg-white p-4 text-slate-950">
                  <div className="flex items-start gap-3">
                    <div className="rounded-2xl bg-blue-50 p-3 text-blue-600">
                      <Bot className="size-5" />
                    </div>
                    <div>
                      <p className="font-bold">Asistente Props</p>
                      <p className="mt-1 text-sm leading-6 text-slate-600">
                        “Luis pagó el alquiler”, “avisá a morosos”, “generá la liquidación” o
                        “resumime este contrato”: Props entiende el contexto y ayuda a operar.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mt-5 space-y-3">
                  {dailyFlow.slice(4).map((item) => (
                    <div key={item} className="flex items-center gap-3 rounded-2xl bg-white/[0.04] px-4 py-3">
                      <CheckCircle2 className="size-5 text-emerald-300" />
                      <span className="text-sm font-medium text-slate-200">{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="mb-8 max-w-3xl">
          <p className="text-sm font-bold uppercase tracking-[0.24em] text-blue-600">Funciones clave</p>
          <h2 className="mt-3 text-3xl font-black tracking-tight sm:text-5xl">
            Todo lo que una inmobiliaria necesita para operar mejor.
          </h2>
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {coreFeatures.map((feature) => {
            const Icon = feature.icon;
            return (
              <article
                key={feature.title}
                className="rounded-[30px] border border-slate-200 bg-white p-6 shadow-[0_24px_80px_-60px_rgba(15,23,42,0.45)]"
              >
                <div className="flex size-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
                  <Icon className="size-5" />
                </div>
                <h3 className="mt-5 text-xl font-black">{feature.title}</h3>
                <p className="mt-3 leading-7 text-slate-600">{feature.description}</p>
              </article>
            );
          })}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="rounded-[34px] bg-blue-600 p-8 text-white shadow-2xl shadow-blue-600/20">
            <ShieldCheck className="size-10" />
            <h2 className="mt-6 text-3xl font-black tracking-tight">Menos caos. Más control.</h2>
            <p className="mt-4 text-lg leading-8 text-blue-50">
              Props está pensado para el empleado que vive entre WhatsApp, visitas, cobranzas y
              reclamos. La idea es que cada día sepa qué responder, a quién avisar y qué cerrar.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {[
              ["Mensajes", "Distingue consultas comerciales, inquilinos y propietarios."],
              ["Contratos", "Lee documentos y detecta fechas, índice y próximos aumentos."],
              ["Propietarios", "Liquidaciones, comprobantes, pagos y cuenta corriente."],
              ["Marketplace", "Más visibilidad para propiedades publicadas en Props.com.ar."],
            ].map(([title, description]) => (
              <div key={title} className="rounded-[28px] border border-slate-200 bg-white p-6">
                <p className="text-lg font-black">{title}</p>
                <p className="mt-2 leading-7 text-slate-600">{description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-10 pb-16 sm:px-6 lg:px-8">
        <div className="rounded-[36px] border border-slate-200 bg-white p-6 shadow-[0_24px_90px_-70px_rgba(15,23,42,0.5)] sm:p-10">
          <div className="grid gap-8 lg:grid-cols-[1fr_auto] lg:items-center">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.24em] text-blue-600">
                Listo para operar
              </p>
              <h2 className="mt-3 text-3xl font-black tracking-tight sm:text-5xl">
                Entrá al panel y seguí la operación diaria.
              </h2>
              <p className="mt-4 max-w-3xl text-lg leading-8 text-slate-600">
                Si ya tenés usuario, ingresá al control inmobiliario. Si todavía no tenés cuenta,
                el equipo de Props puede preparar la inmobiliaria con propiedades, usuarios,
                WhatsApp y automatizaciones.
              </p>
            </div>
            <Link
              href="/auth/login"
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-950 px-7 py-4 text-base font-bold text-white transition hover:-translate-y-0.5 hover:bg-slate-800"
            >
              Ingresar al control
              <ArrowRight className="size-5" />
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
