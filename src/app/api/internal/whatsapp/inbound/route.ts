import { NextResponse } from "next/server";

import { isAutomationRequest } from "@/lib/automation-auth";
import {
  buildClientMemoryContext,
  findOwnerMemoryContext,
  findTenantRentalContext,
  rememberClientInteraction,
  type OwnerMemoryContext,
  type TenantRentalMemoryContext,
} from "@/lib/client-memory";
import type { CrmLeadMessageSummary, CrmLeadSummary } from "@/lib/crm-types";
import { recordCrmLeadMessage, upsertLeadFromSignal } from "@/lib/crm-automation";
import { sendEvolutionTextMessage } from "@/lib/evolution";
import { getOpenAIEnv } from "@/lib/openai-env";
import { buildShortPropertyUrl } from "@/lib/property-links";
import { getCrmLeadById, listCrmLeadMessages } from "@/lib/props-data";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  buildAgencyCatalogContext,
  buildWhatsappAgentInput,
  buildWhatsappSystemPrompt,
  resolveAgencyByMessagingInstance,
} from "@/lib/whatsapp-agent";

export const dynamic = "force-dynamic";

function readPath(value: unknown, path: string[]): unknown {
  let current = value;

  for (const key of path) {
    if (!current || typeof current !== "object") return undefined;
    current = (current as Record<string, unknown>)[key];
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

function normalizeTextForIntent(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function firstName(value: string) {
  return value.trim().split(/\s+/)[0] || "ahi";
}

function formatArs(value: number) {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDate(value: string | null | undefined) {
  if (!value) return "sin fecha";
  const [year, month, day] = value.slice(0, 10).split("-");
  if (!year || !month || !day) return value;
  return `${day}/${month}/${year}`;
}

function threadContains(messages: CrmLeadMessageSummary[], pattern: RegExp) {
  return messages.some((message) => pattern.test(normalizeTextForIntent(message.content)));
}

function isRentAmountQuestion(messageText: string) {
  const normalized = normalizeTextForIntent(messageText);
  return (
    /cuanto|valor|monto|importe|pagar|sale|debo/.test(normalized) &&
    /alquiler|mes|proximo|viene|contrato|deuda/.test(normalized)
  );
}

function isOwnerMoneyQuestion(messageText: string) {
  const normalized = normalizeTextForIntent(messageText);
  return (
    /liquidacion|liquidar|transferencia|transferir|deposito|pago|cobro|cobrar|me corresponde|cuanto/.test(normalized) &&
    /propietario|dueno|dueño|alquiler|liquidacion|transferencia|deposito|me corresponde/.test(normalized)
  );
}

function formatKnownContext(input: {
  lead: CrmLeadSummary;
  agencyName: string;
  recentMessages: CrmLeadMessageSummary[];
  rentalContext?: TenantRentalMemoryContext | null;
  ownerContext?: OwnerMemoryContext | null;
}) {
  const propertyLine = input.rentalContext
    ? `Tengo un contrato activo asociado a ${input.rentalContext.propertyTitle}${input.rentalContext.propertyLocation ? ` en ${input.rentalContext.propertyLocation}` : ""}.`
    : input.ownerContext
    ? `Tengo un propietario asociado a ${input.ownerContext.propertyTitle}${input.ownerContext.propertyLocation ? ` en ${input.ownerContext.propertyLocation}` : ""}.`
    : input.lead.propertyTitle
    ? `Estamos hablando de ${input.lead.propertyTitle}${input.lead.propertyLocation ? ` en ${input.lead.propertyLocation}` : ""}.`
    : "No tengo una propiedad puntual asociada con certeza en este chat.";
  const rentalLine = input.rentalContext
    ? `Alquiler actual: ${formatArs(input.rentalContext.currentRent)}. Ajuste: ${input.rentalContext.indexType} cada ${input.rentalContext.adjustmentFrequencyMonths} meses. Proximo ajuste: ${formatDate(input.rentalContext.nextAdjustmentDate)}.`
    : "";
  const ownerLine = input.ownerContext
    ? [
        `Propietario: ${input.ownerContext.ownerName}. Participacion: ${input.ownerContext.participationPercent}%. Alquiler base del contrato: ${formatArs(input.ownerContext.currentRent)}.`,
        input.ownerContext.latestSettlement
          ? `Ultima liquidacion: ${input.ownerContext.latestSettlement.settlementMonth} por ${formatArs(input.ownerContext.latestSettlement.ownerPayoutAmount)} (${input.ownerContext.latestSettlement.status}).`
          : "No veo una liquidacion reciente emitida.",
      ].join(" ")
    : "";
  const customerMessages = input.recentMessages
    .filter((message) => message.senderRole === "customer")
    .slice(-4)
    .map((message) => message.content.trim())
    .filter(Boolean);
  const historyLine = customerMessages.length
    ? `Lo ultimo que tengo registrado es: ${customerMessages.join(" / ")}.`
    : "Todavia no tengo muchos mensajes previos tuyos en este hilo.";

  return [propertyLine, rentalLine, ownerLine, `Estas hablando con ${input.agencyName}.`, historyLine]
    .filter(Boolean)
    .join(" ");
}

function buildContextualFallbackReply(input: {
  agencyName: string;
  lead: CrmLeadSummary;
  messageText: string;
  recentMessages: CrmLeadMessageSummary[];
  rentalContext?: TenantRentalMemoryContext | null;
  ownerContext?: OwnerMemoryContext | null;
  memoryContextText?: string | null;
}) {
  const normalized = normalizeTextForIntent(input.messageText);
  const name = firstName(input.lead.fullName);
  const context = formatKnownContext(input);
  const hasPaymentContext =
    /pago|pagar|pag[oe]|transfer|comprobante|alquiler|demora|deuda/.test(normalized) ||
    threadContains(input.recentMessages.slice(-6), /pago|pagar|pag[oe]|transfer|comprobante|alquiler|demora|deuda/);
  const hasOwnerContext =
    Boolean(input.ownerContext) &&
    (/liquidacion|liquidar|propietario|dueno|dueño|transfer|deposito|me corresponde|honorario|rendicion/.test(
      normalized
    ) ||
      threadContains(input.recentMessages.slice(-6), /liquidacion|propietario|transfer|deposito|me corresponde/));
  const hasVisitContext =
    /visita|visitar|ver la propiedad|horario|viernes|sabado|domingo|lunes|martes|miercoles|jueves|tarde|manana/.test(
      normalized
    ) || threadContains(input.recentMessages.slice(-6), /visita|visitar|ver la propiedad|horario/);

  if (/contexto|que sabes|que tenes|que tienes|de que propiedad|cual propiedad|propiedad hablas|link/.test(normalized)) {
    if (/link/.test(normalized) && input.lead.propertyId && input.lead.agencySlug) {
      return `${context} Link de la ficha: ${buildShortPropertyUrl(input.lead.agencySlug, input.lead.propertyId)}`;
    }

    return context;
  }

  if (hasOwnerContext && input.ownerContext) {
    const settlement = input.ownerContext.latestSettlement;
    const transfer = input.ownerContext.latestTransfer;

    if (settlement) {
      const transferLine = transfer
        ? `La ultima transferencia figura ${transfer.status.toLowerCase()} por ${formatArs(transfer.amount)}${transfer.transferDate ? ` el ${formatDate(transfer.transferDate)}` : ""}.`
        : "No veo una transferencia reciente asociada todavia.";

      return `${name}, para ${input.ownerContext.propertyTitle} veo tu ultima liquidacion de ${settlement.settlementMonth} por ${formatArs(settlement.ownerPayoutAmount)}, estado ${settlement.status}. ${transferLine}`;
    }

    return `${name}, veo que sos propietario/a de ${input.ownerContext.propertyTitle} con participacion ${input.ownerContext.participationPercent}%. Todavia no encuentro una liquidacion emitida reciente; ${input.agencyName} te confirma el detalle cuando cierre cobranza y gastos.`;
  }

  if (hasPaymentContext) {
    if (
      input.rentalContext &&
      /cuanto|valor|monto|importe|pagar|alquiler|mes que viene|proximo mes|proximo/.test(normalized)
    ) {
      const adjustmentLine = input.rentalContext.nextAdjustmentDate
        ? `El proximo ajuste figura para el ${formatDate(input.rentalContext.nextAdjustmentDate)} por ${input.rentalContext.indexType}.`
        : "No veo una fecha de ajuste cargada.";

      return `${name}, tu alquiler actual registrado para ${input.rentalContext.propertyTitle} es ${formatArs(input.rentalContext.currentRent)}. ${adjustmentLine} Si el mes que viene cae antes del ajuste, el importe base es ese mismo monto; si coincide con el ajuste, ${input.agencyName} lo recalcula con el indice oficial y te avisa.`;
    }

    if (/comprobante|transfer/.test(normalized)) {
      return `Gracias, ${name}. Cuando tengas el comprobante, mandalo por aca y ${input.agencyName} lo registra en tu cuenta.`;
    }

    return `Gracias, ${name}. Dejo asentado que vas a pagar el alquiler. Cuando hagas la transferencia, mandanos el comprobante por aca para registrarlo.`;
  }

  if (hasVisitContext) {
    if (/nombre|telefono|celular|numero|datos/.test(normalized)) {
      return `Gracias, ${name}. Ya queda registrado para que ${input.agencyName} te contacte y cierre la visita.`;
    }

    return `Perfecto, ${name}. Te tomo esa disponibilidad para coordinar la visita. Si todavia no lo pasaste, enviame nombre y celular para dejarlo registrado.`;
  }

  if (/^hola|buenas|buen dia|buenas tardes|buenas noches/.test(normalized)) {
    return `Hola ${name}, te leo. Decime si es por una propiedad, una visita o un tema de alquiler y te ayudo con eso.`;
  }

  return `${name}, te leo. Para no mezclar temas: queres consultar por una propiedad, coordinar una visita o avisar algo de un alquiler?`;
}

function extractOpenAIResponseText(payload: unknown) {
  const outputText = readPath(payload, ["output_text"]);
  if (typeof outputText === "string" && outputText.trim()) {
    return outputText.trim();
  }

  const output = readPath(payload, ["output"]);
  if (!Array.isArray(output)) {
    return "";
  }

  return output
    .flatMap((item) => {
      if (!item || typeof item !== "object") return [];
      const content = (item as { content?: unknown }).content;
      return Array.isArray(content) ? content : [];
    })
    .map((content) => {
      if (!content || typeof content !== "object") return "";
      const text = (content as { text?: unknown }).text;
      return typeof text === "string" ? text : "";
    })
    .join("\n")
    .trim();
}

async function generateWhatsappReply(input: {
  agency: Awaited<ReturnType<typeof resolveAgencyByMessagingInstance>>;
  leadId: string;
  messageText: string;
  fallback: string;
  rentalContext?: TenantRentalMemoryContext | null;
  ownerContext?: OwnerMemoryContext | null;
  memoryContextText?: string | null;
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
  const contextualFallback = buildContextualFallbackReply({
    agencyName: input.agency?.name ?? lead.agencyName,
    lead,
    messageText: input.messageText,
    recentMessages,
    rentalContext: input.rentalContext,
    ownerContext: input.ownerContext,
    memoryContextText: input.memoryContextText,
  });
  const systemPrompt = [
    buildWhatsappSystemPrompt({
      agency: input.agency ?? {
        id: lead.agencyId,
        slug: lead.agencySlug,
        name: lead.agencyName,
        city: lead.desiredLocation ?? "",
        email: "",
        phone: "",
        tagline: "",
        messagingInstance: "",
        whatsappAiEnabled: true,
      },
      lead,
      selectedProperty: catalog.selectedProperty,
      catalogSummary: catalog.catalogSummary,
      recentMessages,
    }),
    "Memoria persistente Props:",
    input.memoryContextText ?? "Sin memoria persistente previa.",
    input.rentalContext
      ? [
          "Contrato operativo detectado por telefono:",
          `Inquilino: ${input.rentalContext.tenantName}.`,
          `Propiedad alquilada: ${input.rentalContext.propertyTitle} | ${input.rentalContext.propertyLocation} | ${input.rentalContext.exactAddress || "sin direccion exacta"}.`,
          `Alquiler actual registrado: ${formatArs(input.rentalContext.currentRent)}.`,
          `Indice: ${input.rentalContext.indexType}. Frecuencia: cada ${input.rentalContext.adjustmentFrequencyMonths} meses.`,
          `Inicio: ${formatDate(input.rentalContext.contractStartDate)}. Ultimo ajuste: ${formatDate(input.rentalContext.lastAdjustmentDate)}. Proximo ajuste: ${formatDate(input.rentalContext.nextAdjustmentDate)}.`,
          `Punitorios: ${formatArs(input.rentalContext.lateFeeDailyAmount)} por dia despues de ${input.rentalContext.lateFeeGraceDays} dias de gracia.`,
          "Si pregunta por su alquiler, pago, deuda, comprobante, proximo mes o ajuste, responde como administracion con estos datos duros. No preguntes presupuesto ni zona.",
        ].join("\n")
      : "No hay contrato operativo detectado por telefono.",
    input.ownerContext
      ? [
          "Contexto operativo del propietario detectado por telefono:",
          `Propietario: ${input.ownerContext.ownerName}.`,
          `Propiedad administrada: ${input.ownerContext.propertyTitle} | ${input.ownerContext.propertyLocation} | ${input.ownerContext.exactAddress || "sin direccion exacta"}.`,
          `Participacion: ${input.ownerContext.participationPercent}%. Alquiler base: ${formatArs(input.ownerContext.currentRent)}. Honorarios admin: ${input.ownerContext.managementFeePercent}%. Gastos mensuales propietario: ${formatArs(input.ownerContext.monthlyOwnerCosts)}.`,
          input.ownerContext.latestSettlement
            ? `Ultima liquidacion: ${input.ownerContext.latestSettlement.settlementMonth}, ${formatArs(input.ownerContext.latestSettlement.ownerPayoutAmount)}, estado ${input.ownerContext.latestSettlement.status}, pagada ${formatDate(input.ownerContext.latestSettlement.paidAt)}.`
            : "No hay liquidacion reciente detectada.",
          input.ownerContext.latestTransfer
            ? `Ultima transferencia: ${formatArs(input.ownerContext.latestTransfer.amount)}, estado ${input.ownerContext.latestTransfer.status}, fecha ${formatDate(input.ownerContext.latestTransfer.transferDate)}, destino ${input.ownerContext.latestTransfer.destinationLabel || "sin destino cargado"}.`
            : "No hay transferencia reciente detectada.",
          "Si pregunta por liquidacion, transferencia, pago al propietario o cuanto le corresponde, responde como administracion con estos datos duros. No lo trates como lead comprador/inquilino ni preguntes presupuesto o zona.",
        ].join("\n")
      : "No hay propietario operativo detectado por telefono.",
  ].join("\n\n");
  const agentInput = [
    buildWhatsappAgentInput({
      lead,
      messageText: input.messageText,
      selectedProperty: catalog.selectedProperty,
    }),
    input.rentalContext
      ? `El contacto coincide con un inquilino: contrato ${input.rentalContext.contractId}, propiedad ${input.rentalContext.propertyTitle}, alquiler actual ${formatArs(input.rentalContext.currentRent)}.`
      : "No se encontro contrato de alquiler asociado por telefono.",
    input.ownerContext
      ? `El contacto coincide con un propietario: contrato ${input.ownerContext.contractId}, propiedad ${input.ownerContext.propertyTitle}, participacion ${input.ownerContext.participationPercent}%, ultima liquidacion ${input.ownerContext.latestSettlement ? `${input.ownerContext.latestSettlement.settlementMonth} por ${formatArs(input.ownerContext.latestSettlement.ownerPayoutAmount)}` : "sin liquidacion reciente"}.`
      : "No se encontro propietario asociado por telefono.",
  ].join("\n");

  if (input.rentalContext && isRentAmountQuestion(input.messageText)) {
    return contextualFallback;
  }

  if (input.ownerContext && isOwnerMoneyQuestion(input.messageText)) {
    return contextualFallback;
  }

  if (!openAI.configured) {
    return contextualFallback;
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

  if (!response.ok) {
    const errorText = await response.text().catch(() => "");
    console.error("[whatsapp-inbound] openai reply failed", {
      leadId: lead.id,
      status: response.status,
      error: errorText.slice(0, 500),
    });
    return contextualFallback;
  }

  const payload = await response.json();
  return extractOpenAIResponseText(payload) || contextualFallback;
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

  const rentalContext = await findTenantRentalContext({
    agencyId: agency.id,
    phone: remoteJid,
    messageText,
  }).catch((error) => {
    console.error("[whatsapp-inbound] tenant rental context failed", {
      agencyId: agency.id,
      remoteJid,
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  });
  const ownerContext = await findOwnerMemoryContext({
    agencyId: agency.id,
    phone: remoteJid,
  }).catch((error) => {
    console.error("[whatsapp-inbound] owner context failed", {
      agencyId: agency.id,
      remoteJid,
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  });

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
    fullName: rentalContext?.tenantName ?? ownerContext?.ownerName ?? senderName,
    email: null,
    phone: remoteJid,
    source: "whatsapp_inbound",
    message: messageText,
  });

  if (rentalContext) {
    await createAdminClient()
      .from("crm_leads")
      .update({
        property_id: rentalContext.propertyId,
        full_name: rentalContext.tenantName,
        stage: "Seguimiento",
        priority: "Media",
        qualification_summary: `Inquilino con contrato activo en ${rentalContext.propertyTitle}.`,
        intent: "Gestion de alquiler",
        desired_operation: "Alquiler",
        desired_location: rentalContext.propertyLocation,
        needs_response: false,
        last_activity_at: new Date().toISOString(),
      })
      .eq("id", signal.lead.id);
  }

  if (!rentalContext && ownerContext) {
    await createAdminClient()
      .from("crm_leads")
      .update({
        property_id: ownerContext.propertyId,
        full_name: ownerContext.ownerName,
        email: ownerContext.ownerEmail,
        stage: "Seguimiento",
        priority: "Media",
        qualification_summary: `Propietario vinculado a ${ownerContext.propertyTitle}.`,
        intent: "Gestion de propietario",
        desired_operation: "Administracion",
        desired_location: ownerContext.propertyLocation,
        needs_response: false,
        last_activity_at: new Date().toISOString(),
      })
      .eq("id", signal.lead.id);
  }

  await recordCrmLeadMessage({
    leadId: signal.lead.id,
    agencyId: signal.lead.agency_id,
    propertyId: rentalContext?.propertyId ?? ownerContext?.propertyId ?? signal.lead.property_id,
    content: messageText,
    direction: "incoming",
    senderRole: "customer",
    waMessageId,
    metadata: {
      messageType,
      instanceName,
      remoteJid,
      source: "evolution_webhook",
      rentalContractId: rentalContext?.contractId ?? null,
      ownerContractId: ownerContext?.contractId ?? null,
      contractOwnerId: ownerContext?.contractOwnerId ?? null,
    },
  });

  await rememberClientInteraction({
    agencyId: agency.id,
    displayName: rentalContext?.tenantName ?? ownerContext?.ownerName ?? senderName,
    phone: remoteJid,
    email: ownerContext?.ownerEmail ?? null,
    leadId: signal.lead.id,
    propertyId: rentalContext?.propertyId ?? ownerContext?.propertyId ?? signal.lead.property_id,
    propertyTitle: rentalContext?.propertyTitle ?? ownerContext?.propertyTitle ?? null,
    contractId: rentalContext?.contractId ?? ownerContext?.contractId ?? null,
    sourceType: "whatsapp_inbound",
    sourceId: waMessageId,
    rentalContext,
    ownerContext,
    messages: [
      {
        direction: "incoming",
        role: "customer",
        content: messageText,
        metadata: {
          messageType,
          instanceName,
          remoteJid,
        },
      },
    ],
  }).catch((error) => {
    console.error("[whatsapp-inbound] memory write failed", {
      leadId: signal.lead.id,
      error: error instanceof Error ? error.message : String(error),
    });
  });

  const memoryContext = await buildClientMemoryContext({
    agencyId: agency.id,
    phone: remoteJid,
    leadId: signal.lead.id,
    rentalContext,
    ownerContext,
  }).catch((error) => {
    console.error("[whatsapp-inbound] memory context failed", {
      leadId: signal.lead.id,
      error: error instanceof Error ? error.message : String(error),
    });
    return { profile: null, contextText: null };
  });

  const latestLead = await getCrmLeadById(signal.lead.id);
  let aiReply: string | null = null;
  let aiError: string | null = null;

  if (agency.whatsappAiEnabled === false) {
    await createAdminClient()
      .from("crm_leads")
      .update({
        needs_response: true,
        ai_reply_draft: "IA automatica apagada: responder manualmente desde Mensajes.",
        last_activity_at: new Date().toISOString(),
      })
      .eq("id", signal.lead.id);

    return NextResponse.json({
      ok: true,
      ai_active: false,
      ai_sent: false,
      ai_disabled: true,
      leadId: signal.lead.id,
      agencySlug: agency.slug,
      agencyName: agency.name,
      propertyId: latestLead?.propertyId ?? null,
      propertyTitle: latestLead?.propertyTitle ?? null,
      customerName: latestLead?.fullName ?? signal.lead.full_name,
      normalizedPhone: remoteJid.split("@")[0],
    });
  }

  try {
    aiReply = await generateWhatsappReply({
      agency,
      leadId: signal.lead.id,
      messageText,
      fallback: signal.insight.replyDraft,
      rentalContext,
      ownerContext,
      memoryContextText: memoryContext.contextText,
    });

    await sendEvolutionTextMessage({
      instanceName,
      number: remoteJid,
      text: aiReply,
    });

    await recordCrmLeadMessage({
      leadId: signal.lead.id,
      agencyId: signal.lead.agency_id,
      propertyId: rentalContext?.propertyId ?? ownerContext?.propertyId ?? signal.lead.property_id,
      content: aiReply,
      direction: "outgoing",
      senderRole: "assistant",
      metadata: {
        messageType: "text",
        instanceName,
        remoteJid,
        source: "whatsapp_inbound_auto_reply",
        rentalContractId: rentalContext?.contractId ?? null,
        ownerContractId: ownerContext?.contractId ?? null,
        contractOwnerId: ownerContext?.contractOwnerId ?? null,
      },
    });

    await rememberClientInteraction({
      agencyId: agency.id,
      displayName: rentalContext?.tenantName ?? ownerContext?.ownerName ?? latestLead?.fullName ?? senderName,
      phone: remoteJid,
      email: ownerContext?.ownerEmail ?? null,
      leadId: signal.lead.id,
      propertyId: rentalContext?.propertyId ?? ownerContext?.propertyId ?? latestLead?.propertyId ?? signal.lead.property_id,
      propertyTitle: rentalContext?.propertyTitle ?? ownerContext?.propertyTitle ?? latestLead?.propertyTitle ?? null,
      contractId: rentalContext?.contractId ?? ownerContext?.contractId ?? null,
      sourceType: "whatsapp_inbound_auto_reply",
      sourceId: waMessageId,
      rentalContext,
      ownerContext,
      messages: [
        {
          direction: "outgoing",
          role: "assistant",
          content: aiReply,
          metadata: {
            instanceName,
            remoteJid,
          },
        },
      ],
    }).catch((error) => {
      console.error("[whatsapp-inbound] memory reply write failed", {
        leadId: signal.lead.id,
        error: error instanceof Error ? error.message : String(error),
      });
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
