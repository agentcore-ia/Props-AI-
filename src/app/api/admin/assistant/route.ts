import { NextResponse } from "next/server";

import { getCurrentUserContext } from "@/lib/auth/current-user";
import { getOpenAIEnv } from "@/lib/openai-env";
import { listProperties } from "@/lib/props-data";

function clip(text: string, maxLength: number) {
  return text.length > maxLength ? `${text.slice(0, maxLength)}...` : text;
}

export async function POST(request: Request) {
  const current = await getCurrentUserContext();

  if (!current) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  if (!["superadmin", "agency_admin", "agent"].includes(current.profile.role)) {
    return NextResponse.json({ error: "No tienes permisos para usar el copiloto." }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const prompt = String(body?.prompt ?? "").trim();

  if (!prompt) {
    return NextResponse.json({ error: "Escribe una consulta para Props AI." }, { status: 400 });
  }

  const properties = await listProperties(
    current.profile.role === "agency_admin" && current.profile.agency_slug
      ? { tenantSlug: current.profile.agency_slug }
      : undefined
  );

  const propertyContext = properties
    .slice(0, 18)
    .map((property) => {
      const rentalContext = property.rentalContract
        ? ` | contrato: ${property.rentalContract.status}, ${property.rentalContract.indexType} cada ${property.rentalContract.adjustmentFrequencyMonths} meses, alquiler actual ${property.rentalContract.currentRent}, contrato adjunto: ${property.rentalContract.contractFileName ?? "no"}, resumen: ${clip(property.rentalContract.contractText, 1600)}`
        : "";

      return `- ${property.title} | ${property.operation} | ${property.status} | ${property.location} | precio ${property.price}${rentalContext}`;
    })
    .join("\n");

  const openAI = getOpenAIEnv();

  if (!openAI.configured) {
    return NextResponse.json({
      reply:
        "La IA real todavia no esta configurada en este entorno. Igual ya puedo guardar contratos y dejarlos listos para analisis cuando conectes OpenAI.",
      configured: false,
    });
  }

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
                "Sos Props AI, un copiloto para equipos inmobiliarios. Responde en espanol claro y accionable. Puedes usar la informacion de propiedades y contratos adjuntos. Si te piden interpretar un contrato, resume clausulas, riesgos, fechas, ajustes y proximos pasos sin inventar datos faltantes.",
            },
          ],
        },
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text: `Contexto del CRM:\n${propertyContext}\n\nConsulta del equipo:\n${prompt}`,
            },
          ],
        },
      ],
    }),
  });

  if (!response.ok) {
    const detail = await response.text();
    return NextResponse.json({ error: "No se pudo consultar OpenAI.", detail }, { status: 502 });
  }

  const payload = (await response.json()) as { output_text?: string };

  return NextResponse.json({
    reply:
      payload.output_text ??
      "No pude generar una respuesta util esta vez. Proba con otra pregunta o mas contexto.",
    configured: true,
  });
}
