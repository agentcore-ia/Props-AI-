import "server-only";

import type { CurrentUserContext } from "@/lib/auth/current-user";

export function getAutomationSecrets() {
  const values = [
    process.env.PROPS_RENT_AUTOMATION_SECRET?.trim(),
    process.env.PROPS_LEGACY_RENT_AUTOMATION_SECRET?.trim(),
  ].filter(Boolean);

  return Array.from(new Set(values));
}

export function isAutomationRequest(request: Request) {
  const provided =
    request.headers.get("x-props-automation-secret") ??
    request.headers.get("x-props-internal-secret") ??
    "";

  return Boolean(provided) && getAutomationSecrets().includes(provided);
}

export function canRunAutomationWithSession(
  current: CurrentUserContext | null
): current is CurrentUserContext {
  return !!current && ["superadmin", "agency_admin", "agent"].includes(current.profile.role);
}
