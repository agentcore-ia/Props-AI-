import { NextResponse } from "next/server";

import { getCurrentUserContext } from "@/lib/auth/current-user";
import { createAdminClient } from "@/lib/supabase/admin";

function currentMonthLabel() {
  return new Date().toISOString().slice(0, 7);
}

export async function POST(request: Request) {
  const current = await getCurrentUserContext();
  if (!current) return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  if (!["superadmin", "agency_admin"].includes(current.profile.role)) {
    return NextResponse.json({ error: "Sin permisos." }, { status: 403 });
  }

  const body = (await request.json().catch(() => null)) as
    | {
        contractId?: string;
        collectionMonth?: string;
        collectedAmount?: number;
        paymentMethod?: string;
        paymentDate?: string | null;
        status?: "Pendiente" | "Parcial" | "Cobrada" | "Mora";
        notes?: string;
      }
    | null;

  const contractId = String(body?.contractId ?? "").trim();
  if (!contractId) {
    return NextResponse.json({ error: "Falta el contrato." }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: contract, error } = await admin
    .from("rental_contracts")
    .select("id, property_id, agency_id, current_rent, agencies!inner(slug)")
    .eq("id", contractId)
    .maybeSingle();

  if (error || !contract) {
    return NextResponse.json({ error: "No encontramos el contrato." }, { status: 404 });
  }

  const agencySlug = Array.isArray(contract.agencies)
    ? contract.agencies[0]?.slug ?? null
    : ((contract.agencies as { slug?: string } | null)?.slug ?? null);

  if (current.profile.role === "agency_admin" && current.profile.agency_slug !== agencySlug) {
    return NextResponse.json({ error: "No puedes cobrar contratos de otra inmobiliaria." }, { status: 403 });
  }

  const expectedRent = Number(contract.current_rent ?? 0);
  const collectedAmount = Number(body?.collectedAmount ?? expectedRent);
  const collectionMonth = String(body?.collectionMonth ?? currentMonthLabel()).slice(0, 7);
  const paymentMethod = String(body?.paymentMethod ?? "Transferencia").trim() || "Transferencia";
  const paymentDate = body?.paymentDate ? String(body.paymentDate).slice(0, 10) : null;
  const status =
    body?.status ??
    (collectedAmount >= expectedRent ? "Cobrada" : collectedAmount > 0 ? "Parcial" : "Pendiente");
  const notes = String(body?.notes ?? "").trim();

  const { error: upsertError } = await admin.from("rental_collections").upsert(
    {
      contract_id: contract.id,
      property_id: contract.property_id,
      agency_id: contract.agency_id,
      collection_month: collectionMonth,
      expected_rent: expectedRent,
      collected_amount: collectedAmount,
      payment_method: paymentMethod,
      payment_date: paymentDate,
      status,
      notes,
      created_by: current.user.id,
    },
    { onConflict: "contract_id,collection_month" }
  );

  if (upsertError) {
    return NextResponse.json({ error: "No se pudo registrar la cobranza." }, { status: 400 });
  }

  return NextResponse.json({ ok: true, collectionMonth, status, collectedAmount });
}

export async function PATCH(request: Request) {
  const current = await getCurrentUserContext();
  if (!current) return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  if (!["superadmin", "agency_admin"].includes(current.profile.role)) {
    return NextResponse.json({ error: "Sin permisos." }, { status: 403 });
  }

  const body = (await request.json().catch(() => null)) as
    | { collectionId?: string; status?: "Pendiente" | "Parcial" | "Cobrada" | "Mora"; notes?: string }
    | null;
  const collectionId = String(body?.collectionId ?? "").trim();
  if (!collectionId) {
    return NextResponse.json({ error: "Falta la cobranza." }, { status: 400 });
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from("rental_collections")
    .update({
      status: body?.status ?? "Cobrada",
      notes: String(body?.notes ?? "").trim(),
    })
    .eq("id", collectionId);

  if (error) {
    return NextResponse.json({ error: "No se pudo actualizar la cobranza." }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
