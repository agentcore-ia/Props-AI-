import "server-only";

import type { CurrentUserContext } from "@/lib/auth/current-user";

const AUTOMATION_SECRET_FALLBACK = "props-automation-2026-05";
const LEGACY_RENT_AUTOMATION_SECRET_FALLBACK = "props-rent-automation-2026-7f0b0b7d";

export function getAutomationSecrets() {
  const values = [
    process.env.PROPS_RENT_AUTOMATION_SECRET?.trim(),
    AUTOMATION_SECRET_FALLBACK,
    LEGACY_RENT_AUTOMATION_SECRET_FALLBACK,
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
