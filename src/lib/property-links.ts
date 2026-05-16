const PUBLIC_MARKETPLACE_URL =
  process.env.PUBLIC_MARKETPLACE_URL?.replace(/\/+$/, "") || "https://props.com.ar";

export function buildPropertyShortCode(propertyId: string) {
  return String(propertyId ?? "").replace(/-/g, "").slice(0, 8);
}

export function buildShortPropertyPath(tenantSlug: string, propertyId: string) {
  const code = buildPropertyShortCode(propertyId);
  return `/p/${tenantSlug}/${code || propertyId}`;
}

export function buildShortPropertyUrl(tenantSlug: string, propertyId: string) {
  return `${PUBLIC_MARKETPLACE_URL}${buildShortPropertyPath(tenantSlug, propertyId)}`;
}

export function buildFullPropertyPath(tenantSlug: string, propertyId: string) {
  return `/propiedad/${tenantSlug}/${propertyId}`;
}
