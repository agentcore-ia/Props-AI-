import { NextResponse } from "next/server";

import { isAutomationRequest } from "@/lib/automation-auth";
import { recordCrmLeadMessage, upsertLeadFromSignal } from "@/lib/crm-automation";
import { sendEvolutionTextMessage } from "@/lib/evolution";
import { getOpenAIEnv } from "@/lib/openai-env";
import { getCrmLeadById, listCrmLeadMessages } from "@/lib/props-data";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  buildAgencyCatalogContext,
  buildWhatsappAgentInput,
  buildWhatsappSystemPrompt,
  resolveAgencyByMessagingInstance,
} from "@/lib/whatsapp-agent";

export const dynamic = "force-dynamic";

function readPath(value: unknown, path: string[]) {
  let current = value as Record<string, unknown> | null | undefined;

  for (const key of path) {
    if (!current || typeof current !== "object") return undefined;
    current = current[key] as Record<string, unknown> | null | undefined;
  }

  return current;
}

function firstString(...values: unknown[]) {
  for (const value of values) {
    const text = String(value ?? "").trim();
    if (text) return text;
  }

  return "";
}

function extractInboundPayload(body: unknown) {
  const instanceName = firstString(
    readPath(body, ["instanceName"]),
    readPath(body, ["instance"]),
    readPath(body, ["body", "instance"]),
    readPath(body, ["data", "instance"])
  );
  const remoteJid = firstString(
    readPath(body, ["remoteJid"]),
    readPath(body, ["body", "data", "key", "remoteJid"]),
    readPath(body, ["data", "key", "remoteJid"]),
    readPath(body, ["data", "remoteJid"])
  );
  const waMessageId = firstString(
    readPath(body, ["waMessageId"]),
    readPath(body, ["body", "data", "key", "id"]),
    readPath(body, ["data", "key", "id"]),
    readPath(body, ["data", "id"])
  ) || null;
  const senderName = firstString(
    readPath(body, ["senderName"]),
    readPath(body, ["body", "data", "pushName"]),
    readPath(body, ["data", "pushName"]),
    remoteJid.split("@")[0],
    "Cliente"
  );
  const messageType = firstString(
    readPath(body, ["messageType"]),
    readPath(body, ["body", "data", "messageType"]),
    readPath(body, ["data", "messageType"]),
    "text"
  );
  const messageText = firstString(
    readPath(body, ["messageText"]),
    readPath(body, ["text"]),
    readPath(body, ["body", "data", "message", "conversation"]),
    readPath(body, ["body", "data", "message", "extendedTextMessage", "text"]),
    readPath(body, ["body", "data", "message", "imageMessage", "caption"]),
    readPath(body, ["body", "data", "message", "videoMessage", "caption"]),
    readPath(body, ["body", "data", "message", "documentMessage", "caption"]),
    readPath(body, ["data", "message", "conversation"]),
    readPath(body, ["data", "message", "extendedTextMessage", "text"]),
    readPath(body, ["data", "message", "imageMessage", "caption"]),
    readPath(body, ["data", "message", "videoMessage", "caption"]),
    readPath(body, ["data", "message", "documentMessage", "caption"])
  );
  const fromMe = Boolean(
    readPath(body, ["fromMe"]) ??
      readPath(body, ["body", "data", "key", "fromMe"]) ??
      readPath(body, ["data", "key", "fromMe"])
  );

  return {
    instanceName,
    waMessageId,
    remoteJid,
    senderName,
    messageType,
    messageText,
    fromMe,
  };
}

function looksLikeEvolutionWebhook(body: unknown) {
  const payload = extractInboundPayload(body);
  return Boolean(payload.instanceName && payload.remoteJid && (payload.waMessageId || payload.messageText));
}

async function generateWhatsappReply(input: {
  agency: Awaited<ReturnType<typeof resolveAgencyByMessagingInstance>>;
  leadId: string;
  messageText: string;
  fallback: string;
}) {
  const openAI = getOpenAIEnv();
  const lead = await getCrmLeadById(input.leadId);

  if (!lead) return input.fallback;

  const catalog = await buildAgencyCatalogContext({
    agencySlug: lead.agencySlug,
    selectedPropertyId: lead.propertyId,
    messageText: input.messageText,
  });
  const recentMessages = await listCrmLeadMessages({ leadIds: [lead.id] });
  const systemPrompt = buildWhatsappSystemPrompt({
    agency: input.agency ?? {
      id: lead.agencyId,
      slug: lead.agencySlug,
      name: lead.agencyName,
      city: lead.desiredLocation ?? "",
      email: "",
      phone: "",
      tagline: "",
      messagingInstance: "",
    },
    lead,
    selectedProperty: catalog.selectedProperty,
    catalogSummary: catalog.catalogSummary,
    recentMessages,
  });
  const agentInput = buildWhatsappAgentInput({
    lead,
    messageText: input.messageText,
    selectedProperty: catalog.selectedProperty,
  });

  if (!openAI.configured) {
    return input.fallback;
  }

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${openAI.apiKey}`,
    },
    body: JSON.stringify({
      model: openAI.model,
      input: [
        {
          role: "system",
          content: [{ type: "input_text", text: systemPrompt }],
        },
        {
          role: "user",
          content: [{ type: "input_text", text: agentInput }],
        },
      ],
    }),
  });

  if (!response.ok) return input.fallback;

  const payload = (await response.json()) as { output_text?: string };
  return payload.output_text?.trim() || input.fallback;
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);

  if (!isAutomationRequest(request) && !looksLikeEvolutionWebhook(body)) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  const {
    instanceName,
    waMessageId,
    remoteJid,
    senderName,
    messageType,
    messageText,
    fromMe,
  } = extractInboundPayload(body);

  if (fromMe) {
    return NextResponse.json({ ok: true, ignored: true, reason: "from_me" });
  }

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
  let aiReply: string | null = null;
  let aiError: string | null = null;

  try {
    aiReply = await generateWhatsappReply({
      agency,
      leadId: signal.lead.id,
      messageText,
      fallback: signal.insight.replyDraft,
    });

    await sendEvolutionTextMessage({
      instanceName,
      number: remoteJid,
      text: aiReply,
    });

    await recordCrmLeadMessage({
      leadId: signal.lead.id,
      agencyId: signal.lead.agency_id,
      propertyId: signal.lead.property_id,
      content: aiReply,
      direction: "outgoing",
      senderRole: "assistant",
      metadata: {
        messageType: "text",
        instanceName,
        remoteJid,
        source: "whatsapp_inbound_auto_reply",
      },
    });

    await createAdminClient()
      .from("crm_leads")
      .update({
        ai_reply_draft: aiReply,
        needs_response: false,
        last_contacted_at: new Date().toISOString(),
        last_activity_at: new Date().toISOString(),
      })
      .eq("id", signal.lead.id);
  } catch (error) {
    aiError = error instanceof Error ? error.message : String(error);
    console.error("[whatsapp-inbound] automatic reply failed", {
      leadId: signal.lead.id,
      instanceName,
      remoteJid,
      error: aiError,
    });
  }

  return NextResponse.json({
    ok: true,
    ai_active: !aiReply,
    ai_sent: Boolean(aiReply),
    ai_error: aiError,
    leadId: signal.lead.id,
    agencySlug: agency.slug,
    agencyName: agency.name,
    propertyId: latestLead?.propertyId ?? null,
    propertyTitle: latestLead?.propertyTitle ?? null,
    customerName: latestLead?.fullName ?? signal.lead.full_name,
    normalizedPhone: remoteJid.split("@")[0],
  });
}
