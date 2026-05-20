import "server-only";

import { getOpenAIEnv } from "@/lib/openai-env";
import { createAdminClient } from "@/lib/supabase/admin";

type MemoryDirection = "incoming" | "outgoing" | "internal";
type MemoryRole = "customer" | "assistant" | "agent" | "system";
type MemoryEntityType = "lead" | "tenant" | "owner" | "property" | "contract" | "conversation";

type MemoryProfileRow = {
  id: string;
  agency_id: string;
  display_name: string;
  normalized_phone: string | null;
  email: string | null;
  summary: string;
  facts: Record<string, unknown>;
  preferences: Record<string, unknown>;
  tags: string[];
  last_interaction_at: string;
};

type MemoryEventRow = {
  id: string;
  direction: MemoryDirection;
  role: MemoryRole;
  content: string;
  metadata: Record<string, unknown>;
  created_at: string;
};

type MemoryLinkRow = {
  entity_type: MemoryEntityType;
  entity_id: string;
  label: string;
  metadata: Record<string, unknown>;
};

export type TenantRentalMemoryContext = {
  contractId: string;
  propertyId: string;
  tenantName: string;
  tenantPhone: string;
  currentRent: number;
  currency: "ARS";
  indexType: "IPC" | "ICL";
  adjustmentFrequencyMonths: number;
  contractStartDate: string;
  nextAdjustmentDate: string;
  lastAdjustmentDate: string | null;
  lateFeeDailyAmount: number;
  lateFeeGraceDays: number;
  status: "Activo" | "Pausado" | "Finalizado";
  propertyTitle: string;
  propertyLocation: string;
  exactAddress: string;
};

export function normalizeMemoryPhone(phone: string | null | undefined) {
  const raw = String(phone ?? "")
    .trim()
    .replace(/@s\.whatsapp\.net$/i, "");
  const digits = raw.replace(/[^\d]/g, "");
  if (!digits) return "";
  return digits.startsWith("54") ? digits : `54${digits}`;
}

function normalizeEmail(email: string | null | undefined) {
  return String(email ?? "").trim().toLowerCase();
}

function compactText(value: string, maxLength = 900) {
  const text = value.replace(/\s+/g, " ").trim();
  return text.length > maxLength ? `${text.slice(0, maxLength - 1)}…` : text;
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

function detectTopics(content: string) {
  const normalized = content
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
  const topics = new Set<string>();

  if (/pago|pagar|pague|comprobante|transfer|alquiler|deuda|demora/.test(normalized)) {
    topics.add("alquiler/pagos");
  }
  if (/visita|visitar|horario|coordinar|ver la propiedad/.test(normalized)) {
    topics.add("visitas");
  }
  if (/mascota|perro|gato/.test(normalized)) {
    topics.add("mascotas");
  }
  if (/precio|valor|cuanto|presupuesto|importe/.test(normalized)) {
    topics.add("precio");
  }
  if (/subte|colectivo|ubicacion|direccion|zona|barrio/.test(normalized)) {
    topics.add("ubicacion");
  }
  if (/requisito|garantia|caucion|ingreso/.test(normalized)) {
    topics.add("requisitos");
  }

  return Array.from(topics);
}

function buildHeuristicSummary(input: {
  profile: MemoryProfileRow;
  events: MemoryEventRow[];
  links: MemoryLinkRow[];
  rentalContext?: TenantRentalMemoryContext | null;
}) {
  const lastCustomerMessages = input.events
    .filter((event) => event.role === "customer")
    .slice(0, 6)
    .map((event) => compactText(event.content, 180));
  const topics = Array.from(
    new Set(input.events.flatMap((event) => detectTopics(event.content)))
  );
  const linkedProperties = input.links
    .filter((link) => link.entity_type === "property")
    .map((link) => link.label)
    .filter(Boolean);
  const rentalLine = input.rentalContext
    ? `Es inquilino/a de ${input.rentalContext.propertyTitle}; alquiler actual ${formatArs(input.rentalContext.currentRent)}, ajuste ${input.rentalContext.indexType} cada ${input.rentalContext.adjustmentFrequencyMonths} meses, proximo ajuste ${formatDate(input.rentalContext.nextAdjustmentDate)}.`
    : "";

  return [
    `${input.profile.display_name || "Cliente"} tiene memoria activa en Props.`,
    rentalLine,
    linkedProperties.length ? `Propiedades vinculadas: ${linkedProperties.join(", ")}.` : "",
    topics.length ? `Temas frecuentes: ${topics.join(", ")}.` : "",
    lastCustomerMessages.length
      ? `Ultimos mensajes relevantes: ${lastCustomerMessages.join(" / ")}.`
      : "Sin mensajes relevantes todavia.",
  ]
    .filter(Boolean)
    .join(" ");
}

function mergeFacts(
  previous: Record<string, unknown>,
  input: {
    normalizedPhone: string;
    email: string;
    displayName: string;
    events: Array<{ content: string; role: MemoryRole }>;
    propertyId?: string | null;
    contractId?: string | null;
    rentalContext?: TenantRentalMemoryContext | null;
  }
) {
  const topics = new Set<string>(Array.isArray(previous.topics) ? previous.topics as string[] : []);
  for (const event of input.events) {
    detectTopics(event.content).forEach((topic) => topics.add(topic));
  }

  return {
    ...previous,
    displayName: input.displayName || previous.displayName || null,
    normalizedPhone: input.normalizedPhone || previous.normalizedPhone || null,
    email: input.email || previous.email || null,
    propertyId: input.propertyId ?? previous.propertyId ?? null,
    contractId: input.contractId ?? previous.contractId ?? null,
    isTenant: Boolean(input.contractId || previous.isTenant),
    rental: input.rentalContext
      ? {
          contractId: input.rentalContext.contractId,
          propertyId: input.rentalContext.propertyId,
          propertyTitle: input.rentalContext.propertyTitle,
          currentRent: input.rentalContext.currentRent,
          indexType: input.rentalContext.indexType,
          nextAdjustmentDate: input.rentalContext.nextAdjustmentDate,
          lateFeeDailyAmount: input.rentalContext.lateFeeDailyAmount,
          lateFeeGraceDays: input.rentalContext.lateFeeGraceDays,
        }
      : previous.rental ?? null,
    topics: Array.from(topics).slice(0, 24),
    lastMemoryUpdateAt: new Date().toISOString(),
  };
}

function parseOpenAIJson(value: string) {
  const normalized = value.replace(/```json|```/gi, "").trim();
  try {
    return JSON.parse(normalized) as {
      summary?: string;
      facts?: Record<string, unknown>;
      preferences?: Record<string, unknown>;
      tags?: string[];
    };
  } catch {
    return null;
  }
}

async function summarizeWithOpenAI(input: {
  previousSummary: string;
  facts: Record<string, unknown>;
  preferences: Record<string, unknown>;
  events: MemoryEventRow[];
  rentalContext?: TenantRentalMemoryContext | null;
}) {
  const openAI = getOpenAIEnv();
  if (!openAI.configured) return null;

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
                "Sos la memoria persistente de Props para una inmobiliaria. Actualiza una nota viva de cliente como si fuera Obsidian: resumen durable, hechos confirmados, preferencias y tags. No inventes datos. Devuelve solo JSON valido con summary, facts, preferences y tags. El resumen debe ser breve y util para que un empleado o agente IA siga la conversacion.",
            },
          ],
        },
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text: [
                `Resumen anterior: ${input.previousSummary || "sin resumen"}`,
                `Hechos previos: ${JSON.stringify(input.facts)}`,
                `Preferencias previas: ${JSON.stringify(input.preferences)}`,
                input.rentalContext
                  ? `Contrato detectado: ${input.rentalContext.tenantName}, ${input.rentalContext.propertyTitle}, alquiler ${formatArs(input.rentalContext.currentRent)}, ajuste ${input.rentalContext.indexType}, proximo ${formatDate(input.rentalContext.nextAdjustmentDate)}.`
                  : "Sin contrato detectado.",
                "Eventos recientes:",
                input.events
                  .slice(0, 18)
                  .map((event) => `${event.role}/${event.direction}: ${compactText(event.content, 300)}`)
                  .join("\n"),
              ].join("\n\n"),
            },
          ],
        },
      ],
    }),
  });

  if (!response.ok) return null;
  const payload = (await response.json()) as { output_text?: string };
  return parseOpenAIJson(payload.output_text ?? "");
}

async function findProfile(input: {
  agencyId: string;
  normalizedPhone: string;
  email: string;
  leadId?: string | null;
}) {
  const admin = createAdminClient();

  if (input.normalizedPhone) {
    const { data } = await admin
      .from("client_memory_profiles")
      .select("*")
      .eq("agency_id", input.agencyId)
      .eq("normalized_phone", input.normalizedPhone)
      .maybeSingle();
    if (data) return data as MemoryProfileRow;
  }

  if (input.email) {
    const { data } = await admin
      .from("client_memory_profiles")
      .select("*")
      .eq("agency_id", input.agencyId)
      .ilike("email", input.email)
      .maybeSingle();
    if (data) return data as MemoryProfileRow;
  }

  if (input.leadId) {
    const { data: link } = await admin
      .from("client_memory_links")
      .select("memory_id")
      .eq("agency_id", input.agencyId)
      .eq("entity_type", "lead")
      .eq("entity_id", input.leadId)
      .maybeSingle();

    if (link?.memory_id) {
      const { data } = await admin
        .from("client_memory_profiles")
        .select("*")
        .eq("id", link.memory_id)
        .maybeSingle();
      if (data) return data as MemoryProfileRow;
    }
  }

  return null;
}

async function upsertMemoryLink(input: {
  memoryId: string;
  agencyId: string;
  entityType: MemoryEntityType;
  entityId?: string | null;
  label?: string | null;
  metadata?: Record<string, unknown>;
}) {
  if (!input.entityId) return;

  const admin = createAdminClient();
  await admin.from("client_memory_links").upsert(
    {
      memory_id: input.memoryId,
      agency_id: input.agencyId,
      entity_type: input.entityType,
      entity_id: input.entityId,
      label: input.label ?? "",
      metadata: input.metadata ?? {},
    },
    { onConflict: "memory_id,entity_type,entity_id" }
  );
}

export async function rememberClientInteraction(input: {
  agencyId: string;
  displayName: string;
  phone?: string | null;
  email?: string | null;
  leadId?: string | null;
  propertyId?: string | null;
  propertyTitle?: string | null;
  contractId?: string | null;
  conversationId?: string | null;
  sourceType: string;
  sourceId?: string | null;
  rentalContext?: TenantRentalMemoryContext | null;
  messages: Array<{
    direction: MemoryDirection;
    role: MemoryRole;
    content: string;
    metadata?: Record<string, unknown>;
  }>;
}) {
  const normalizedPhone = normalizeMemoryPhone(input.phone);
  const email = normalizeEmail(input.email);
  const admin = createAdminClient();
  const existingProfile = await findProfile({
    agencyId: input.agencyId,
    normalizedPhone,
    email,
    leadId: input.leadId,
  });

  const baseProfile = {
    agency_id: input.agencyId,
    display_name: input.displayName || existingProfile?.display_name || "Cliente",
    normalized_phone: normalizedPhone || existingProfile?.normalized_phone || null,
    email: email || existingProfile?.email || null,
    last_interaction_at: new Date().toISOString(),
  };

  let profile: MemoryProfileRow;
  if (existingProfile) {
    const { data, error } = await admin
      .from("client_memory_profiles")
      .update(baseProfile)
      .eq("id", existingProfile.id)
      .select("*")
      .single();
    if (error) throw error;
    profile = data as MemoryProfileRow;
  } else {
    const { data, error } = await admin
      .from("client_memory_profiles")
      .insert(baseProfile)
      .select("*")
      .single();
    if (error) throw error;
    profile = data as MemoryProfileRow;
  }

  await Promise.all([
    upsertMemoryLink({
      memoryId: profile.id,
      agencyId: input.agencyId,
      entityType: "lead",
      entityId: input.leadId,
      label: input.displayName,
    }),
    upsertMemoryLink({
      memoryId: profile.id,
      agencyId: input.agencyId,
      entityType: "property",
      entityId: input.propertyId,
      label: input.propertyTitle,
    }),
    upsertMemoryLink({
      memoryId: profile.id,
      agencyId: input.agencyId,
      entityType: "contract",
      entityId: input.contractId,
      label: input.rentalContext?.propertyTitle ?? input.propertyTitle,
      metadata: input.rentalContext ? { tenantName: input.rentalContext.tenantName } : {},
    }),
    upsertMemoryLink({
      memoryId: profile.id,
      agencyId: input.agencyId,
      entityType: "conversation",
      entityId: input.conversationId,
      label: input.sourceType,
    }),
  ]);

  const eventsToInsert = input.messages
    .filter((message) => message.content.trim())
    .map((message) => ({
      memory_id: profile.id,
      agency_id: input.agencyId,
      lead_id: input.leadId ?? null,
      property_id: input.propertyId ?? null,
      contract_id: input.contractId ?? null,
      source_type: input.sourceType,
      source_id: input.sourceId ?? null,
      direction: message.direction,
      role: message.role,
      content: message.content.trim(),
      metadata: message.metadata ?? {},
    }));

  if (eventsToInsert.length) {
    const { error } = await admin.from("client_memory_events").insert(eventsToInsert);
    if (error) throw error;
  }

  const [{ data: eventRows }, { data: linkRows }] = await Promise.all([
    admin
      .from("client_memory_events")
      .select("id, direction, role, content, metadata, created_at")
      .eq("memory_id", profile.id)
      .order("created_at", { ascending: false })
      .limit(30),
    admin
      .from("client_memory_links")
      .select("entity_type, entity_id, label, metadata")
      .eq("memory_id", profile.id),
  ]);

  const events = (eventRows ?? []) as MemoryEventRow[];
  const links = (linkRows ?? []) as MemoryLinkRow[];
  const mergedFacts = mergeFacts(profile.facts ?? {}, {
    normalizedPhone,
    email,
    displayName: input.displayName,
    events: input.messages,
    propertyId: input.propertyId,
    contractId: input.contractId,
    rentalContext: input.rentalContext,
  });
  const aiMemory = await summarizeWithOpenAI({
    previousSummary: profile.summary,
    facts: mergedFacts,
    preferences: profile.preferences ?? {},
    events,
    rentalContext: input.rentalContext,
  }).catch(() => null);
  const nextSummary =
    aiMemory?.summary?.trim() ||
    buildHeuristicSummary({
      profile,
      events,
      links,
      rentalContext: input.rentalContext,
    });

  const { data: updatedProfile, error: updateError } = await admin
    .from("client_memory_profiles")
    .update({
      summary: compactText(nextSummary, 1800),
      facts: {
        ...mergedFacts,
        ...(aiMemory?.facts ?? {}),
      },
      preferences: {
        ...(profile.preferences ?? {}),
        ...(aiMemory?.preferences ?? {}),
      },
      tags: Array.from(
        new Set([
          ...(Array.isArray(profile.tags) ? profile.tags : []),
          ...(Array.isArray(aiMemory?.tags) ? aiMemory.tags : []),
          ...detectTopics(input.messages.map((message) => message.content).join(" ")),
          input.contractId ? "inquilino" : "",
        ].filter(Boolean))
      ).slice(0, 24),
    })
    .eq("id", profile.id)
    .select("*")
    .single();

  if (updateError) throw updateError;
  return updatedProfile as MemoryProfileRow;
}

export async function buildClientMemoryContext(input: {
  agencyId: string;
  phone?: string | null;
  email?: string | null;
  leadId?: string | null;
  rentalContext?: TenantRentalMemoryContext | null;
}) {
  const profile = await findProfile({
    agencyId: input.agencyId,
    normalizedPhone: normalizeMemoryPhone(input.phone),
    email: normalizeEmail(input.email),
    leadId: input.leadId,
  });

  if (!profile) {
    return {
      profile: null,
      contextText: input.rentalContext
        ? `Memoria Props: sin nota previa, pero se detecto contrato activo. ${input.rentalContext.tenantName} alquila ${input.rentalContext.propertyTitle}. Alquiler actual ${formatArs(input.rentalContext.currentRent)}. Proximo ajuste ${formatDate(input.rentalContext.nextAdjustmentDate)} por ${input.rentalContext.indexType}.`
        : "Memoria Props: no hay memoria previa para este contacto.",
    };
  }

  const admin = createAdminClient();
  const [{ data: eventRows }, { data: linkRows }] = await Promise.all([
    admin
      .from("client_memory_events")
      .select("id, direction, role, content, metadata, created_at")
      .eq("memory_id", profile.id)
      .order("created_at", { ascending: false })
      .limit(12),
    admin
      .from("client_memory_links")
      .select("entity_type, entity_id, label, metadata")
      .eq("memory_id", profile.id),
  ]);

  const events = (eventRows ?? []) as MemoryEventRow[];
  const links = (linkRows ?? []) as MemoryLinkRow[];
  const linkText = links.length
    ? links
        .map((link) => `${link.entity_type}: ${link.label || link.entity_id}`)
        .join(" | ")
    : "sin vinculos todavia";
  const recentText = events.length
    ? events
        .slice(0, 8)
        .map((event) => `${event.role}/${event.direction}: ${compactText(event.content, 220)}`)
        .join("\n")
    : "sin eventos previos";
  const rentalText = input.rentalContext
    ? `Contrato activo detectado: ${input.rentalContext.tenantName} alquila ${input.rentalContext.propertyTitle}. Alquiler actual ${formatArs(input.rentalContext.currentRent)}. Ajuste ${input.rentalContext.indexType} cada ${input.rentalContext.adjustmentFrequencyMonths} meses. Proximo ajuste ${formatDate(input.rentalContext.nextAdjustmentDate)}. Punitorios ${formatArs(input.rentalContext.lateFeeDailyAmount)} por dia despues de ${input.rentalContext.lateFeeGraceDays} dias de gracia.`
    : "Sin contrato activo detectado por telefono.";

  return {
    profile,
    contextText: [
      `Memoria Props de ${profile.display_name}: ${profile.summary || "sin resumen durable"}`,
      `Hechos: ${JSON.stringify(profile.facts ?? {})}`,
      `Preferencias: ${JSON.stringify(profile.preferences ?? {})}`,
      `Tags: ${(profile.tags ?? []).join(", ") || "sin tags"}`,
      `Vinculos: ${linkText}`,
      rentalText,
      "Eventos recientes:",
      recentText,
    ].join("\n"),
  };
}

export async function findTenantRentalContext(input: {
  agencyId: string;
  phone?: string | null;
}): Promise<TenantRentalMemoryContext | null> {
  const normalizedPhone = normalizeMemoryPhone(input.phone);
  if (!normalizedPhone) return null;

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("rental_contracts")
    .select(
      "id, property_id, tenant_name, tenant_phone, current_rent, currency, index_type, adjustment_frequency_months, late_fee_daily_amount, late_fee_grace_days, contract_start_date, next_adjustment_date, last_adjustment_date, status, properties!inner(title, location, exact_address)"
    )
    .eq("agency_id", input.agencyId)
    .neq("status", "Finalizado")
    .order("status", { ascending: true })
    .order("next_adjustment_date", { ascending: true });

  if (error) {
    console.error("[client-memory] rental lookup failed", {
      agencyId: input.agencyId,
      error: error.message,
    });
    return null;
  }

  const rows = (data ?? []) as Array<{
    id: string;
    property_id: string;
    tenant_name: string;
    tenant_phone: string;
    current_rent: number;
    currency: "ARS";
    index_type: "IPC" | "ICL";
    adjustment_frequency_months: number;
    late_fee_daily_amount: number | null;
    late_fee_grace_days: number | null;
    contract_start_date: string;
    next_adjustment_date: string;
    last_adjustment_date: string | null;
    status: "Activo" | "Pausado" | "Finalizado";
    properties:
      | { title: string; location: string; exact_address: string | null }
      | { title: string; location: string; exact_address: string | null }[];
  }>;

  const match = rows.find((contract) => normalizeMemoryPhone(contract.tenant_phone) === normalizedPhone);
  if (!match) return null;

  const property = Array.isArray(match.properties) ? match.properties[0] : match.properties;

  return {
    contractId: match.id,
    propertyId: match.property_id,
    tenantName: match.tenant_name,
    tenantPhone: match.tenant_phone,
    currentRent: Number(match.current_rent ?? 0),
    currency: match.currency,
    indexType: match.index_type,
    adjustmentFrequencyMonths: Number(match.adjustment_frequency_months ?? 0),
    contractStartDate: match.contract_start_date,
    nextAdjustmentDate: match.next_adjustment_date,
    lastAdjustmentDate: match.last_adjustment_date,
    lateFeeDailyAmount: Number(match.late_fee_daily_amount ?? 0),
    lateFeeGraceDays: Number(match.late_fee_grace_days ?? 0),
    status: match.status,
    propertyTitle: property?.title ?? "la propiedad alquilada",
    propertyLocation: property?.location ?? "",
    exactAddress: property?.exact_address ?? "",
  };
}
