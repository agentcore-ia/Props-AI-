import { NextResponse } from "next/server";

import { getCurrentUserContext } from "@/lib/auth/current-user";
import { ensureLeadTask, recordCrmLeadMessage, upsertLeadFromSignal } from "@/lib/crm-automation";
import { getOpenAIEnv } from "@/lib/openai-env";
import { listProperties } from "@/lib/props-data";
import { createAdminClient } from "@/lib/supabase/admin";

type PropertyRecord = {
  id: string;
  title: string;
  operation: string;
  status: string;
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
  amenities: string[] | null;
};

type RecentMessage = {
  senderRole: string;
  content: string;
};

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
    .select(
      "id, title, operation, status, location, exact_address, description, price, currency, property_type, bedrooms, bathrooms, area, expenses, expenses_currency, available_from, pets_policy, requirements, amenities"
    )
    .eq("id", propertyId)
    .eq("agency_id", agency.id)
    .maybeSingle<PropertyRecord>();

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

  const { data: recentMessagesRows } = await admin
    .from("marketplace_messages")
    .select("sender_role, content, created_at")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true })
    .limit(8);

  const recentMessages: RecentMessage[] = (recentMessagesRows ?? []).map((item) => ({
    senderRole: item.sender_role,
    content: item.content,
  }));

  const { data: inquiry } = await admin
    .from("catalog_inquiries")
    .insert({
      agency_id: agency.id,
      property_id: property.id,
      name: current.profile.full_name ?? current.user.email ?? "Cliente Props",
      email: current.user.email ?? "",
      phone: "Pendiente",
      message,
      operation: property.operation,
      budget: null,
      source: "marketplace_chat",
    })
    .select("id")
    .single();

  const openAI = getOpenAIEnv();
  const relatedProperties = await listProperties({ tenantSlug });
  const conversationContext = recentMessages
    .map((item) => `${item.senderRole === "customer" ? "Cliente" : "IA"}: ${item.content}`)
    .join("\n");

  const visitState = analyzeVisitFlow({
    message,
    recentMessages,
    fallbackName: current.profile.full_name ?? null,
    propertyTitle: property.title,
    agencyName: agency.name,
  });

  let reply = visitState.reply
    ? visitState.reply
    : buildPropertyChatFallback({
        property,
        agencyName: agency.name,
        message,
        recentMessages,
      });

  if (!visitState.reply && openAI.configured) {
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
                  "Sos la IA de captacion de Props para compradores e inquilinos. Responde en espanol rioplatense, breve, amable y comercial. Estas dentro de la ficha de una sola propiedad: responde solo sobre esa propiedad y no recomiendes otras salvo que el usuario lo pida de forma explicita. Responde solo lo que preguntaron, sin volcar toda la ficha ni hacer listas largas. Si el usuario responde algo como 'si', 'si por favor' o 'dale', interpreta el contexto inmediato de la conversacion y contesta solo a eso. Si preguntan por precio, expensas, mascotas, ubicacion, disponibilidad, requisitos o ambientes, da ese dato puntual. Como maximo cierra con una sola pregunta corta para avanzar.",
              },
            ],
          },
          {
            role: "user",
            content: [
              {
                type: "input_text",
                text: `Inmobiliaria: ${agency.name} (${agency.city}). Propiedad consultada: ${property.title} | ${property.operation} | ${property.status} | ${property.location} | direccion: ${property.exact_address} | precio: ${property.price} ${property.currency} | tipo: ${property.property_type} | dormitorios: ${property.bedrooms} | banos: ${property.bathrooms} | m2: ${property.area} | expensas: ${property.expenses ?? "n/d"} ${property.expenses_currency ?? ""} | disponible desde: ${property.available_from ?? "inmediata"} | mascotas: ${property.pets_policy || "consultar"} | requisitos: ${property.requirements || "sin requisitos cargados"} | amenities: ${Array.isArray(property.amenities) ? property.amenities.join(", ") : "sin amenities"} | descripcion: ${property.description}.\n\nHistorial reciente de la conversacion:\n${conversationContext}\n\nUltimo mensaje del cliente:\n${message}`,
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
        reply = sanitizePropertyReply(aiReply);
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

  const { lead } = await upsertLeadFromSignal({
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

  const extractedPhone = visitState.phone ?? extractPhoneFromText(message);
  const visitPreference = extractVisitPreference(message);
  const visitFlowActive = visitState.flowActive;

  if (visitState.customerName || extractedPhone) {
    await admin
      .from("crm_leads")
      .update({
        full_name: visitState.customerName ?? lead.full_name,
        phone: extractedPhone ?? lead.phone,
        updated_at: new Date().toISOString(),
      })
      .eq("id", lead.id);
  }

  if (visitFlowActive && (extractedPhone || visitPreference)) {
    await admin
      .from("crm_leads")
      .update({
        phone: extractedPhone ?? lead.phone,
        stage: "Visita",
        priority: "Alta",
        needs_response: true,
        next_follow_up_at: new Date().toISOString(),
        last_activity_at: new Date().toISOString(),
      })
      .eq("id", lead.id);

    const details = [
      `Lead web solicitó visita por ${property.title}.`,
      extractedPhone ? `Telefono: ${extractedPhone}.` : null,
      visitPreference ? `Preferencia: ${visitPreference}.` : null,
      `Ultimo mensaje: ${message}`,
    ]
      .filter(Boolean)
      .join(" ");

    await ensureLeadTask({
      agencyId: agency.id,
      leadId: lead.id,
      propertyId: property.id,
      title: `Contactar a ${lead.full_name} para coordinar visita`,
      details,
      dueAt: new Date().toISOString(),
      taskType: "Visita",
      priority: "Alta",
      automationSource: "marketplace_chat_visit",
    });
  }

  await recordCrmLeadMessage({
    leadId: lead.id,
    agencyId: agency.id,
    propertyId: property.id,
    channel: "web",
    content: message,
    direction: "incoming",
    senderRole: "customer",
    metadata: {
      source: "marketplace_chat",
      conversationId,
      inquiryId: inquiry?.id ?? null,
    },
  });

  await recordCrmLeadMessage({
    leadId: lead.id,
    agencyId: agency.id,
    propertyId: property.id,
    channel: "web",
    content: reply,
    direction: "outgoing",
    senderRole: "assistant",
    metadata: {
      source: "marketplace_chat",
      conversationId,
      inquiryId: inquiry?.id ?? null,
    },
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
      ? (item as { content: Array<Record<string, unknown>> }).content
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
  recentMessages,
}: {
  property: PropertyRecord;
  agencyName: string;
  message: string;
  recentMessages: RecentMessage[];
}) {
  const normalized = message.toLowerCase();
  const address = property.exact_address || property.location;
  const details = [
    `${property.title} es una ${property.property_type?.toLowerCase() || "propiedad"} en ${property.location}.`,
    `El valor publicado es ${property.price} ${property.currency}.`,
  ];
  const lastAssistantMessage = [...recentMessages]
    .reverse()
    .find((item) => item.senderRole === "assistant")?.content
    ?.toLowerCase();
  const affirmativeFollowUp = /^(si|sí|si por favor|sí por favor|dale|perfecto|ok|oka)$/.test(
    normalized.replace(/[!.?]+/g, "").trim()
  );

  if (
    normalized.includes("precio") ||
    normalized.includes("vale") ||
    normalized.includes("cuanto") ||
    normalized.includes("valor")
  ) {
    return `${details.join(" ")} Si queres, tambien te cuento expensas, requisitos o coordinamos una visita con ${agencyName}.`;
  }

  if (normalized.includes("expensa")) {
    return property.expenses && property.expenses_currency
      ? `Las expensas informadas son ${property.expenses} ${property.expenses_currency}.`
      : `En esta publicacion no hay expensas cargadas. Si queres, dejo la consulta para que ${agencyName} te lo confirme.`;
  }

  if (normalized.includes("mascota")) {
    return property.pets_policy
      ? `Si, la politica cargada es: ${property.pets_policy}.`
      : `En esta propiedad no hay politica de mascotas cargada. Si queres, se lo consulto a ${agencyName}.`;
  }

  if (normalized.includes("requis")) {
    return property.requirements
      ? `Los requisitos cargados son: ${property.requirements}`
      : `Esta publicacion no tiene requisitos cargados todavia. Si queres, le dejo la consulta a ${agencyName}.`;
  }

  if (
    affirmativeFollowUp &&
    lastAssistantMessage?.includes("requisitos") &&
    (lastAssistantMessage.includes("costo total") || lastAssistantMessage.includes("costo de ingreso"))
  ) {
    return [
      `Alquiler: ${property.price} ${property.currency}.`,
      property.expenses && property.expenses_currency
        ? `Expensas: ${property.expenses} ${property.expenses_currency}.`
        : null,
      property.requirements
        ? `Requisitos: ${property.requirements}`
        : "Requisitos: la inmobiliaria no los cargo todavia.",
    ]
      .filter(Boolean)
      .join(" ");
  }

  if (normalized.includes("donde") || normalized.includes("ubic") || normalized.includes("direccion")) {
    return `La propiedad esta en ${address}.`;
  }

  if (normalized.includes("dispon")) {
    return `La disponibilidad cargada es ${property.available_from || "inmediata"}.`;
  }

  if (
    normalized.includes("ambiente") ||
    normalized.includes("dorm") ||
    normalized.includes("baño") ||
    normalized.includes("bano") ||
    normalized.includes("metro") ||
    normalized.includes("m2")
  ) {
    return `${property.title} tiene ${property.bedrooms ?? "n/d"} dormitorio(s), ${property.bathrooms ?? "n/d"} baño(s) y ${property.area ?? "n/d"} m2.`;
  }

  return `Puedo ayudarte con el precio, la ubicacion, la disponibilidad, las expensas o los requisitos de ${property.title}. Decime que queres saber y te respondo puntual.`;
}

function sanitizePropertyReply(reply: string) {
  return reply
    .replace(/\*\*/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/también hay .*$/gim, "")
    .replace(/tambien hay .*$/gim, "")
    .replace(/adem[aá]s puedo recomendarte .*$/gim, "")
    .trim();
}

function extractPhoneFromText(text: string) {
  const match = text.match(/(?:\+?54[\s-]?)?(?:\(?\d{2,4}\)?[\s-]?)?\d{3,4}[\s-]?\d{4}/);
  if (!match) return null;
  const digits = match[0].replace(/[^\d]/g, "");
  if (digits.length < 8) return null;
  return digits.startsWith("54") ? digits : `54${digits}`;
}

function extractVisitPreference(text: string) {
  const normalized = text.toLowerCase();
  if (/mañana|manana/.test(normalized)) return "Prefiere por la mañana";
  if (/tarde/.test(normalized)) return "Prefiere por la tarde";
  if (/noche/.test(normalized)) return "Prefiere por la noche";
  if (/finde|fin de semana|sabado|sábado|domingo/.test(normalized)) {
    return "Prefiere fin de semana";
  }
  return null;
}

function analyzeVisitFlow({
  message,
  recentMessages,
  fallbackName,
  propertyTitle,
  agencyName,
}: {
  message: string;
  recentMessages: RecentMessage[];
  fallbackName: string | null;
  propertyTitle: string;
  agencyName: string;
}) {
  const normalized = normalizeForIntent(message);
  const phone = extractPhoneFromText(message);
  const explicitName = extractCustomerName(message);
  const customerName = explicitName ?? fallbackName ?? null;
  const assistantAskedForContact = recentMessages.some(
    (item) =>
      item.senderRole === "assistant" &&
      /pasame tu nombre|pasame tu celular|pasame tu nombre y (un )?(telefono|celular)|telefono de contacto|coordinarla/i.test(
        normalizeForIntent(item.content)
      )
  );
  const anyVisitContext = recentMessages.some(
    (item) => /visita|visitar|coordinar/i.test(normalizeForIntent(item.content))
  );
  const wantsVisit =
    /visitar|visita|coordinar.*visita|quiero verla|quiero visitar|me gustaria visitar|me gustaría visitar/.test(
      normalized
    ) ||
    (/^si\b|^dale\b|^perfecto\b/.test(normalized) && anyVisitContext);

  const flowActive = wantsVisit || assistantAskedForContact || anyVisitContext;

  if (!flowActive) {
    return {
      flowActive: false,
      phone,
      customerName,
      reply: null as string | null,
    };
  }

  if (phone) {
    const firstName = customerName?.split(/\s+/)[0] ?? "gracias";
    return {
      flowActive: true,
      phone,
      customerName,
      reply: `Gracias, ${capitalizeName(firstName)}. Ya quedó tu solicitud de visita para ${propertyTitle}. ${agencyName} te va a contactar para coordinarla.`,
    };
  }

  if (assistantAskedForContact && !phone) {
    if (explicitName) {
      return {
        flowActive: true,
        phone: null,
        customerName,
        reply: `Gracias, ${capitalizeName(explicitName.split(/\s+/)[0])}. Ahora pasame tu celular y ${agencyName} te contacta para coordinar la visita.`,
      };
    }

    return {
      flowActive: true,
      phone: null,
      customerName,
      reply: "Perfecto. Para coordinar la visita pasame tu nombre y tu celular.",
    };
  }

  if (wantsVisit) {
    return {
      flowActive: true,
      phone: null,
      customerName,
      reply: "Perfecto. Para coordinar la visita pasame tu nombre y tu celular.",
    };
  }

  return {
    flowActive: true,
    phone: null,
    customerName,
    reply: null as string | null,
  };
}

function extractCustomerName(text: string) {
  const explicitMatch = text.match(
    /(?:mi nombre es|soy)\s+([a-záéíóúñ]+(?:\s+[a-záéíóúñ]+){0,2})/i
  );

  if (explicitMatch?.[1]) {
    return explicitMatch[1].trim();
  }

  const normalized = text.trim();
  if (/^\+?\d[\d\s.-]{7,}$/.test(normalized)) {
    return null;
  }

  if (/^[a-záéíóúñ]+(?:\s+[a-záéíóúñ]+){0,2}[.!]?$/i.test(normalized)) {
    return normalized.replace(/[.!]+$/g, "").trim();
  }

  return null;
}

function normalizeForIntent(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function capitalizeName(value: string) {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .map((token) => token.charAt(0).toUpperCase() + token.slice(1).toLowerCase())
    .join(" ");
}
