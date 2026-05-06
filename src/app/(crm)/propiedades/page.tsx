import { PropertiesWorkspace } from "@/components/props/properties-workspace";
import { getCurrentUserContext } from "@/lib/auth/current-user";
import { getAgencyScopeFromUser } from "@/lib/crm-automation";
import {
  listAgencies,
  listCrmLeads,
  listProperties,
  listVisitAppointments,
} from "@/lib/props-data";

export const dynamic = "force-dynamic";

export default async function PropertiesPage() {
  const currentUser = await getCurrentUserContext();

  if (!currentUser) {
    return null;
  }

  const agencyScope = getAgencyScopeFromUser(currentUser);
  const propertyScope = agencyScope ? { tenantSlug: agencyScope.agencySlug } : undefined;

  const [agencies, properties, leads, visits] = await Promise.all([
    listAgencies(),
    listProperties(propertyScope),
    listCrmLeads(agencyScope),
    listVisitAppointments(agencyScope),
  ]);

  return (
    <PropertiesWorkspace
      agencies={agencies}
      properties={properties}
      leads={leads}
      visits={visits}
      currentUser={currentUser}
    />
  );
}
