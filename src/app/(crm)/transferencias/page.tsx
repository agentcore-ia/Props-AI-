import { TransfersWorkspace } from "@/components/operations/transfers-workspace";
import { getCurrentUserContext } from "@/lib/auth/current-user";
import { getAgencyScopeFromUser } from "@/lib/crm-automation";
import { listOwnerRoster, listOwnerTransfers } from "@/lib/props-data";

export const dynamic = "force-dynamic";

export default async function TransfersPage() {
  const currentUser = await getCurrentUserContext();
  if (!currentUser) return null;
  const scope = getAgencyScopeFromUser(currentUser);
  const [owners, transfers] = await Promise.all([
    listOwnerRoster(scope),
    listOwnerTransfers({ ...scope, limit: 50 }),
  ]);
  return <TransfersWorkspace owners={owners} transfers={transfers} />;
}
