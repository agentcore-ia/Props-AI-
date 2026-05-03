import { PropertiesWorkspace } from "@/components/props/properties-workspace";
import { getCurrentUserContext } from "@/lib/auth/current-user";
import { listAgencies, listProperties } from "@/lib/props-data";

export const dynamic = "force-dynamic";

export default async function PropertiesPage() {
  const [currentUser, agencies, properties] = await Promise.all([
    getCurrentUserContext(),
    listAgencies(),
    listProperties(),
  ]);

  if (!currentUser) {
    return null;
  }

  return (
    <PropertiesWorkspace
      agencies={agencies}
      properties={properties}
      currentUser={currentUser}
    />
  );
}
