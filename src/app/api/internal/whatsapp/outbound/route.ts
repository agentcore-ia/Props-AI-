import { NextResponse } from "next/server";

import { isAutomationRequest } from "@/lib/automation-auth";
import { ensureLeadTask, recordCrmLeadMessage } from "@/lib/crm-automation";
import { sendEvolutionMediaMessage, sendEvolutionTextMessage } from "@/lib/evolution";
import { getCrmLeadById, getPropertyBySlugAndId, listProperties } from "@/lib/props-data";
import { createAdminClient } from "@/lib/supabase/admin";
import { matchPropertyFromMessage } from "@/lib/whatsapp-agent";

function addHoursIso(hours: number) {
  return new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();
}

const PUBLIC_MARKETPLACE_URL =
  process.env.PUBLIC_MARKETPLACE_URL?.replace(/\/+$/, "") || "https://props.com.ar";

function wantsPropertyImages(text: string) {
  return /\b(foto|fotos|imagen|imagenes|ver\s+mas|como\s+es|muestrame|mostrame|manda(?:me)?\s+fotos?)\b/i.test(
    text
  );
}

function buildPublicPropertyUrl(tenantSlug: string, propertyId: string) {
  return `${PUBLIC_MARKETPLACE_URL}/propiedad/${tenantSlug}/${propertyId}`;
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
  const selectedPropertyId = String(body?.selectedPropertyId ?? "").trim();
  const selectedPropertyUrl = String(body?.selectedPropertyUrl ?? "").trim();

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
  const customerAskedForImages = wantsPropertyImages(lead.lastCustomerMessage || "");
  let property =
    (selectedPropertyId || lead.propertyId) && lead.agencySlug
      ? await getPropertyBySlugAndId(lead.agencySlug, selectedPropertyId || lead.propertyId || "")
      : null;

  if (!property && lead.agencySlug) {
    const agencyProperties = await listProperties({ tenantSlug: lead.agencySlug });
    property =
      matchPropertyFromMessage(agencyProperties, lead.lastCustomerMessage || "", null) ?? null;
  }

  const propertyUrl =
    selectedPropertyUrl ||
    (property && lead.agencySlug ? buildPublicPropertyUrl(lead.agencySlug, property.id) : "");
  const propertyImages = property?.images.filter(Boolean).slice(0, 3) ?? [];
  const replyWithLink =
    customerAskedForImages && propertyUrl && !reply.includes(propertyUrl)
      ? `${reply}\n\nPodes ver fotos y detalles aca: ${propertyUrl}`
      : reply;

  await sendEvolutionTextMessage({
    instanceName,
    number,
    text: replyWithLink,
  });

  await recordCrmLeadMessage({
    leadId: lead.id,
    agencyId: lead.agencyId,
    propertyId: property?.id ?? lead.propertyId,
    content: replyWithLink,
    direction: "outgoing",
    senderRole: "assistant",
    metadata: {
      source: "whatsapp_ai_agent",
      instanceName,
      propertyUrl: propertyUrl || null,
    },
  });

  if (customerAskedForImages && propertyImages.length > 0) {
    for (let index = 0; index < propertyImages.length; index += 1) {
      const imageUrl = propertyImages[index];
      await sendEvolutionMediaMessage({
        instanceName,
        number,
        mediaUrl: imageUrl,
        mediaType: "image",
        caption:
          index === 0 && property
            ? `${property.title}\n${property.location}\n${propertyUrl}`
            : property?.title ?? "",
      });

      await recordCrmLeadMessage({
        leadId: lead.id,
        agencyId: lead.agencyId,
        propertyId: property?.id ?? lead.propertyId,
        content: `[imagen] ${property?.title ?? "Propiedad"} ${index + 1}`,
        direction: "outgoing",
        senderRole: "assistant",
        metadata: {
          source: "whatsapp_ai_agent_media",
          instanceName,
          mediaType: "image",
          imageUrl,
          propertyUrl: propertyUrl || null,
        },
      });
    }
  }

  const admin = createAdminClient();
  await admin
    .from("crm_leads")
    .update({
      ai_reply_draft: replyWithLink,
      needs_response: false,
      last_contacted_at: new Date().toISOString(),
      next_follow_up_at: addHoursIso(24),
      last_activity_at: new Date().toISOString(),
    })
    .eq("id", lead.id);

  await ensureLeadTask({
    agencyId: lead.agencyId,
    leadId: lead.id,
    propertyId: property?.id ?? lead.propertyId,
    title: `Revisar respuesta de ${lead.fullName}`,
    details: "Chequea si el cliente respondio y mueve la oportunidad a la siguiente etapa si corresponde.",
    dueAt: addHoursIso(24),
    taskType: "Seguimiento",
    priority: lead.priority,
    automationSource: "whatsapp_ai_agent",
  });

  return NextResponse.json({ ok: true });
}
