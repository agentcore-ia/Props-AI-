import { redirect } from "next/navigation";

import { AgencyManager } from "@/components/admin/agency-manager";
import { getCurrentUserContext } from "@/lib/auth/current-user";
import { listAgencySummaries } from "@/lib/props-data";

export const dynamic = "force-dynamic";

export default async function AgenciesPage() {
  const currentUser = await getCurrentUserContext();

  if (!currentUser) {
    return null;
  }

  if (currentUser.profile.role !== "superadmin") {
    redirect("/dashboard");
  }

  const agencies = await listAgencySummaries();

  return <AgencyManager agencies={agencies} />;
}
