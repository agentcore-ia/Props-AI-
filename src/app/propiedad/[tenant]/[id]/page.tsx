import { MarketplacePropertyDetail } from "@/components/sites/marketplace-property-detail";
import {
  getAgencyBySlug,
  getPropertyBySlugAndId,
  listAgencies,
  listProperties,
} from "@/lib/props-data";

export const dynamic = "force-dynamic";

export default async function MarketplacePropertyPage({
  params,
}: {
  params: { tenant: string; id: string };
}) {
  const [agency, property, allAgencies, sameAgencyProperties] = await Promise.all([
    getAgencyBySlug(params.tenant),
    getPropertyBySlugAndId(params.tenant, params.id),
    listAgencies(),
    listProperties({ tenantSlug: params.tenant }),
  ]);

  const relatedProperties = sameAgencyProperties
    .filter((item) => item.id !== params.id)
    .slice(0, 3);

  return (
    <MarketplacePropertyDetail
      agency={agency}
      property={property}
      allAgencies={allAgencies}
      relatedProperties={relatedProperties}
    />
  );
}
