import { headers } from "next/headers";

import { AppControlLanding } from "@/components/landing/app-control-landing";
import { PublicMarketplace } from "@/components/sites/public-marketplace";
import { getCurrentUserContext } from "@/lib/auth/current-user";
import { normalizeMarketplaceSection } from "@/lib/public-marketplace";
import { listAgencies, listProperties } from "@/lib/props-data";
import { resolveTenantFromHost } from "@/lib/tenant-routing";

export const dynamic = "force-dynamic";

export default async function HomePage({
  searchParams,
}: {
  searchParams?: { view?: string | string[] };
}) {
  const resolved = resolveTenantFromHost(headers().get("host"));

  if (resolved.kind === "app") {
    return <AppControlLanding />;
  }

  const [agencies, properties, current] = await Promise.all([
    listAgencies(),
    listProperties({ marketplaceOnly: true }),
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
