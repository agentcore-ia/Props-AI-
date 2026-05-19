import { NextResponse } from "next/server";

import { getCurrentUserContext } from "@/lib/auth/current-user";
import { logFinancialAudit } from "@/lib/financial-audit";
import { createAdminClient } from "@/lib/supabase/admin";

function currentMonthLabel() {
  return new Date().toISOString().slice(0, 7);
}

export async function POST(request: Request) {
  const current = await getCurrentUserContext();
  if (!current) return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  if (!["superadmin", "agency_admin", "agent"].includes(current.profile.role)) {
    return NextResponse.json({ error: "Sin permisos." }, { status: 403 });
  }

  const body = (await request.json().catch(() => null)) as { month?: string } | null;
  const month = String(body?.month ?? currentMonthLabel()).slice(0, 7);
  if (!/^\d{4}-\d{2}$/.test(month)) {
    return NextResponse.json({ error: "El periodo debe tener formato YYYY-MM." }, { status: 400 });
  }

  const admin = createAdminClient();
  let contractsQuery = admin
    .from("rental_contracts")
    .select("id, property_id, agency_id, current_rent, tenant_name, status, agencies!inner(slug)")
    .eq("status", "Activo");

  if (current.profile.role !== "superadmin") {
    contractsQuery = contractsQuery.eq("agencies.slug", current.profile.agency_slug);
  }

  const { data: contracts, error: contractsError } = await contractsQuery;
  if (contractsError) {
    return NextResponse.json({ error: "No se pudieron leer los contratos activos." }, { status: 400 });
  }

  const rows = (contracts ?? []) as Array<{
    id: string;
    property_id: string;
    agency_id: string;
    current_rent: number;
    tenant_name: string;
  }>;

  if (rows.length === 0) {
    return NextResponse.json({ ok: true, month, created: 0, skipped: 0 });
  }

  const contractIds = rows.map((contract) => contract.id);
  const { data: existing, error: existingError } = await admin
    .from("rental_collections")
    .select("contract_id")
    .eq("collection_month", month)
    .in("contract_id", contractIds);

  if (existingError) {
    return NextResponse.json({ error: "No se pudo revisar el periodo de cobranza." }, { status: 400 });
  }

  const existingIds = new Set(((existing ?? []) as Array<{ contract_id: string }>).map((item) => item.contract_id));
  const missing = rows.filter((contract) => !existingIds.has(contract.id));

  if (missing.length === 0) {
    return NextResponse.json({ ok: true, month, created: 0, skipped: rows.length });
  }

  const { error: insertError } = await admin.from("rental_collections").insert(
    missing.map((contract) => ({
      contract_id: contract.id,
      property_id: contract.property_id,
      agency_id: contract.agency_id,
      collection_month: month,
      expected_rent: Number(contract.current_rent ?? 0),
      collected_amount: 0,
      payment_method: "Pendiente",
      payment_date: null,
      status: "Pendiente",
      notes: `Periodo ${month} preparado automaticamente por Props.`,
      created_by: current.user.id,
    }))
  );

  if (insertError) {
    return NextResponse.json({ error: "No se pudo preparar el periodo de cobranzas." }, { status: 400 });
  }

  await logFinancialAudit({
    admin,
    agencyId: missing[0]?.agency_id,
    actorId: current.user.id,
    action: "rental_period_prepared",
    entityTable: "rental_collections",
    amount: missing.reduce((sum, contract) => sum + Number(contract.current_rent ?? 0), 0),
    summary: `Periodo ${month} preparado con ${missing.length} cobranzas pendientes`,
    metadata: { month, created: missing.length, skipped: rows.length - missing.length },
  });

  return NextResponse.json({
    ok: true,
    month,
    created: missing.length,
    skipped: rows.length - missing.length,
  });
}
