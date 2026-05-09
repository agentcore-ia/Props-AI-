import { CashWorkspace } from "@/components/operations/cash-workspace";
import { getCurrentUserContext } from "@/lib/auth/current-user";
import { getAgencyScopeFromUser } from "@/lib/crm-automation";
import { listCashMovements } from "@/lib/props-data";

export const dynamic = "force-dynamic";

export default async function CashPage() {
  const currentUser = await getCurrentUserContext();
  if (!currentUser) return null;
  const scope = getAgencyScopeFromUser(currentUser);
  const movements = await listCashMovements({ ...scope, limit: 40 });
  return <CashWorkspace movements={movements} />;
}
