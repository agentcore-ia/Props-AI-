import { PropertiesWorkspace } from "@/components/props/properties-workspace";
import { getCurrentUserContext } from "@/lib/auth/current-user";
import { getAgencyScopeFromUser } from "@/lib/crm-automation";
import {
  getRentalDashboardSummary,
  listAgencies,
  listProperties,
  listRecentRentalAdjustments,
} from "@/lib/props-data";

export const dynamic = "force-dynamic";

export default async function PropertiesPage() {
  const currentUser = await getCurrentUserContext();

  if (!currentUser) {
    return null;
  }

  const agencyScope = getAgencyScopeFromUser(currentUser);
  const propertyScope = agencyScope ? { tenantSlug: agencyScope.agencySlug } : undefined;

  const [agencies, properties, rentalSummary, recentAdjustments] = await Promise.all([
    listAgencies(),
    listProperties(propertyScope),
    getRentalDashboardSummary(agencyScope),
    listRecentRentalAdjustments({ ...agencyScope, limit: 8 }),
  ]);

  return (
    <PropertiesWorkspace
      agencies={agencies}
      properties={properties}
      currentUser={currentUser}
      rentalSummary={rentalSummary}
      recentAdjustments={recentAdjustments}
    />
  );
}
