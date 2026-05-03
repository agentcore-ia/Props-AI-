import { NextResponse } from "next/server";

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
    .select("id, title, operation, status, location, description, price")
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

  await admin.from("catalog_inquiries").insert({
    agency_id: agency.id,
    property_id: property.id,
    name: current.profile.full_name ?? current.user.email ?? "Cliente Props",
    email: current.user.email ?? "",
    phone: "Pendiente",
    message,
    operation: property.operation,
    budget: null,
    source: "marketplace_chat",
  });

  const openAI = getOpenAIEnv();
  const relatedProperties = await listProperties({ tenantSlug });
  const catalogContext = relatedProperties
    .slice(0, 10)
    .map(
      (item) =>
        `- ${item.title} | ${item.operation} | ${item.status} | ${item.location} | ${item.price} | ${item.description}`
    )
    .join("\n");

  let reply =
    "Recibi tu consulta. Puedo ayudarte a precisar presupuesto, zona, tipo de propiedad o tiempos para que la inmobiliaria responda con una propuesta mejor armada.";

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
                  "Sos la IA de captacion de Props para compradores e inquilinos. Responde en espanol rioplatense, breve, amable y comercial. Ayuda a clarificar necesidades del cliente y prepara el contacto con la inmobiliaria. No prometas visitas ni disponibilidades exactas si no estan confirmadas.",
              },
            ],
          },
          {
            role: "user",
            content: [
              {
                type: "input_text",
                text: `Inmobiliaria: ${agency.name} (${agency.city}). Propiedad consultada: ${property.title} | ${property.operation} | ${property.status} | ${property.location} | ${property.price} | ${property.description}.\nCatalogo adicional:\n${catalogContext}\n\nMensaje del cliente:\n${message}`,
              },
            ],
          },
        ],
      }),
    });

    if (aiResponse.ok) {
      const payload = (await aiResponse.json()) as { output_text?: string };
      if (payload.output_text) {
        reply = payload.output_text;
      }
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

  return NextResponse.json({
    ok: true,
    conversationId,
    reply,
  });
}
