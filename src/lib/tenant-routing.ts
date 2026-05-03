export function getHostParts(hostHeader: string | null) {
  const host = (hostHeader ?? "").split(":")[0].toLowerCase();
  const segments = host.split(".").filter(Boolean);

  return { host, segments };
}

export function resolveTenantFromHost(hostHeader: string | null) {
  const { host, segments } = getHostParts(hostHeader);

  if (!host || host === "localhost" || host === "127.0.0.1") {
    return { kind: "root" as const, tenantSlug: null };
  }

  if (host.endsWith(".localhost")) {
    const subdomain = segments[0];
    if (subdomain === "app") return { kind: "app" as const, tenantSlug: null };
    return { kind: "tenant" as const, tenantSlug: subdomain };
  }

  if (host === "props.com.ar" || host === "www.props.com.ar") {
    return { kind: "root" as const, tenantSlug: null };
  }

  if (host === "app.props.com.ar") {
    return { kind: "app" as const, tenantSlug: null };
  }

  if (host.endsWith(".props.com.ar")) {
    const subdomain = segments[0];
    return { kind: "tenant" as const, tenantSlug: subdomain };
  }

  return { kind: "root" as const, tenantSlug: null };
}
