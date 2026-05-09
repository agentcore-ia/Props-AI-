import { TenantsWorkspace } from "@/components/operations/tenants-workspace";
import { getCurrentUserContext } from "@/lib/auth/current-user";
import { getAgencyScopeFromUser } from "@/lib/crm-automation";
import { listTenantRoster } from "@/lib/props-data";

export const dynamic = "force-dynamic";

export default async function TenantsPage() {
  const currentUser = await getCurrentUserContext();
  if (!currentUser) return null;
  const scope = getAgencyScopeFromUser(currentUser);
  const tenants = await listTenantRoster(scope);
  return <TenantsWorkspace tenants={tenants} />;
}
