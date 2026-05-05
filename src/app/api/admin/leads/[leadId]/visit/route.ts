import { NextResponse } from "next/server";

import { getCurrentUserContext } from "@/lib/auth/current-user";
import { getAgencyScopeFromUser, scheduleLeadVisit } from "@/lib/crm-automation";
import { getCrmLeadById } from "@/lib/props-data";

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

  const body = await request.json().catch(() => null);
  const scheduledFor = String(body?.scheduledFor ?? "").trim();
  const notes = String(body?.notes ?? "").trim();

  if (!scheduledFor) {
    return NextResponse.json({ error: "Selecciona fecha y hora para la visita." }, { status: 400 });
  }

  await scheduleLeadVisit({
    agencyId: lead.agencyId,
    leadId: lead.id,
    propertyId: lead.propertyId,
    scheduledFor,
    notes,
    createdBy: current.user.id,
  });

  return NextResponse.json({ ok: true });
}
