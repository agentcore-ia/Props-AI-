import { NextResponse } from "next/server";

import { isAutomationRequest } from "@/lib/automation-auth";
import { fetchEvolutionInstances, setEvolutionWebhook } from "@/lib/evolution";
import { listAgencySummaries } from "@/lib/props-data";

const PROPS_N8N_WEBHOOK_FALLBACK =
  "https://agentcore-n8n.8zp1cp.easypanel.host/webhook/props-evolution-webhook";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!isAutomationRequest(request)) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  const webhookUrl =
    process.env.N8N_EVOLUTION_WEBHOOK_URL?.trim() || PROPS_N8N_WEBHOOK_FALLBACK;
  const agencies = await listAgencySummaries();
  const instances = await fetchEvolutionInstances();
  const results: Array<Record<string, unknown>> = [];

  for (const agency of agencies) {
    const instanceName = String(agency.messagingInstance ?? "").trim();

    if (!instanceName) {
      results.push({ agency: agency.slug, status: "skipped", reason: "missing_instance" });
      continue;
    }

    const exists = instances.some(
      (instance) =>
        instance.name === instanceName || instance.instance?.instanceName === instanceName
    );

    if (!exists) {
      results.push({ agency: agency.slug, status: "skipped", reason: "instance_not_found" });
      continue;
    }

    await setEvolutionWebhook(instanceName, webhookUrl, [
      "QRCODE_UPDATED",
      "CONNECTION_UPDATE",
      "MESSAGES_UPSERT",
      "MESSAGES_UPDATE",
      "SEND_MESSAGE",
    ]);

    results.push({ agency: agency.slug, status: "updated", instanceName, webhookUrl });
  }

  return NextResponse.json({ ok: true, processed: results.length, results });
}
