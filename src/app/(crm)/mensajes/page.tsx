import { InboxWorkspace } from "@/components/messages/inbox-workspace";
import { getCurrentUserContext } from "@/lib/auth/current-user";
import { getAgencyScopeFromUser } from "@/lib/crm-automation";
import {
  listAgencyMessageTemplates,
  listCrmLeadMessages,
  listCrmLeads,
  listProperties,
  listVisitAppointments,
} from "@/lib/props-data";

export const dynamic = "force-dynamic";

export default async function MessagesPage({
  searchParams,
}: {
  searchParams?: { modo?: string };
}) {
  const currentUser = await getCurrentUserContext();
  if (!currentUser) {
    return null;
  }

  const scope = getAgencyScopeFromUser(currentUser);
  const [leads, properties, visits, templates] = await Promise.all([
    listCrmLeads(scope),
    listProperties(scope?.agencySlug ? { tenantSlug: scope.agencySlug } : undefined),
    listVisitAppointments(scope),
    listAgencyMessageTemplates(scope),
  ]);
  const visibleLeads = leads.filter(
    (lead) => lead.needsResponse || lead.stage !== "Cerrado"
  );
  const messages = await listCrmLeadMessages({
    agencySlug: scope?.agencySlug,
    leadIds: visibleLeads.map((lead) => lead.id),
  });

  return (
    <InboxWorkspace
      leads={visibleLeads}
      messages={messages}
      properties={properties}
      visits={visits}
      templates={templates}
      initialMode={searchParams?.modo === "recepcion" ? "recepcion" : "completo"}
    />
  );
}
