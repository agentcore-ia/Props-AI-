import { NextResponse } from "next/server";

import { getCurrentUserContext } from "@/lib/auth/current-user";
import { getAgencyScopeFromUser, registerVisitOutcome } from "@/lib/crm-automation";
import { listVisitAppointments } from "@/lib/props-data";

export async function POST(
  request: Request,
  { params }: { params: { visitId: string } }
) {
  const current = await getCurrentUserContext();
  if (!current || !["superadmin", "agency_admin", "agent"].includes(current.profile.role)) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  const visits = await listVisitAppointments(getAgencyScopeFromUser(current));
  const visit = visits.find((item) => item.id === params.visitId);

  if (!visit) {
    return NextResponse.json({ error: "No encontramos esa visita." }, { status: 404 });
  }

  const body = await request.json().catch(() => null);
  const status = String(body?.status ?? "").trim() as
    | "Programada"
    | "Confirmada"
    | "Realizada"
    | "Reprogramar"
    | "Cancelada";
  const outcomeSummary = String(body?.outcomeSummary ?? "").trim();
  const objections = String(body?.objections ?? "").trim();
  const interestLevel = String(body?.interestLevel ?? "Media").trim() as "Alta" | "Media" | "Baja";
  const nextAction = String(body?.nextAction ?? "").trim();

  if (!status || !outcomeSummary) {
    return NextResponse.json(
      { error: "Completa estado y resumen de la visita." },
      { status: 400 }
    );
  }

  await registerVisitOutcome({
    visitId: visit.id,
    leadId: visit.leadId,
    agencyId: visit.agencyId,
    propertyId: visit.propertyId,
    status,
    outcomeSummary,
    objections,
    interestLevel,
    nextAction,
  });

  return NextResponse.json({ ok: true });
}
