import { PublicMarketplace } from "@/components/sites/public-marketplace";
import { normalizeMarketplaceSection } from "@/lib/public-marketplace";
import { listAgencies, listProperties } from "@/lib/props-data";

export const dynamic = "force-dynamic";

export default async function HomePage({
  searchParams,
}: {
  searchParams?: { view?: string | string[] };
}) {
  const [agencies, properties] = await Promise.all([listAgencies(), listProperties()]);

  return (
    <PublicMarketplace
      agencies={agencies}
      properties={properties}
      initialSection={normalizeMarketplaceSection(searchParams?.view)}
    />
  );
}
