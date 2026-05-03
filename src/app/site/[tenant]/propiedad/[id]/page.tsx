import { TenantPropertyDetail } from "@/components/sites/tenant-property-detail";
import { getAgencyBySlug, getPropertyBySlugAndId } from "@/lib/props-data";

export const dynamic = "force-dynamic";

export default async function TenantPropertyPage({
  params,
}: {
  params: { tenant: string; id: string };
}) {
  const [agency, property] = await Promise.all([
    getAgencyBySlug(params.tenant),
    getPropertyBySlugAndId(params.tenant, params.id),
  ]);

  return <TenantPropertyDetail agency={agency} property={property} />;
}
