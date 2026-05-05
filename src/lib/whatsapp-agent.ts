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

const PUBLIC_MARKETPLACE_URL =
  process.env.PUBLIC_MARKETPLACE_URL?.replace(/\/+$/, "") || "https://props.com.ar";

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

function normalizeSearchText(value: string) {
  return normalizeMessageText(value)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ");
}

function tokenizeSearchText(value: string) {
  return Array.from(
    new Set(
      normalizeSearchText(value)
        .split(/\s+/)
        .map((token) => token.trim())
        .filter((token) => token.length >= 3)
    )
  );
}

function scorePropertyAgainstMessage(property: Property, messageText: string) {
  const haystack = normalizeSearchText(
    [
      property.title,
      property.location,
      property.exactAddress,
      property.description,
      property.propertyType,
      property.operation,
    ]
      .filter(Boolean)
      .join(" ")
  );
  const tokens = tokenizeSearchText(messageText);

  if (tokens.length === 0) {
    return 0;
  }

  let score = 0;

  for (const token of tokens) {
    if (haystack.includes(token)) {
      score += token.length >= 7 ? 3 : 2;
    }
  }

  const normalizedTitle = normalizeSearchText(property.title);
  const normalizedLocation = normalizeSearchText(property.location);

  if (normalizedTitle && normalizeSearchText(messageText).includes(normalizedTitle)) {
    score += 6;
  }

  if (normalizedLocation && normalizeSearchText(messageText).includes(normalizedLocation)) {
    score += 5;
  }

  return score;
}

export function matchPropertyFromMessage(
  properties: Property[],
  messageText: string,
  preferredPropertyId?: string | null
) {
  if (preferredPropertyId) {
    const preferred = properties.find((property) => property.id === preferredPropertyId);
    if (preferred) {
      return preferred;
    }
  }

  const normalizedMessage = normalizeSearchText(messageText);
  if (!normalizedMessage) {
    return null;
  }

  let bestMatch: Property | null = null;
  let bestScore = 0;

  for (const property of properties) {
    const score = scorePropertyAgainstMessage(property, normalizedMessage);
    if (score > bestScore) {
      bestScore = score;
      bestMatch = property;
    }
  }

  return bestScore >= 3 ? bestMatch : null;
}

function summarizeProperty(property: Property) {
  const publicUrl = `${PUBLIC_MARKETPLACE_URL}/propiedad/${property.tenantSlug}/${property.id}`;
  const imageLinks = property.images
    .filter(Boolean)
    .slice(0, 3)
    .map((image) => image.trim())
    .filter(Boolean);
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
    `link: ${publicUrl}`,
    imageLinks.length ? `imagenes: ${imageLinks.join(", ")}` : "",
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
  messageText?: string | null;
}) {
  const properties = await listProperties({ tenantSlug: options.agencySlug });
  const selectedProperty =
    matchPropertyFromMessage(
      properties,
      options.messageText ?? "",
      options.selectedPropertyId ?? null
    ) ?? null;
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
  const selectedPropertyPublicUrl = input.selectedProperty
    ? `${PUBLIC_MARKETPLACE_URL}/propiedad/${input.selectedProperty.tenantSlug}/${input.selectedProperty.id}`
    : "";
  const selectedPropertyImages = input.selectedProperty?.images
    .filter(Boolean)
    .slice(0, 5)
    .join(", ");

  return [
    `Eres el asistente comercial de WhatsApp de ${input.agency.name}, una inmobiliaria de ${input.agency.city}.`,
    "Hablas en espanol rioplatense, con tono humano, claro y comercial. Nunca digas que eres un bot salvo que te lo pregunten.",
    "Tu trabajo es responder consultas de compra o alquiler, aclarar precio, ubicacion, requisitos, mascotas, expensas, disponibilidad, amenities y proximo paso.",
    "Solo puedes afirmar datos que esten en el contexto. Si no aparece algo, dilo con honestidad y ofrece derivarlo al equipo.",
    "Cuando el cliente muestra interes concreto, invita a dejar horario, presupuesto o coordinar visita. Cuando haga falta, pide una sola aclaracion a la vez.",
    "Si el cliente pide fotos, imagenes, ver mas o recorrer la propiedad, comparte el link publico de la ficha y menciona que puedes enviarle algunas imagenes destacadas.",
    "Si tienes una propiedad asociada y el cliente pide fotos, usa el link publico exacto en la respuesta. No inventes URLs.",
    "No hables de software interno, n8n, CRM, automatizaciones, APIs ni procesos tecnicos.",
    `Lead actual: ${input.lead.fullName} | etapa ${input.lead.stage} | prioridad ${input.lead.priority} | resumen interno: ${input.lead.qualificationSummary}.`,
    `Propiedad asociada: ${selectedPropertySummary}`,
    selectedPropertyPublicUrl
      ? `Link publico de la propiedad asociada: ${selectedPropertyPublicUrl}`
      : "No hay link publico asociado porque todavia no tenemos una propiedad seleccionada.",
    selectedPropertyImages
      ? `Imagenes de la propiedad asociada: ${selectedPropertyImages}`
      : "No hay imagenes adicionales cargadas para la propiedad asociada.",
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
