import { AgencyManager } from "@/components/admin/agency-manager";
import { listAgencySummaries } from "@/lib/props-data";

export const dynamic = "force-dynamic";

export default async function AgenciesPage() {
  const agencies = await listAgencySummaries();

  return <AgencyManager agencies={agencies} />;
}
