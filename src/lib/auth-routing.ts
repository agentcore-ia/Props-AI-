export type AppRole = "superadmin" | "agency_admin" | "agent" | "customer";

export function resolvePostLoginPath(role: AppRole, fallback?: string | null) {
  if (role === "customer") {
    return fallback && fallback.startsWith("/") ? fallback : "/cuenta";
  }

  return fallback && fallback.startsWith("/") ? fallback : "/dashboard";
}
