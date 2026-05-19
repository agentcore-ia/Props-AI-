import { CashWorkspace } from "@/components/operations/cash-workspace";
import { getCurrentUserContext } from "@/lib/auth/current-user";
import { getAgencyScopeFromUser } from "@/lib/crm-automation";
import { listCashMovements, listOwnerSettlements, listOwnerTransfers, listRentalCollections } from "@/lib/props-data";

export const dynamic = "force-dynamic";

export default async function CashPage() {
  const currentUser = await getCurrentUserContext();
  if (!currentUser) return null;
  const scope = getAgencyScopeFromUser(currentUser);
  const [movements, collections, settlements, transfers] = await Promise.all([
    listCashMovements({ ...scope, limit: 80 }),
    listRentalCollections({ ...scope, limit: 120 }),
    listOwnerSettlements({ ...scope, limit: 120 }),
    listOwnerTransfers({ ...scope, limit: 120 }),
  ]);
  return (
    <CashWorkspace
      movements={movements}
      collections={collections}
      settlements={settlements}
      transfers={transfers}
    />
  );
}
