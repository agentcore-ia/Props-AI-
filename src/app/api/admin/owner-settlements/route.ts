import { NextResponse } from "next/server";

import { getCurrentUserContext } from "@/lib/auth/current-user";
import { createAdminClient } from "@/lib/supabase/admin";

function startOfMonth(value: string) {
  return `${value}-01`;
}

function getCurrentMonthLabel() {
  return new Date().toISOString().slice(0, 7);
}

export async function POST(request: Request) {
  const current = await getCurrentUserContext();

  if (!current) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  if (!["superadmin", "agency_admin"].includes(current.profile.role)) {
    return NextResponse.json(
      { error: "No tienes permisos para liquidar propietarios." },
      { status: 403 }
    );
  }

  const body = (await request.json().catch(() => null)) as
    | {
        contractId?: string;
        settlementMonth?: string;
        otherChargesAmount?: number;
        otherChargesDetail?: string;
      }
    | null;

  const settlementMonth = String(body?.settlementMonth ?? getCurrentMonthLabel()).slice(0, 7);
  const contractId = String(body?.contractId ?? "").trim();
  const otherChargesAmount = Math.max(0, Number(body?.otherChargesAmount ?? 0) || 0);
  const otherChargesDetail = String(body?.otherChargesDetail ?? "").trim();

  const admin = createAdminClient();
  let query = admin
    .from("rental_contracts")
    .select(
      "id, property_id, agency_id, current_rent, owner_name, owner_email, owner_phone, management_fee_percent, monthly_owner_costs, status, properties!inner(title, location), agencies!inner(slug)"
    )
    .in("status", ["Activo", "Pausado"]);

  if (contractId) {
    query = query.eq("id", contractId);
  }

  if (current.profile.role === "agency_admin") {
    query = query.eq("agencies.slug", current.profile.agency_slug);
  }

  const { data: contracts, error: contractsError } = await query;

  if (contractsError) {
    return NextResponse.json(
      { error: "No se pudieron leer los contratos para liquidar." },
      { status: 400 }
    );
  }

  const rows = (contracts ?? []) as Array<{
    id: string;
    property_id: string;
    agency_id: string;
    current_rent: number;
    owner_name: string | null;
    owner_email: string | null;
    owner_phone: string | null;
    management_fee_percent: number | null;
    monthly_owner_costs: number | null;
    status: "Activo" | "Pausado" | "Finalizado";
    properties: { title: string; location: string } | { title: string; location: string }[] | null;
    agencies: { slug: string } | { slug: string }[] | null;
  }>;

  const eligible = rows.filter((contract) => contract.owner_name?.trim());

  if (eligible.length === 0) {
    return NextResponse.json(
      { error: "No hay contratos con propietario configurado para liquidar." },
      { status: 400 }
    );
  }

  const payload = eligible.map((contract) => {
    const rentCollected = Number(contract.current_rent ?? 0);
    const managementFeePercent = Number(contract.management_fee_percent ?? 0);
    const managementFeeAmount = Number(
      ((rentCollected * managementFeePercent) / 100).toFixed(2)
    );
    const monthlyOwnerCosts = Number(contract.monthly_owner_costs ?? 0);
    const ownerPayoutAmount = Number(
      Math.max(0, rentCollected - managementFeeAmount - monthlyOwnerCosts - otherChargesAmount).toFixed(2)
    );

    return {
      contract_id: contract.id,
      property_id: contract.property_id,
      agency_id: contract.agency_id,
      settlement_month: settlementMonth,
      owner_name: contract.owner_name!.trim(),
      owner_email: contract.owner_email,
      owner_phone: contract.owner_phone,
      rent_collected: rentCollected,
      management_fee_percent: managementFeePercent,
      management_fee_amount: managementFeeAmount,
      monthly_owner_costs: monthlyOwnerCosts,
      other_charges_amount: otherChargesAmount,
      other_charges_detail: otherChargesDetail,
      owner_payout_amount: ownerPayoutAmount,
      status: "Emitida" as const,
      sent_at: null,
      paid_at: null,
      created_by: current.user.id,
    };
  });

  const { data: inserted, error: upsertError } = await admin
    .from("owner_settlements")
    .upsert(payload, { onConflict: "contract_id,settlement_month" })
    .select("id, owner_name, settlement_month, owner_payout_amount");

  if (upsertError) {
    return NextResponse.json(
      { error: "No se pudo generar la liquidacion al propietario." },
      { status: 400 }
    );
  }

  return NextResponse.json({
    ok: true,
    processed: inserted?.length ?? 0,
    settlementMonth,
    results: (inserted ?? []).map((item) => ({
      id: item.id,
      ownerName: item.owner_name,
      settlementMonth: item.settlement_month,
      ownerPayoutAmount: item.owner_payout_amount,
    })),
    referenceDate: startOfMonth(settlementMonth),
  });
}
