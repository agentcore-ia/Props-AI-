import { LeasesWorkspace } from "@/components/rentals/leases-workspace";
import { getCurrentUserContext } from "@/lib/auth/current-user";
import { getAgencyScopeFromUser } from "@/lib/crm-automation";
import {
  getRentalDashboardSummary,
  listLeaseRoster,
  listRecentRentalAdjustments,
} from "@/lib/props-data";

export const dynamic = "force-dynamic";

export default async function LeasesPage() {
  const currentUser = await getCurrentUserContext();

  if (!currentUser) {
    return null;
  }

  const agencyScope = getAgencyScopeFromUser(currentUser);

  const [leases, rentalSummary, recentAdjustments] = await Promise.all([
    listLeaseRoster(agencyScope),
    getRentalDashboardSummary(agencyScope),
    listRecentRentalAdjustments({ ...agencyScope, limit: 8 }),
  ]);

  return (
    <LeasesWorkspace
      leases={leases}
      rentalSummary={rentalSummary}
      recentAdjustments={recentAdjustments}
    />
  );
}
