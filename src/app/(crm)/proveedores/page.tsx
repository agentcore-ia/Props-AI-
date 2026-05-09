import { SuppliersWorkspace } from "@/components/operations/suppliers-workspace";
import { getCurrentUserContext } from "@/lib/auth/current-user";
import { getAgencyScopeFromUser } from "@/lib/crm-automation";
import { listSuppliers } from "@/lib/props-data";

export const dynamic = "force-dynamic";

export default async function SuppliersPage() {
  const currentUser = await getCurrentUserContext();
  if (!currentUser) return null;
  const scope = getAgencyScopeFromUser(currentUser);
  const suppliers = await listSuppliers({ ...scope, limit: 50 });
  return <SuppliersWorkspace suppliers={suppliers} />;
}
