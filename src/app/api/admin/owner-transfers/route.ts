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
        settlementId?: string | null;
        contractId?: string;
        contractOwnerId?: string | null;
        amount?: number;
        destinationLabel?: string;
        transferDate?: string | null;
        status?: "Pendiente" | "Programada" | "Enviada" | "Confirmada";
        notes?: string;
      }
    | null;

  const contractId = String(body?.contractId ?? "").trim();
  const contractOwnerId = String(body?.contractOwnerId ?? "").trim() || null;
  if (!contractId) {
    return NextResponse.json({ error: "Falta el contrato." }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: contract, error } = await admin
    .from("rental_contracts")
    .select("id, property_id, agency_id, owner_name, owner_email, owner_phone, current_rent, management_fee_percent, monthly_owner_costs, agencies!inner(slug)")
    .eq("id", contractId)
    .maybeSingle();

  if (error || !contract) {
    return NextResponse.json({ error: "No encontramos el contrato." }, { status: 404 });
  }

  const agencySlug = Array.isArray(contract.agencies)
    ? contract.agencies[0]?.slug ?? null
    : ((contract.agencies as { slug?: string } | null)?.slug ?? null);

  if (current.profile.role === "agency_admin" && current.profile.agency_slug !== agencySlug) {
    return NextResponse.json({ error: "No puedes transferir a otra inmobiliaria." }, { status: 403 });
  }

  const { data: contractOwner, error: contractOwnerError } = contractOwnerId
    ? await admin
        .from("rental_contract_owners")
        .select("id, full_name, email, phone, participation_percent")
        .eq("id", contractOwnerId)
        .eq("contract_id", contractId)
        .maybeSingle()
    : { data: null, error: null };

  if (contractOwnerError && !/rental_contract_owners/i.test(contractOwnerError.message ?? "")) {
    return NextResponse.json({ error: "No se pudo leer el propietario del contrato." }, { status: 400 });
  }

  if (!contract.owner_name?.trim() && !contractOwner?.full_name?.trim()) {
    return NextResponse.json({ error: "El contrato no tiene propietario configurado." }, { status: 400 });
  }

  const ratio = contractOwner ? Number(contractOwner.participation_percent ?? 0) / 100 : 1;
  const amount =
    Number(body?.amount) ||
    Math.max(
      0,
      Number(contract.current_rent ?? 0) * ratio -
        Number(contract.monthly_owner_costs ?? 0) * ratio -
        Number(contract.current_rent ?? 0) * ratio * (Number(contract.management_fee_percent ?? 0) / 100)
    );

  const { error: insertError } = await admin.from("owner_transfers").insert({
    settlement_id: body?.settlementId || null,
    contract_id: contract.id,
    contract_owner_id: contractOwnerId,
    property_id: contract.property_id,
    agency_id: contract.agency_id,
    owner_name: contractOwner?.full_name ?? contract.owner_name,
    amount,
    destination_label: String(
      body?.destinationLabel ??
        contractOwner?.email ??
        contractOwner?.phone ??
        contract.owner_email ??
        contract.owner_phone ??
        "Cuenta informada"
    ).trim(),
    transfer_date: body?.transferDate ? String(body.transferDate).slice(0, 10) : null,
    status: body?.status ?? "Programada",
    notes: String(body?.notes ?? "").trim(),
    created_by: current.user.id,
  });

  if (insertError) {
    return NextResponse.json({ error: "No se pudo registrar la transferencia." }, { status: 400 });
  }

  return NextResponse.json({ ok: true, amount });
}

export async function PATCH(request: Request) {
  const current = await getCurrentUserContext();
  if (!current) return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  if (!["superadmin", "agency_admin"].includes(current.profile.role)) {
    return NextResponse.json({ error: "Sin permisos." }, { status: 403 });
  }

  const body = (await request.json().catch(() => null)) as
    | {
        transferId?: string;
        status?: "Pendiente" | "Programada" | "Enviada" | "Confirmada";
        transferDate?: string | null;
      }
    | null;

  const transferId = String(body?.transferId ?? "").trim();
  if (!transferId) {
    return NextResponse.json({ error: "Falta la transferencia." }, { status: 400 });
  }

  const { error } = await createAdminClient()
    .from("owner_transfers")
    .update({
      status: body?.status ?? "Confirmada",
      transfer_date: body?.transferDate ? String(body.transferDate).slice(0, 10) : null,
    })
    .eq("id", transferId);

  if (error) {
    return NextResponse.json({ error: "No se pudo actualizar la transferencia." }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
