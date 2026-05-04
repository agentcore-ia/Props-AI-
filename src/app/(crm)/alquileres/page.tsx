import { LeasesWorkspace } from "@/components/rentals/leases-workspace";
import { getCurrentUserContext } from "@/lib/auth/current-user";
import { listLeaseRoster } from "@/lib/props-data";

export const dynamic = "force-dynamic";

export default async function LeasesPage() {
  const currentUser = await getCurrentUserContext();

  if (!currentUser) {
    return null;
  }

  const agencyScope =
    currentUser.profile.role === "agency_admin"
      ? { agencySlug: currentUser.profile.agency_slug ?? undefined }
      : undefined;

  const leases = await listLeaseRoster(agencyScope);

  return <LeasesWorkspace leases={leases} />;
}
