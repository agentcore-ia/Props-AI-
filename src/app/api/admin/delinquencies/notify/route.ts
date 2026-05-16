import { NextResponse } from "next/server";

import { getCurrentUserContext } from "@/lib/auth/current-user";
import { getAgencyScopeFromUser } from "@/lib/crm-automation";
import { sendEvolutionTextMessage } from "@/lib/evolution";
import { getOpenAIEnv } from "@/lib/openai-env";
import { listDelinquentTenants } from "@/lib/props-data";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatMoney } from "@/lib/utils";

type AgencyMessagingRow = {
  slug: string;
  messaging_instance: string;
};

async function buildAiReminder(input: {
  apiKey: string;
  model: string;
  tenantName: string;
  propertyTitle: string;
  collectionMonth: string;
  debtLabel: string;
  daysLate: number;
  risk: string;
  fallback: string;
}) {
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${input.apiKey}`,
    },
    body: JSON.stringify({
      model: input.model,
      input: [
        {
          role: "system",
          content: [
            {
              type: "input_text",
              text:
                "Sos asistente de cobranzas de una inmobiliaria argentina. Escribi mensajes de WhatsApp cortos, humanos y profesionales. No amenaces, no inventes datos y no menciones IA.",
            },
          ],
        },
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text: `Redacta un aviso de alquiler pendiente para ${input.tenantName}. Propiedad: ${input.propertyTitle}. Periodo: ${input.collectionMonth}. Deuda: ${input.debtLabel}. Dias de atraso despues de gracia: ${input.daysLate}. Prioridad: ${input.risk}. Pedi comprobante o fecha exacta de pago. Maximo 420 caracteres.`,
            },
          ],
        },
      ],
    }),
  });

  if (!response.ok) {
    return input.fallback;
  }

  const payload = (await response.json()) as {
    output_text?: string;
    output?: Array<{ content?: Array<{ text?: string }> }>;
  };
  const text =
    payload.output_text?.trim() ||
    payload.output
      ?.flatMap((item) => item.content ?? [])
      .map((item) => item.text ?? "")
      .join("\n")
      .trim() ||
    "";

  return text || input.fallback;
}

export async function POST(request: Request) {
  const current = await getCurrentUserContext();
  if (!current || !["superadmin", "agency_admin", "agent"].includes(current.profile.role)) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as { contractIds?: string[] } | null;
  const contractIds = Array.isArray(body?.contractIds)
    ? body.contractIds.map((id) => String(id).trim()).filter(Boolean)
    : [];

  if (contractIds.length === 0) {
    return NextResponse.json({ error: "Selecciona al menos un moroso para avisar." }, { status: 400 });
  }

  const scope = getAgencyScopeFromUser(current);
  const delinquencies = await listDelinquentTenants(scope);
  const selected = delinquencies.filter((item) => contractIds.includes(item.contractId));

  if (selected.length === 0) {
    return NextResponse.json({ error: "No encontramos morosos vigentes para esos contratos." }, { status: 404 });
  }

  const admin = createAdminClient();
  const { data: agencies, error: agencyError } = await admin
    .from("agencies")
    .select("slug, messaging_instance")
    .in("slug", Array.from(new Set(selected.map((item) => item.agencySlug))));

  if (agencyError) {
    return NextResponse.json({ error: "No se pudieron leer las instancias de WhatsApp." }, { status: 400 });
  }

  const instanceBySlug = new Map(
    ((agencies ?? []) as AgencyMessagingRow[]).map((agency) => [agency.slug, agency.messaging_instance])
  );
  const openAI = getOpenAIEnv();
  const failed: Array<{ tenantName: string; error: string }> = [];
  let sent = 0;

  for (const item of selected) {
    const instanceName = instanceBySlug.get(item.agencySlug);
    const number = item.tenantPhone.replace(/[^\d]/g, "");

    if (!instanceName) {
      failed.push({ tenantName: item.tenantName, error: "Sin instancia de WhatsApp" });
      continue;
    }

    if (!number) {
      failed.push({ tenantName: item.tenantName, error: "Sin telefono cargado" });
      continue;
    }

    const message = openAI.configured
      ? await buildAiReminder({
          apiKey: openAI.apiKey,
          model: openAI.model,
          tenantName: item.tenantName,
          propertyTitle: item.propertyTitle,
          collectionMonth: item.collectionMonth,
          debtLabel: formatMoney(item.totalDebtAmount, item.currency),
          daysLate: item.daysLate,
          risk: item.risk,
          fallback: item.suggestedMessage,
        })
      : item.suggestedMessage;

    try {
      await sendEvolutionTextMessage({
        instanceName,
        number,
        text: message,
      });
      sent += 1;
    } catch (error) {
      failed.push({
        tenantName: item.tenantName,
        error: error instanceof Error ? error.message : "No se pudo enviar",
      });
    }
  }

  return NextResponse.json({ ok: failed.length === 0, sent, failed });
}
