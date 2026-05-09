import { NextResponse } from "next/server";

import { getCurrentUserContext } from "@/lib/auth/current-user";
import { createAdminClient } from "@/lib/supabase/admin";

function startOfMonth(value: string) {
  return `${value}-01`;
}

function getCurrentMonthLabel() {
  return new Date().toISOString().slice(0, 7);
}

function roundMoney(value: number) {
  return Number(value.toFixed(2));
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
  const contractIds = rows.map((contract) => contract.id);
  const { data: ownersData, error: ownersError } = contractIds.length
    ? await admin
        .from("rental_contract_owners")
        .select("*")
        .in("contract_id", contractIds)
        .order("display_order", { ascending: true })
    : { data: [], error: null };
  const { data: collectionsData, error: collectionsError } = contractIds.length
    ? await admin
        .from("rental_collections")
        .select("contract_id, collection_month, collected_amount, notes")
        .eq("collection_month", settlementMonth)
        .in("contract_id", contractIds)
    : { data: [], error: null };

  if (ownersError && !/rental_contract_owners/i.test(ownersError.message ?? "")) {
    return NextResponse.json(
      { error: "No se pudieron leer los propietarios del contrato." },
      { status: 400 }
    );
  }

  if (collectionsError && !/rental_collections/i.test(collectionsError.message ?? "")) {
    return NextResponse.json(
      { error: "No se pudo leer la cobranza del periodo para liquidar." },
      { status: 400 }
    );
  }

  const ownersByContractId = new Map<string, Array<{
    id: string;
    full_name: string;
    email: string | null;
    phone: string | null;
    participation_percent: number;
  }>>();

  for (const owner of ((ownersData ?? []) as Array<{
    id: string;
    contract_id: string;
    full_name: string;
    email: string | null;
    phone: string | null;
    participation_percent: number;
  }>)) {
    const currentOwners = ownersByContractId.get(owner.contract_id) ?? [];
    currentOwners.push(owner);
    ownersByContractId.set(owner.contract_id, currentOwners);
  }

  const collectionsByContractId = new Map(
    ((collectionsData ?? []) as Array<{
      contract_id: string;
      collection_month: string;
      collected_amount: number;
      notes: string | null;
    }>).map((collection) => [collection.contract_id, collection])
  );

  const multiOwnerPayload: Array<{
    contract_id: string;
    contract_owner_id: string | null;
    property_id: string;
    agency_id: string;
    settlement_month: string;
    owner_name: string;
    owner_email: string | null;
    owner_phone: string | null;
    participation_percent: number;
    rent_collected: number;
    management_fee_percent: number;
    management_fee_amount: number;
    monthly_owner_costs: number;
    other_charges_amount: number;
    other_charges_detail: string;
    owner_payout_amount: number;
    status: "Emitida";
    sent_at: null;
    paid_at: null;
    created_by: string;
  }> = [];

  for (const contract of rows) {
    const contractOwners = ownersByContractId.get(contract.id) ?? [];
    const collection = collectionsByContractId.get(contract.id);
    const rentCollected = Number(collection?.collected_amount ?? contract.current_rent ?? 0);
    const managementFeePercent = Number(contract.management_fee_percent ?? 0);
    const monthlyOwnerCosts = Number(contract.monthly_owner_costs ?? 0);

    if (contractOwners.length > 0) {
      for (const owner of contractOwners) {
        const participationPercent = Number(owner.participation_percent ?? 0);
        const ratio = participationPercent > 0 ? participationPercent / 100 : 0;
        const ownerRentCollected = roundMoney(rentCollected * ratio);
        const ownerManagementFeeAmount = roundMoney(ownerRentCollected * (managementFeePercent / 100));
        const ownerMonthlyCosts = roundMoney(monthlyOwnerCosts * ratio);
        const ownerOtherCharges = roundMoney(otherChargesAmount * ratio);
        const ownerPayoutAmount = roundMoney(
          Math.max(0, ownerRentCollected - ownerManagementFeeAmount - ownerMonthlyCosts - ownerOtherCharges)
        );

        multiOwnerPayload.push({
          contract_id: contract.id,
          contract_owner_id: owner.id,
          property_id: contract.property_id,
          agency_id: contract.agency_id,
          settlement_month: settlementMonth,
          owner_name: owner.full_name,
          owner_email: owner.email,
          owner_phone: owner.phone,
          participation_percent: participationPercent,
          rent_collected: ownerRentCollected,
          management_fee_percent: managementFeePercent,
          management_fee_amount: ownerManagementFeeAmount,
          monthly_owner_costs: ownerMonthlyCosts,
          other_charges_amount: ownerOtherCharges,
          other_charges_detail: otherChargesDetail,
          owner_payout_amount: ownerPayoutAmount,
          status: "Emitida" as const,
          sent_at: null,
          paid_at: null,
          created_by: current.user.id,
        });
      }
      continue;
    }

    if (!contract.owner_name?.trim()) {
      continue;
    }

    const managementFeeAmount = roundMoney(rentCollected * (managementFeePercent / 100));
    const ownerPayoutAmount = roundMoney(
      Math.max(0, rentCollected - managementFeeAmount - monthlyOwnerCosts - otherChargesAmount)
    );

    multiOwnerPayload.push({
      contract_id: contract.id,
      contract_owner_id: null,
      property_id: contract.property_id,
      agency_id: contract.agency_id,
      settlement_month: settlementMonth,
      owner_name: contract.owner_name.trim(),
      owner_email: contract.owner_email,
      owner_phone: contract.owner_phone,
      participation_percent: 100,
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
    });
  }

  if (multiOwnerPayload.length === 0) {
    return NextResponse.json(
      { error: "No hay contratos con propietarios configurados para liquidar." },
      { status: 400 }
    );
  }

  const targetContractIds = Array.from(new Set(multiOwnerPayload.map((item) => item.contract_id)));

  if (targetContractIds.length > 0) {
    const { error: deleteExistingError } = await admin
      .from("owner_settlements")
      .delete()
      .eq("settlement_month", settlementMonth)
      .in("contract_id", targetContractIds);

    if (deleteExistingError) {
      return NextResponse.json(
        { error: "No se pudieron refrescar las liquidaciones existentes." },
        { status: 400 }
      );
    }
  }

  const { data: inserted, error: upsertError } = await admin
    .from("owner_settlements")
    .insert(multiOwnerPayload)
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
