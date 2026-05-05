import { MetricCard } from "@/components/dashboard/metric-card";
import { PipelineChart } from "@/components/dashboard/pipeline-chart";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getCurrentUserContext } from "@/lib/auth/current-user";
import { getDashboardSnapshot } from "@/lib/props-data";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const currentUser = await getCurrentUserContext();

  if (!currentUser) {
    return null;
  }

  const scope =
    currentUser.profile.role === "agency_admin"
      ? { agencySlug: currentUser.profile.agency_slug ?? undefined }
      : undefined;

  const snapshot = await getDashboardSnapshot(scope);

  return (
    <div className="space-y-8">
      <PageHeader
        title="Dashboard"
        description="Una vista rápida para seguir publicaciones, consultas y contratos desde la operación diaria."
      />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {snapshot.metrics.map((metric) => (
          <MetricCard key={metric.label} metric={metric} />
        ))}
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.45fr_0.85fr]">
        <Card className="rounded-[30px] border-0 bg-card shadow-sm">
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

        <Card className="rounded-[30px] border-0 bg-card shadow-sm">
          <CardHeader>
            <CardTitle className="text-xl">Actividad reciente</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {snapshot.recentActivity.map((activity) => (
              <div
                key={activity}
                className="rounded-2xl border bg-background p-4 text-sm leading-6 text-muted-foreground"
              >
                {activity}
              </div>
            ))}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
