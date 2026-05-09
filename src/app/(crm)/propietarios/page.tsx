import { OwnersWorkspace } from "@/components/operations/owners-workspace";
import { getCurrentUserContext } from "@/lib/auth/current-user";
import { getAgencyScopeFromUser } from "@/lib/crm-automation";
import { listOwnerRoster, listOwnerSettlementItems, listOwnerSettlements } from "@/lib/props-data";

export const dynamic = "force-dynamic";

export default async function OwnersPage() {
  const currentUser = await getCurrentUserContext();
  if (!currentUser) return null;
  const scope = getAgencyScopeFromUser(currentUser);
  const [owners, settlements, settlementItems] = await Promise.all([
    listOwnerRoster(scope),
    listOwnerSettlements({ ...scope, limit: 20 }),
    listOwnerSettlementItems({ ...scope, limit: 300 }),
  ]);

  return <OwnersWorkspace owners={owners} settlements={settlements} settlementItems={settlementItems} />;
}
