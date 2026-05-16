import { NextResponse } from "next/server";

import { getCurrentUserContext } from "@/lib/auth/current-user";
import { getAgencyScopeFromUser } from "@/lib/crm-automation";
import { suggestAssistantFallback } from "@/lib/crm-insights";
import { getOpenAIEnv } from "@/lib/openai-env";
import {
  getTodayWorkspaceSnapshot,
  listCrmLeads,
  listEmployeeTasks,
  listLeaseRoster,
  listProperties,
  listRentalContracts,
  listVisitAppointments,
} from "@/lib/props-data";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatMoney } from "@/lib/utils";

type AssistantHistoryItem = {
  role: "assistant" | "user";
  content: string;
};

type AssistantAction =
  | "answer"
  | "register_collection"
  | "generate_settlement"
  | "record_transfer"
  | "record_cash_movement"
  | "start_rescission";

type AssistantActionResult = {
  type: AssistantAction;
  status: "success" | "error" | "clarify";
  title: string;
  details: string;
};

type AssistantContractContext = {
  contractId: string;
  propertyId: string;
  agencyId: string;
  tenantName: string;
  propertyTitle: string;
  propertyLocation: string;
  currentRent: number;
  ownerName: string | null;
};

function clip(text: string, maxLength: number) {
  return text.length > maxLength ? `${text.slice(0, maxLength)}...` : text;
}

function normalizeText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function extractAmount(prompt: string) {
  const matches = prompt.match(/(?:\$|ars|usd)?\s*([\d][\d\.\,]*)/gi);
  if (!matches?.length) {
    return null;
  }

  const parsed = matches
    .map((item) => Number(item.replace(/[^\d]/g, "")))
    .filter((value) => Number.isFinite(value) && value > 0);

  return parsed.length > 0 ? parsed[0] : null;
}

function extractPaymentMethod(prompt: string) {
  const normalized = normalizeText(prompt);
  if (normalized.includes("efectivo")) return "Efectivo";
  if (normalized.includes("mercado pago")) return "Mercado Pago";
  if (normalized.includes("debito")) return "Debito";
  if (normalized.includes("credito")) return "Credito";
  return "Transferencia";
}

function currentMonthLabel() {
  return new Date().toISOString().slice(0, 7);
}

function inferAssistantAction(prompt: string): AssistantAction {
  const normalized = normalizeText(prompt);

  if (/(como hago|como genero|como registro|como cargo|como puedo|donde|que hace|que puedo|ayuda|explicame)/.test(normalized)) {
    return "answer";
  }

  if (/(ya pago|ya pago|pago el alquiler|pago alquiler|registrar pago|registrame el pago|cobro alquiler|cobranza)/.test(normalized)) {
    return "register_collection";
  }

  if (/(liquida|liquidacion|liquidar).*(propiet)/.test(normalized) || /genera.*liquidacion/.test(normalized)) {
    return "generate_settlement";
  }

  if (/(transferi|transferir|transferencia|paga al propietario|pagale al propietario)/.test(normalized)) {
    return "record_transfer";
  }

  if (/(movimiento de caja|caja|registrar gasto|registrar ingreso|registrar egreso)/.test(normalized)) {
    return "record_cash_movement";
  }

  if (/(rescision|rescindir|rescindir|dar de baja el contrato|terminar contrato)/.test(normalized)) {
    return "start_rescission";
  }

  return "answer";
}

function getDeterministicHelp(prompt: string) {
  const normalized = normalizeText(prompt);

  if (normalized.includes("liquidacion") && normalized.includes("propiet")) {
    return [
      "Para generar una liquidacion al propietario:",
      "1. Primero registra la cobranza del inquilino en Cobranzas.",
      "2. Anda a Alquileres y verifica que el contrato tenga propietario, porcentaje y comision.",
      "3. Toca Generar liquidaciones del mes o Liquidar propietario en ese contrato.",
      "4. Si hace falta, agrega conceptos particulares como arreglos, honorarios o descuentos.",
      "5. Luego podes registrar la transferencia al propietario desde Transferencias.",
      "",
      "Tambien podes pedirmelo directo, por ejemplo: genera la liquidacion del propietario de Maria Gomez.",
    ].join("\n");
  }

  if (normalized.includes("cobranza") || normalized.includes("pago") || normalized.includes("alquiler")) {
    return [
      "Para registrar un pago de alquiler podes hacerlo desde Cobranzas o pedirmelo aca.",
      "Ejemplo: ya pago Maria Gomez el alquiler de este mes.",
      "Si no indicas monto, uso el alquiler actual del contrato. Si hay mas de un contrato parecido, te voy a pedir que aclares cual es.",
    ].join("\n");
  }

  if (normalized.includes("caja")) {
    return [
      "Para registrar caja, decime si es ingreso o egreso, el monto y el motivo.",
      "Ejemplo: registra un gasto de caja de 25000 por cerrajeria.",
      "Eso queda asentado en la seccion Caja como movimiento operativo.",
    ].join("\n");
  }

  return null;
}

function buildSectionGuide() {
  return [
    "Dashboard: muestra urgencias, tareas, visitas, seguimientos automaticos y actividad reciente.",
    "Mensajes: bandeja unica para web y WhatsApp con historial, respuestas rapidas y contexto de propiedad.",
    "Leads: perfil del cliente, score, objeciones, propiedades vistas y siguiente accion sugerida.",
    "Propiedades: alta y edicion de publicaciones, fotos, requisitos, direccion exacta y estado comercial.",
    "Alquileres: contratos, ajustes, liquidaciones, rescisiones y documentacion.",
    "Propietarios: relacion por propietario, participacion, liquidaciones emitidas y netos.",
    "Cobranzas: registrar cobros de inquilinos y controlar estado del periodo.",
    "Transferencias: registrar pagos al propietario y dejar trazabilidad.",
    "Caja: ingresos, egresos y movimientos operativos.",
    "Proveedores y Facturacion: alta de proveedores, facturas y gastos administrativos.",
  ].join("\n");
}

function buildContractsForAssistant(input: {
  leases: Awaited<ReturnType<typeof listLeaseRoster>>;
  contracts: Awaited<ReturnType<typeof listRentalContracts>>;
}) {
  const leaseById = new Map(input.leases.map((lease) => [lease.contractId, lease]));
  return input.contracts.map<AssistantContractContext>((contract) => {
    const lease = leaseById.get(contract.id);
    return {
      contractId: contract.id,
      propertyId: contract.propertyId,
      agencyId: contract.agencyId,
      tenantName: contract.tenantName,
      propertyTitle: lease?.propertyTitle ?? "Propiedad",
      propertyLocation: lease?.propertyLocation ?? "",
      currentRent: contract.currentRent,
      ownerName: contract.owners[0]?.fullName ?? contract.ownerName ?? null,
    };
  });
}

function resolveContractFromPrompt(prompt: string, contracts: AssistantContractContext[]) {
  const normalizedPrompt = normalizeText(prompt);
  const scored = contracts
    .map((contract) => {
      const tenant = normalizeText(contract.tenantName);
      const propertyTitle = normalizeText(contract.propertyTitle);
      const propertyLocation = normalizeText(contract.propertyLocation);
      let score = 0;

      if (tenant && normalizedPrompt.includes(tenant)) score += 12;
      if (propertyTitle && normalizedPrompt.includes(propertyTitle)) score += 10;
      if (propertyLocation && normalizedPrompt.includes(propertyLocation)) score += 5;

      for (const token of tenant.split(" ")) {
        if (token.length >= 3 && normalizedPrompt.includes(token)) score += 2;
      }
      for (const token of propertyTitle.split(" ")) {
        if (token.length >= 4 && normalizedPrompt.includes(token)) score += 1;
      }
      for (const token of propertyLocation.split(" ")) {
        if (token.length >= 4 && normalizedPrompt.includes(token)) score += 1;
      }

      return { contract, score };
    })
    .sort((a, b) => b.score - a.score);

  if (!scored.length || scored[0].score < 2) {
    return { contract: null, alternatives: [] as AssistantContractContext[] };
  }

  const bestScore = scored[0].score;
  const alternatives = scored.filter((item) => item.score >= bestScore - 1).slice(0, 3).map((item) => item.contract);
  return { contract: scored[0].contract, alternatives };
}

async function callInternalAction(request: Request, path: string, body: Record<string, unknown>, method = "POST") {
  const origin = new URL(request.url).origin;
  const response = await fetch(`${origin}${path}`, {
    method,
    headers: {
      "content-type": "application/json",
      cookie: request.headers.get("cookie") ?? "",
    },
    body: JSON.stringify(body),
    cache: "no-store",
  });

  const payload = await response.json().catch(() => null);
  return { ok: response.ok, payload, status: response.status };
}

async function answerWithOpenAI(input: {
  openAI: ReturnType<typeof getOpenAIEnv>;
  prompt: string;
  history: AssistantHistoryItem[];
  propertyContext: string;
  leadsContext: string;
  visitsContext: string;
  tasksContext: string;
  contractsContext: string;
  sectionGuide: string;
  todaySnapshot: Awaited<ReturnType<typeof getTodayWorkspaceSnapshot>>;
}) {
  const historyContext = input.history
    .slice(-6)
    .map((item) => `${item.role === "assistant" ? "Props AI" : "Equipo"}: ${clip(item.content, 600)}`)
    .join("\n");

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${input.openAI.apiKey}`,
    },
    body: JSON.stringify({
      model: input.openAI.model,
      input: [
        {
          role: "system",
          content: [
            {
              type: "input_text",
              text:
                "Sos Props AI, un copiloto para equipos inmobiliarios. Responde en espanol claro, corto y accionable. Puedes ayudar a operar el CRM, explicar como hacer tareas y orientar al equipo. Si faltan datos para ejecutar una accion, dilo con precision. No inventes estados ni resultados. Si el usuario pregunta como usar una seccion, explicalo con pasos concretos.",
            },
          ],
        },
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text: `Guia de secciones:\n${input.sectionGuide}\n\nPropiedades:\n${input.propertyContext}\n\nLeads:\n${input.leadsContext}\n\nVisitas:\n${input.visitsContext}\n\nTareas:\n${input.tasksContext}\n\nContratos:\n${input.contractsContext}\n\nPanel de hoy: tareas ${input.todaySnapshot.counters.pendingTasks}, visitas ${input.todaySnapshot.counters.visitsToday}, leads urgentes ${input.todaySnapshot.counters.urgentLeads}, seguimientos ${input.todaySnapshot.counters.automaticFollowUps}.\n\nHistorial reciente:\n${historyContext || "Sin historial previo."}\n\nConsulta del equipo:\n${input.prompt}`,
            },
          ],
        },
      ],
    }),
  });

  if (!response.ok) {
    const detail = await response.text();
    return { ok: false, error: detail };
  }

  const payload = (await response.json()) as { output_text?: string };
  return { ok: true, reply: payload.output_text?.trim() ?? "" };
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
  const history = Array.isArray(body?.history)
    ? (body.history as AssistantHistoryItem[])
        .filter((item) => item && (item.role === "assistant" || item.role === "user") && typeof item.content === "string")
        .map((item) => ({ role: item.role, content: item.content.trim() }))
        .filter((item) => item.content)
    : [];

  if (!prompt) {
    return NextResponse.json({ error: "Escribe una consulta para Props AI." }, { status: 400 });
  }

  const scope = getAgencyScopeFromUser(current);
  const [properties, leads, visits, tasks, contracts, leases, today] = await Promise.all([
    listProperties(scope?.agencySlug ? { tenantSlug: scope.agencySlug } : undefined),
    listCrmLeads(scope),
    listVisitAppointments(scope),
    listEmployeeTasks(scope),
    listRentalContracts(scope),
    listLeaseRoster(scope),
    getTodayWorkspaceSnapshot(scope),
  ]);

  const assistantContracts = buildContractsForAssistant({ leases, contracts });
  const propertyContext = properties
    .slice(0, 18)
    .map((property) => {
      const rentalContext = property.rentalContract
        ? ` | contrato: ${property.rentalContract.status}, ${property.rentalContract.indexType} cada ${property.rentalContract.adjustmentFrequencyMonths} meses, alquiler actual ${property.rentalContract.currentRent}, contrato adjunto: ${property.rentalContract.contractFileName ?? "no"}, resumen: ${clip(property.rentalContract.contractText, 900)}`
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
    .map((visit) => `- ${visit.leadName} | ${visit.propertyTitle ?? "propiedad"} | ${visit.status} | ${visit.scheduledFor}`)
    .join("\n");
  const contractsContext = assistantContracts
    .slice(0, 12)
    .map(
      (contract) =>
        `- ${contract.tenantName} | ${contract.propertyTitle} | ${contract.propertyLocation} | alquiler ${contract.currentRent} | propietario ${contract.ownerName ?? "sin definir"}`
    )
    .join("\n");

  const openAI = getOpenAIEnv();
  const inferredAction = inferAssistantAction(prompt);
  const deterministicHelp = inferredAction === "answer" ? getDeterministicHelp(prompt) : null;

  if (deterministicHelp) {
    return NextResponse.json({
      reply: deterministicHelp,
      configured: openAI.configured,
    });
  }

  if (current.profile.role !== "superadmin" && inferredAction === "record_cash_movement") {
    const amount = extractAmount(prompt);
    if (!amount) {
      return NextResponse.json({
        reply: "Para registrar un movimiento de caja necesito al menos el monto. Ejemplo: registra un gasto de caja de 25000 por cerrajeria.",
        configured: openAI.configured,
        actionResult: {
          type: inferredAction,
          status: "clarify",
          title: "Falta el monto del movimiento",
          details: "Indica monto y, si puedes, categoria o referencia.",
        } satisfies AssistantActionResult,
      });
    }

    const normalized = normalizeText(prompt);
    const kind = normalized.includes("egreso") || normalized.includes("gasto") ? "Egreso" : "Ingreso";
    const category = normalized.includes("cerrajer")
      ? "Cerrajeria"
      : normalized.includes("luz") || normalized.includes("edenor")
        ? "Servicios"
        : normalized.includes("gas")
          ? "Servicios"
          : normalized.includes("honorario")
            ? "Honorarios"
            : "Movimiento manual";

    const admin = createAdminClient();
    const { data: agency, error: agencyError } = await admin
      .from("agencies")
      .select("id")
      .eq("slug", current.profile.agency_slug)
      .maybeSingle();

    if (agencyError || !agency) {
      return NextResponse.json({
        reply: "No pude registrar el movimiento porque no encontre la inmobiliaria de esta cuenta.",
        configured: openAI.configured,
        actionResult: {
          type: inferredAction,
          status: "error",
          title: "No se pudo registrar el movimiento",
          details: "Revisa que tu usuario tenga una inmobiliaria asignada.",
        } satisfies AssistantActionResult,
      });
    }

    const { error: insertError } = await admin.from("cash_movements").insert({
      agency_id: agency.id,
      occurred_on: new Date().toISOString().slice(0, 10),
      kind,
      category,
      amount,
      reference: prompt,
      notes: `Registrado por Props AI desde dashboard: ${prompt}`,
      created_by: current.user.id,
    });

    if (insertError) {
      return NextResponse.json({
        reply: insertError.message,
        configured: openAI.configured,
        actionResult: {
          type: inferredAction,
          status: "error",
          title: "No se pudo registrar el movimiento",
          details: insertError.message,
        } satisfies AssistantActionResult,
      });
    }

    return NextResponse.json({
      reply: `Listo. Registre un movimiento de caja de ${formatMoney(amount, "ARS")} como ${kind.toLowerCase()} en ${category}.`,
      configured: openAI.configured,
      actionResult: {
        type: inferredAction,
        status: "success",
        title: "Movimiento de caja registrado",
        details: `${kind} · ${category} · ${formatMoney(amount, "ARS")}`,
      } satisfies AssistantActionResult,
    });
  }

  if (current.profile.role !== "superadmin" && inferredAction !== "answer") {
    const { contract, alternatives } = resolveContractFromPrompt(prompt, assistantContracts);

    if (!contract) {
      const alternativesLabel =
        alternatives.length > 0
          ? ` Las opciones mas cercanas son: ${alternatives.map((item) => `${item.tenantName} (${item.propertyTitle})`).join(", ")}.`
          : "";

      return NextResponse.json({
        reply: `Necesito que me aclares de que contrato hablas para ejecutar esa accion.${alternativesLabel}`,
        configured: openAI.configured,
        actionResult: {
          type: inferredAction,
          status: "clarify",
          title: "Falta identificar el contrato",
          details: "Indica nombre del inquilino, propiedad o barrio para ejecutar la accion correcta.",
        } satisfies AssistantActionResult,
      });
    }

    if (inferredAction === "register_collection") {
      const collectedAmount = extractAmount(prompt) ?? contract.currentRent;
      const paymentMethod = extractPaymentMethod(prompt);
      const status = collectedAmount >= contract.currentRent ? "Cobrada" : collectedAmount > 0 ? "Parcial" : "Pendiente";
      const admin = createAdminClient();
      const { error: upsertError } = await admin.from("rental_collections").upsert(
        {
          contract_id: contract.contractId,
          property_id: contract.propertyId,
          agency_id: contract.agencyId,
          collection_month: currentMonthLabel(),
          expected_rent: contract.currentRent,
          collected_amount: collectedAmount,
          payment_method: paymentMethod,
          payment_date: new Date().toISOString().slice(0, 10),
          status,
          notes: `Registrado por Props AI desde dashboard: ${prompt}`,
          created_by: current.user.id,
        },
        { onConflict: "contract_id,collection_month" }
      );

      if (upsertError) {
        return NextResponse.json({
          reply: upsertError.message,
          configured: openAI.configured,
          actionResult: {
            type: inferredAction,
            status: "error",
            title: "No se pudo registrar el pago",
            details: upsertError.message,
          } satisfies AssistantActionResult,
        });
      }

      return NextResponse.json({
        reply: `Listo. Registre la cobranza de ${contract.tenantName} por ${formatMoney(collectedAmount, "ARS")} con ${paymentMethod}. Ya te queda asentada en Cobranzas para ${contract.propertyTitle}.`,
        configured: openAI.configured,
        actionResult: {
          type: inferredAction,
          status: "success",
          title: "Cobranza registrada",
          details: `${contract.tenantName} · ${contract.propertyTitle} · ${formatMoney(collectedAmount, "ARS")} · ${paymentMethod}`,
        } satisfies AssistantActionResult,
      });
    }

    if (inferredAction === "generate_settlement") {
      const result = await callInternalAction(
        request,
        "/api/admin/owner-settlements",
        {
          contractId: contract.contractId,
        },
        "POST"
      );

      if (!result.ok) {
        return NextResponse.json({
          reply: result.payload?.error ?? "No pude generar la liquidacion.",
          configured: openAI.configured,
          actionResult: {
            type: inferredAction,
            status: "error",
            title: "No se pudo generar la liquidacion",
            details: result.payload?.error ?? "Revisa propietarios, cobranza y configuracion del contrato.",
          } satisfies AssistantActionResult,
        });
      }

      return NextResponse.json({
        reply: `Listo. Genere la liquidacion del mes para ${contract.propertyTitle}. Si queres, ahora te ayudo con la transferencia al propietario.`,
        configured: openAI.configured,
        actionResult: {
          type: inferredAction,
          status: "success",
          title: "Liquidacion emitida",
          details: `${contract.propertyTitle} · ${contract.tenantName} · ${result.payload?.settlementMonth ?? "mes actual"}`,
        } satisfies AssistantActionResult,
      });
    }

    if (inferredAction === "record_transfer") {
      const amount = extractAmount(prompt) ?? null;
      const result = await callInternalAction(
        request,
        "/api/admin/owner-transfers",
        {
          contractId: contract.contractId,
          amount,
          notes: `Registrado por Props AI desde dashboard: ${prompt}`,
        },
        "POST"
      );

      if (!result.ok) {
        return NextResponse.json({
          reply: result.payload?.error ?? "No pude registrar la transferencia.",
          configured: openAI.configured,
          actionResult: {
            type: inferredAction,
            status: "error",
            title: "No se pudo registrar la transferencia",
            details: result.payload?.error ?? "Revisa el propietario o la liquidacion asociada.",
          } satisfies AssistantActionResult,
        });
      }

      return NextResponse.json({
        reply: `Listo. Registre la transferencia al propietario de ${contract.propertyTitle} por ${formatMoney(Number(result.payload?.amount ?? amount ?? 0), "ARS")}.`,
        configured: openAI.configured,
        actionResult: {
          type: inferredAction,
          status: "success",
          title: "Transferencia registrada",
          details: `${contract.ownerName ?? "Propietario"} · ${formatMoney(Number(result.payload?.amount ?? amount ?? 0), "ARS")} · ${contract.propertyTitle}`,
        } satisfies AssistantActionResult,
      });
    }

    if (inferredAction === "start_rescission") {
      const result = await callInternalAction(
        request,
        "/api/admin/contract-rescissions",
        {
          contractId: contract.contractId,
          reason: `Iniciada desde Props AI: ${prompt}`,
          settlementTerms: "Pendiente de definir penalidad, deuda, entrega y cierre operativo.",
          status: "En negociacion",
        },
        "POST"
      );

      if (!result.ok) {
        return NextResponse.json({
          reply: result.payload?.error ?? "No pude iniciar la rescision.",
          configured: openAI.configured,
          actionResult: {
            type: inferredAction,
            status: "error",
            title: "No se pudo iniciar la rescision",
            details: result.payload?.error ?? "Revisa el contrato e intenta nuevamente.",
          } satisfies AssistantActionResult,
        });
      }

      return NextResponse.json({
        reply: `Listo. Inicie la rescision contractual para ${contract.tenantName} en ${contract.propertyTitle}.`,
        configured: openAI.configured,
        actionResult: {
          type: inferredAction,
          status: "success",
          title: "Rescision iniciada",
          details: `${contract.tenantName} · ${contract.propertyTitle}`,
        } satisfies AssistantActionResult,
      });
    }
  }

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

  const answer = await answerWithOpenAI({
    openAI,
    prompt,
    history,
    propertyContext,
    leadsContext,
    visitsContext,
    tasksContext,
    contractsContext,
    sectionGuide: buildSectionGuide(),
    todaySnapshot: today,
  });

  if (!answer.ok) {
    return NextResponse.json({ error: "No se pudo consultar OpenAI.", detail: answer.error }, { status: 502 });
  }

  return NextResponse.json({
    reply:
      answer.reply ||
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
