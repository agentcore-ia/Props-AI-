import { LeadsWorkspace } from "@/components/leads/leads-workspace";
import { getCurrentUserContext } from "@/lib/auth/current-user";
import { getAgencyScopeFromUser } from "@/lib/crm-automation";
import { listCrmLeads } from "@/lib/props-data";

export const dynamic = "force-dynamic";

export default async function LeadsPage() {
  const currentUser = await getCurrentUserContext();
  if (!currentUser) {
    return null;
  }

  const leads = await listCrmLeads(getAgencyScopeFromUser(currentUser));
  return <LeadsWorkspace leads={leads} />;
}
