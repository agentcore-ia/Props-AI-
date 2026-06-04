import { NextResponse } from "next/server";

import { recordCrmLeadMessage, upsertLeadFromSignal } from "@/lib/crm-automation";
import { rememberClientInteraction } from "@/lib/client-memory";
import {
  findPropertyForPortalLead,
  getPortalLabel,
  normalizePortalKey,
} from "@/lib/portal-integrations";
import { createAdminClient } from "@/lib/supabase/admin";

type PortalIntegrationLookupRow = {
  id: string;
  agency_id: string;
  portal: "email" | "zonaprop" | "argenprop" | "mercadolibre" | "otro";
  label: string;
  enabled: boolean;
  agencies:
    | {
        id: string;
        name: string;
        slug: string;
        city: string | null;
        messaging_instance: string | null;
      }
    | Array<{
        id: string;
        name: string;
        slug: string;
        city: string | null;
        messaging_instance: string | null;
      }>
    | null;
};

function asString(value: unknown) {
  return String(value ?? "").trim();
}

function nullableString(value: unknown) {
  const text = asString(value);
  return text || null;
}

function normalizeEmail(value: unknown) {
  return asString(value).toLowerCase() || null;
}

function pickBodyValue(body: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = nullableString(body[key]);
    if (value) return value;
  }
  return null;
}

function buildPortalMessage(body: Record<string, unknown>) {
  const subject = pickBodyValue(body, ["subject", "asunto", "title"]);
  const message = pickBodyValue(body, ["message", "mensaje", "text", "body", "consulta"]);
  const notes = pickBodyValue(body, ["notes", "observaciones"]);

  return [subject, message, notes].filter(Boolean).join("\n\n").trim();
}

function safePayload(body: Record<string, unknown>) {
  const clone = { ...body };
  delete clone.token;
  delete clone.inboundToken;
  delete clone.authorization;
  return clone;
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;

  if (!body) {
    return NextResponse.json({ error: "El payload no es valido." }, { status: 400 });
  }

  const token =
    nullableString(body.token) ??
    nullableString(body.inboundToken) ??
    request.headers.get("x-props-integration-token") ??
    request.headers.get("authorization")?.replace(/^Bearer\s+/i, "").trim() ??
    "";

  if (!token) {
    return NextResponse.json({ error: "Falta token de integracion." }, { status: 401 });
  }

  const admin = createAdminClient();
  const { data: integrationData, error: integrationError } = await admin
    .from("portal_integrations")
    .select("id, agency_id, portal, label, enabled, agencies!inner(id, name, slug, city, messaging_instance)")
    .eq("inbound_token", token)
    .maybeSingle();

  if (integrationError) {
    return NextResponse.json({ error: "No se pudo validar la integracion." }, { status: 400 });
  }

  if (!integrationData) {
    return NextResponse.json({ error: "Token de integracion invalido." }, { status: 401 });
  }

  const integration = integrationData as unknown as PortalIntegrationLookupRow;
  if (!integration.enabled) {
    return NextResponse.json({ error: "La integracion esta desactivada." }, { status: 403 });
  }

  const agency = Array.isArray(integration.agencies)
    ? integration.agencies[0]
    : integration.agencies;

  if (!agency) {
    return NextResponse.json({ error: "No encontramos la inmobiliaria." }, { status: 404 });
  }

  const portal = normalizePortalKey(body.portal ?? integration.portal);
  const portalLabel = asString(body.portalLabel) || integration.label || getPortalLabel(portal);
  const externalId = pickBodyValue(body, ["externalId", "external_id", "leadId", "id"]);

  if (externalId) {
    const { data: existingEvent } = await admin
      .from("portal_lead_events")
      .select("id, lead_id")
      .eq("integration_id", integration.id)
      .eq("external_id", externalId)
      .maybeSingle();

    if (existingEvent?.lead_id) {
      return NextResponse.json({
        ok: true,
        duplicate: true,
        leadId: existingEvent.lead_id,
      });
    }
  }

  const fullName =
    pickBodyValue(body, ["name", "customerName", "fullName", "nombre"]) ??
    `Consulta de ${portalLabel}`;
  const email = normalizeEmail(body.email ?? body.mail);
  const phone = pickBodyValue(body, ["phone", "telefono", "whatsapp", "mobile"]);
  const message = buildPortalMessage(body);
  const operation = pickBodyValue(body, ["operation", "operacion"]);
  const budget = pickBodyValue(body, ["budget", "presupuesto"]);

  if (!message) {
    return NextResponse.json({ error: "Falta el mensaje de la consulta." }, { status: 400 });
  }

  const property = await findPropertyForPortalLead({
    agencySlug: agency.slug,
    propertyId: pickBodyValue(body, ["propertyId", "property_id", "propsPropertyId"]),
    propertyUrl: pickBodyValue(body, ["propertyUrl", "url", "link", "publicationUrl"]),
    propertyTitle: pickBodyValue(body, ["propertyTitle", "publicationTitle", "tituloPropiedad"]),
    propertyAddress: pickBodyValue(body, ["propertyAddress", "address", "direccion"]),
    message,
  });

  const source = `portal_${portal}`;
  const signal = await upsertLeadFromSignal({
    agency: {
      id: agency.id,
      name: agency.name,
      slug: agency.slug,
      city: agency.city,
      messagingInstance: agency.messaging_instance,
    },
    property,
    fullName,
    email,
    phone,
    source,
    message,
  });

  const messageId = await recordCrmLeadMessage({
    leadId: signal.lead.id,
    agencyId: agency.id,
    propertyId: property?.id ?? signal.lead.property_id ?? null,
    channel: "web",
    content: message,
    direction: "incoming",
    senderRole: "customer",
    metadata: {
      source,
      portal,
      portalLabel,
      externalId,
      operation,
      budget,
      propertyUrl: pickBodyValue(body, ["propertyUrl", "url", "link", "publicationUrl"]),
      propertyTitle: pickBodyValue(body, ["propertyTitle", "publicationTitle", "tituloPropiedad"]),
    },
  });

  await rememberClientInteraction({
    agencyId: agency.id,
    displayName: fullName,
    phone,
    email,
    leadId: signal.lead.id,
    propertyId: property?.id ?? signal.lead.property_id ?? null,
    propertyTitle: property?.title ?? null,
    sourceType: source,
    sourceId: messageId,
    messages: [
      {
        direction: "incoming",
        role: "customer",
        content: message,
        metadata: {
          portal,
          portalLabel,
          externalId,
        },
      },
    ],
  }).catch((error) => {
    console.error("[portal-leads] memory write failed", {
      leadId: signal.lead.id,
      portal,
      error: error instanceof Error ? error.message : String(error),
    });
  });

  const { data: event, error: eventError } = await admin
    .from("portal_lead_events")
    .insert({
      integration_id: integration.id,
      agency_id: agency.id,
      property_id: property?.id ?? signal.lead.property_id ?? null,
      lead_id: signal.lead.id,
      portal,
      external_id: externalId,
      customer_name: fullName,
      email,
      phone,
      message,
      payload: safePayload(body),
    })
    .select("id")
    .single();

  if (eventError) {
    console.error("[portal-leads] event insert failed", {
      leadId: signal.lead.id,
      portal,
      error: eventError.message,
    });
  }

  await admin
    .from("portal_integrations")
    .update({ last_event_at: new Date().toISOString() })
    .eq("id", integration.id);

  return NextResponse.json({
    ok: true,
    leadId: signal.lead.id,
    eventId: event?.id ?? null,
    propertyId: property?.id ?? signal.lead.property_id ?? null,
    source,
  });
}
