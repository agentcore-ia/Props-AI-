import { NextResponse } from "next/server";

import { getCurrentUserContext } from "@/lib/auth/current-user";
import { getAgencyScopeFromUser, runVisitReminders } from "@/lib/crm-automation";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST() {
  const current = await getCurrentUserContext();
  if (!current || !["superadmin", "agency_admin", "agent"].includes(current.profile.role)) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  const scope = getAgencyScopeFromUser(current);
  let agencyIds: string[] | undefined;

  if (scope?.agencySlug) {
    const admin = createAdminClient();
    const { data } = await admin.from("agencies").select("id").eq("slug", scope.agencySlug);
    agencyIds = (data ?? []).map((item) => item.id);
  }

  const result = await runVisitReminders(agencyIds);
  return NextResponse.json(result);
}
