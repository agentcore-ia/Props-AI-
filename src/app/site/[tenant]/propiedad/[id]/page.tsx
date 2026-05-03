import { TenantPropertyDetail } from "@/components/sites/tenant-property-detail";
import { getAgencyBySlug, getPropertyBySlugAndId, listProperties } from "@/lib/props-data";

export const dynamic = "force-dynamic";

export default async function TenantPropertyPage({
  params,
}: {
  params: { tenant: string; id: string };
}) {
  const [agency, property, properties] = await Promise.all([
    getAgencyBySlug(params.tenant),
    getPropertyBySlugAndId(params.tenant, params.id),
    listProperties({ tenantSlug: params.tenant }),
  ]);

  const relatedProperties = properties.filter((item) => item.id !== params.id).slice(0, 3);

  return (
    <TenantPropertyDetail
      agency={agency}
      property={property}
      relatedProperties={relatedProperties}
    />
  );
}
