import { NextResponse } from "next/server";

import { isAutomationRequest } from "@/lib/automation-auth";
import { ensureLeadTask, recordCrmLeadMessage } from "@/lib/crm-automation";
import { sendEvolutionTextMessage } from "@/lib/evolution";
import { getCrmLeadById } from "@/lib/props-data";
import { createAdminClient } from "@/lib/supabase/admin";

function addHoursIso(hours: number) {
  return new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();
}

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!isAutomationRequest(request)) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const leadId = String(body?.leadId ?? "").trim();
  const reply = String(body?.reply ?? "").trim();
  const instanceName = String(body?.instanceName ?? "").trim();
  const rawPhone = String(body?.number ?? "").trim();

  if (!leadId || !reply || !instanceName || !rawPhone) {
    return NextResponse.json(
      { error: "Faltan datos para enviar la respuesta." },
      { status: 400 }
    );
  }

  const lead = await getCrmLeadById(leadId);

  if (!lead) {
    return NextResponse.json({ error: "No encontramos ese lead." }, { status: 404 });
  }

  const number = rawPhone.replace(/[^\d]/g, "");

  await sendEvolutionTextMessage({
    instanceName,
    number,
    text: reply,
  });

  await recordCrmLeadMessage({
    leadId: lead.id,
    agencyId: lead.agencyId,
    propertyId: lead.propertyId,
    content: reply,
    direction: "outgoing",
    senderRole: "assistant",
    metadata: {
      source: "whatsapp_ai_agent",
      instanceName,
    },
  });

  const admin = createAdminClient();
  await admin
    .from("crm_leads")
    .update({
      ai_reply_draft: reply,
      needs_response: false,
      last_contacted_at: new Date().toISOString(),
      next_follow_up_at: addHoursIso(24),
      last_activity_at: new Date().toISOString(),
    })
    .eq("id", lead.id);

  await ensureLeadTask({
    agencyId: lead.agencyId,
    leadId: lead.id,
    propertyId: lead.propertyId,
    title: `Revisar respuesta de ${lead.fullName}`,
    details: "Chequea si el cliente respondio y mueve la oportunidad a la siguiente etapa si corresponde.",
    dueAt: addHoursIso(24),
    taskType: "Seguimiento",
    priority: lead.priority,
    automationSource: "whatsapp_ai_agent",
  });

  return NextResponse.json({ ok: true });
}
