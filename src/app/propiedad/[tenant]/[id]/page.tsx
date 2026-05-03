import { MarketplacePropertyDetail } from "@/components/sites/marketplace-property-detail";
import { getCurrentUserContext } from "@/lib/auth/current-user";
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
  const [agency, property, allAgencies, sameAgencyProperties, current] = await Promise.all([
    getAgencyBySlug(params.tenant),
    getPropertyBySlugAndId(params.tenant, params.id),
    listAgencies(),
    listProperties({ tenantSlug: params.tenant }),
    getCurrentUserContext(),
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
