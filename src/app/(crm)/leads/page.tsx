import { EmptyState } from "@/components/layout/empty-state";
import { LeadsKanban } from "@/components/leads/leads-kanban";
import { LeadsTable } from "@/components/leads/leads-table";
import { PageHeader } from "@/components/layout/page-header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { leads } from "@/lib/mock-data";

export default function LeadsPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        title="Leads"
        description="Centraliza contactos, etapas del embudo y seguimiento comercial con vista analitica y operativa."
      />

      {leads.length > 0 ? (
        <Tabs defaultValue="tabla">
          <TabsList className="rounded-2xl">
            <TabsTrigger value="tabla">Tabla</TabsTrigger>
            <TabsTrigger value="kanban">Kanban</TabsTrigger>
          </TabsList>
          <TabsContent value="tabla" className="pt-5">
            <LeadsTable leads={leads} />
          </TabsContent>
          <TabsContent value="kanban" className="pt-5">
            <LeadsKanban leads={leads} />
          </TabsContent>
        </Tabs>
      ) : (
        <EmptyState
          title="Sin leads todavia"
          description="Puedes conectar formularios, portales y campanas para empezar a centralizar contactos aqui."
        />
      )}
    </div>
  );
}
