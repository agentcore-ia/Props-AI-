import { notFound, redirect } from "next/navigation";

import { buildFullPropertyPath } from "@/lib/property-links";
import { listProperties } from "@/lib/props-data";

export default async function ShortTenantPropertyPage({
  params,
}: {
  params: { tenant: string; code: string };
}) {
  const code = params.code.replace(/-/g, "").toLowerCase();
  const properties = await listProperties({ tenantSlug: params.tenant });
  const property = properties.find((item) => {
    const normalizedId = item.id.replace(/-/g, "").toLowerCase();
    return normalizedId === code || normalizedId.startsWith(code);
  });

  if (!property) {
    notFound();
  }

  redirect(buildFullPropertyPath(params.tenant, property.id));
}
