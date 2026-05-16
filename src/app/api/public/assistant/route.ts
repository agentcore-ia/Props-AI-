import { NextResponse } from "next/server";

import { getOpenAIEnv } from "@/lib/openai-env";
import { buildShortPropertyPath } from "@/lib/property-links";
import { listProperties } from "@/lib/props-data";
import type { Property } from "@/lib/mock-data";

export async function POST(request: Request) {
  const body = await request.json();
  const tenantSlug = String(body.tenantSlug ?? "").trim().toLowerCase();
  const prompt = String(body.prompt ?? "").trim();

  if (!prompt) {
    return NextResponse.json(
      { error: "Falta la consulta." },
      { status: 400 }
    );
  }

  const properties = await listProperties(tenantSlug ? { tenantSlug } : undefined);

  if (properties.length === 0) {
    return NextResponse.json({
      reply:
        tenantSlug
          ? "Todavia no hay propiedades publicadas para este portafolio. Proba de nuevo mas tarde o dejanos tu consulta."
          : "Todavia no hay propiedades publicadas en este momento. Proba de nuevo mas tarde o dejanos tu consulta.",
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

  const assistantHints = buildAssistantHints(properties, prompt);
  const localReply = buildMarketplaceAssistantFallback(properties, prompt, assistantHints);
  const suggestions = buildAssistantSuggestions(
    assistantHints.exactMatches.length > 0
      ? assistantHints.exactMatches
      : assistantHints.suggestedMatches
  );

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
                "Sos un asesor inmobiliario digital de Props. Responde en espanol rioplatense, con tono humano y comercial. Responde siempre corto: 1 a 3 frases. No listes propiedades con detalle tecnico ni en bullets largos porque la interfaz ya mostrara fichas visuales. Usa el texto solo para orientar, comparar y pedir el dato minimo que falta. Si no hay coincidencia exacta, ofrece alternativas cercanas y pregunta por barrio, presupuesto o ambientes. Nunca inventes disponibilidad, fotos ni propiedades.",
            },
          ],
        },
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text: `Inventario disponible:\n${catalogContext}\n\nSugerencias internas del buscador:\n${assistantHints.debugSummary}\n\nConsulta del cliente:\n${prompt}`,
            },
          ],
        },
      ],
      max_output_tokens: 220,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("[public-assistant] openai error", { tenantSlug, detail: errorText });
    return NextResponse.json({
      reply: localReply,
      suggestions,
      configured: true,
      fallback: true,
    });
  }

  const payload = (await response.json()) as Record<string, unknown>;
  const aiReply = extractResponseText(payload);

  return NextResponse.json({
    reply: sanitizeAssistantReply(aiReply || localReply),
    suggestions,
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

type PropertyMatch = {
  property: Property;
  score: number;
};

type AssistantHints = {
  desiredOperation: Property["operation"] | null;
  inferredPlaces: string[];
  exactMatches: PropertyMatch[];
  suggestedMatches: PropertyMatch[];
  debugSummary: string;
};

type AssistantSuggestion = {
  id: string;
  title: string;
  location: string;
  price: number;
  currency: Property["currency"];
  operation: Property["operation"];
  image: string;
  routeHref: string;
  bedrooms: number;
  bathrooms: number;
  area: number;
};

function buildAssistantHints(properties: Property[], prompt: string): AssistantHints {
  const normalizedPrompt = normalizeText(prompt);
  const desiredOperation = inferOperation(normalizedPrompt);
  const promptTokens = extractMeaningfulTokens(normalizedPrompt);
  const inferredPlaces = Array.from(
    new Set(
      properties
        .flatMap((property) => buildLocationTokens(property))
        .filter((token) => normalizedPrompt.includes(token))
    )
  );

  const scoredMatches = properties
    .map((property) => ({
      property,
      score: scorePropertyMatch(property, promptTokens, desiredOperation, inferredPlaces),
    }))
    .filter((item) => item.score > 0)
    .sort((left, right) => right.score - left.score);

  const exactMatches = scoredMatches.filter((item) => item.score >= 8).slice(0, 3);
  const fallbackPool = (exactMatches.length > 0 ? scoredMatches : scoredMatches.filter((item) => item.score >= 3)).slice(0, 3);
  const suggestedMatches =
    fallbackPool.length > 0
      ? fallbackPool
      : properties
          .filter((property) => !desiredOperation || property.operation === desiredOperation)
          .slice(0, 3)
          .map((property) => ({ property, score: 1 }));

  return {
    desiredOperation,
    inferredPlaces,
    exactMatches,
    suggestedMatches,
    debugSummary: [
      `operacion inferida: ${desiredOperation ?? "sin definir"}`,
      inferredPlaces.length > 0 ? `zonas detectadas: ${inferredPlaces.join(", ")}` : "zonas detectadas: ninguna",
      exactMatches.length > 0
        ? `coincidencias fuertes: ${exactMatches.map((item) => `${item.property.title} (${item.property.location})`).join(" | ")}`
        : "coincidencias fuertes: ninguna",
      suggestedMatches.length > 0
        ? `alternativas sugeridas: ${suggestedMatches.map((item) => `${item.property.title} (${item.property.location})`).join(" | ")}`
        : "alternativas sugeridas: ninguna",
    ].join("\n"),
  };
}

function buildMarketplaceAssistantFallback(
  properties: Property[],
  prompt: string,
  hints: AssistantHints
) {
  const source = hints.exactMatches.length > 0 ? hints.exactMatches : hints.suggestedMatches;

  if (source.length === 0) {
    const operations = hints.desiredOperation ? ` de ${hints.desiredOperation.toLowerCase()}` : "";
    return `No vi opciones${operations} que coincidan bien con eso. Decime barrio, presupuesto o ambientes y te propongo alternativas concretas.`;
  }

  return (
    hints.exactMatches.length > 0
      ? "Te encontre opciones que pueden servirte."
      : hints.inferredPlaces.length > 0
        ? `No encontre una coincidencia exacta en ${hints.inferredPlaces[0]}, pero te dejo alternativas cercanas.`
        : "No encontre una coincidencia exacta, pero te dejo opciones parecidas."
  );
}

function inferOperation(normalizedPrompt: string): Property["operation"] | null {
  if (/(alquiler|alquilar|renta|rentar|alquilo)/.test(normalizedPrompt)) {
    return "Alquiler";
  }

  if (/(venta|comprar|compra|inversion|invertir)/.test(normalizedPrompt)) {
    return "Venta";
  }

  return null;
}

function scorePropertyMatch(
  property: Property,
  promptTokens: string[],
  desiredOperation: Property["operation"] | null,
  inferredPlaces: string[]
) {
  let score = 0;
  const searchable = buildSearchableText(property);
  const locationTokens = buildLocationTokens(property);

  if (desiredOperation && property.operation === desiredOperation) {
    score += 4;
  }

  for (const place of inferredPlaces) {
    if (locationTokens.includes(place)) {
      score += 6;
    }
  }

  for (const token of promptTokens) {
    if (locationTokens.includes(token)) {
      score += 4;
      continue;
    }

    if (searchable.includes(token)) {
      score += 2;
    }
  }

  if (promptTokens.some((token) => isPropertyTypeToken(token, property.propertyType))) {
    score += 2;
  }

  return score;
}

function buildSearchableText(property: Property) {
  return normalizeText(
    [
      property.title,
      property.location,
      property.exactAddress,
      property.propertyType,
      property.description,
      property.requirements,
      property.petsPolicy,
      property.operation,
      property.status,
      ...property.amenities,
    ].join(" ")
  );
}

function buildLocationTokens(property: Property) {
  const base = normalizeText(`${property.location} ${property.exactAddress}`);
  const tokens = extractMeaningfulTokens(base);
  const aliases: string[] = [];

  if (base.includes("caba") || base.includes("ciudad autonoma") || base.includes("buenos aires")) {
    aliases.push("caba", "capital", "capital federal", "buenos aires");
  }

  return Array.from(new Set([...tokens, ...aliases]));
}

function extractMeaningfulTokens(normalizedText: string) {
  const stopWords = new Set([
    "busco",
    "quiero",
    "necesito",
    "alquiler",
    "alquilar",
    "venta",
    "comprar",
    "compra",
    "depto",
    "departamento",
    "casa",
    "ph",
    "con",
    "para",
    "por",
    "del",
    "las",
    "los",
    "una",
    "uno",
    "que",
    "zona",
    "propiedad",
    "propiedades",
  ]);

  return normalizedText
    .split(/[^a-z0-9]+/)
    .map((token) => token.trim())
    .filter((token) => token.length >= 3 && !stopWords.has(token));
}

function normalizeText(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function isPropertyTypeToken(token: string, propertyType: Property["propertyType"]) {
  const normalizedType = normalizeText(propertyType);
  return normalizedType.includes(token) || token.includes(normalizedType);
}

function buildAssistantSuggestions(matches: PropertyMatch[]): AssistantSuggestion[] {
  return matches.slice(0, 3).map(({ property }) => ({
    id: property.id,
    title: property.title,
    location: property.location,
    price: property.price,
    currency: property.currency,
    operation: property.operation,
    image: property.image,
    routeHref: buildShortPropertyPath(property.tenantSlug, property.id),
    bedrooms: property.bedrooms,
    bathrooms: property.bathrooms,
    area: property.area,
  }));
}

function sanitizeAssistantReply(reply: string) {
  return reply
    .replace(/\*\*/g, "")
    .replace(/__+/g, "")
    .replace(/^- /gm, "• ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
