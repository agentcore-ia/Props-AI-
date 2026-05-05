import { NextResponse } from "next/server";

import { isAutomationRequest } from "@/lib/automation-auth";
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
    };

  const recentMessages = await listCrmLeadMessages({
    leadIds: [lead.id],
  });

  const catalog = await buildAgencyCatalogContext({
    agencySlug: lead.agencySlug,
    selectedPropertyId: lead.propertyId,
  });

  return NextResponse.json({
    ok: true,
    leadId: lead.id,
    memorySessionId: `lead-${lead.id}`,
    targetPhone: String(lead.phone ?? body?.remoteJid ?? "").replace(/@s\.whatsapp\.net$/i, ""),
    instanceName: instanceName || agency.messagingInstance || "",
    systemPrompt: buildWhatsappSystemPrompt({
      agency,
      lead,
      selectedProperty: catalog.selectedProperty,
      catalogSummary: catalog.catalogSummary,
      recentMessages,
    }),
    agentInput: buildWhatsappAgentInput({
      lead,
      messageText,
      selectedProperty: catalog.selectedProperty,
    }),
    selectedPropertyTitle: catalog.selectedProperty?.title ?? null,
    recentMessagesCount: recentMessages.length,
  });
}
