import Link from "next/link";
import {
  ArrowRight,
  Building2,
  KeyRound,
  Settings,
  Users,
} from "lucide-react";

import { AgencyList, CreateAgencyDialog } from "@/components/admin/agency-manager";
import { DashboardAssistant } from "@/components/dashboard/dashboard-assistant";
import { MetricCard } from "@/components/dashboard/metric-card";
import { PipelineChart } from "@/components/dashboard/pipeline-chart";
import { TodayPanel } from "@/components/dashboard/today-panel";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getCurrentUserContext } from "@/lib/auth/current-user";
import { getAgencyScopeFromUser } from "@/lib/crm-automation";
import {
  getAdminDashboardSnapshot,
  getDashboardSnapshot,
  getTodayWorkspaceSnapshot,
} from "@/lib/props-data";

export const dynamic = "force-dynamic";

const adminQuickActions = [
  {
    href: "/inmobiliarias",
    title: "Inmobiliarias y usuarios",
    description: "Crear cuentas nuevas, entregar accesos y revisar el estado de cada cliente.",
    icon: Users,
  },
  {
    href: "/propiedades",
    title: "Propiedades globales",
    description: "Ver todo el inventario publicado y detectar rapido cuentas incompletas.",
    icon: Building2,
  },
  {
    href: "/alquileres",
    title: "Alquileres activos",
    description: "Controlar contratos, revisiones pendientes y automatizaciones de aumentos.",
    icon: KeyRound,
  },
  {
    href: "/configuracion",
    title: "Configuracion",
    description: "Ajustar integraciones, WhatsApp y parametros generales de la plataforma.",
    icon: Settings,
  },
];

export default async function DashboardPage() {
  const currentUser = await getCurrentUserContext();

  if (!currentUser) {
    return null;
  }

  if (currentUser.profile.role === "superadmin") {
    const snapshot = await getAdminDashboardSnapshot();

    return (
      <div className="space-y-6">
        <PageHeader
          title="Panel admin"
          description="Centro de control para altas de inmobiliarias, usuarios, inventario y seguimiento general de la plataforma."
          action={<CreateAgencyDialog />}
        />

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {snapshot.metrics.map((metric) => (
            <MetricCard key={metric.label} metric={metric} />
          ))}
        </section>

        <section className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
          <Card className="rounded-[28px] border-0 bg-card shadow-sm">
            <CardHeader className="pb-4">
              <CardTitle className="text-xl">Control rapido</CardTitle>
              <p className="text-sm text-muted-foreground">
                Accesos directos a las tareas de admin que mas se usan durante el dia.
              </p>
            </CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-2">
              {adminQuickActions.map(({ href, title, description, icon: Icon }) => (
                <Link
                  key={href}
                  href={href}
                  className="rounded-[22px] border bg-background p-3.5 transition-colors hover:bg-muted/30"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex size-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                      <Icon className="size-5" />
                    </div>
                    <ArrowRight className="mt-1 size-4 text-muted-foreground" />
                  </div>
                  <h3 className="mt-3 text-base font-semibold">{title}</h3>
                  <p className="mt-1.5 text-sm leading-6 text-muted-foreground">{description}</p>
                </Link>
              ))}
            </CardContent>
          </Card>

          <Card className="rounded-[28px] border-0 bg-card shadow-sm">
            <CardHeader className="pb-4">
              <CardTitle className="text-xl">Actividad reciente</CardTitle>
              <p className="text-sm text-muted-foreground">
                Movimientos nuevos de clientes, publicaciones y consultas en toda la plataforma.
              </p>
            </CardHeader>
            <CardContent className="space-y-3">
              {snapshot.recentActivity.map((activity) => (
                <div
                  key={activity}
                  className="rounded-2xl border bg-background p-3 text-sm leading-6 text-muted-foreground"
                >
                  {activity}
                </div>
              ))}
            </CardContent>
          </Card>
        </section>

        <section className="space-y-3">
          <div className="flex items-end justify-between gap-4">
            <div>
              <h3 className="text-xl font-semibold">Clientes administrados</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Desde aca das de alta inmobiliarias nuevas y revisas rapido sus accesos.
              </p>
            </div>
            <Link
              href="/inmobiliarias"
              className="hidden items-center gap-2 text-sm font-medium text-primary md:inline-flex"
            >
              Ver gestion completa
              <ArrowRight className="size-4" />
            </Link>
          </div>
          <AgencyList agencies={snapshot.agencies} />
        </section>
        <DashboardAssistant />
      </div>
    );
  }

  const scope = getAgencyScopeFromUser(currentUser);
  const [snapshot, todaySnapshot] = await Promise.all([
    getDashboardSnapshot(scope),
    getTodayWorkspaceSnapshot(scope),
  ]);

  return (
      <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        description="Una vista rapida para seguir publicaciones, consultas y contratos desde la operacion diaria."
      />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {snapshot.metrics.map((metric) => (
          <MetricCard key={metric.label} metric={metric} />
        ))}
      </section>

      <TodayPanel snapshot={todaySnapshot} />

      <section className="grid gap-4 xl:grid-cols-[1.45fr_0.85fr]">
        <Card className="rounded-[28px] border-0 bg-card shadow-sm">
          <CardHeader className="pb-0">
            <CardTitle className="text-xl">Ritmo comercial semanal</CardTitle>
            <p className="text-sm text-muted-foreground">
              Una vista simple para seguir consultas y cierres del equipo.
            </p>
          </CardHeader>
          <CardContent className="pt-2">
            <PipelineChart />
          </CardContent>
        </Card>

        <Card className="rounded-[28px] border-0 bg-card shadow-sm">
          <CardHeader className="pb-4">
            <CardTitle className="text-xl">Actividad reciente</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {snapshot.recentActivity.map((activity) => (
              <div
                key={activity}
                className="rounded-2xl border bg-background p-3 text-sm leading-6 text-muted-foreground"
              >
                {activity}
              </div>
            ))}
          </CardContent>
        </Card>
      </section>
      <DashboardAssistant />
    </div>
  );
}
