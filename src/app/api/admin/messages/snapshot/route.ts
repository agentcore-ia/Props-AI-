import { NextResponse } from "next/server";

import { getCurrentUserContext } from "@/lib/auth/current-user";
import { getAgencyScopeFromUser } from "@/lib/crm-automation";
import { listCrmLeadMessages, listCrmLeads } from "@/lib/props-data";

export async function GET() {
  const current = await getCurrentUserContext();

  if (!current || !["superadmin", "agency_admin", "agent"].includes(current.profile.role)) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  const scope = getAgencyScopeFromUser(current);
  const leads = await listCrmLeads(scope);
  const visibleLeads = leads.filter(
    (lead) => lead.needsResponse || lead.stage !== "Cerrado"
  );
  const messages = await listCrmLeadMessages({
    agencySlug: scope?.agencySlug,
    leadIds: visibleLeads.map((lead) => lead.id),
  });

  return NextResponse.json({
    ok: true,
    leads: visibleLeads,
    messages,
    generatedAt: new Date().toISOString(),
  });
}
