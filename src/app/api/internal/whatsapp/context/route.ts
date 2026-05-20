import { NextResponse } from "next/server";

import { isAutomationRequest } from "@/lib/automation-auth";
import {
  buildClientMemoryContext,
  findOwnerMemoryContext,
  findTenantRentalContext,
} from "@/lib/client-memory";
import { buildShortPropertyUrl } from "@/lib/property-links";
import { getCrmLeadById, listCrmLeadMessages } from "@/lib/props-data";
import {
  buildAgencyCatalogContext,
  buildWhatsappAgentInput,
  buildWhatsappSystemPrompt,
  resolveAgencyByMessagingInstance,
} from "@/lib/whatsapp-agent";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!isAutomationRequest(request)) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const leadId = String(body?.leadId ?? "").trim();
  const messageText = String(body?.messageText ?? "").trim();
  const instanceName = String(body?.instanceName ?? "").trim();
  const remoteJid = String(body?.remoteJid ?? body?.number ?? "").trim();

  if (!leadId || !messageText) {
    return NextResponse.json(
      { error: "Faltan el lead o el mensaje para construir el contexto." },
      { status: 400 }
    );
  }

  const lead = await getCrmLeadById(leadId);

  if (!lead) {
    return NextResponse.json({ error: "No encontramos ese lead." }, { status: 404 });
  }

  const agency =
    (instanceName ? await resolveAgencyByMessagingInstance(instanceName) : null) ?? {
      id: lead.agencyId,
      slug: lead.agencySlug,
      name: lead.agencyName,
      city: lead.desiredLocation ?? "",
      email: "",
      phone: "",
      tagline: "",
      messagingInstance: instanceName,
      whatsappAiEnabled: true,
    };

  const recentMessages = await listCrmLeadMessages({
    leadIds: [lead.id],
  });
  const contactPhone = remoteJid || lead.phone || "";
  const [rentalContext, ownerContext] = await Promise.all([
    findTenantRentalContext({
      agencyId: lead.agencyId,
      phone: contactPhone,
      messageText,
    }).catch((error) => {
      console.error("[whatsapp-context] tenant memory lookup failed", {
        leadId: lead.id,
        error: error instanceof Error ? error.message : String(error),
      });
      return null;
    }),
    findOwnerMemoryContext({
      agencyId: lead.agencyId,
      phone: contactPhone,
    }).catch((error) => {
      console.error("[whatsapp-context] owner memory lookup failed", {
        leadId: lead.id,
        error: error instanceof Error ? error.message : String(error),
      });
      return null;
    }),
  ]);
  const memoryContext = await buildClientMemoryContext({
    agencyId: lead.agencyId,
    phone: contactPhone,
    email: lead.email,
    leadId: lead.id,
    rentalContext,
    ownerContext,
  }).catch((error) => {
    console.error("[whatsapp-context] memory context failed", {
      leadId: lead.id,
      error: error instanceof Error ? error.message : String(error),
    });
    return { contextText: "Memoria Props: no se pudo leer el contexto persistente." };
  });

  const catalog = await buildAgencyCatalogContext({
    agencySlug: lead.agencySlug,
    selectedPropertyId: lead.propertyId,
    messageText,
  });

  const systemPrompt = [
    buildWhatsappSystemPrompt({
      agency,
      lead,
      selectedProperty: catalog.selectedProperty,
      catalogSummary: catalog.catalogSummary,
      recentMessages,
    }),
    "Memoria persistente Props:",
    memoryContext.contextText,
    rentalContext
      ? `Contrato de inquilino detectado: ${rentalContext.tenantName} alquila ${rentalContext.propertyTitle}. Alquiler actual ARS ${rentalContext.currentRent}. Proximo ajuste ${rentalContext.nextAdjustmentDate} por ${rentalContext.indexType}. Si consulta por pago/alquiler/ajuste, responde con este contexto y no como lead nuevo.`
      : "No hay contrato de inquilino detectado por telefono.",
    ownerContext
      ? `Propietario detectado: ${ownerContext.ownerName} de ${ownerContext.propertyTitle}. Participacion ${ownerContext.participationPercent}%. Ultima liquidacion: ${ownerContext.latestSettlement ? `${ownerContext.latestSettlement.settlementMonth} por ARS ${ownerContext.latestSettlement.ownerPayoutAmount}, estado ${ownerContext.latestSettlement.status}` : "sin liquidacion reciente"}. Si consulta por liquidacion/transferencia/pago al propietario, responde con este contexto y no como lead nuevo.`
      : "No hay propietario detectado por telefono.",
  ].join("\n\n");

  return NextResponse.json({
    ok: true,
    leadId: lead.id,
    memorySessionId: `lead-${lead.id}`,
    targetPhone: String(contactPhone).replace(/@s\.whatsapp\.net$/i, ""),
    instanceName: instanceName || agency.messagingInstance || "",
    whatsappAiEnabled: agency.whatsappAiEnabled !== false,
    systemPrompt,
    agentInput: buildWhatsappAgentInput({
      lead,
      messageText,
      selectedProperty: catalog.selectedProperty,
    }),
    selectedPropertyId: catalog.selectedProperty?.id ?? null,
    selectedPropertyTitle: catalog.selectedProperty?.title ?? null,
    selectedPropertyUrl: catalog.selectedProperty
      ? buildShortPropertyUrl(catalog.selectedProperty.tenantSlug, catalog.selectedProperty.id)
      : null,
    memoryContext: memoryContext.contextText,
    tenantContractId: rentalContext?.contractId ?? null,
    ownerContractId: ownerContext?.contractId ?? null,
    contractOwnerId: ownerContext?.contractOwnerId ?? null,
    recentMessagesCount: recentMessages.length,
  });
}
