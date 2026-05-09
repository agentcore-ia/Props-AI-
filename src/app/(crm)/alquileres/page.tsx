import { LeasesWorkspace } from "@/components/rentals/leases-workspace";
import { getCurrentUserContext } from "@/lib/auth/current-user";
import { getAgencyScopeFromUser } from "@/lib/crm-automation";
import {
  getRentalDashboardSummary,
  listContractRescissions,
  listLeaseRoster,
  listOwnerSettlements,
  listRecentRentalAdjustments,
} from "@/lib/props-data";

export const dynamic = "force-dynamic";

export default async function LeasesPage() {
  const currentUser = await getCurrentUserContext();

  if (!currentUser) {
    return null;
  }

  const agencyScope = getAgencyScopeFromUser(currentUser);

  const [leases, rentalSummary, recentAdjustments, ownerSettlements, rescissions] = await Promise.all([
    listLeaseRoster(agencyScope),
    getRentalDashboardSummary(agencyScope),
    listRecentRentalAdjustments({ ...agencyScope, limit: 8 }),
    listOwnerSettlements({ ...agencyScope, limit: 12 }),
    listContractRescissions({ ...agencyScope, limit: 12 }),
  ]);

  return (
    <LeasesWorkspace
      leases={leases}
      rentalSummary={rentalSummary}
      recentAdjustments={recentAdjustments}
      ownerSettlements={ownerSettlements}
      rescissions={rescissions}
    />
  );
}
