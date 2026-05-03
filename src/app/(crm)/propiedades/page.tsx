import { PropertiesWorkspace } from "@/components/props/properties-workspace";
import { getCurrentUserContext } from "@/lib/auth/current-user";
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

  const agencyScope =
    currentUser.profile.role === "agency_admin"
      ? { agencySlug: currentUser.profile.agency_slug ?? undefined }
      : undefined;

  const [agencies, properties, rentalSummary, recentAdjustments] = await Promise.all([
    listAgencies(),
    listProperties(),
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
