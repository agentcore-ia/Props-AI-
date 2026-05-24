import Link from "next/link";
import { AlertTriangle, ArrowRight, Sparkles } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { SmartAlertSummary } from "@/lib/operations-types";

const priorityTone = {
  Alta: "bg-red-500/10 text-red-700",
  Media: "bg-amber-500/10 text-amber-700",
  Baja: "bg-emerald-500/10 text-emerald-700",
};

export function SmartAlertsPanel({ alerts }: { alerts: SmartAlertSummary[] }) {
  return (
    <Card className="rounded-[28px] border-0 bg-card shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-xl">
          <Sparkles className="size-5 text-primary" />
          Alertas inteligentes
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Props anticipa problemas antes de que terminen en mensajes perdidos o tareas urgentes.
        </p>
      </CardHeader>
      <CardContent className="grid gap-3 lg:grid-cols-2">
        {alerts.length > 0 ? (
          alerts.map((alert) => (
            <article key={alert.id} className="rounded-2xl border bg-background p-3.5">
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 gap-3">
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                    <AlertTriangle className="size-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-semibold">{alert.title}</h3>
                      <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${priorityTone[alert.priority]}`}>
                        {alert.priority}
                      </span>
                    </div>
                    <p className="mt-1 line-clamp-2 text-sm leading-6 text-muted-foreground">
                      {alert.description}
                    </p>
                  </div>
                </div>
              </div>
              <Link
                href={alert.actionHref}
                className="mt-3 inline-flex h-8 items-center gap-1 rounded-xl px-2 text-sm font-medium text-primary transition hover:bg-primary/5"
              >
                {alert.actionLabel}
                <ArrowRight className="size-4" />
              </Link>
            </article>
          ))
        ) : (
          <div className="rounded-2xl border border-dashed bg-background p-4 text-sm text-muted-foreground lg:col-span-2">
            No hay alertas críticas ahora. Buen momento para revisar mensajes nuevos o cargar documentación pendiente.
          </div>
        )}
      </CardContent>
    </Card>
  );
}
