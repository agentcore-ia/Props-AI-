import { NextResponse } from "next/server";

import { getCurrentUserContext } from "@/lib/auth/current-user";
import { getAgencyScopeFromUser } from "@/lib/crm-automation";
import { getCrmLeadById } from "@/lib/props-data";
import { createAdminClient } from "@/lib/supabase/admin";

const TEST_AGENCY_SLUG = "ceballos";

export async function POST(
  _request: Request,
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

  if (lead.agencySlug !== TEST_AGENCY_SLUG) {
    return NextResponse.json(
      { error: "Esta herramienta de prueba solo esta habilitada para Ceballos." },
      { status: 403 }
    );
  }

  const admin = createAdminClient();
  const { error: deleteMessagesError } = await admin
    .from("crm_lead_messages")
    .delete()
    .eq("lead_id", lead.id);

  if (deleteMessagesError) {
    return NextResponse.json(
      { error: "No pudimos borrar el historial de mensajes." },
      { status: 500 }
    );
  }

  const { error: completeTasksError } = await admin
    .from("employee_tasks")
    .update({
      status: "Hecha",
      completed_at: new Date().toISOString(),
    })
    .eq("lead_id", lead.id)
    .eq("status", "Pendiente");

  if (completeTasksError) {
    return NextResponse.json(
      { error: "Borramos mensajes, pero no pudimos cerrar tareas pendientes." },
      { status: 500 }
    );
  }

  const { error: updateLeadError } = await admin
    .from("crm_leads")
    .update({
      property_id: null,
      conversation_id: null,
      inquiry_id: null,
      customer_id: null,
      stage: "Nuevo",
      priority: "Media",
      score: 50,
      qualification_summary: "Conversacion reiniciada manualmente para pruebas.",
      ai_reply_draft: "",
      intent: null,
      desired_operation: null,
      desired_location: null,
      desired_timeline: null,
      budget: null,
      requirements_summary: null,
      last_customer_message: "",
      needs_response: false,
      next_follow_up_at: null,
      last_contacted_at: null,
      last_activity_at: new Date().toISOString(),
    })
    .eq("id", lead.id);

  if (updateLeadError) {
    return NextResponse.json(
      { error: "No pudimos reiniciar los datos del lead." },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}
