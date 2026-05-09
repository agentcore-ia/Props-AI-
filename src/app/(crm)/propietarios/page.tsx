import { OwnersWorkspace } from "@/components/operations/owners-workspace";
import { getCurrentUserContext } from "@/lib/auth/current-user";
import { getAgencyScopeFromUser } from "@/lib/crm-automation";
import { listOwnerRoster, listOwnerSettlements } from "@/lib/props-data";

export const dynamic = "force-dynamic";

export default async function OwnersPage() {
  const currentUser = await getCurrentUserContext();
  if (!currentUser) return null;
  const scope = getAgencyScopeFromUser(currentUser);
  const [owners, settlements] = await Promise.all([
    listOwnerRoster(scope),
    listOwnerSettlements({ ...scope, limit: 20 }),
  ]);

  return <OwnersWorkspace owners={owners} settlements={settlements} />;
}
