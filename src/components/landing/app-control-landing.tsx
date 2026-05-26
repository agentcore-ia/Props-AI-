import {
  ArrowRight,
  Banknote,
  Bot,
  Building2,
  CalendarCheck2,
  CheckCircle2,
  ClipboardCheck,
  Clock3,
  FileText,
  Home,
  KeyRound,
  MapPinned,
  MessageCircle,
  ReceiptText,
  SearchCheck,
  ShieldCheck,
  Sparkles,
  UsersRound,
  WalletCards,
  Wrench,
} from "lucide-react";
import Link from "next/link";

import { AppControlContactForm } from "@/components/landing/app-control-contact-form";

const coreFeatures = [
  {
    icon: MessageCircle,
    title: "Bandeja única de mensajes",
    description:
      "WhatsApp, consultas web, respuestas de IA y mensajes del equipo en una sola vista. Cada conversación queda asociada al cliente, propiedad y contexto correcto.",
  },
  {
    icon: Bot,
    title: "IA que responde y asiste",
    description:
      "Atiende consultas 24/7, sugiere respuestas al equipo, resume conversaciones y ayuda a ejecutar tareas operativas sin buscar en cinco pantallas.",
  },
  {
    icon: Clock3,
    title: "Aumentos automáticos",
    description:
      "Lee contratos, detecta índice, fechas y frecuencia, calcula ajustes por IPC o ICL y prepara el aviso al inquilino por WhatsApp.",
  },
  {
    icon: ReceiptText,
    title: "Cobros y comprobantes",
    description:
      "Registrás el pago del alquiler, generás comprobante para el inquilino y podés enviarlo por WhatsApp o email desde el mismo flujo.",
  },
  {
    icon: WalletCards,
    title: "Liquidaciones a propietarios",
    description:
      "Calcula alquiler cobrado, comisión, gastos, conceptos particulares, neto a transferir y deja la cuenta corriente ordenada.",
  },
  {
    icon: ClipboardCheck,
    title: "Morosos con prioridad IA",
    description:
      "Ordena deudores por riesgo, días de atraso, punitorios y último contacto. Sugiere el mensaje correcto para cobrar sin sonar improvisado.",
  },
  {
    icon: Home,
    title: "Portafolio y marketplace",
    description:
      "Cada inmobiliaria tiene su perfil con propiedades y fichas listas para compartir. Si quiere, también publica en Props.com.ar.",
  },
  {
    icon: Wrench,
    title: "Reclamos y proveedores",
    description:
      "Centraliza reclamos de inquilinos, proveedor asignado, costos estimados y reales, autorización del propietario y seguimiento por WhatsApp.",
  },
  {
    icon: FileText,
    title: "Contratos y documentos",
    description:
      "Adjuntá contratos, comprobantes y documentos importantes. Props los usa como contexto para fechas, aumentos, alquileres y consultas.",
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

const workflowCards = [
  {
    title: "Atención y mensajes",
    description:
      "Mensajes nuevos, consultas web, WhatsApp y respuestas sugeridas quedan ordenados para no perder oportunidades.",
    items: ["Consultas nuevas", "Respuestas rápidas", "Seguimiento"],
  },
  {
    title: "Alquileres y cobros",
    description:
      "Contratos, aumentos, comprobantes, morosos y liquidaciones se conectan en el mismo flujo operativo.",
    items: ["Registrar alquiler", "Avisar aumento", "Liquidar propietario"],
  },
  {
    title: "Propiedades y leads",
    description:
      "Publicaciones, visitas y próximos pasos comerciales se organizan para avanzar con cada interesado.",
    items: ["Publicar propiedad", "Precalificar lead", "Coordinar visita"],
  },
  {
    title: "Operación diaria",
    description:
      "El dashboard muestra tareas, visitas, recontactos, reclamos y pendientes para saber qué resolver primero.",
    items: ["Qué hacer hoy", "Alertas inteligentes", "Reclamos"],
  },
];

const automationCards = [
  ["Aumento de alquiler", "Calcula el nuevo valor, actualiza el contrato y avisa al inquilino."],
  ["Mora", "Detecta atrasos, suma punitorios y prepara avisos de cobranza."],
  ["Visitas", "Confirma horarios y deja recordatorios para no perder oportunidades."],
  ["Leads sin respuesta", "Retoma consultas dormidas con mensajes personalizados."],
  ["Comprobantes", "Genera recibos claros para inquilinos y los envía por WhatsApp o email."],
  ["Propietarios", "Deja listas liquidaciones, pagos y mensajes de estado."],
];

const modules = [
  "Dashboard diario",
  "Mensajes",
  "Agenda",
  "Leads",
  "Propiedades",
  "Alquileres",
  "Cobros",
  "Morosos",
  "Inquilinos",
  "Propietarios",
  "Caja",
  "Pagos propietarios",
  "Reclamos",
  "Proveedores",
  "Facturación",
  "Asistente Props",
];

const metrics = [
  { value: "24/7", label: "atención automática" },
  { value: "1 panel", label: "para toda la operación" },
  { value: "0 planillas", label: "para cobros y liquidaciones" },
];

export function AppControlLanding() {
  return (
    <main className="min-h-screen overflow-hidden bg-[#f5f8ff] text-slate-950">
      <header className="sticky top-0 z-30 border-b border-white/70 bg-white/82 backdrop-blur-xl">
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
            <a
              href="#contacto"
              className="hidden rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:text-slate-950 md:inline-flex"
            >
              Contacto
            </a>
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
        <div className="absolute inset-x-0 top-0 h-[680px] bg-[radial-gradient(circle_at_18%_18%,rgba(37,99,235,0.24),transparent_32%),radial-gradient(circle_at_78%_8%,rgba(15,23,42,0.14),transparent_30%),linear-gradient(180deg,#eef5ff,transparent)]" />
        <div className="relative mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-6 lg:grid-cols-[1.02fr_0.98fr] lg:px-8 lg:py-20">
          <div className="flex flex-col justify-center">
            <div className="mb-6 flex w-fit items-center gap-2 rounded-full border border-blue-200 bg-white/80 px-4 py-2 text-sm font-semibold text-blue-700 shadow-sm">
              <Sparkles className="size-4" />
              Operación diaria, mensajes y alquileres en un solo lugar
            </div>
            <h1 className="max-w-3xl text-4xl font-black tracking-[-0.045em] text-slate-950 sm:text-6xl lg:text-7xl">
              Un sistema inmobiliario que hace el trabajo repetitivo por vos.
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-600">
              Props reúne CRM, WhatsApp, propiedades, contratos, cobros, morosos, reclamos,
              propietarios y automatizaciones para que la inmobiliaria opere con orden todos los días.
            </p>
            <p className="mt-4 max-w-2xl text-base leading-7 text-slate-500">
              No es solo un panel para cargar datos: es un asistente operativo que ayuda a responder,
              cobrar, liquidar, avisar aumentos, hacer seguimiento y publicar propiedades con más visibilidad.
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
                href="#contacto"
                className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-6 py-4 text-base font-bold text-slate-800 shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300"
              >
                Quiero que me contacten
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
        <div className="grid gap-4 md:grid-cols-3">
          {[
            ["Antes", "Mensajes sueltos, planillas, fechas manuales, comprobantes perdidos y consultas sin seguimiento."],
            ["Con Props", "Cada contacto, propiedad, contrato, pago y tarea queda conectado en una operación diaria simple."],
            ["Resultado", "Menos trabajo repetitivo, mejor respuesta al cliente y más control para la inmobiliaria."],
          ].map(([title, description]) => (
            <div key={title} className="rounded-[30px] border border-slate-200 bg-white p-6 shadow-sm">
              <p className="text-sm font-bold uppercase tracking-[0.24em] text-blue-600">{title}</p>
              <p className="mt-3 text-lg font-semibold leading-7">{description}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <SectionIntro
          eyebrow="Funciones clave"
          title="Todo lo que una inmobiliaria necesita para operar mejor."
          description="Props cubre la parte comercial, administrativa y operativa: desde publicar una propiedad hasta cobrar, liquidar y resolver reclamos."
        />
        <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
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

      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="rounded-[34px] bg-blue-600 p-8 text-white shadow-2xl shadow-blue-600/20">
            <ShieldCheck className="size-10" />
            <h2 className="mt-6 text-3xl font-black tracking-tight">Menos caos. Más control.</h2>
            <p className="mt-4 text-lg leading-8 text-blue-50">
              Props está pensado para el empleado que vive entre WhatsApp, visitas, cobranzas y
              reclamos. La idea es que cada día sepa qué responder, a quién avisar y qué cerrar.
            </p>
            <div className="mt-6 space-y-3">
              {["No perder consultas", "No olvidar aumentos", "No perseguir pagos sin registro"].map((item) => (
                <div key={item} className="flex items-center gap-3 rounded-2xl bg-white/10 px-4 py-3">
                  <CheckCircle2 className="size-5" />
                  <span className="font-semibold">{item}</span>
                </div>
              ))}
            </div>
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

      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <SectionIntro
          eyebrow="Automatizaciones"
          title="Lo repetitivo queda preparado para salir solo o con un clic."
          description="La inmobiliaria decide qué automatizar y qué revisar antes de enviar. Props muestra contexto, destinatario y mensaje sugerido."
        />
        <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {automationCards.map(([title, description]) => (
            <div key={title} className="rounded-[28px] border border-slate-200 bg-white p-5">
              <div className="mb-4 flex size-10 items-center justify-center rounded-2xl bg-slate-950 text-white">
                <Sparkles className="size-4" />
              </div>
              <p className="text-lg font-black">{title}</p>
              <p className="mt-2 leading-7 text-slate-600">{description}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <SectionIntro
          eyebrow="Trabajo ordenado"
          title="Cada tarea tiene su lugar, sin mezclar toda la operación."
          description="Props organiza mensajes, alquileres, cobros, propiedades, reclamos y propietarios para que el equipo entre directo a lo que necesita resolver."
        />
        <div className="mt-8 grid gap-4 lg:grid-cols-4">
          {workflowCards.map((workflow) => (
            <article key={workflow.title} className="rounded-[30px] border border-slate-200 bg-white p-6 shadow-sm">
              <p className="text-xl font-black">{workflow.title}</p>
              <p className="mt-3 min-h-[112px] leading-7 text-slate-600">{workflow.description}</p>
              <div className="mt-5 space-y-2">
                {workflow.items.map((item) => (
                  <div key={item} className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                    <CheckCircle2 className="size-4 text-blue-600" />
                    {item}
                  </div>
                ))}
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-5 lg:grid-cols-[1fr_1fr]">
          <div className="rounded-[34px] border border-slate-200 bg-white p-8 shadow-sm">
            <div className="flex size-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
              <SearchCheck className="size-5" />
            </div>
            <h2 className="mt-5 text-3xl font-black tracking-tight">Más oportunidades comerciales</h2>
            <p className="mt-4 text-lg leading-8 text-slate-600">
              Las propiedades se pueden publicar en el perfil de la inmobiliaria y, si se activa,
              también en Props Marketplace. El cliente puede buscar, ver fotos, mapa, ficha,
              inmobiliaria responsable y consultar con IA antes de contactar al equipo.
            </p>
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              {["Fichas listas para compartir", "Mapa de propiedades", "Fotos por WhatsApp", "Consultas guardadas"].map((item) => (
                <div key={item} className="rounded-2xl bg-slate-50 px-4 py-3 font-semibold text-slate-700">
                  {item}
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[34px] border border-slate-200 bg-slate-950 p-8 text-white shadow-[0_24px_90px_-60px_rgba(15,23,42,0.85)]">
            <div className="flex size-12 items-center justify-center rounded-2xl bg-white/10 text-blue-200">
              <KeyRound className="size-5" />
            </div>
            <h2 className="mt-5 text-3xl font-black tracking-tight">Información segura y con contexto</h2>
            <p className="mt-4 text-lg leading-8 text-slate-300">
              Cada inmobiliaria opera con sus datos: propiedades, contactos, contratos y WhatsApp.
              La IA usa contexto del cliente para responder mejor, sin mezclar información entre cuentas.
            </p>
            <div className="mt-6 space-y-3">
              {["Historial por cliente", "Memoria de conversaciones", "Datos de contratos", "Datos por inmobiliaria"].map((item) => (
                <div key={item} className="flex items-center gap-3 rounded-2xl bg-white/[0.05] px-4 py-3">
                  <CheckCircle2 className="size-5 text-emerald-300" />
                  <span className="font-semibold text-slate-100">{item}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <SectionIntro
          eyebrow="Módulos incluidos"
          title="Un control completo sin perder simpleza."
          description="La plataforma cubre operación diaria, administración de alquileres, cobranza, ventas, atención al cliente y control interno."
        />
        <div className="mt-8 flex flex-wrap gap-3">
          {modules.map((module) => (
            <span
              key={module}
              className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 shadow-sm"
            >
              {module}
            </span>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-5 lg:grid-cols-3">
          {[
            {
              icon: CalendarCheck2,
              title: "Visitas y seguimiento",
              text: "Registra visitas, objeciones, interés real y próximo paso para que el equipo no arranque de cero.",
            },
            {
              icon: Banknote,
              title: "Caja y pagos",
              text: "Controla ingresos, egresos, transferencias, pagos a proveedores y movimientos operativos.",
            },
            {
              icon: MapPinned,
              title: "Ubicación y mapa",
              text: "Cada propiedad puede mostrarse con dirección exacta, mapa y pin para mejorar la consulta.",
            },
            {
              icon: UsersRound,
              title: "Clientes con historial",
              text: "Inquilinos, propietarios y leads tienen contexto, mensajes, pagos, reclamos y tareas asociadas.",
            },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.title} className="rounded-[30px] border border-slate-200 bg-white p-6 lg:first:col-span-2">
                <Icon className="size-8 text-blue-600" />
                <h3 className="mt-4 text-2xl font-black">{item.title}</h3>
                <p className="mt-3 leading-7 text-slate-600">{item.text}</p>
              </div>
            );
          })}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
          <div className="rounded-[34px] border border-slate-200 bg-slate-950 p-7 text-white shadow-[0_24px_90px_-60px_rgba(15,23,42,0.75)] sm:p-9">
            <p className="text-sm font-black uppercase tracking-[0.24em] text-blue-200">
              Contacto comercial
            </p>
            <h2 className="mt-4 text-3xl font-black tracking-tight sm:text-5xl">
              Te mostramos Props con casos reales de inmobiliaria.
            </h2>
            <p className="mt-5 text-lg leading-8 text-slate-300">
              Completá el formulario y coordinamos una demo enfocada en lo que más impacto tenga para tu operación:
              WhatsApp, aumentos, morosos, cobros, liquidaciones, reclamos o publicación de propiedades.
            </p>
            <div className="mt-7 grid gap-3 sm:grid-cols-2">
              {["Demo guiada", "Diagnóstico operativo", "Configuración inicial", "Acompañamiento"].map((item) => (
                <div key={item} className="rounded-2xl bg-white/[0.06] px-4 py-3 font-semibold text-slate-100">
                  {item}
                </div>
              ))}
            </div>
          </div>
          <AppControlContactForm />
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-12 pb-16 sm:px-6 lg:px-8">
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

function SectionIntro({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <div className="max-w-4xl">
      <p className="text-sm font-bold uppercase tracking-[0.24em] text-blue-600">{eyebrow}</p>
      <h2 className="mt-3 text-3xl font-black tracking-tight sm:text-5xl">{title}</h2>
      <p className="mt-4 text-lg leading-8 text-slate-600">{description}</p>
    </div>
  );
}
