import { NextResponse } from "next/server";

import { getCurrentUserContext } from "@/lib/auth/current-user";
import { createAdminClient } from "@/lib/supabase/admin";

function roundMoney(value: number) {
  return Number(value.toFixed(2));
}

async function recalculateSettlement(admin: ReturnType<typeof createAdminClient>, settlementId: string) {
  const { data: settlement, error: settlementError } = await admin
    .from("owner_settlements")
    .select(
      "id, rent_collected, management_fee_percent, monthly_owner_costs, other_charges_amount, other_charges_detail"
    )
    .eq("id", settlementId)
    .maybeSingle();

  if (settlementError || !settlement) {
    throw new Error("No se pudo leer la liquidacion a recalcular.");
  }

  const { data: items, error: itemsError } = await admin
    .from("owner_settlement_items")
    .select("amount, effect, apply_management_fee")
    .eq("settlement_id", settlementId);

  if (itemsError) {
    throw new Error("No se pudieron leer los conceptos particulares.");
  }

  const rentCollected = Number(settlement.rent_collected ?? 0);
  const managementFeePercent = Number(settlement.management_fee_percent ?? 0);
  const monthlyOwnerCosts = Number(settlement.monthly_owner_costs ?? 0);
  const otherChargesAmount = Number(settlement.other_charges_amount ?? 0);

  let additions = 0;
  let deductions = 0;
  let feeBaseExtras = 0;

  for (const item of items ?? []) {
    const amount = Number(item.amount ?? 0);
    if (item.effect === "Suma") {
      additions += amount;
      if (item.apply_management_fee) {
        feeBaseExtras += amount;
      }
      continue;
    }

    if (item.effect === "Descuento") {
      deductions += amount;
      if (item.apply_management_fee) {
        feeBaseExtras += amount;
      }
    }
  }

  const managementFeeAmount = roundMoney((rentCollected + feeBaseExtras) * (managementFeePercent / 100));
  const ownerPayoutAmount = roundMoney(
    Math.max(0, rentCollected + additions - deductions - monthlyOwnerCosts - otherChargesAmount - managementFeeAmount)
  );

  const { error: updateError } = await admin
    .from("owner_settlements")
    .update({
      management_fee_amount: managementFeeAmount,
      owner_payout_amount: ownerPayoutAmount,
    })
    .eq("id", settlementId);

  if (updateError) {
    throw new Error("No se pudo recalcular la liquidacion.");
  }
}

export async function POST(request: Request) {
  const current = await getCurrentUserContext();
  if (!current) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  if (!["superadmin", "agency_admin"].includes(current.profile.role)) {
    return NextResponse.json({ error: "Sin permisos." }, { status: 403 });
  }

  const body = (await request.json().catch(() => null)) as
    | {
        settlementId?: string;
        label?: string;
        amount?: number;
        effect?: "Suma" | "Descuento" | "Informativo";
        applyManagementFee?: boolean;
        notes?: string;
      }
    | null;

  const settlementId = String(body?.settlementId ?? "").trim();
  const label = String(body?.label ?? "").trim();
  const amount = Math.max(0, Number(body?.amount ?? 0) || 0);
  const effect = body?.effect ?? "Descuento";
  const applyManagementFee = Boolean(body?.applyManagementFee);
  const notes = String(body?.notes ?? "").trim();

  if (!settlementId) {
    return NextResponse.json({ error: "Falta la liquidacion." }, { status: 400 });
  }

  if (!label) {
    return NextResponse.json({ error: "Falta el concepto." }, { status: 400 });
  }

  if (amount <= 0) {
    return NextResponse.json({ error: "El monto debe ser mayor a cero." }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: settlement, error: settlementError } = await admin
    .from("owner_settlements")
    .select("id, contract_id, contract_owner_id, agency_id, agencies!inner(slug)")
    .eq("id", settlementId)
    .maybeSingle();

  if (settlementError || !settlement) {
    return NextResponse.json({ error: "No encontramos la liquidacion." }, { status: 404 });
  }

  const agencySlug = Array.isArray(settlement.agencies)
    ? settlement.agencies[0]?.slug ?? null
    : ((settlement.agencies as { slug?: string } | null)?.slug ?? null);
  if (current.profile.role === "agency_admin" && current.profile.agency_slug !== agencySlug) {
    return NextResponse.json({ error: "No puedes editar liquidaciones de otra inmobiliaria." }, { status: 403 });
  }

  const { error: insertError } = await admin.from("owner_settlement_items").insert({
    settlement_id: settlement.id,
    contract_id: settlement.contract_id,
    contract_owner_id: settlement.contract_owner_id,
    agency_id: settlement.agency_id,
    label,
    amount,
    effect,
    apply_management_fee: applyManagementFee,
    notes,
    created_by: current.user.id,
  });

  if (insertError) {
    return NextResponse.json({ error: "No se pudo guardar el concepto particular." }, { status: 400 });
  }

  try {
    await recalculateSettlement(admin, settlement.id);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "No se pudo recalcular la liquidacion." },
      { status: 400 }
    );
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request) {
  const current = await getCurrentUserContext();
  if (!current) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  if (!["superadmin", "agency_admin"].includes(current.profile.role)) {
    return NextResponse.json({ error: "Sin permisos." }, { status: 403 });
  }

  const body = (await request.json().catch(() => null)) as { itemId?: string } | null;
  const itemId = String(body?.itemId ?? "").trim();

  if (!itemId) {
    return NextResponse.json({ error: "Falta el concepto particular." }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: item, error: itemError } = await admin
    .from("owner_settlement_items")
    .select("id, settlement_id, agencies!inner(slug)")
    .eq("id", itemId)
    .maybeSingle();

  if (itemError || !item) {
    return NextResponse.json({ error: "No encontramos el concepto particular." }, { status: 404 });
  }

  const agencySlug = Array.isArray(item.agencies)
    ? item.agencies[0]?.slug ?? null
    : ((item.agencies as { slug?: string } | null)?.slug ?? null);
  if (current.profile.role === "agency_admin" && current.profile.agency_slug !== agencySlug) {
    return NextResponse.json({ error: "No puedes editar conceptos de otra inmobiliaria." }, { status: 403 });
  }

  const { error: deleteError } = await admin.from("owner_settlement_items").delete().eq("id", itemId);
  if (deleteError) {
    return NextResponse.json({ error: "No se pudo eliminar el concepto particular." }, { status: 400 });
  }

  try {
    await recalculateSettlement(admin, item.settlement_id);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "No se pudo recalcular la liquidacion." },
      { status: 400 }
    );
  }

  return NextResponse.json({ ok: true });
}
