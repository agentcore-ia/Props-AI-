import { LeasesWorkspace } from "@/components/rentals/leases-workspace";
import { getCurrentUserContext } from "@/lib/auth/current-user";
import { getAgencyScopeFromUser } from "@/lib/crm-automation";
import { listLeaseRoster } from "@/lib/props-data";

export const dynamic = "force-dynamic";

export default async function LeasesPage() {
  const currentUser = await getCurrentUserContext();

  if (!currentUser) {
    return null;
  }

  const agencyScope = getAgencyScopeFromUser(currentUser);

  const leases = await listLeaseRoster(agencyScope);

  return <LeasesWorkspace leases={leases} />;
}
