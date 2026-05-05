import { NextResponse } from "next/server";

import { upsertLeadFromSignal } from "@/lib/crm-automation";
import { getCurrentUserContext } from "@/lib/auth/current-user";
import { getOpenAIEnv } from "@/lib/openai-env";
import { listProperties } from "@/lib/props-data";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  const current = await getCurrentUserContext();

  if (!current || current.profile.role !== "customer") {
    return NextResponse.json(
      { error: "Debes iniciar sesion como cliente para enviar mensajes." },
      { status: 401 }
    );
  }

  const body = await request.json();
  const tenantSlug = String(body.tenantSlug ?? "").trim().toLowerCase();
  const propertyId = String(body.propertyId ?? "").trim();
  const message = String(body.message ?? "").trim();

  if (!tenantSlug || !propertyId || !message) {
    return NextResponse.json(
      { error: "Falta informacion para iniciar la conversacion." },
      { status: 400 }
    );
  }

  const admin = createAdminClient();
  const { data: agency, error: agencyError } = await admin
    .from("agencies")
    .select("id, name, slug, city")
    .eq("slug", tenantSlug)
    .maybeSingle();

  if (agencyError || !agency) {
    return NextResponse.json(
      { error: "No encontramos la inmobiliaria de esta propiedad." },
      { status: 404 }
    );
  }

  const { data: property, error: propertyError } = await admin
    .from("properties")
    .select("id, title, operation, status, location, exact_address, description, price, currency, property_type, bedrooms, bathrooms, area, expenses, expenses_currency, available_from, pets_policy, requirements, amenities")
    .eq("id", propertyId)
    .eq("agency_id", agency.id)
    .maybeSingle();

  if (propertyError || !property) {
    return NextResponse.json(
      { error: "No encontramos la propiedad para esta conversacion." },
      { status: 404 }
    );
  }

  const { data: existingConversation } = await admin
    .from("marketplace_conversations")
    .select("id")
    .eq("customer_id", current.user.id)
    .eq("agency_id", agency.id)
    .eq("property_id", property.id)
    .eq("status", "Abierta")
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  let conversationId = existingConversation?.id ?? null;

  if (!conversationId) {
    const { data: createdConversation, error: conversationError } = await admin
      .from("marketplace_conversations")
      .insert({
        customer_id: current.user.id,
        agency_id: agency.id,
        property_id: property.id,
        title: `Consulta por ${property.title}`,
      })
      .select("id")
      .single();

    if (conversationError || !createdConversation) {
      return NextResponse.json(
        { error: "No se pudo iniciar la conversacion." },
        { status: 400 }
      );
    }

    conversationId = createdConversation.id;
  }

  await admin.from("marketplace_messages").insert({
    conversation_id: conversationId,
    sender_role: "customer",
    content: message,
    metadata: {
      propertyId: property.id,
      tenantSlug,
    },
  });

  const { data: inquiry } = await admin.from("catalog_inquiries").insert({
    agency_id: agency.id,
    property_id: property.id,
    name: current.profile.full_name ?? current.user.email ?? "Cliente Props",
    email: current.user.email ?? "",
    phone: "Pendiente",
    message,
    operation: property.operation,
    budget: null,
    source: "marketplace_chat",
  }).select("id").single();

  const openAI = getOpenAIEnv();
  const relatedProperties = await listProperties({ tenantSlug });
  const catalogContext = relatedProperties
    .slice(0, 10)
    .map(
      (item) =>
        `- ${item.title} | ${item.operation} | ${item.status} | ${item.location} | direccion: ${item.exactAddress} | precio: ${item.price} ${item.currency} | tipo: ${item.propertyType} | dormitorios: ${item.bedrooms} | banos: ${item.bathrooms} | m2: ${item.area} | mascotas: ${item.petsPolicy || "consultar"} | requisitos: ${item.requirements || "sin requisitos cargados"} | amenities: ${item.amenities.join(", ") || "sin amenities"} | descripcion: ${item.description}`
    )
    .join("\n");

  let reply =
    buildPropertyChatFallback({
      property,
      agencyName: agency.name,
      message,
    });

  if (openAI.configured) {
    const aiResponse = await fetch("https://api.openai.com/v1/responses", {
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
      "Sos la IA de captacion de Props para compradores e inquilinos. Responde en espanol rioplatense, breve, amable y comercial. Debes responder la pregunta concreta del usuario usando primero la propiedad consultada y luego, si ayuda, el portafolio adicional. Si te preguntan por precio, expensas, mascotas, ubicacion, disponibilidad, requisitos o ambientes, responde con esos datos. No repitas un mensaje generico si ya hay informacion suficiente. Cierra con una sola pregunta de avance o siguiente paso.",
              },
            ],
          },
          {
            role: "user",
            content: [
              {
                type: "input_text",
        text: `Inmobiliaria: ${agency.name} (${agency.city}). Propiedad consultada: ${property.title} | ${property.operation} | ${property.status} | ${property.location} | direccion: ${property.exact_address} | precio: ${property.price} ${property.currency} | tipo: ${property.property_type} | dormitorios: ${property.bedrooms} | banos: ${property.bathrooms} | m2: ${property.area} | expensas: ${property.expenses ?? "n/d"} ${property.expenses_currency ?? ""} | disponible desde: ${property.available_from ?? "inmediata"} | mascotas: ${property.pets_policy || "consultar"} | requisitos: ${property.requirements || "sin requisitos cargados"} | amenities: ${Array.isArray(property.amenities) ? property.amenities.join(", ") : "sin amenities"} | descripcion: ${property.description}.\nPortafolio adicional:\n${catalogContext}\n\nMensaje del cliente:\n${message}`,
              },
            ],
          },
        ],
      }),
    });

    if (aiResponse.ok) {
      const payload = (await aiResponse.json()) as Record<string, unknown>;
      const aiReply = extractResponseText(payload);
      if (aiReply) {
        reply = aiReply;
      }
    } else {
      console.error("[public-conversations] openai error", {
        tenantSlug,
        propertyId,
        status: aiResponse.status,
      });
    }
  }

  await admin.from("marketplace_messages").insert({
    conversation_id: conversationId,
    sender_role: "assistant",
    content: reply,
    metadata: {
      propertyId: property.id,
      tenantSlug,
      agencyName: agency.name,
    },
  });

  await admin
    .from("marketplace_conversations")
    .update({
      updated_at: new Date().toISOString(),
    })
    .eq("id", conversationId);

  await upsertLeadFromSignal({
    agency: {
      id: agency.id,
      name: agency.name,
      slug: agency.slug,
      city: agency.city,
    },
    property: relatedProperties.find((item) => item.id === property.id) ?? null,
    customerId: current.user.id,
    conversationId,
    inquiryId: inquiry?.id ?? null,
    fullName: current.profile.full_name ?? current.user.email ?? "Cliente Props",
    email: current.user.email ?? null,
    phone: null,
    source: "chat_marketplace",
    message,
  });

  return NextResponse.json({
    ok: true,
    conversationId,
    reply,
  });
}

function extractResponseText(payload: Record<string, unknown>) {
  const direct = typeof payload.output_text === "string" ? payload.output_text.trim() : "";

  if (direct) {
    return direct;
  }

  const output = Array.isArray(payload.output) ? payload.output : [];

  for (const item of output) {
    if (!item || typeof item !== "object") {
      continue;
    }

    const content = Array.isArray((item as { content?: unknown }).content)
      ? ((item as { content: Array<Record<string, unknown>> }).content)
      : [];

    for (const chunk of content) {
      const text =
        typeof chunk.text === "string"
          ? chunk.text.trim()
          : typeof chunk.output_text === "string"
            ? chunk.output_text.trim()
            : "";

      if (text) {
        return text;
      }
    }
  }

  return "";
}

function buildPropertyChatFallback({
  property,
  agencyName,
  message,
}: {
  property: {
    title: string;
    operation: string;
    location: string;
    exact_address: string | null;
    description: string;
    price: number;
    currency: string;
    property_type: string | null;
    bedrooms: number | null;
    bathrooms: number | null;
    area: number | null;
    expenses: number | null;
    expenses_currency: string | null;
    available_from: string | null;
    pets_policy: string | null;
    requirements: string | null;
  };
  agencyName: string;
  message: string;
}) {
  const normalized = message.toLowerCase();
  const address = property.exact_address || property.location;
  const details = [
    `${property.title} es una ${property.property_type?.toLowerCase() || "propiedad"} en ${property.location}.`,
    `El valor publicado es ${property.price} ${property.currency}.`,
  ];

  if (
    normalized.includes("precio") ||
    normalized.includes("vale") ||
    normalized.includes("cuanto") ||
    normalized.includes("valor")
  ) {
    return `${details.join(" ")} Si querés, también te cuento expensas, requisitos o coordinamos una visita con ${agencyName}.`;
  }

  if (normalized.includes("expensa")) {
    return property.expenses && property.expenses_currency
      ? `Las expensas informadas son ${property.expenses} ${property.expenses_currency}. Si querés, también te paso disponibilidad y requisitos.`
      : `En esta publicación no hay expensas cargadas. Si querés, dejo la consulta para que ${agencyName} te lo confirme.`;
  }

  if (normalized.includes("mascota")) {
    return property.pets_policy
      ? `Sobre mascotas, la publicación indica: ${property.pets_policy}. Si querés, también te puedo contar requisitos y disponibilidad.`
      : `En esta propiedad no hay política de mascotas cargada. Si querés, le consulto a ${agencyName}.`;
  }

  if (normalized.includes("requis")) {
    return property.requirements
      ? `Los requisitos cargados son: ${property.requirements}`
      : `Esta publicación no tiene requisitos cargados todavía. Si querés, le dejo la consulta a ${agencyName}.`;
  }

  if (normalized.includes("donde") || normalized.includes("ubic") || normalized.includes("direccion")) {
    return `La propiedad está en ${address}. Si querés, también te paso precio, disponibilidad o coordinamos una visita.`;
  }

  if (normalized.includes("dispon")) {
    return `La disponibilidad cargada es ${property.available_from || "inmediata"}. Si querés, también te cuento requisitos y próximos pasos para avanzar.`;
  }

  if (
    normalized.includes("ambiente") ||
    normalized.includes("dorm") ||
    normalized.includes("baño") ||
    normalized.includes("bano") ||
    normalized.includes("metro") ||
    normalized.includes("m2")
  ) {
    return `${property.title} tiene ${property.bedrooms ?? "n/d"} dormitorio(s), ${property.bathrooms ?? "n/d"} baño(s) y ${property.area ?? "n/d"} m2. Si querés, también te paso ubicación y precio.`;
  }

  return `Puedo ayudarte con el precio, la ubicación, la disponibilidad, las expensas o los requisitos de ${property.title}. Decime qué querés saber y te respondo puntual.`;
}
