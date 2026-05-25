import { NextResponse } from "next/server";

import { getCurrentUserContext } from "@/lib/auth/current-user";
import { getAgencyScopeFromUser } from "@/lib/crm-automation";
import { getCrmLeadById } from "@/lib/props-data";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(
  request: Request,
  { params }: { params: { leadId: string } }
) {
  const current = await getCurrentUserContext();
  if (!current || !["superadmin", "agency_admin", "agent"].includes(current.profile.role)) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  const lead = await getCrmLeadById(params.leadId);
  if (!lead) {
    return NextResponse.json({ error: "No encontramos ese chat." }, { status: 404 });
  }

  const scope = getAgencyScopeFromUser(current);
  if (scope?.agencySlug && lead.agencySlug !== scope.agencySlug) {
    return NextResponse.json({ error: "No tienes acceso a este chat." }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  if (typeof body?.enabled !== "boolean") {
    return NextResponse.json({ error: "Indica si la IA queda activa o pausada." }, { status: 400 });
  }

  const admin = createAdminClient();
  const now = new Date().toISOString();
  const { error } = await admin
    .from("crm_leads")
    .update({
      ai_enabled: body.enabled,
      needs_response: body.enabled ? false : true,
      ai_reply_draft: body.enabled
        ? "IA activada para responder automaticamente este chat."
        : "IA pausada en este chat: el equipo responde manualmente.",
      last_activity_at: now,
    })
    .eq("id", lead.id);

  if (error) {
    return NextResponse.json(
      { error: "No pudimos actualizar la IA de este chat." },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true, aiEnabled: body.enabled });
}
