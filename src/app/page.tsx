import { PublicMarketplace } from "@/components/sites/public-marketplace";
import { listAgencies, listProperties } from "@/lib/props-data";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [agencies, properties] = await Promise.all([listAgencies(), listProperties()]);

  return <PublicMarketplace agencies={agencies} properties={properties} />;
}
