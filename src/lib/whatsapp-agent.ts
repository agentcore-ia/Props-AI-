import "server-only";

import type { Agency, Property } from "@/lib/mock-data";
import type { CrmLeadMessageSummary, CrmLeadSummary } from "@/lib/crm-types";
import { getEffectiveMessagingInstance } from "@/lib/agency-access";
import { listProperties } from "@/lib/props-data";
import { createAdminClient } from "@/lib/supabase/admin";

type MessagingAgencyRow = {
  id: string;
  slug: string;
  name: string;
  city: string;
  email: string;
  phone: string;
  tagline: string;
  messaging_instance: string;
};

export type MessagingAgency = Pick<
  Agency,
  "id" | "slug" | "name" | "city" | "email" | "phone" | "tagline" | "messagingInstance"
>;

function mapMessagingAgency(row: MessagingAgencyRow): MessagingAgency {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    city: row.city,
    email: row.email,
    phone: row.phone,
    tagline: row.tagline,
    messagingInstance: row.messaging_instance,
  };
}

function normalizeMessageText(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function summarizeProperty(property: Property) {
  const blocks = [
    property.title,
    property.operation,
    property.status,
    property.location,
    property.exactAddress,
    `${property.price} ${property.currency}`,
    `${property.propertyType}`,
    property.bedrooms ? `${property.bedrooms} dormitorios` : "",
    property.bathrooms ? `${property.bathrooms} banos` : "",
    property.area ? `${property.area} m2` : "",
    property.expenses ? `expensas ${property.expenses} ${property.expensesCurrency ?? "ARS"}` : "",
    property.petsPolicy ? `mascotas: ${property.petsPolicy}` : "",
    property.requirements ? `requisitos: ${property.requirements}` : "",
    property.amenities.length ? `amenities: ${property.amenities.join(", ")}` : "",
    property.description ? `descripcion: ${property.description}` : "",
  ].filter(Boolean);

  return `- ${blocks.join(" | ")}`;
}

function summarizeThread(messages: CrmLeadMessageSummary[]) {
  const recent = messages.slice(-8);

  if (recent.length === 0) {
    return "Todavia no hay historial previo en este hilo.";
  }

  return recent
    .map((message) => {
      const speaker =
        message.senderRole === "customer"
          ? "Cliente"
          : message.senderRole === "assistant"
            ? "IA"
            : message.senderRole === "agent"
              ? "Agente"
              : "Sistema";
      return `- ${speaker}: ${normalizeMessageText(message.content)}`;
    })
    .join("\n");
}

export async function resolveAgencyByMessagingInstance(instanceName: string) {
  const requested = String(instanceName ?? "").trim();

  if (!requested) {
    return null;
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("agencies")
    .select("id, slug, name, city, email, phone, tagline, messaging_instance");

  if (error) {
    throw error;
  }

  const rows = (data ?? []) as MessagingAgencyRow[];
  const match = rows.find((row) => {
    const current = getEffectiveMessagingInstance({
      slug: row.slug,
      messaging_instance: row.messaging_instance,
    });
    return current === requested || row.messaging_instance === requested;
  });

  return match ? mapMessagingAgency(match) : null;
}

export async function buildAgencyCatalogContext(options: {
  agencySlug: string;
  selectedPropertyId?: string | null;
}) {
  const properties = await listProperties({ tenantSlug: options.agencySlug });
  const selectedProperty =
    properties.find((property) => property.id === options.selectedPropertyId) ?? null;
  const featured = selectedProperty
    ? [selectedProperty, ...properties.filter((property) => property.id !== selectedProperty.id)]
    : properties;

  return {
    selectedProperty,
    properties,
    catalogSummary: featured.slice(0, 12).map(summarizeProperty).join("\n"),
  };
}

export function buildWhatsappSystemPrompt(input: {
  agency: MessagingAgency;
  lead: CrmLeadSummary;
  selectedProperty: Property | null;
  catalogSummary: string;
  recentMessages: CrmLeadMessageSummary[];
}) {
  const threadSummary = summarizeThread(input.recentMessages);
  const selectedPropertySummary = input.selectedProperty
    ? summarizeProperty(input.selectedProperty)
    : "No hay una propiedad puntual asociada todavia; puedes guiarte por el catalogo y por lo que pida el cliente.";

  return [
    `Eres el asistente comercial de WhatsApp de ${input.agency.name}, una inmobiliaria de ${input.agency.city}.`,
    "Hablas en espanol rioplatense, con tono humano, claro y comercial. Nunca digas que eres un bot salvo que te lo pregunten.",
    "Tu trabajo es responder consultas de compra o alquiler, aclarar precio, ubicacion, requisitos, mascotas, expensas, disponibilidad, amenities y proximo paso.",
    "Solo puedes afirmar datos que esten en el contexto. Si no aparece algo, dilo con honestidad y ofrece derivarlo al equipo.",
    "Cuando el cliente muestra interes concreto, invita a dejar horario, presupuesto o coordinar visita. Cuando haga falta, pide una sola aclaracion a la vez.",
    "No hables de software interno, n8n, CRM, automatizaciones, APIs ni procesos tecnicos.",
    `Lead actual: ${input.lead.fullName} | etapa ${input.lead.stage} | prioridad ${input.lead.priority} | resumen interno: ${input.lead.qualificationSummary}.`,
    `Propiedad asociada: ${selectedPropertySummary}`,
    "Catalogo de propiedades disponibles para responder:",
    input.catalogSummary || "Sin propiedades disponibles en este momento.",
    "Historial reciente del hilo:",
    threadSummary,
  ].join("\n\n");
}

export function buildWhatsappAgentInput(input: {
  lead: CrmLeadSummary;
  messageText: string;
  selectedProperty: Property | null;
}) {
  const pieces = [
    `Cliente: ${input.lead.fullName}.`,
    input.selectedProperty
      ? `Propiedad consultada: ${input.selectedProperty.title}.`
      : "No hay propiedad fija asociada a esta conversacion.",
    `Ultimo mensaje del cliente: ${normalizeMessageText(input.messageText)}.`,
  ];

  return pieces.join("\n");
}
