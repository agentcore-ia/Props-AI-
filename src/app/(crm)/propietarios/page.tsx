import { OwnersWorkspace } from "@/components/operations/owners-workspace";
import { getCurrentUserContext } from "@/lib/auth/current-user";
import { getAgencyScopeFromUser } from "@/lib/crm-automation";
import {
  getPersonTimeline,
  listMaintenanceTickets,
  listOwnerRoster,
  listOwnerSettlementItems,
  listOwnerSettlements,
} from "@/lib/props-data";

export const dynamic = "force-dynamic";

export default async function OwnersPage() {
  const currentUser = await getCurrentUserContext();
  if (!currentUser) return null;
  const scope = getAgencyScopeFromUser(currentUser);
  const [owners, settlements, settlementItems, maintenanceTickets] = await Promise.all([
    listOwnerRoster(scope),
    listOwnerSettlements({ ...scope, limit: 20 }),
    listOwnerSettlementItems({ ...scope, limit: 300 }),
    listMaintenanceTickets({ agencySlug: scope?.agencySlug, limit: 80 }),
  ]);

  const timelines = await Promise.all(
    owners.map(async (owner) => {
      const key = `${owner.contractOwnerId ?? owner.contractId}-${owner.ownerName}`;
      const events = await getPersonTimeline({
        agencySlug: scope?.agencySlug,
        contractId: owner.contractId,
        ownerName: owner.ownerName,
        limit: 8,
      });
      return [key, events] as const;
    })
  );

  return (
    <OwnersWorkspace
      owners={owners}
      settlements={settlements}
      settlementItems={settlementItems}
      maintenanceTickets={maintenanceTickets}
      timelinesByOwnerKey={Object.fromEntries(timelines)}
    />
  );
}
