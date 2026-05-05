import { InboxWorkspace } from "@/components/messages/inbox-workspace";
import { getCurrentUserContext } from "@/lib/auth/current-user";
import { getAgencyScopeFromUser } from "@/lib/crm-automation";
import { listCrmLeadMessages, listCrmLeads } from "@/lib/props-data";

export const dynamic = "force-dynamic";

export default async function MessagesPage() {
  const currentUser = await getCurrentUserContext();
  if (!currentUser) {
    return null;
  }

  const scope = getAgencyScopeFromUser(currentUser);
  const leads = await listCrmLeads(scope);
  const visibleLeads = leads.filter(
    (lead) => lead.needsResponse || lead.stage !== "Cerrado"
  );
  const messages = await listCrmLeadMessages({
    agencySlug: scope?.agencySlug,
    leadIds: visibleLeads.map((lead) => lead.id),
  });

  return <InboxWorkspace leads={visibleLeads} messages={messages} />;
}
