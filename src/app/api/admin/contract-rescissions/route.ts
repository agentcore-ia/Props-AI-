import { NextResponse } from "next/server";

import { getCurrentUserContext } from "@/lib/auth/current-user";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  const current = await getCurrentUserContext();
  if (!current) return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  if (!["superadmin", "agency_admin"].includes(current.profile.role)) {
    return NextResponse.json({ error: "Sin permisos." }, { status: 403 });
  }

  const body = (await request.json().catch(() => null)) as
    | {
        contractId?: string;
        requestedOn?: string;
        effectiveDate?: string | null;
        reason?: string;
        settlementTerms?: string;
        status?: "Borrador" | "En negociacion" | "Aprobada" | "Cerrada";
      }
    | null;

  const contractId = String(body?.contractId ?? "").trim();
  if (!contractId) return NextResponse.json({ error: "Falta el contrato." }, { status: 400 });

  const admin = createAdminClient();
  const { data: contract, error } = await admin
    .from("rental_contracts")
    .select("id, property_id, agency_id, agencies!inner(slug)")
    .eq("id", contractId)
    .maybeSingle();

  if (error || !contract) {
    return NextResponse.json({ error: "No encontramos el contrato." }, { status: 404 });
  }

  const agencySlug = Array.isArray(contract.agencies)
    ? contract.agencies[0]?.slug ?? null
    : ((contract.agencies as { slug?: string } | null)?.slug ?? null);
  if (current.profile.role === "agency_admin" && current.profile.agency_slug !== agencySlug) {
    return NextResponse.json({ error: "No puedes rescindir contratos de otra inmobiliaria." }, { status: 403 });
  }

  const { error: insertError } = await admin.from("contract_rescissions").insert({
    contract_id: contract.id,
    property_id: contract.property_id,
    agency_id: contract.agency_id,
    requested_on: String(body?.requestedOn ?? new Date().toISOString().slice(0, 10)).slice(0, 10),
    effective_date: body?.effectiveDate ? String(body.effectiveDate).slice(0, 10) : null,
    reason: String(body?.reason ?? "").trim(),
    settlement_terms: String(body?.settlementTerms ?? "").trim(),
    status: body?.status ?? "Borrador",
    created_by: current.user.id,
  });

  if (insertError) {
    return NextResponse.json({ error: "No se pudo iniciar la rescision." }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}

export async function PATCH(request: Request) {
  const current = await getCurrentUserContext();
  if (!current) return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  const body = (await request.json().catch(() => null)) as
    | { rescissionId?: string; status?: "Borrador" | "En negociacion" | "Aprobada" | "Cerrada" }
    | null;
  const rescissionId = String(body?.rescissionId ?? "").trim();
  if (!rescissionId) return NextResponse.json({ error: "Falta la rescision." }, { status: 400 });

  const { error } = await createAdminClient()
    .from("contract_rescissions")
    .update({ status: body?.status ?? "Aprobada" })
    .eq("id", rescissionId);

  if (error) {
    return NextResponse.json({ error: "No se pudo actualizar la rescision." }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
