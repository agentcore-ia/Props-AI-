import { NextResponse } from "next/server";

import { getManagedAgency } from "@/lib/agency-access";
import { getCurrentUserContext } from "@/lib/auth/current-user";
import {
  agencyTemplateLabels,
  getDefaultAgencyTemplates,
} from "@/lib/crm-insights";
import type { AgencyMessageTemplateKey } from "@/lib/crm-types";
import { listAgencyMessageTemplates } from "@/lib/props-data";
import { createAdminClient } from "@/lib/supabase/admin";

const allowedTemplateKeys = new Set<AgencyMessageTemplateKey>([
  "rental_requirements",
  "sale_reply",
  "follow_up",
  "visit_confirmation",
  "gentle_rejection",
]);

export async function GET(request: Request) {
  const current = await getCurrentUserContext();
  if (!current || !["superadmin", "agency_admin"].includes(current.profile.role)) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const agencySlug = searchParams.get("agencySlug") ?? undefined;

  const agency = await getManagedAgency(current, agencySlug);
  if (!agency) {
    return NextResponse.json({ error: "No encontramos la inmobiliaria." }, { status: 404 });
  }

  const templates = await listAgencyMessageTemplates({ agencySlug: agency.slug });
  return NextResponse.json({ ok: true, templates });
}

export async function POST(request: Request) {
  const current = await getCurrentUserContext();
  if (!current || !["superadmin", "agency_admin"].includes(current.profile.role)) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const agencySlug = typeof body?.agencySlug === "string" ? body.agencySlug : undefined;
  const agency = await getManagedAgency(current, agencySlug);
  if (!agency) {
    return NextResponse.json({ error: "No encontramos la inmobiliaria." }, { status: 404 });
  }

  const templates = Array.isArray(body?.templates)
    ? (body.templates as Array<Record<string, unknown>>)
    : [];
  const sanitized = templates
    .map((template) => ({
      template_key: String(template?.templateKey ?? "").trim() as AgencyMessageTemplateKey,
      label: String(template?.label ?? "").trim(),
      body: String(template?.body ?? "").trim(),
    }))
    .filter((template) => allowedTemplateKeys.has(template.template_key));

  const merged = getDefaultAgencyTemplates(agency.name).map((template) => {
    const override = sanitized.find((item) => item.template_key === template.templateKey);
    return {
      template_key: template.templateKey,
      label: override?.label || agencyTemplateLabels[template.templateKey],
      body: override?.body || template.body,
    };
  });

  const admin = createAdminClient();
  const payload = merged.map((template) => ({
    agency_id: agency.id,
    template_key: template.template_key,
    label: template.label,
    body: template.body,
  }));

  const { error } = await admin
    .from("agency_message_templates")
    .upsert(payload, { onConflict: "agency_id,template_key" });

  if (error) {
    return NextResponse.json(
      { error: "No se pudieron guardar las plantillas.", detail: error.message },
      { status: 400 }
    );
  }

  const updatedTemplates = await listAgencyMessageTemplates({ agencySlug: agency.slug });
  return NextResponse.json({ ok: true, templates: updatedTemplates });
}
