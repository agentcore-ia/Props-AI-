import { DelinquenciesWorkspace } from "@/components/operations/delinquencies-workspace";
import { getCurrentUserContext } from "@/lib/auth/current-user";
import { getAgencyScopeFromUser } from "@/lib/crm-automation";
import { listDelinquentTenants } from "@/lib/props-data";

export const dynamic = "force-dynamic";

export default async function DelinquenciesPage() {
  const currentUser = await getCurrentUserContext();
  if (!currentUser) return null;

  const scope = getAgencyScopeFromUser(currentUser);
  const delinquencies = await listDelinquentTenants(scope);

  return <DelinquenciesWorkspace delinquencies={delinquencies} />;
}
