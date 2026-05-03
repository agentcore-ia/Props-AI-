import { TenantPropertyDetail } from "@/components/sites/tenant-property-detail";

export default function TenantPropertyPage({
  params,
}: {
  params: { tenant: string; id: string };
}) {
  return <TenantPropertyDetail tenantSlug={params.tenant} propertyId={params.id} />;
}
