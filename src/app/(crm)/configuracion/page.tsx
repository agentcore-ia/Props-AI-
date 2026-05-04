import { AgencySettingsWorkspace } from "@/components/settings/agency-settings-workspace";
import { getManagedAgency, listManagedAgencies } from "@/lib/agency-access";
import { getCurrentUserContext } from "@/lib/auth/current-user";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const currentUser = await getCurrentUserContext();

  if (!currentUser) {
    return null;
  }

  if (!["superadmin", "agency_admin"].includes(currentUser.profile.role)) {
    return null;
  }

  const agencies = await listManagedAgencies(currentUser);
  const primaryAgency = await getManagedAgency(currentUser);
  const orderedAgencies =
    primaryAgency && agencies.length > 1
      ? [primaryAgency, ...agencies.filter((agency) => agency.id !== primaryAgency.id)]
      : agencies;

  return <AgencySettingsWorkspace currentUser={currentUser} agencies={orderedAgencies} />;
}
