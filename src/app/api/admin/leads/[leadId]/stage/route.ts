import { NextResponse } from "next/server";

import { getCurrentUserContext } from "@/lib/auth/current-user";
import type { LeadStage } from "@/lib/crm-types";
import { getAgencyScopeFromUser, updateLeadStage } from "@/lib/crm-automation";
import { getCrmLeadById } from "@/lib/props-data";

const ALLOWED_STAGES: LeadStage[] = [
  "Nuevo",
  "Precalificado",
  "Visita",
  "Seguimiento",
  "Propuesta",
  "Cerrado",
  "Descartado",
];

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
  const stage = String(body?.stage ?? "").trim() as LeadStage;
  if (!ALLOWED_STAGES.includes(stage)) {
    return NextResponse.json({ error: "Selecciona una etapa valida." }, { status: 400 });
  }

  await updateLeadStage(lead.id, stage);
  return NextResponse.json({ ok: true });
}
