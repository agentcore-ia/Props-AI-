import { Lead } from "@/lib/mock-data";

const columns: Lead["status"][] = ["Nuevo", "Visitando", "Propuesta", "Cerrado"];

export function LeadsKanban({ leads }: { leads: Lead[] }) {
  return (
    <div className="grid gap-4 xl:grid-cols-4">
      {columns.map((status) => (
        <div key={status} className="rounded-[28px] border bg-card p-4 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-semibold">{status}</h3>
            <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium">
              {leads.filter((lead) => lead.status === status).length}
            </span>
          </div>
          <div className="space-y-3">
            {leads
              .filter((lead) => lead.status === status)
              .map((lead) => (
                <div key={lead.id} className="rounded-2xl border bg-background p-4">
                  <p className="font-medium">{lead.name}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{lead.interest}</p>
                  <p className="mt-3 text-xs text-muted-foreground">{lead.phone}</p>
                </div>
              ))}
          </div>
        </div>
      ))}
    </div>
  );
}
