import { NextResponse } from "next/server";

import { getCurrentUserContext } from "@/lib/auth/current-user";
import { buildFinancialDocumentNumber, logFinancialAudit } from "@/lib/financial-audit";
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

  const upsertPayload = {
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
    };

  const { data: upserted, error: upsertError } = await admin.from("rental_collections").upsert(
    upsertPayload,
    { onConflict: "contract_id,collection_month" }
  ).select("id, created_at").maybeSingle();

  if (upsertError) {
    return NextResponse.json({ error: "No se pudo registrar la cobranza." }, { status: 400 });
  }

  const documentNumber = buildFinancialDocumentNumber("RC", upserted?.created_at, upserted?.id);
  if (upserted?.id) {
    await admin.from("rental_collections").update({ receipt_number: documentNumber }).eq("id", upserted.id);
  }
  await logFinancialAudit({
    admin,
    agencyId: contract.agency_id,
    actorId: current.user.id,
    action: "rental_collection_upserted",
    entityTable: "rental_collections",
    entityId: upserted?.id ?? null,
    documentNumber,
    amount: collectedAmount,
    summary: `Cobranza ${status} del periodo ${collectionMonth}`,
    metadata: { contractId, collectionMonth, paymentMethod, status },
  });

  return NextResponse.json({ ok: true, collectionMonth, status, collectedAmount, receiptNumber: documentNumber });
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
  const { data: collectionBefore } = await admin
    .from("rental_collections")
    .select("id, agency_id, collected_amount, collection_month")
    .eq("id", collectionId)
    .maybeSingle();

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

  await logFinancialAudit({
    admin,
    agencyId: collectionBefore?.agency_id,
    actorId: current.user.id,
    action: "rental_collection_updated",
    entityTable: "rental_collections",
    entityId: collectionId,
    amount: Number(collectionBefore?.collected_amount ?? 0),
    summary: `Cobranza actualizada a ${body?.status ?? "Cobrada"}`,
    metadata: { collectionMonth: collectionBefore?.collection_month, status: body?.status ?? "Cobrada" },
  });

  return NextResponse.json({ ok: true });
}
