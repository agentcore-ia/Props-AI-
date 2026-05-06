import { NextResponse } from "next/server";

import { getCurrentUserContext } from "@/lib/auth/current-user";
import { getAgencyScopeFromUser } from "@/lib/crm-automation";
import { suggestAssistantFallback } from "@/lib/crm-insights";
import { getOpenAIEnv } from "@/lib/openai-env";
import {
  getTodayWorkspaceSnapshot,
  listCrmLeads,
  listEmployeeTasks,
  listProperties,
  listRentalContracts,
  listVisitAppointments,
} from "@/lib/props-data";

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

  const scope = getAgencyScopeFromUser(current);
  const [properties, leads, visits, tasks, contracts, today] = await Promise.all([
    listProperties(scope?.agencySlug ? { tenantSlug: scope.agencySlug } : undefined),
    listCrmLeads(scope),
    listVisitAppointments(scope),
    listEmployeeTasks(scope),
    listRentalContracts(scope),
    getTodayWorkspaceSnapshot(scope),
  ]);

  const propertyContext = properties
    .slice(0, 18)
    .map((property) => {
      const rentalContext = property.rentalContract
        ? ` | contrato: ${property.rentalContract.status}, ${property.rentalContract.indexType} cada ${property.rentalContract.adjustmentFrequencyMonths} meses, alquiler actual ${property.rentalContract.currentRent}, contrato adjunto: ${property.rentalContract.contractFileName ?? "no"}, resumen: ${clip(property.rentalContract.contractText, 1600)}`
        : "";

      return `- ${property.title} | ${property.operation} | ${property.status} | ${property.location} | precio ${property.price}${rentalContext}`;
    })
    .join("\n");
  const leadsContext = leads
    .slice(0, 10)
    .map(
      (lead) =>
        `- ${lead.fullName} | etapa ${lead.stage} | prioridad ${lead.priority} | score ${lead.score} | busca ${lead.desiredOperation ?? lead.propertyOperation ?? "sin definir"} en ${lead.desiredLocation ?? lead.propertyLocation ?? "sin zona"} | ultimo mensaje: ${clip(lead.lastCustomerMessage, 240)}`
    )
    .join("\n");
  const tasksContext = tasks
    .slice(0, 10)
    .map((task) => `- ${task.title} | ${task.priority} | vence ${task.dueAt} | ${clip(task.details, 200)}`)
    .join("\n");
  const visitsContext = visits
    .slice(0, 10)
    .map(
      (visit) =>
        `- ${visit.leadName} | ${visit.propertyTitle ?? "propiedad"} | ${visit.status} | ${visit.scheduledFor}`
    )
    .join("\n");
  const contractsContext = contracts
    .slice(0, 10)
    .map(
      (contract) =>
        `- ${contract.tenantName} | ${contract.status} | ${contract.indexType} cada ${contract.adjustmentFrequencyMonths} meses | proximo ajuste ${contract.nextAdjustmentDate}`
    )
    .join("\n");

  const openAI = getOpenAIEnv();

  if (!openAI.configured) {
    return NextResponse.json({
      reply: suggestAssistantFallback({
        prompt,
        leads,
        tasks,
        visits,
        properties,
      }),
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
                "Sos Props AI, un copiloto para equipos inmobiliarios. Responde en espanol claro y accionable. Ayuda a empleados a contestar mejor, resumir contratos, detectar objeciones, sugerir propiedades similares y priorizar tareas del dia. Se muy concreto. Si faltan datos, dilo. No inventes disponibilidad ni condiciones.",
            },
          ],
        },
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text: `Contexto del CRM:\nPropiedades:\n${propertyContext}\n\nLeads:\n${leadsContext}\n\nVisitas:\n${visitsContext}\n\nTareas:\n${tasksContext}\n\nContratos:\n${contractsContext}\n\nPanel de hoy: tareas ${today.counters.pendingTasks}, visitas ${today.counters.visitsToday}, leads urgentes ${today.counters.urgentLeads}, seguimientos ${today.counters.automaticFollowUps}.\n\nConsulta del equipo:\n${prompt}`,
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
      payload.output_text?.trim() ||
      suggestAssistantFallback({
        prompt,
        leads,
        tasks,
        visits,
        properties,
      }),
    configured: true,
  });
}
