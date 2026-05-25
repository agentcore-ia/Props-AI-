import { MaintenanceWorkspace } from "@/components/operations/maintenance-workspace";
import { getCurrentUserContext } from "@/lib/auth/current-user";
import { getAgencyScopeFromUser } from "@/lib/crm-automation";
import { listLeaseRoster, listMaintenanceTickets, listSuppliers } from "@/lib/props-data";

export const dynamic = "force-dynamic";

export default async function MaintenancePage() {
  const currentUser = await getCurrentUserContext();
  if (!currentUser) return null;
  const scope = getAgencyScopeFromUser(currentUser);
  const [tickets, leases, suppliers] = await Promise.all([
    listMaintenanceTickets({ ...scope, limit: 80 }),
    listLeaseRoster(scope),
    listSuppliers({ ...scope, limit: 120 }),
  ]);

  return <MaintenanceWorkspace tickets={tickets} leases={leases} suppliers={suppliers} />;
}
