import { PublicMarketplace } from "@/components/sites/public-marketplace";
import { getCurrentUserContext } from "@/lib/auth/current-user";
import { normalizeMarketplaceSection } from "@/lib/public-marketplace";
import { listAgencies, listProperties } from "@/lib/props-data";

export const dynamic = "force-dynamic";

export default async function HomePage({
  searchParams,
}: {
  searchParams?: { view?: string | string[] };
}) {
  const [agencies, properties, current] = await Promise.all([
    listAgencies(),
    listProperties(),
    getCurrentUserContext(),
  ]);

  return (
    <PublicMarketplace
      agencies={agencies}
      properties={properties}
      initialSection={normalizeMarketplaceSection(searchParams?.view)}
      currentUser={
        current
          ? {
              fullName: current.profile.full_name,
              email: current.user.email,
              role: current.profile.role,
            }
          : null
      }
    />
  );
}
