import { NextResponse } from "next/server";

import { getCurrentUserContext } from "@/lib/auth/current-user";
import { getAgencyScopeFromUser, sendLeadWhatsApp } from "@/lib/crm-automation";
import { getCrmLeadById, getPropertyBySlugAndId } from "@/lib/props-data";
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
    return NextResponse.json({ error: "No encontramos ese lead." }, { status: 404 });
  }

  const scope = getAgencyScopeFromUser(current);
  if (scope?.agencySlug && lead.agencySlug !== scope.agencySlug) {
    return NextResponse.json({ error: "No tienes acceso a este lead." }, { status: 403 });
  }

  const admin = createAdminClient();
  const { data: agency, error: agencyError } = await admin
    .from("agencies")
    .select("messaging_instance")
    .eq("slug", lead.agencySlug)
    .maybeSingle();

  if (agencyError || !agency) {
    return NextResponse.json({ error: "No encontramos la instancia de WhatsApp." }, { status: 404 });
  }

  const body = await request.json().catch(() => null);
  const customPrompt = String(body?.customPrompt ?? "").trim() || null;
  const property =
    lead.propertyId && lead.agencySlug
      ? await getPropertyBySlugAndId(lead.agencySlug, lead.propertyId)
      : null;

  const sentText = await sendLeadWhatsApp({
    lead,
    agencyMessagingInstance: agency.messaging_instance,
    property,
    customPrompt,
  });

  return NextResponse.json({ ok: true, message: sentText });
}
