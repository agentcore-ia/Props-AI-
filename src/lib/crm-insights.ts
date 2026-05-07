import type { Property } from "@/lib/mock-data";
import type {
  AgencyMessageTemplateKey,
  AgencyMessageTemplateSummary,
  CrmLeadMessageSummary,
  CrmLeadSummary,
  EmployeeTaskSummary,
  VisitAppointmentSummary,
} from "@/lib/crm-types";
import { buildGoogleMapsExternalUrl, formatMoney } from "@/lib/utils";

export type ConversationStatus = "Nuevo" | "Esperando respuesta" | "Visita" | "Cerrado";

export type LeadScoreReason = {
  label: string;
  detail: string;
};

export type LeadProfileSnapshot = {
  whatTheySeek: string;
  viewedProperties: string[];
  whatTheyAsked: string[];
  whatWeAnswered: string[];
  objections: string[];
  closeProbability: {
    label: string;
    detail: string;
    percentage: number;
  };
  nextAction: string;
};

export type QuickReplyScenario = {
  key: string;
  label: string;
  message: string;
  tone?: "default" | "outline";
};

export type PropertyHealthItem = {
  propertyId: string;
  title: string;
  operation: Property["operation"];
  location: string;
  leadsCount: number;
  visitsCount: number;
  openLeadsCount: number;
  imageCount: number;
  healthLabel: string;
  healthTone: string;
  recommendations: string[];
};

export const agencyTemplateLabels: Record<AgencyMessageTemplateKey, string> = {
  rental_requirements: "Requisitos de alquiler",
  sale_reply: "Respuesta para venta",
  follow_up: "Seguimiento",
  visit_confirmation: "Confirmacion de visita",
  gentle_rejection: "Rechazo amable",
};

export function getDefaultAgencyTemplates(agencyName = "la inmobiliaria"): Array<{
  templateKey: AgencyMessageTemplateKey;
  label: string;
  body: string;
}> {
  return [
    {
      templateKey: "rental_requirements",
      label: agencyTemplateLabels.rental_requirements,
      body: `Hola, te comparto los requisitos de alquiler que solemos pedir en ${agencyName}: documento, ingresos demostrables, garantia o seguro de caucion, deposito y firma coordinada segun la propiedad. Si queres, te paso los requisitos exactos de esta publicacion.`,
    },
    {
      templateKey: "sale_reply",
      label: agencyTemplateLabels.sale_reply,
      body: `Hola, gracias por tu consulta. Te confirmo los datos principales de la propiedad y, si te sirve, coordinamos una visita o te comparto opciones similares dentro de tu presupuesto.`,
    },
    {
      templateKey: "follow_up",
      label: agencyTemplateLabels.follow_up,
      body: `Hola, retomo esta conversacion para saber si seguis buscando y si queres que te acerque opciones similares o coordinemos una visita.`,
    },
    {
      templateKey: "visit_confirmation",
      label: agencyTemplateLabels.visit_confirmation,
      body: `Perfecto, te confirmo la visita. Si queres, te envio ubicacion exacta, requisitos y recomendaciones antes de ir.`,
    },
    {
      templateKey: "gentle_rejection",
      label: agencyTemplateLabels.gentle_rejection,
      body: `Gracias por el interes. Por ahora no tenemos una opcion exacta con esas condiciones, pero puedo buscar alternativas cercanas y avisarte apenas entre algo que encaje mejor.`,
    },
  ];
}

export function getTemplateBody(
  templates: AgencyMessageTemplateSummary[],
  key: AgencyMessageTemplateKey,
  agencyName?: string
) {
  const found = templates.find((template) => template.templateKey === key);
  if (found?.body?.trim()) {
    return found.body.trim();
  }
  return (
    getDefaultAgencyTemplates(agencyName).find((template) => template.templateKey === key)?.body ??
    ""
  );
}

export function deriveConversationStatus(lead: CrmLeadSummary): ConversationStatus {
  if (lead.stage === "Cerrado" || lead.stage === "Descartado") {
    return "Cerrado";
  }
  if (lead.stage === "Visita") {
    return "Visita";
  }
  if (lead.needsResponse) {
    return "Nuevo";
  }
  return "Esperando respuesta";
}

export function deriveSourceChannel(source: string) {
  const normalized = source.toLowerCase();
  if (normalized.includes("instagram")) return "Instagram";
  if (normalized.includes("web") || normalized.includes("marketplace") || normalized.includes("catalog")) {
    return "Web";
  }
  if (normalized.includes("whatsapp")) return "WhatsApp";
  return "CRM";
}

export function deriveLeadScoreReasons(lead: CrmLeadSummary): LeadScoreReason[] {
  const reasons: LeadScoreReason[] = [];

  if (lead.budget) {
    reasons.push({ label: "Tiene presupuesto", detail: lead.budget });
  }
  if (lead.desiredTimeline) {
    reasons.push({ label: "Plazo detectado", detail: lead.desiredTimeline });
  }
  if (lead.stage === "Visita") {
    reasons.push({ label: "Ya pidio visita", detail: "El lead avanzo a instancia presencial." });
  }
  if (lead.requirementsSummary) {
    reasons.push({
      label: "Acepta o menciona condiciones",
      detail: lead.requirementsSummary,
    });
  }
  if (/visita|hoy|manana|disponible|coordinar/i.test(lead.lastCustomerMessage)) {
    reasons.push({
      label: "Muestra intencion concreta",
      detail: "Pidio disponibilidad o proximo paso.",
    });
  }
  if (reasons.length === 0) {
    reasons.push({
      label: "Todavia en exploracion",
      detail: "Conviene precisar presupuesto, zona y fecha objetivo.",
    });
  }

  return reasons.slice(0, 4);
}

export function deriveCloseProbability(lead: CrmLeadSummary) {
  const score = Math.max(0, Math.min(100, lead.score || 0));

  if (score >= 80) {
    return {
      label: "Alta",
      detail: "Tiene señales claras de cierre si se sostiene el ritmo.",
      percentage: score,
    };
  }
  if (score >= 60) {
    return {
      label: "Media",
      detail: "Hay interes real, pero todavia falta definir datos clave.",
      percentage: score,
    };
  }
  return {
    label: "Baja",
    detail: "Conviene calificar mejor antes de invertir mucho tiempo comercial.",
    percentage: score,
  };
}

export function deriveLeadNextAction(lead: CrmLeadSummary) {
  if (lead.stage === "Visita") {
    return "Confirmar visita, mandar ubicacion y preparar seguimiento post-visita.";
  }
  if (lead.needsResponse) {
    return "Responder ahora con una propuesta concreta y dejar siguiente paso cerrado.";
  }
  if (lead.stage === "Precalificado") {
    return "Ofrecer 2 o 3 opciones parecidas y pedir definicion de visita.";
  }
  if (lead.stage === "Propuesta") {
    return "Retomar objeciones y buscar cierre o reserva.";
  }
  if (lead.desiredOperation === "Alquiler") {
    return "Pasar requisitos y validar fecha de mudanza para acelerar el filtro.";
  }
  return "Seguir calificando zona, presupuesto y urgencia del cliente.";
}

export function inferLeadPropertyType(lead: CrmLeadSummary) {
  const text = [lead.intent, lead.lastCustomerMessage, lead.requirementsSummary]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  if (text.includes("casa")) return "Casa";
  if (text.includes("ph")) return "PH";
  if (text.includes("loft")) return "Loft";
  if (text.includes("local")) return "Local";
  if (text.includes("oficina")) return "Oficina";
  return "Departamento";
}

export function findSimilarProperties(
  lead: CrmLeadSummary,
  properties: Property[],
  limit = 3
) {
  const desiredOperation = lead.desiredOperation ?? lead.propertyOperation ?? null;
  const desiredLocation = (lead.desiredLocation ?? lead.propertyLocation ?? "").toLowerCase();
  const desiredType = inferLeadPropertyType(lead);
  const budgetValue = Number(String(lead.budget ?? "").replace(/[^\d]/g, "")) || null;
  const wantsPets = /mascotas|perro|gato/i.test(
    `${lead.requirementsSummary ?? ""} ${lead.lastCustomerMessage}`
  );
  const wantsBalcony = /balcon|terraza/i.test(
    `${lead.requirementsSummary ?? ""} ${lead.lastCustomerMessage}`
  );

  return [...properties]
    .filter((property) => property.id !== lead.propertyId)
    .filter((property) => (desiredOperation ? property.operation === desiredOperation : true))
    .map((property) => {
      let score = 0;

      if (property.propertyType === desiredType) score += 3;
      if (desiredLocation && property.location.toLowerCase().includes(desiredLocation)) score += 5;
      if (lead.propertyLocation && property.location === lead.propertyLocation) score += 3;
      if (budgetValue && Math.abs(property.price - budgetValue) / Math.max(budgetValue, 1) <= 0.25) score += 4;
      if (wantsPets && /si|consultar/i.test(property.petsPolicy)) score += 2;
      if (wantsBalcony && property.amenities.some((item) => /balcon|terraza/i.test(item))) score += 2;
      if (property.status === "Disponible") score += 1;

      return { property, score };
    })
    .sort((a, b) => b.score - a.score || a.property.price - b.property.price)
    .slice(0, limit)
    .map((item) => item.property);
}

function collectLeadMessages(messages: CrmLeadMessageSummary[], role: CrmLeadMessageSummary["senderRole"]) {
  return messages
    .filter((message) => message.senderRole === role)
    .map((message) => message.content.trim())
    .filter(Boolean);
}

function extractObjections(texts: string[]) {
  const joined = texts.join(" \n ").toLowerCase();
  const possible = [
    { keyword: /expensas|gastos/, label: "Le preocupa el costo total / expensas." },
    { keyword: /mascotas|perro|gato/, label: "Quiere validar politica de mascotas." },
    { keyword: /garantia|seguro de caucion|requisitos/, label: "Tiene dudas sobre requisitos de ingreso." },
    { keyword: /cochera/, label: "Pregunta por cochera o guardado." },
    { keyword: /precio|rebaja|negociable/, label: "Esta negociando precio o presupuesto." },
    { keyword: /ubicacion|barrio|zona/, label: "Esta comparando ubicacion o barrio." },
  ];

  return possible
    .filter((item) => item.keyword.test(joined))
    .map((item) => item.label);
}

export function buildLeadProfileSnapshot(input: {
  lead: CrmLeadSummary;
  messages: CrmLeadMessageSummary[];
  relatedLeads: CrmLeadSummary[];
  visits: VisitAppointmentSummary[];
}) : LeadProfileSnapshot {
  const customerMessages = collectLeadMessages(input.messages, "customer");
  const outboundMessages = input.messages
    .filter((message) => message.senderRole !== "customer")
    .map((message) => message.content.trim())
    .filter(Boolean);
  const viewedProperties = Array.from(
    new Set(
      input.relatedLeads
        .map((lead) => lead.propertyTitle)
        .filter((value): value is string => Boolean(value))
    )
  );
  const objections = extractObjections(customerMessages);
  const nextVisit = input.visits.find((visit) => visit.leadId === input.lead.id);

  const whatTheySeek = [
    input.lead.desiredOperation || input.lead.propertyOperation,
    input.lead.desiredLocation || input.lead.propertyLocation,
    input.lead.budget ? `presupuesto ${input.lead.budget}` : null,
    input.lead.desiredTimeline ? `para ${input.lead.desiredTimeline}` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return {
    whatTheySeek: whatTheySeek || "Todavia falta precisar mejor la necesidad del cliente.",
    viewedProperties,
    whatTheyAsked: customerMessages.slice(-4),
    whatWeAnswered: outboundMessages.slice(-4),
    objections,
    closeProbability: deriveCloseProbability(input.lead),
    nextAction: nextVisit
      ? `Ya tiene visita ${new Date(nextVisit.scheduledFor).toLocaleString("es-AR")}. Conviene reconfirmar y preparar seguimiento.`
      : deriveLeadNextAction(input.lead),
  };
}

function propertyPublicUrl(lead: CrmLeadSummary, property: Property) {
  return `https://props.com.ar/propiedad/${lead.agencySlug}/${property.id}`;
}

export function buildPropertyComparisonMessage(
  lead: CrmLeadSummary,
  selectedProperties: Property[]
) {
  const lines = [
    `Te comparto una comparacion rapida para ayudarte a decidir mejor:`,
    "",
    ...selectedProperties.map((property, index) => {
      const highlights = [
        `${index + 1}. ${property.title}`,
        `${property.operation} · ${formatMoney(property.price, property.currency)}`,
        property.location,
        `${property.bedrooms} dorm · ${property.bathrooms} banos · ${property.area} m2`,
        property.expenses ? `Expensas: ${formatMoney(property.expenses, property.expensesCurrency ?? "ARS")}` : null,
        property.requirements ? `Requisitos: ${property.requirements}` : null,
        `Ficha: ${propertyPublicUrl(lead, property)}`,
      ].filter(Boolean);
      return highlights.join("\n");
    }),
    "",
    "Si queres, te marco cual conviene mas segun presupuesto, zona o timing.",
  ];

  return lines.join("\n");
}

export function buildQuickReplyScenarios(input: {
  lead: CrmLeadSummary;
  property: Property | null;
  similarProperties: Property[];
  templates: AgencyMessageTemplateSummary[];
}) {
  const { lead, property, similarProperties, templates } = input;
  const publicUrl = property ? propertyPublicUrl(lead, property) : null;
  const requirementTemplate = getTemplateBody(templates, "rental_requirements", lead.agencyName);
  const saleTemplate = getTemplateBody(templates, "sale_reply", lead.agencyName);
  const followUpTemplate = getTemplateBody(templates, "follow_up", lead.agencyName);
  const visitTemplate = getTemplateBody(templates, "visit_confirmation", lead.agencyName);

  const scenarios: QuickReplyScenario[] = [];

  if (property?.requirements || lead.desiredOperation === "Alquiler") {
    scenarios.push({
      key: "requirements",
      label: "Pasar requisitos",
      message: property?.requirements
        ? `Hola ${lead.fullName.split(" ")[0]}, te comparto los requisitos principales para avanzar con ${property.title}: ${property.requirements}${publicUrl ? `\n\nFicha completa: ${publicUrl}` : ""}`
        : requirementTemplate,
    });
  }

  scenarios.push({
    key: "visit",
    label: "Coordinar visita",
    message: `${visitTemplate}\n\n${property?.title ? `La idea es avanzar con ${property.title}. ` : ""}Decime que dia y franja te sirven y lo coordinamos.`,
  });

  if (property?.exactAddress) {
    scenarios.push({
      key: "location",
      label: "Enviar ubicacion",
      message: `Te comparto la ubicacion de ${property.title}: ${property.exactAddress}\n${buildGoogleMapsExternalUrl(property.exactAddress)}`,
      tone: "outline",
    });
  }

  if (publicUrl) {
    scenarios.push({
      key: "photos",
      label: "Enviar mas fotos",
      message: `Te comparto la ficha completa de ${property?.title} para que veas fotos, detalles y ubicacion:\n${publicUrl}`,
      tone: "outline",
    });
  }

  if (similarProperties.length > 0) {
    scenarios.push({
      key: "similar",
      label: "Ofrecer similares",
      message:
        `Ademas de esta propiedad, te puedo mostrar estas opciones parecidas:\n\n` +
        similarProperties
          .map(
            (item) =>
              `- ${item.title} · ${item.location} · ${formatMoney(item.price, item.currency)}\n  ${propertyPublicUrl(lead, item)}`
          )
          .join("\n"),
    });
  }

  scenarios.push({
    key: "availability",
    label: "Consultar disponibilidad",
    message:
      property && property.status === "Disponible"
        ? `Hoy la propiedad sigue disponible. Si queres, avanzamos con una visita o te comparto condiciones para reservar.`
        : property
          ? `La disponibilidad puede cambiar rapido. Si te interesa ${property.title}, te la verifico ahora y te aviso enseguida.`
          : saleTemplate,
  });

  scenarios.push({
    key: "followup",
    label: "Hacer seguimiento",
    message: followUpTemplate,
    tone: "outline",
  });

  return scenarios;
}

export function buildAutomaticFollowUpMessage(input: {
  lead: CrmLeadSummary;
  property?: Property | null;
}) {
  const { lead, property } = input;
  const firstName = lead.fullName.split(" ")[0] || "Hola";
  const propertyLabel = property?.title ?? lead.propertyTitle ?? "la propiedad";

  if (lead.stage === "Visita") {
    return `Hola ${firstName}, retomo por la visita a ${propertyLabel}. Si te parece, coordinamos dia y horario para verla esta semana.`;
  }

  if (lead.stage === "Seguimiento") {
    return `Hola ${firstName}, retomo esta conversacion por ${propertyLabel}. Si seguis interesado, te ayudo a avanzar con el proximo paso.`;
  }

  if (lead.desiredOperation === "Alquiler") {
    return `Hola ${firstName}, retomo tu consulta por ${propertyLabel}. Si seguis buscando alquiler, te paso requisitos y coordinamos visita.`;
  }

  if (lead.desiredOperation === "Venta") {
    return `Hola ${firstName}, retomo tu consulta por ${propertyLabel}. Si queres, avanzamos con disponibilidad, detalles y visita.`;
  }

  return `Hola ${firstName}, retomo tu consulta para ayudarte a avanzar con el proximo paso.`;
}

export function derivePropertyHealth(
  properties: Property[],
  leads: CrmLeadSummary[],
  visits: VisitAppointmentSummary[]
): PropertyHealthItem[] {
  const sameBucketMedian = (property: Property) => {
    const bucket = properties.filter(
      (item) =>
        item.operation === property.operation &&
        item.propertyType === property.propertyType &&
        item.currency === property.currency
    );
    const prices = bucket.map((item) => item.price).sort((a, b) => a - b);
    const middle = Math.floor(prices.length / 2);
    return prices.length ? prices[middle] : property.price;
  };

  return properties.map((property) => {
    const propertyLeads = leads.filter((lead) => lead.propertyId === property.id);
    const propertyVisits = visits.filter((visit) => visit.propertyId === property.id);
    const recommendations: string[] = [];
    const imageCount = property.images?.length ?? 0;
    const medianPrice = sameBucketMedian(property);
    let healthLabel = "Sana";
    let healthTone = "bg-emerald-500/10 text-emerald-700";

    if (imageCount < 4) {
      recommendations.push("Cargar mas fotos para mejorar conversion.");
    }
    if (propertyLeads.length >= 4 && propertyVisits.length === 0) {
      recommendations.push("Tiene consultas pero nadie agenda visita: revisar copy y respuesta inicial.");
    }
    if (propertyLeads.length === 0 && property.status === "Disponible") {
      recommendations.push("Tiene baja traccion: revisar portada, precio o difusion.");
    }
    if (Math.abs(property.price - medianPrice) / Math.max(medianPrice, 1) > 0.35) {
      recommendations.push("El precio esta bastante fuera del rango tipico del portafolio.");
    }

    if (recommendations.length >= 3) {
      healthLabel = "Revisar ya";
      healthTone = "bg-red-500/10 text-red-700";
    } else if (recommendations.length >= 1) {
      healthLabel = "Ajustable";
      healthTone = "bg-amber-500/10 text-amber-700";
    }

    return {
      propertyId: property.id,
      title: property.title,
      operation: property.operation,
      location: property.location,
      leadsCount: propertyLeads.length,
      visitsCount: propertyVisits.length,
      openLeadsCount: propertyLeads.filter((lead) => lead.stage !== "Cerrado" && lead.stage !== "Descartado").length,
      imageCount,
      healthLabel,
      healthTone,
      recommendations:
        recommendations.length > 0
          ? recommendations
          : ["La publicacion esta respondiendo bien con el estado actual."],
    };
  });
}

export function suggestAssistantFallback(input: {
  prompt: string;
  leads: CrmLeadSummary[];
  tasks: EmployeeTaskSummary[];
  visits: VisitAppointmentSummary[];
  properties: Property[];
}) {
  const prompt = input.prompt.toLowerCase();

  if (/pendiente|hoy|que tengo/i.test(prompt)) {
    const urgentTasks = input.tasks.slice(0, 4).map((task) => `- ${task.title}: ${task.details}`);
    return urgentTasks.length
      ? `Hoy te conviene enfocarte en esto:\n${urgentTasks.join("\n")}`
      : "Hoy no veo tareas urgentes cargadas, pero conviene revisar mensajes nuevos y visitas del dia.";
  }

  if (/objecion|objeciones/i.test(prompt)) {
    const leadWithObjection = input.leads.find((lead) =>
      /expensas|mascotas|garantia|precio/i.test(lead.lastCustomerMessage)
    );
    return leadWithObjection
      ? `La objecion mas visible hoy es la de ${leadWithObjection.fullName}: ${leadWithObjection.lastCustomerMessage}`
      : "No detecte objeciones claras en las ultimas conversaciones cargadas.";
  }

  if (/similar|parecida|parecidas/i.test(prompt)) {
    const lead = input.leads[0];
    if (!lead) return "Todavia no hay leads activos para sugerir propiedades similares.";
    const matches = findSimilarProperties(lead, input.properties);
    return matches.length
      ? `Para ${lead.fullName} yo mostraria primero: ${matches.map((property) => property.title).join(", ")}.`
      : "No encontre propiedades claramente parecidas con el inventario actual.";
  }

  if (/contrato|alquiler/i.test(prompt)) {
    return "Puedo ayudarte a resumir clausulas, revisar fechas de ajuste y preparar el siguiente aviso al inquilino si me decis que contrato queres revisar.";
  }

  return "Puedo ayudarte con respuestas, seguimientos, visitas, contratos y propiedades similares. Proba preguntandome que conviene contestar o que tareas tenes hoy.";
}
