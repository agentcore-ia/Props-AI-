import { TenantsWorkspace } from "@/components/operations/tenants-workspace";
import { getCurrentUserContext } from "@/lib/auth/current-user";
import { getAgencyScopeFromUser } from "@/lib/crm-automation";
import { getPersonTimeline, listTenantRoster } from "@/lib/props-data";

export const dynamic = "force-dynamic";

export default async function TenantsPage() {
  const currentUser = await getCurrentUserContext();
  if (!currentUser) return null;
  const scope = getAgencyScopeFromUser(currentUser);
  const tenants = await listTenantRoster(scope);
  const timelines = await Promise.all(
    tenants.map(async (tenant) => {
      const events = await getPersonTimeline({
        agencySlug: scope?.agencySlug,
        contractId: tenant.contractId,
        phone: tenant.tenantPhone,
        tenantName: tenant.tenantName,
        limit: 8,
      });
      return [tenant.contractId, events] as const;
    })
  );
  return <TenantsWorkspace tenants={tenants} timelinesByContractId={Object.fromEntries(timelines)} />;
}
