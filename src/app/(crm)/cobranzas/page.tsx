import { CollectionsWorkspace } from "@/components/operations/collections-workspace";
import { getCurrentUserContext } from "@/lib/auth/current-user";
import { getAgencyScopeFromUser } from "@/lib/crm-automation";
import { listLeaseRoster, listRentalCollections } from "@/lib/props-data";

export const dynamic = "force-dynamic";

export default async function CollectionsPage() {
  const currentUser = await getCurrentUserContext();
  if (!currentUser) return null;
  const scope = getAgencyScopeFromUser(currentUser);
  const [leases, collections] = await Promise.all([
    listLeaseRoster(scope),
    listRentalCollections({ ...scope, limit: 30 }),
  ]);
  return <CollectionsWorkspace leases={leases} collections={collections} />;
}
