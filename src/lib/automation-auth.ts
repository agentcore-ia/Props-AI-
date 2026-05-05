import "server-only";

import type { CurrentUserContext } from "@/lib/auth/current-user";

const AUTOMATION_SECRET_FALLBACK = "props-automation-2026-05";

export function getAutomationSecret() {
  return (process.env.PROPS_RENT_AUTOMATION_SECRET ?? AUTOMATION_SECRET_FALLBACK).trim();
}

export function isAutomationRequest(request: Request) {
  const provided =
    request.headers.get("x-props-automation-secret") ??
    request.headers.get("x-props-internal-secret") ??
    "";

  return Boolean(provided) && provided === getAutomationSecret();
}

export function canRunAutomationWithSession(
  current: CurrentUserContext | null
): current is CurrentUserContext {
  return !!current && ["superadmin", "agency_admin", "agent"].includes(current.profile.role);
}
