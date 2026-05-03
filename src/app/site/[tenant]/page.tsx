import { TenantCatalog } from "@/components/sites/tenant-catalog";

export default function TenantCatalogPage({
  params,
}: {
  params: { tenant: string };
}) {
  return <TenantCatalog tenantSlug={params.tenant} />;
}
