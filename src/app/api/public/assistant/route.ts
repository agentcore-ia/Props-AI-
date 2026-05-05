import { NextResponse } from "next/server";

import { getOpenAIEnv } from "@/lib/openai-env";
import { listProperties } from "@/lib/props-data";

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
    return NextResponse.json(
      { error: "No se pudo consultar OpenAI.", detail: errorText },
      { status: 502 }
    );
  }

  const payload = (await response.json()) as { output_text?: string };

  return NextResponse.json({
    reply:
      payload.output_text ??
      "No pude generar una respuesta util esta vez. Proba reformular la consulta.",
    configured: true,
  });
}
