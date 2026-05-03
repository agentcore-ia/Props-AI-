import { TenantCatalog } from "@/components/sites/tenant-catalog";
import { getAgencyBySlug, listProperties } from "@/lib/props-data";

export const dynamic = "force-dynamic";

export default async function TenantCatalogPage({
  params,
}: {
  params: { tenant: string };
}) {
  const [agency, properties] = await Promise.all([
    getAgencyBySlug(params.tenant),
    listProperties({ tenantSlug: params.tenant }),
  ]);

  return <TenantCatalog agency={agency} properties={properties} />;
}
