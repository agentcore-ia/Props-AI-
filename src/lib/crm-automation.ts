import "server-only";

import type { CurrentUserContext } from "@/lib/auth/current-user";
import type { Property } from "@/lib/mock-data";
import type {
  CrmLeadSummary,
  LeadPriority,
  LeadStage,
  TaskType,
  VisitStatus,
} from "@/lib/crm-types";
import { getEffectiveMessagingInstance } from "@/lib/agency-access";
import { ensureEvolutionInstance, sendEvolutionTextMessage } from "@/lib/evolution";
import { buildAutomaticFollowUpMessage } from "@/lib/crm-insights";
import { getOpenAIEnv } from "@/lib/openai-env";
import { createAdminClient } from "@/lib/supabase/admin";

type LeadAutomationInput = {
  agency: {
    id: string;
    name: string;
    slug: string;
    city?: string | null;
    messagingInstance?: string | null;
  };
  property?: Property | null;
  fullName: string;
  email?: string | null;
  phone?: string | null;
  source: string;
  message: string;
};

type LeadInsight = {
  stage: LeadStage;
  priority: LeadPriority;
  score: number;
  summary: string;
  replyDraft: string;
  intent: string | null;
  desiredOperation: string | null;
  desiredLocation: string | null;
  desiredTimeline: string | null;
  budget: string | null;
  requirementsSummary: string | null;
  nextFollowUpHours: number;
};

type LeadRow = {
  id: string;
  agency_id: string;
  property_id: string | null;
  conversation_id: string | null;
  inquiry_id: string | null;
  customer_id: string | null;
  full_name: string;
  email: string | null;
  phone: string | null;
  source: string;
  stage: LeadStage;
  priority: LeadPriority;
  score: number;
  qualification_summary: string;
  ai_reply_draft: string;
  intent: string | null;
  desired_operation: string | null;
  desired_location: string | null;
  desired_timeline: string | null;
  budget: string | null;
  requirements_summary: string | null;
  last_customer_message: string;
  needs_response: boolean;
  next_follow_up_at: string | null;
  last_contacted_at: string | null;
  last_activity_at: string;
  owner_user_id: string | null;
  created_at: string;
  updated_at: string;
};

function escapeJsonFence(value: string) {
  return value.replace(/```json|```/gi, "").trim();
}

function normalizePhone(phone: string | null | undefined) {
  const digits = String(phone ?? "").replace(/[^\d]/g, "");
  if (!digits) return "";
  return digits.startsWith("54") ? digits : `54${digits}`;
}

export function normalizeWhatsAppJid(phone: string | null | undefined) {
  const raw = String(phone ?? "").trim();
  if (!raw) return "";
  return normalizePhone(raw.replace(/@s\.whatsapp\.net$/i, ""));
}

function addHoursIso(hours: number) {
  return new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();
}

function inferLeadFallback(input: LeadAutomationInput): LeadInsight {
  const message = input.message.toLowerCase();
  const operation =
    message.includes("alquiler") || input.property?.operation === "Alquiler"
      ? "Alquiler"
      : message.includes("compra") || message.includes("venta")
        ? "Venta"
        : input.property?.operation ?? null;

  const urgent =
    /hoy|urgente|ya|esta semana|mañana|manana|visita/i.test(input.message) ||
    /disponible|cuando se puede ver/i.test(input.message);

  return {
    stage: urgent ? "Precalificado" : "Nuevo",
    priority: urgent ? "Alta" : "Media",
    score: urgent ? 78 : 58,
    summary: urgent
      ? "Lead con intención clara y pedido de respuesta rápida."
      : "Lead nuevo a calificar con presupuesto, zona y tiempos.",
    replyDraft: urgent
      ? `Hola ${input.fullName.split(" ")[0] || ""}, gracias por escribirnos por ${input.property?.title ?? "esta propiedad"}. Te confirmo que ya estamos revisando la disponibilidad y te propongo coordinar una visita o llamada para avanzar.`
      : `Hola ${input.fullName.split(" ")[0] || ""}, gracias por tu consulta. Para ayudarte mejor, ¿me compartís presupuesto estimado, zona buscada y para cuándo querés resolverlo?`,
    intent: urgent ? "Coordinar visita" : "Consulta general",
    desiredOperation: operation,
    desiredLocation: input.property?.location ?? null,
    desiredTimeline: urgent ? "Corto plazo" : null,
    budget: null,
    requirementsSummary: null,
    nextFollowUpHours: urgent ? 2 : 24,
  };
}

export async function analyzeLeadSignal(input: LeadAutomationInput): Promise<LeadInsight> {
  const fallback = inferLeadFallback(input);
  const openAI = getOpenAIEnv();

  if (!openAI.configured) {
    return fallback;
  }

  const propertyContext = input.property
    ? `Propiedad consultada: ${input.property.title} | ${input.property.operation} | ${input.property.status} | ${input.property.location} | direccion: ${input.property.exactAddress} | precio: ${input.property.price} ${input.property.currency} | requisitos: ${input.property.requirements || "sin requisitos"} | mascotas: ${input.property.petsPolicy || "consultar"}`
    : "No hay propiedad puntual asociada a esta consulta.";

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
          content: [
            {
              type: "input_text",
              text:
                "Sos el motor de pre-calificacion de Props para inmobiliarias argentinas. Lee consultas de clientes y devuelve solo JSON valido con las claves stage, priority, score, summary, replyDraft, intent, desiredOperation, desiredLocation, desiredTimeline, budget, requirementsSummary y nextFollowUpHours. stage solo puede ser Nuevo, Precalificado, Visita, Seguimiento, Propuesta, Cerrado o Descartado. priority solo puede ser Alta, Media o Baja. score debe ir de 0 a 100. replyDraft debe ser una respuesta breve de WhatsApp, comercial y concreta. No inventes datos no mencionados: usa null si faltan.",
            },
          ],
        },
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text: `Inmobiliaria: ${input.agency.name} (${input.agency.city ?? "sin ciudad"}). Fuente: ${input.source}. Cliente: ${input.fullName}. Email: ${input.email ?? "sin email"}. Telefono: ${input.phone ?? "sin telefono"}.\n${propertyContext}\n\nConsulta del cliente:\n${input.message}`,
            },
          ],
        },
      ],
    }),
  });

  if (!response.ok) {
    return fallback;
  }

  const payload = (await response.json()) as { output_text?: string };
  const normalized = escapeJsonFence(payload.output_text ?? "");

  try {
    const parsed = JSON.parse(normalized) as Partial<LeadInsight>;
    return {
      stage: parsed.stage ?? fallback.stage,
      priority: parsed.priority ?? fallback.priority,
      score: Math.max(0, Math.min(100, Number(parsed.score ?? fallback.score))),
      summary: parsed.summary?.trim() || fallback.summary,
      replyDraft: parsed.replyDraft?.trim() || fallback.replyDraft,
      intent: parsed.intent?.trim() || fallback.intent,
      desiredOperation: parsed.desiredOperation?.trim() || fallback.desiredOperation,
      desiredLocation: parsed.desiredLocation?.trim() || fallback.desiredLocation,
      desiredTimeline: parsed.desiredTimeline?.trim() || fallback.desiredTimeline,
      budget: parsed.budget?.trim() || fallback.budget,
      requirementsSummary:
        parsed.requirementsSummary?.trim() || fallback.requirementsSummary,
      nextFollowUpHours: Number(parsed.nextFollowUpHours ?? fallback.nextFollowUpHours) || fallback.nextFollowUpHours,
    };
  } catch {
    return fallback;
  }
}

async function findExistingLead(params: {
  agencyId: string;
  conversationId?: string | null;
  customerId?: string | null;
  email?: string | null;
  phone?: string | null;
  propertyId?: string | null;
}) {
  const admin = createAdminClient();

  if (params.conversationId) {
    const { data } = await admin
      .from("crm_leads")
      .select("*")
      .eq("conversation_id", params.conversationId)
      .maybeSingle();
    if (data) return data as LeadRow;
  }

  let query = admin.from("crm_leads").select("*").eq("agency_id", params.agencyId);
  if (params.propertyId) query = query.eq("property_id", params.propertyId);

  if (params.customerId) {
    const { data } = await query
      .eq("customer_id", params.customerId)
      .order("last_activity_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (data) return data as LeadRow;
  }

  if (params.phone) {
    const { data } = await query
      .eq("phone", params.phone)
      .order("last_activity_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (data) return data as LeadRow;
  }

  if (params.email) {
    const { data } = await query
      .eq("email", params.email)
      .order("last_activity_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (data) return data as LeadRow;
  }

  return null;
}

export async function ensureLeadTask(input: {
  agencyId: string;
  leadId: string;
  propertyId?: string | null;
  title: string;
  details: string;
  dueAt: string;
  taskType: TaskType;
  priority: LeadPriority;
  automationSource: string;
}) {
  const admin = createAdminClient();
  const { data: existing } = await admin
    .from("employee_tasks")
    .select("id")
    .eq("lead_id", input.leadId)
    .eq("task_type", input.taskType)
    .eq("status", "Pendiente")
    .limit(1)
    .maybeSingle();

  if (existing) {
    await admin
      .from("employee_tasks")
      .update({
        title: input.title,
        details: input.details,
        due_at: input.dueAt,
        priority: input.priority,
        automation_source: input.automationSource,
      })
      .eq("id", existing.id);
    return existing.id as string;
  }

  const { data, error } = await admin
    .from("employee_tasks")
    .insert({
      agency_id: input.agencyId,
      lead_id: input.leadId,
      property_id: input.propertyId ?? null,
      title: input.title,
      details: input.details,
      due_at: input.dueAt,
      task_type: input.taskType,
      priority: input.priority,
      automation_source: input.automationSource,
    })
    .select("id")
    .single();

  if (error) throw error;
  return data.id as string;
}

export async function recordCrmLeadMessage(input: {
  leadId: string;
  agencyId: string;
  propertyId?: string | null;
  channel?: "whatsapp" | "web" | "instagram" | "crm";
  content: string;
  direction: "incoming" | "outgoing";
  senderRole: "customer" | "assistant" | "agent" | "system";
  waMessageId?: string | null;
  metadata?: Record<string, unknown>;
}) {
  const admin = createAdminClient();
  const content = String(input.content ?? "").trim();

  if (!content) {
    return null;
  }

  if (input.waMessageId) {
    const { data: existing } = await admin
      .from("crm_lead_messages")
      .select("id")
      .eq("wa_message_id", input.waMessageId)
      .maybeSingle();

    if (existing?.id) {
      return existing.id as string;
    }
  }

  const { data, error } = await admin
    .from("crm_lead_messages")
    .insert({
      lead_id: input.leadId,
      agency_id: input.agencyId,
      property_id: input.propertyId ?? null,
      channel: input.channel ?? "whatsapp",
      direction: input.direction,
      sender_role: input.senderRole,
      content,
      wa_message_id: input.waMessageId ?? null,
      metadata: input.metadata ?? {},
    })
    .select("id")
    .single();

  if (error) {
    throw error;
  }

  return data.id as string;
}

export async function upsertLeadFromSignal(input: {
  agency: LeadAutomationInput["agency"];
  property?: Property | null;
  customerId?: string | null;
  conversationId?: string | null;
  inquiryId?: string | null;
  fullName: string;
  email?: string | null;
  phone?: string | null;
  source: string;
  message: string;
}) {
  const admin = createAdminClient();
  const insight = await analyzeLeadSignal({
    agency: input.agency,
    property: input.property,
    fullName: input.fullName,
    email: input.email ?? null,
    phone: input.phone ?? null,
    source: input.source,
    message: input.message,
  });

  const existing = await findExistingLead({
    agencyId: input.agency.id,
    conversationId: input.conversationId,
    customerId: input.customerId,
    email: input.email ?? null,
    phone: input.phone ?? null,
    propertyId: input.property?.id ?? null,
  });

  const payload = {
    agency_id: input.agency.id,
    property_id: input.property?.id ?? existing?.property_id ?? null,
    conversation_id: input.conversationId ?? existing?.conversation_id ?? null,
    inquiry_id: input.inquiryId ?? existing?.inquiry_id ?? null,
    customer_id: input.customerId ?? existing?.customer_id ?? null,
    full_name: input.fullName,
    email: input.email ?? existing?.email ?? null,
    phone: input.phone ?? existing?.phone ?? null,
    source: input.source,
    stage: insight.stage,
    priority: insight.priority,
    score: insight.score,
    qualification_summary: insight.summary,
    ai_reply_draft: insight.replyDraft,
    intent: insight.intent,
    desired_operation: insight.desiredOperation,
    desired_location: insight.desiredLocation,
    desired_timeline: insight.desiredTimeline,
    budget: insight.budget,
    requirements_summary: insight.requirementsSummary,
    last_customer_message: input.message,
    needs_response: true,
    next_follow_up_at: addHoursIso(insight.nextFollowUpHours),
    last_activity_at: new Date().toISOString(),
  };

  const query = existing
    ? admin.from("crm_leads").update(payload).eq("id", existing.id)
    : admin.from("crm_leads").insert(payload);

  const { data, error } = await query.select("*").single();
  if (error) throw error;

  const lead = data as LeadRow;

  await ensureLeadTask({
    agencyId: input.agency.id,
    leadId: lead.id,
    propertyId: input.property?.id ?? null,
    title: input.property
      ? `Responder consulta por ${input.property.title}`
      : `Responder consulta nueva de ${input.fullName}`,
    details: insight.summary,
    dueAt: addHoursIso(Math.min(insight.nextFollowUpHours, 2)),
    taskType: "Responder",
    priority: insight.priority,
    automationSource: input.source,
  });

  return { lead, insight };
}

export async function scheduleLeadVisit(input: {
  agencyId: string;
  leadId: string;
  propertyId?: string | null;
  scheduledFor: string;
  notes?: string | null;
  createdBy?: string | null;
}) {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("visit_appointments")
    .insert({
      agency_id: input.agencyId,
      lead_id: input.leadId,
      property_id: input.propertyId ?? null,
      scheduled_for: input.scheduledFor,
      notes: input.notes ?? "",
      created_by: input.createdBy ?? null,
    })
    .select("id")
    .single();

  if (error) throw error;

  await admin
    .from("crm_leads")
    .update({
      stage: "Visita",
      next_follow_up_at: input.scheduledFor,
      last_activity_at: new Date().toISOString(),
    })
    .eq("id", input.leadId);

  await ensureLeadTask({
    agencyId: input.agencyId,
    leadId: input.leadId,
    propertyId: input.propertyId ?? null,
    title: "Confirmar visita con el cliente",
    details: "Recordar horario, direccion y disponibilidad de la propiedad.",
    dueAt: new Date(new Date(input.scheduledFor).getTime() - 2 * 60 * 60 * 1000).toISOString(),
    taskType: "Visita",
    priority: "Alta",
    automationSource: "visit_schedule",
  });

  return data.id as string;
}

export async function markTaskDone(taskId: string) {
  const admin = createAdminClient();
  const { error } = await admin
    .from("employee_tasks")
    .update({
      status: "Hecha",
      completed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", taskId);

  if (error) throw error;
}

export async function updateLeadStage(leadId: string, stage: LeadStage) {
  const admin = createAdminClient();
  const updates: Record<string, unknown> = {
    stage,
    updated_at: new Date().toISOString(),
    last_activity_at: new Date().toISOString(),
  };

  if (stage === "Cerrado" || stage === "Descartado") {
    updates.needs_response = false;
  }

  const { error } = await admin.from("crm_leads").update(updates).eq("id", leadId);
  if (error) throw error;
}

export async function generateLeadReply(input: {
  lead: CrmLeadSummary;
  property?: Property | null;
  customPrompt?: string | null;
}) {
  const openAI = getOpenAIEnv();
  if (!openAI.configured) {
    return (
      input.lead.aiReplyDraft ||
      `Hola ${input.lead.fullName.split(" ")[0]}, gracias por escribirnos. Si te parece, avanzamos con disponibilidad, requisitos y proximo paso para esta propiedad.`
    );
  }

  const context = [
    `Lead: ${input.lead.fullName}.`,
    `Etapa: ${input.lead.stage}. Prioridad: ${input.lead.priority}. Score: ${input.lead.score}.`,
    `Resumen: ${input.lead.qualificationSummary}.`,
    `Ultimo mensaje: ${input.lead.lastCustomerMessage}.`,
    input.lead.requirementsSummary ? `Necesidades: ${input.lead.requirementsSummary}.` : "",
    input.property
      ? `Propiedad: ${input.property.title} | ${input.property.operation} | ${input.property.status} | ${input.property.location} | precio ${input.property.price} ${input.property.currency} | requisitos ${input.property.requirements || "sin requisitos"} | mascotas ${input.property.petsPolicy || "consultar"}.`
      : "",
    input.customPrompt ? `Instruccion extra: ${input.customPrompt}` : "",
  ]
    .filter(Boolean)
    .join("\n");

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
          content: [
            {
              type: "input_text",
              text:
                "Sos un asistente comercial de inmobiliaria. Escribe respuestas de WhatsApp concretas, empaticas y orientadas a proximo paso. No uses tono robotico ni menciones que sos IA. No inventes disponibilidad ni condiciones.",
            },
          ],
        },
        {
          role: "user",
          content: [{ type: "input_text", text: context }],
        },
      ],
    }),
  });

  if (!response.ok) {
    return input.lead.aiReplyDraft;
  }

  const payload = (await response.json()) as { output_text?: string };
  return payload.output_text?.trim() || input.lead.aiReplyDraft;
}

export async function sendLeadWhatsApp(input: {
  lead: CrmLeadSummary;
  agencyMessagingInstance: string;
  property?: Property | null;
  customPrompt?: string | null;
  directText?: string | null;
}) {
  const text =
    String(input.directText ?? "").trim() ||
    (input.lead.stage === "Visita" || input.lead.stage === "Seguimiento"
      ? buildAutomaticFollowUpMessage({ lead: input.lead, property: input.property ?? null })
      : "") ||
    (await generateLeadReply({
      lead: input.lead,
      property: input.property,
      customPrompt: input.customPrompt,
    }));

  const normalizedPhone = normalizePhone(input.lead.phone);
  if (!normalizedPhone) {
    throw new Error("Este lead no tiene WhatsApp cargado.");
  }

  await sendEvolutionTextMessage({
    instanceName: input.agencyMessagingInstance,
    number: normalizedPhone,
    text,
  });

  const admin = createAdminClient();
  await admin
    .from("crm_leads")
    .update({
      ai_reply_draft: text,
      needs_response: false,
      last_contacted_at: new Date().toISOString(),
      next_follow_up_at: addHoursIso(48),
      last_activity_at: new Date().toISOString(),
    })
    .eq("id", input.lead.id);

  await recordCrmLeadMessage({
    leadId: input.lead.id,
    agencyId: input.lead.agencyId,
    propertyId: input.lead.propertyId,
    content: text,
    direction: "outgoing",
    senderRole: "agent",
    metadata: {
      source: "crm_manual",
      propertyTitle: input.property?.title ?? input.lead.propertyTitle,
    },
  });

  await ensureLeadTask({
    agencyId: input.lead.agencyId,
    leadId: input.lead.id,
    propertyId: input.lead.propertyId,
    title: `Retomar contacto con ${input.lead.fullName}`,
    details: "Ver si respondio al ultimo mensaje y mover la oportunidad de etapa si corresponde.",
    dueAt: addHoursIso(48),
    taskType: "Seguimiento",
    priority: input.lead.priority,
    automationSource: "whatsapp_followup",
  });

  return text;
}

export async function registerVisitOutcome(input: {
  visitId: string;
  leadId: string;
  agencyId: string;
  propertyId?: string | null;
  status: VisitStatus;
  outcomeSummary: string;
  objections: string;
  interestLevel: LeadPriority;
  nextAction: string;
}) {
  const admin = createAdminClient();

  const { error: visitError } = await admin
    .from("visit_appointments")
    .update({
      status: input.status,
      notes: [input.outcomeSummary, input.objections ? `Objeciones: ${input.objections}` : "", input.nextAction ? `Siguiente paso: ${input.nextAction}` : ""]
        .filter(Boolean)
        .join("\n"),
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.visitId);

  if (visitError) throw visitError;

  const nextStage: LeadStage =
    input.status === "Realizada"
      ? "Seguimiento"
      : input.status === "Confirmada"
        ? "Visita"
        : input.status === "Cancelada"
          ? "Seguimiento"
          : "Visita";

  const { error: leadError } = await admin
    .from("crm_leads")
    .update({
      stage: nextStage,
      priority: input.interestLevel,
      qualification_summary: input.outcomeSummary,
      requirements_summary: input.objections || null,
      last_activity_at: new Date().toISOString(),
      next_follow_up_at:
        input.nextAction && input.status === "Realizada"
          ? addHoursIso(input.interestLevel === "Alta" ? 4 : 24)
          : null,
    })
    .eq("id", input.leadId);

  if (leadError) throw leadError;

  if (input.nextAction.trim()) {
    await ensureLeadTask({
      agencyId: input.agencyId,
      leadId: input.leadId,
      propertyId: input.propertyId ?? null,
      title: "Seguimiento post-visita",
      details: input.nextAction,
      dueAt: addHoursIso(input.interestLevel === "Alta" ? 4 : 24),
      taskType: "Seguimiento",
      priority: input.interestLevel,
      automationSource: "post_visit",
    });
  }
}

export async function runAutomaticLeadFollowUps(agencyIds?: string[]) {
  const admin = createAdminClient();
  let query = admin
    .from("crm_leads")
    .select("*, agencies!inner(slug, name, city, messaging_instance), properties(*)")
    .eq("needs_response", true)
    .not("phone", "is", null)
    .lte("next_follow_up_at", new Date().toISOString())
    .in("stage", ["Nuevo", "Precalificado", "Seguimiento", "Visita"]);

  if (agencyIds?.length) {
    query = query.in("agency_id", agencyIds);
  }

  const { data, error } = await query.limit(25);
  if (error) throw error;

  const results: Array<Record<string, unknown>> = [];

  for (const row of (data ?? []) as Array<LeadRow & { agencies: { slug: string; name: string; city: string; messaging_instance: string } | { slug: string; name: string; city: string; messaging_instance: string }[] | null; properties: Record<string, unknown> | Record<string, unknown>[] | null }>) {
    const agency = Array.isArray(row.agencies) ? row.agencies[0] : row.agencies;
    const property = Array.isArray(row.properties) ? row.properties[0] : row.properties;

    try {
      const instanceName = getEffectiveMessagingInstance({
        slug: agency?.slug ?? "",
        messaging_instance: agency?.messaging_instance ?? "",
      });
      await ensureEvolutionInstance(instanceName);

      await sendLeadWhatsApp({
        lead: {
          id: row.id,
          agencyId: row.agency_id,
          agencySlug: agency?.slug ?? "",
          agencyName: agency?.name ?? "",
          propertyId: row.property_id,
          propertyTitle: String((property as { title?: string } | null)?.title ?? "") || null,
          propertyLocation: String((property as { location?: string } | null)?.location ?? "") || null,
          propertyPrice: Number((property as { price?: number } | null)?.price ?? 0) || null,
          propertyCurrency: ((property as { currency?: "USD" | "ARS" } | null)?.currency ?? null),
          propertyOperation: ((property as { operation?: "Venta" | "Alquiler" } | null)?.operation ?? null),
          propertyStatus: ((property as { status?: "Disponible" | "Reservada" | "Vendida" | "Alquilada" } | null)?.status ?? null),
          customerId: row.customer_id,
          conversationId: row.conversation_id,
          inquiryId: row.inquiry_id,
          fullName: row.full_name,
          email: row.email,
          phone: row.phone,
          source: row.source,
          stage: row.stage,
          priority: row.priority,
          score: row.score,
          qualificationSummary: row.qualification_summary,
          aiReplyDraft: row.ai_reply_draft,
          intent: row.intent,
          desiredOperation: row.desired_operation,
          desiredLocation: row.desired_location,
          desiredTimeline: row.desired_timeline,
          budget: row.budget,
          requirementsSummary: row.requirements_summary,
          lastCustomerMessage: row.last_customer_message,
          needsResponse: row.needs_response,
          nextFollowUpAt: row.next_follow_up_at,
          lastContactedAt: row.last_contacted_at,
          lastActivityAt: row.last_activity_at,
          ownerUserId: row.owner_user_id,
          createdAt: row.created_at,
          updatedAt: row.updated_at,
        },
        agencyMessagingInstance: instanceName,
      });

      results.push({ leadId: row.id, status: "sent" });
    } catch (error) {
      results.push({
        leadId: row.id,
        status: "error",
        error: error instanceof Error ? error.message : "No se pudo enviar el seguimiento.",
      });
    }
  }

  return {
    ok: true,
    processed: results.length,
    results,
  };
}

export async function runVisitReminders(agencyIds?: string[]) {
  const admin = createAdminClient();
  const start = new Date().toISOString();
  const end = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  let query = admin
    .from("visit_appointments")
    .select("id, scheduled_for, status, reminder_sent_at, crm_leads!inner(full_name, phone), properties(title), agency_id, agencies!inner(slug, messaging_instance)")
    .in("status", ["Programada", "Confirmada"])
    .is("reminder_sent_at", null)
    .gte("scheduled_for", start)
    .lte("scheduled_for", end);

  if (agencyIds?.length) {
    query = query.in("agency_id", agencyIds);
  }

  const { data, error } = await query.limit(25);
  if (error) throw error;

  const results: Array<Record<string, unknown>> = [];

  for (const visit of (data ?? []) as Array<{
    id: string;
    scheduled_for: string;
    status: VisitStatus;
    reminder_sent_at: string | null;
    crm_leads: { full_name: string; phone: string | null } | { full_name: string; phone: string | null }[];
    properties: { title: string } | { title: string }[] | null;
    agencies: { slug: string; messaging_instance: string } | { slug: string; messaging_instance: string }[] | null;
  }>) {
    const lead = Array.isArray(visit.crm_leads) ? visit.crm_leads[0] : visit.crm_leads;
    const property = Array.isArray(visit.properties) ? visit.properties[0] : visit.properties;
    const agency = Array.isArray(visit.agencies) ? visit.agencies[0] : visit.agencies;
    const phone = normalizePhone(lead?.phone);

    if (!phone) {
      results.push({ visitId: visit.id, status: "skipped", reason: "missing-phone" });
      continue;
    }

    try {
      const instanceName = getEffectiveMessagingInstance({
        slug: agency?.slug ?? "",
        messaging_instance: agency?.messaging_instance ?? "",
      });
      await ensureEvolutionInstance(instanceName);

      await sendEvolutionTextMessage({
        instanceName,
        number: phone,
        text: `Hola ${lead?.full_name ?? ""}, te recordamos la visita de ${property?.title ?? "la propiedad"} programada para ${new Date(visit.scheduled_for).toLocaleString("es-AR")}. Si necesitas reprogramar, responde a este mensaje.`,
      });

      await admin
        .from("visit_appointments")
        .update({ reminder_sent_at: new Date().toISOString() })
        .eq("id", visit.id);

      results.push({ visitId: visit.id, status: "sent" });
    } catch (error) {
      results.push({
        visitId: visit.id,
        status: "error",
        error: error instanceof Error ? error.message : "No se pudo enviar el recordatorio.",
      });
    }
  }

  return {
    ok: true,
    processed: results.length,
    results,
  };
}

export function getAgencyScopeFromUser(currentUser: CurrentUserContext) {
  if (currentUser.profile.role === "superadmin") {
    return undefined;
  }

  return currentUser.profile.agency_slug
    ? { agencySlug: currentUser.profile.agency_slug }
    : undefined;
}
