import { NextResponse } from "next/server";

import { getOpenAIEnv } from "@/lib/openai-env";
import { listProperties } from "@/lib/props-data";
import type { Property } from "@/lib/mock-data";

export async function POST(request: Request) {
  const body = await request.json();
  const tenantSlug = String(body.tenantSlug ?? "").trim().toLowerCase();
  const prompt = String(body.prompt ?? "").trim();

  if (!tenantSlug || !prompt) {
    return NextResponse.json(
      { error: "Falta el tenant o la consulta." },
      { status: 400 }
    );
  }

  const properties = await listProperties({ tenantSlug });

  if (properties.length === 0) {
    return NextResponse.json({
      reply:
      "Todavia no hay propiedades publicadas para este portafolio. Proba de nuevo mas tarde o dejanos tu consulta.",
    });
  }

  const openAI = getOpenAIEnv();

  if (!openAI.configured) {
    return NextResponse.json({
      reply:
        "La IA real todavia no esta configurada en este entorno. Igual puedo mostrarte las propiedades publicadas y capturar tu consulta para el equipo comercial.",
      configured: false,
    });
  }

  const catalogContext = properties
    .slice(0, 12)
    .map(
      (property) =>
        `- ${property.title} | ${property.operation} | ${property.status} | ${property.location} | direccion: ${property.exactAddress} | precio: ${property.price} ${property.currency} | tipo: ${property.propertyType} | dormitorios: ${property.bedrooms} | banos: ${property.bathrooms} | m2: ${property.area} | expensas: ${property.expenses ?? "n/d"} ${property.expensesCurrency ?? ""} | mascotas: ${property.petsPolicy || "consultar"} | requisitos: ${property.requirements || "sin requisitos cargados"} | amenities: ${property.amenities.join(", ") || "sin amenities"} | descripcion: ${property.description}`
      )
    .join("\n");

  const localReply = buildMarketplaceAssistantFallback(properties, prompt);

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
      "Sos un asesor inmobiliario digital de Props. Responde en espanol claro, breve y comercial. Solo podes recomendar propiedades del portafolio provisto. Usa direccion, moneda, requisitos, politica de mascotas, expensas, disponibilidad y amenities cuando existan. Si faltan datos, pedi presupuesto, zona y cantidad de ambientes. No inventes propiedades ni disponibilidad.",
            },
          ],
        },
        {
          role: "user",
          content: [
            {
              type: "input_text",
        text: `Portafolio disponible:\n${catalogContext}\n\nConsulta del cliente:\n${prompt}`,
            },
          ],
        },
      ],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("[public-assistant] openai error", { tenantSlug, detail: errorText });
    return NextResponse.json({
      reply: localReply,
      configured: true,
      fallback: true,
    });
  }

  const payload = (await response.json()) as Record<string, unknown>;
  const aiReply = extractResponseText(payload);

  return NextResponse.json({
    reply: aiReply || localReply,
    configured: true,
    fallback: !aiReply,
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

function buildMarketplaceAssistantFallback(properties: Property[], prompt: string) {
  const normalized = prompt.toLowerCase();
  const desiredOperation =
    normalized.includes("alquiler") || normalized.includes("alquilar")
      ? "Alquiler"
      : normalized.includes("venta") || normalized.includes("comprar") || normalized.includes("compra")
        ? "Venta"
        : null;

  const matches = properties.filter((property) => {
    if (desiredOperation && property.operation !== desiredOperation) {
      return false;
    }

    const searchable =
      `${property.title} ${property.location} ${property.exactAddress} ${property.propertyType} ${property.description}`.toLowerCase();

    const locationWords = normalized
      .split(/\s+/)
      .filter((word) => word.length > 3)
      .filter((word) => !["busco", "quiero", "alquiler", "venta", "comprar", "depto", "departamento", "casa", "ph"].includes(word));

    if (locationWords.length === 0) {
      return true;
    }

    return locationWords.some((word) => searchable.includes(word));
  });

  if (matches.length === 0) {
    const operations = desiredOperation ? ` de ${desiredOperation.toLowerCase()}` : "";
    return `No encontre propiedades${operations} que coincidan claramente con esa zona o busqueda. Si queres, decime barrio, presupuesto y cantidad de ambientes y te ayudo a afinar mejor.`;
  }

  const topMatches = matches.slice(0, 3);
  const intro =
    topMatches.length === 1
      ? "Encontre esta opcion que encaja bien con lo que buscas:"
      : "Encontre estas opciones que encajan bastante bien con lo que buscas:";

  const lines = topMatches.map((property) => {
    const price = `${property.currency === "USD" ? "US$" : "$"} ${Number(property.price).toLocaleString("es-AR")}`;
    return `- ${property.title} en ${property.location}: ${price}, ${property.bedrooms} dorm., ${property.area} m2.`;
  });

  return `${intro}\n${lines.join("\n")}\nSi queres, te recomiendo una segun presupuesto, ubicacion o tipo de operacion.`;
}
