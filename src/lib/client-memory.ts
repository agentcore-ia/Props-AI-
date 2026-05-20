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

export type OwnerMemoryContext = {
  contractOwnerId: string | null;
  contractId: string;
  propertyId: string;
  ownerName: string;
  ownerPhone: string | null;
  ownerEmail: string | null;
  participationPercent: number;
  bankAlias: string | null;
  bankAccount: string | null;
  notes: string;
  currentRent: number;
  currency: "ARS";
  managementFeePercent: number;
  monthlyOwnerCosts: number;
  status: "Activo" | "Pausado" | "Finalizado";
  tenantName: string;
  propertyTitle: string;
  propertyLocation: string;
  exactAddress: string;
  latestSettlement: {
    id: string;
    settlementMonth: string;
    ownerPayoutAmount: number;
    status: "Borrador" | "Emitida" | "Pagada";
    paidAt: string | null;
  } | null;
  latestTransfer: {
    id: string;
    amount: number;
    status: "Pendiente" | "Programada" | "Enviada" | "Confirmada";
    transferDate: string | null;
    destinationLabel: string;
  } | null;
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
  ownerContext?: OwnerMemoryContext | null;
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
  const ownerLine = input.ownerContext
    ? [
        `Es propietario/a de ${input.ownerContext.propertyTitle}; participacion ${input.ownerContext.participationPercent}%, alquiler base ${formatArs(input.ownerContext.currentRent)}.`,
        input.ownerContext.latestSettlement
          ? `Ultima liquidacion ${input.ownerContext.latestSettlement.settlementMonth}: ${formatArs(input.ownerContext.latestSettlement.ownerPayoutAmount)} (${input.ownerContext.latestSettlement.status}).`
          : "Sin liquidacion reciente detectada.",
      ].join(" ")
    : "";

  return [
    `${input.profile.display_name || "Cliente"} tiene memoria activa en Props.`,
    rentalLine,
    ownerLine,
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
    ownerContext?: OwnerMemoryContext | null;
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
    isTenant: Boolean(input.rentalContext || (!input.ownerContext && previous.isTenant)),
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
    isOwner: Boolean(input.ownerContext || previous.isOwner),
    owner: input.ownerContext
      ? {
          contractOwnerId: input.ownerContext.contractOwnerId,
          contractId: input.ownerContext.contractId,
          propertyId: input.ownerContext.propertyId,
          propertyTitle: input.ownerContext.propertyTitle,
          participationPercent: input.ownerContext.participationPercent,
          currentRent: input.ownerContext.currentRent,
          latestSettlementMonth: input.ownerContext.latestSettlement?.settlementMonth ?? null,
          latestSettlementStatus: input.ownerContext.latestSettlement?.status ?? null,
          latestSettlementPayout: input.ownerContext.latestSettlement?.ownerPayoutAmount ?? null,
          latestTransferStatus: input.ownerContext.latestTransfer?.status ?? null,
        }
      : previous.owner ?? null,
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
  ownerContext?: OwnerMemoryContext | null;
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
                input.ownerContext
                  ? `Propietario detectado: ${input.ownerContext.ownerName}, propiedad ${input.ownerContext.propertyTitle}, participacion ${input.ownerContext.participationPercent}%, ultima liquidacion ${input.ownerContext.latestSettlement ? `${input.ownerContext.latestSettlement.settlementMonth} por ${formatArs(input.ownerContext.latestSettlement.ownerPayoutAmount)} (${input.ownerContext.latestSettlement.status})` : "sin liquidacion reciente"}.`
                  : "Sin propietario detectado.",
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
  ownerContext?: OwnerMemoryContext | null;
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
      entityType: "owner",
      entityId: input.ownerContext
        ? input.ownerContext.contractOwnerId ?? `owner:${normalizedPhone || email || input.ownerContext.ownerName}`
        : null,
      label: input.ownerContext?.ownerName ?? input.displayName,
      metadata: input.ownerContext
        ? {
            contractId: input.ownerContext.contractId,
            propertyId: input.ownerContext.propertyId,
            participationPercent: input.ownerContext.participationPercent,
          }
        : {},
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
    ownerContext: input.ownerContext,
  });
  const aiMemory = await summarizeWithOpenAI({
    previousSummary: profile.summary,
    facts: mergedFacts,
    preferences: profile.preferences ?? {},
    events,
    rentalContext: input.rentalContext,
    ownerContext: input.ownerContext,
  }).catch(() => null);
  const nextSummary =
    aiMemory?.summary?.trim() ||
    buildHeuristicSummary({
      profile,
      events,
      links,
      rentalContext: input.rentalContext,
      ownerContext: input.ownerContext,
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
          input.rentalContext ? "inquilino" : "",
          input.ownerContext ? "propietario" : "",
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
  ownerContext?: OwnerMemoryContext | null;
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
        : input.ownerContext
          ? `Memoria Props: sin nota previa, pero se detecto propietario. ${input.ownerContext.ownerName} es propietario/a de ${input.ownerContext.propertyTitle} con participacion ${input.ownerContext.participationPercent}%. ${input.ownerContext.latestSettlement ? `Ultima liquidacion ${input.ownerContext.latestSettlement.settlementMonth}: ${formatArs(input.ownerContext.latestSettlement.ownerPayoutAmount)} (${input.ownerContext.latestSettlement.status}).` : "Sin liquidacion reciente detectada."}`
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
  const ownerText = input.ownerContext
    ? [
        `Propietario detectado: ${input.ownerContext.ownerName} de ${input.ownerContext.propertyTitle}.`,
        `Participacion: ${input.ownerContext.participationPercent}%. Alquiler base del contrato: ${formatArs(input.ownerContext.currentRent)}. Honorarios admin: ${input.ownerContext.managementFeePercent}%. Gastos mensuales propietario: ${formatArs(input.ownerContext.monthlyOwnerCosts)}.`,
        input.ownerContext.latestSettlement
          ? `Ultima liquidacion: ${input.ownerContext.latestSettlement.settlementMonth}, ${formatArs(input.ownerContext.latestSettlement.ownerPayoutAmount)}, estado ${input.ownerContext.latestSettlement.status}, pagada ${formatDate(input.ownerContext.latestSettlement.paidAt)}.`
          : "Sin liquidacion reciente detectada.",
        input.ownerContext.latestTransfer
          ? `Ultima transferencia: ${formatArs(input.ownerContext.latestTransfer.amount)}, estado ${input.ownerContext.latestTransfer.status}, fecha ${formatDate(input.ownerContext.latestTransfer.transferDate)}, destino ${input.ownerContext.latestTransfer.destinationLabel || "sin destino cargado"}.`
          : "Sin transferencia reciente detectada.",
      ].join(" ")
    : "Sin propietario detectado por telefono.";

  return {
    profile,
    contextText: [
      `Memoria Props de ${profile.display_name}: ${profile.summary || "sin resumen durable"}`,
      `Hechos: ${JSON.stringify(profile.facts ?? {})}`,
      `Preferencias: ${JSON.stringify(profile.preferences ?? {})}`,
      `Tags: ${(profile.tags ?? []).join(", ") || "sin tags"}`,
      `Vinculos: ${linkText}`,
      rentalText,
      ownerText,
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

async function findLatestOwnerFinancials(input: {
  agencyId: string;
  contractId: string;
  contractOwnerId?: string | null;
  ownerPhone?: string | null;
  ownerName: string;
}) {
  const admin = createAdminClient();
  const normalizedOwnerPhone = normalizeMemoryPhone(input.ownerPhone);

  const [{ data: settlementRows }, { data: transferRows }] = await Promise.all([
    admin
      .from("owner_settlements")
      .select("id, contract_owner_id, owner_name, owner_phone, settlement_month, owner_payout_amount, status, paid_at, created_at")
      .eq("agency_id", input.agencyId)
      .eq("contract_id", input.contractId)
      .order("created_at", { ascending: false })
      .limit(30),
    admin
      .from("owner_transfers")
      .select("id, contract_owner_id, owner_name, amount, status, transfer_date, destination_label, created_at")
      .eq("agency_id", input.agencyId)
      .eq("contract_id", input.contractId)
      .order("created_at", { ascending: false })
      .limit(30),
  ]);

  const settlements = (settlementRows ?? []) as Array<{
    id: string;
    contract_owner_id: string | null;
    owner_name: string;
    owner_phone: string | null;
    settlement_month: string;
    owner_payout_amount: number;
    status: "Borrador" | "Emitida" | "Pagada";
    paid_at: string | null;
  }>;
  const transfers = (transferRows ?? []) as Array<{
    id: string;
    contract_owner_id: string | null;
    owner_name: string;
    amount: number;
    status: "Pendiente" | "Programada" | "Enviada" | "Confirmada";
    transfer_date: string | null;
    destination_label: string;
  }>;
  const normalizedOwnerName = input.ownerName.trim().toLowerCase();

  const latestSettlement =
    settlements.find((settlement) => input.contractOwnerId && settlement.contract_owner_id === input.contractOwnerId) ??
    settlements.find((settlement) => normalizedOwnerPhone && normalizeMemoryPhone(settlement.owner_phone) === normalizedOwnerPhone) ??
    settlements.find((settlement) => settlement.owner_name.trim().toLowerCase() === normalizedOwnerName) ??
    null;
  const latestTransfer =
    transfers.find((transfer) => input.contractOwnerId && transfer.contract_owner_id === input.contractOwnerId) ??
    transfers.find((transfer) => transfer.owner_name.trim().toLowerCase() === normalizedOwnerName) ??
    null;

  return {
    latestSettlement: latestSettlement
      ? {
          id: latestSettlement.id,
          settlementMonth: latestSettlement.settlement_month,
          ownerPayoutAmount: Number(latestSettlement.owner_payout_amount ?? 0),
          status: latestSettlement.status,
          paidAt: latestSettlement.paid_at,
        }
      : null,
    latestTransfer: latestTransfer
      ? {
          id: latestTransfer.id,
          amount: Number(latestTransfer.amount ?? 0),
          status: latestTransfer.status,
          transferDate: latestTransfer.transfer_date,
          destinationLabel: latestTransfer.destination_label ?? "",
        }
      : null,
  };
}

export async function findOwnerMemoryContext(input: {
  agencyId: string;
  phone?: string | null;
}): Promise<OwnerMemoryContext | null> {
  const normalizedPhone = normalizeMemoryPhone(input.phone);
  if (!normalizedPhone) return null;

  const admin = createAdminClient();
  const { data: ownerRows, error: ownerError } = await admin
    .from("rental_contract_owners")
    .select(
      "id, contract_id, property_id, agency_id, full_name, email, phone, participation_percent, bank_alias, bank_account, notes, rental_contracts!inner(current_rent, currency, status, tenant_name, management_fee_percent, monthly_owner_costs), properties!inner(title, location, exact_address)"
    )
    .eq("agency_id", input.agencyId)
    .limit(250);

  if (ownerError && !/rental_contract_owners/i.test(ownerError.message ?? "")) {
    console.error("[client-memory] owner lookup failed", {
      agencyId: input.agencyId,
      error: ownerError.message,
    });
  }

  const ownerMatches = (ownerRows ?? []) as Array<{
    id: string;
    contract_id: string;
    property_id: string;
    full_name: string;
    email: string | null;
    phone: string | null;
    participation_percent: number;
    bank_alias: string | null;
    bank_account: string | null;
    notes: string | null;
    rental_contracts:
      | {
          current_rent: number;
          currency: "ARS";
          status: "Activo" | "Pausado" | "Finalizado";
          tenant_name: string;
          management_fee_percent: number | null;
          monthly_owner_costs: number | null;
        }
      | Array<{
          current_rent: number;
          currency: "ARS";
          status: "Activo" | "Pausado" | "Finalizado";
          tenant_name: string;
          management_fee_percent: number | null;
          monthly_owner_costs: number | null;
        }>;
    properties:
      | { title: string; location: string; exact_address: string | null }
      | { title: string; location: string; exact_address: string | null }[];
  }>;

  const ownerMatch = ownerMatches.find((owner) => normalizeMemoryPhone(owner.phone) === normalizedPhone);

  if (ownerMatch) {
    const contract = Array.isArray(ownerMatch.rental_contracts)
      ? ownerMatch.rental_contracts[0]
      : ownerMatch.rental_contracts;
    const property = Array.isArray(ownerMatch.properties) ? ownerMatch.properties[0] : ownerMatch.properties;
    const financials = await findLatestOwnerFinancials({
      agencyId: input.agencyId,
      contractId: ownerMatch.contract_id,
      contractOwnerId: ownerMatch.id,
      ownerPhone: ownerMatch.phone,
      ownerName: ownerMatch.full_name,
    });

    return {
      contractOwnerId: ownerMatch.id,
      contractId: ownerMatch.contract_id,
      propertyId: ownerMatch.property_id,
      ownerName: ownerMatch.full_name,
      ownerPhone: ownerMatch.phone,
      ownerEmail: ownerMatch.email,
      participationPercent: Number(ownerMatch.participation_percent ?? 100),
      bankAlias: ownerMatch.bank_alias,
      bankAccount: ownerMatch.bank_account,
      notes: ownerMatch.notes ?? "",
      currentRent: Number(contract?.current_rent ?? 0),
      currency: contract?.currency ?? "ARS",
      managementFeePercent: Number(contract?.management_fee_percent ?? 0),
      monthlyOwnerCosts: Number(contract?.monthly_owner_costs ?? 0),
      status: contract?.status ?? "Activo",
      tenantName: contract?.tenant_name ?? "",
      propertyTitle: property?.title ?? "la propiedad administrada",
      propertyLocation: property?.location ?? "",
      exactAddress: property?.exact_address ?? "",
      ...financials,
    };
  }

  const { data: legacyContracts, error: legacyError } = await admin
    .from("rental_contracts")
    .select(
      "id, property_id, owner_name, owner_phone, owner_email, current_rent, currency, status, tenant_name, management_fee_percent, monthly_owner_costs, owner_notes, properties!inner(title, location, exact_address)"
    )
    .eq("agency_id", input.agencyId)
    .neq("status", "Finalizado")
    .limit(250);

  if (legacyError) {
    console.error("[client-memory] legacy owner lookup failed", {
      agencyId: input.agencyId,
      error: legacyError.message,
    });
    return null;
  }

  const legacyRows = (legacyContracts ?? []) as Array<{
    id: string;
    property_id: string;
    owner_name: string | null;
    owner_phone: string | null;
    owner_email: string | null;
    current_rent: number;
    currency: "ARS";
    status: "Activo" | "Pausado" | "Finalizado";
    tenant_name: string;
    management_fee_percent: number | null;
    monthly_owner_costs: number | null;
    owner_notes: string | null;
    properties:
      | { title: string; location: string; exact_address: string | null }
      | { title: string; location: string; exact_address: string | null }[];
  }>;

  const legacyMatch = legacyRows.find((contract) => normalizeMemoryPhone(contract.owner_phone) === normalizedPhone);
  if (!legacyMatch || !legacyMatch.owner_name?.trim()) return null;

  const property = Array.isArray(legacyMatch.properties) ? legacyMatch.properties[0] : legacyMatch.properties;
  const financials = await findLatestOwnerFinancials({
    agencyId: input.agencyId,
    contractId: legacyMatch.id,
    ownerPhone: legacyMatch.owner_phone,
    ownerName: legacyMatch.owner_name,
  });

  return {
    contractOwnerId: null,
    contractId: legacyMatch.id,
    propertyId: legacyMatch.property_id,
    ownerName: legacyMatch.owner_name,
    ownerPhone: legacyMatch.owner_phone,
    ownerEmail: legacyMatch.owner_email,
    participationPercent: 100,
    bankAlias: null,
    bankAccount: null,
    notes: legacyMatch.owner_notes ?? "",
    currentRent: Number(legacyMatch.current_rent ?? 0),
    currency: legacyMatch.currency,
    managementFeePercent: Number(legacyMatch.management_fee_percent ?? 0),
    monthlyOwnerCosts: Number(legacyMatch.monthly_owner_costs ?? 0),
    status: legacyMatch.status,
    tenantName: legacyMatch.tenant_name,
    propertyTitle: property?.title ?? "la propiedad administrada",
    propertyLocation: property?.location ?? "",
    exactAddress: property?.exact_address ?? "",
    ...financials,
  };
}
