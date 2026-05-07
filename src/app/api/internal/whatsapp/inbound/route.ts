import { NextResponse } from "next/server";

import { isAutomationRequest } from "@/lib/automation-auth";
import { recordCrmLeadMessage, upsertLeadFromSignal } from "@/lib/crm-automation";
import { getCrmLeadById, getPropertyBySlugAndId } from "@/lib/props-data";
import { createAdminClient } from "@/lib/supabase/admin";
import { resolveAgencyByMessagingInstance } from "@/lib/whatsapp-agent";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!isAutomationRequest(request)) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const instanceName = String(body?.instanceName ?? "").trim();
  const waMessageId = String(body?.waMessageId ?? "").trim() || null;
  const remoteJid = String(body?.remoteJid ?? "").trim();
  const senderName =
    String(body?.senderName ?? "").trim() || remoteJid.split("@")[0] || "Cliente";
  const messageType = String(body?.messageType ?? "").trim() || "text";
  const messageText = String(body?.messageText ?? "").trim();

  if (!instanceName || !remoteJid || !messageText) {
    return NextResponse.json(
      { error: "Faltan datos para procesar el mensaje entrante." },
      { status: 400 }
    );
  }

  const agency = await resolveAgencyByMessagingInstance(instanceName);

  if (!agency) {
    return NextResponse.json(
      { error: "No encontramos una inmobiliaria asociada a esta instancia." },
      { status: 404 }
    );
  }

  if (waMessageId) {
    const admin = createAdminClient();
    const { data: existingMessage } = await admin
      .from("crm_lead_messages")
      .select("id, lead_id")
      .eq("wa_message_id", waMessageId)
      .maybeSingle();

    if (existingMessage?.id) {
      return NextResponse.json({
        ok: true,
        duplicate: true,
        ai_active: false,
        leadId: existingMessage.lead_id,
        agencySlug: agency.slug,
        agencyName: agency.name,
      });
    }
  }

  const signal = await upsertLeadFromSignal({
    agency: {
      id: agency.id,
      name: agency.name,
      slug: agency.slug,
      city: agency.city,
      messagingInstance: agency.messagingInstance ?? null,
    },
    property: null,
    fullName: senderName,
    email: null,
    phone: remoteJid,
    source: "whatsapp_inbound",
    message: messageText,
  });

  await recordCrmLeadMessage({
    leadId: signal.lead.id,
    agencyId: signal.lead.agency_id,
    propertyId: signal.lead.property_id,
    content: messageText,
    direction: "incoming",
    senderRole: "customer",
    waMessageId,
    metadata: {
      messageType,
      instanceName,
      remoteJid,
      source: "evolution_webhook",
    },
  });

  const latestLead = await getCrmLeadById(signal.lead.id);
  const property =
    latestLead?.propertyId && latestLead.agencySlug
      ? await getPropertyBySlugAndId(latestLead.agencySlug, latestLead.propertyId)
      : null;

  return NextResponse.json({
    ok: true,
    ai_active: true,
    leadId: signal.lead.id,
    agencySlug: agency.slug,
    agencyName: agency.name,
    propertyId: property?.id ?? latestLead?.propertyId ?? null,
    propertyTitle: property?.title ?? latestLead?.propertyTitle ?? null,
    customerName: latestLead?.fullName ?? signal.lead.full_name,
    normalizedPhone: remoteJid.split("@")[0],
  });
}
