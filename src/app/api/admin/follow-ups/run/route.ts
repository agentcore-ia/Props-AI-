import { NextResponse } from "next/server";

import { getCurrentUserContext } from "@/lib/auth/current-user";
import {
  canRunAutomationWithSession,
  isAutomationRequest,
} from "@/lib/automation-auth";
import { getAgencyScopeFromUser, runAutomaticLeadFollowUps } from "@/lib/crm-automation";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  if (isAutomationRequest(request)) {
    const result = await runAutomaticLeadFollowUps();
    return NextResponse.json({ ...result, trigger: "n8n" });
  }

  const current = await getCurrentUserContext();
  if (!canRunAutomationWithSession(current)) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  const scope = getAgencyScopeFromUser(current);
  let agencyIds: string[] | undefined;

  if (scope?.agencySlug) {
    const admin = createAdminClient();
    const { data } = await admin.from("agencies").select("id").eq("slug", scope.agencySlug);
    agencyIds = (data ?? []).map((item) => item.id);
  }

  const result = await runAutomaticLeadFollowUps(agencyIds);
  return NextResponse.json({ ...result, trigger: "dashboard" });
}
