import { PhoneCall } from "lucide-react";

import { EmptyState } from "@/components/layout/empty-state";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { calls } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

const toneByStatus = {
  Pendiente: "bg-amber-500/10 text-amber-700",
  Completada: "bg-emerald-500/10 text-emerald-700",
  Perdida: "bg-rose-500/10 text-rose-700",
};

export default function CallsPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        title="Llamadas"
        description="Seguimiento rapido de llamadas salientes y entrantes, con resumenes listos para enriquecer con transcripcion automatica."
      />

      {calls.length > 0 ? (
        <section className="grid gap-4">
          {calls.map((call) => (
            <Card key={call.id} className="rounded-[28px] border-0 bg-card shadow-sm">
              <CardContent className="flex flex-col gap-4 p-5 md:flex-row md:items-center md:justify-between">
                <div className="flex items-start gap-4">
                  <div className="flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                    <PhoneCall className="size-5" />
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-3">
                      <h3 className="font-semibold">{call.contact}</h3>
                      <Badge className={cn("rounded-full border-0", toneByStatus[call.status])}>{call.status}</Badge>
                    </div>
                    <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">{call.summary}</p>
                  </div>
                </div>
                <p className="text-sm font-medium text-muted-foreground">{call.when}</p>
              </CardContent>
            </Card>
          ))}
        </section>
      ) : (
        <EmptyState
          title="No hay llamadas registradas"
          description="Cuando conectemos telefonia o cargues actividad manual, las llamadas apareceran con su resumen."
        />
      )}
    </div>
  );
}
