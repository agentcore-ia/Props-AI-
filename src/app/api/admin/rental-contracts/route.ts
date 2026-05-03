import { NextResponse } from "next/server";

import { getCurrentUserContext } from "@/lib/auth/current-user";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  const current = await getCurrentUserContext();

  if (!current) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  if (!["superadmin", "agency_admin"].includes(current.profile.role)) {
    return NextResponse.json(
      { error: "No tienes permisos para gestionar contratos." },
      { status: 403 }
    );
  }

  const body = await request.json();
  const propertyId = String(body.propertyId ?? "").trim();
  const tenantName = String(body.tenantName ?? "").trim();
  const tenantPhone = String(body.tenantPhone ?? "").trim();
  const tenantEmail = String(body.tenantEmail ?? "").trim();
  const currentRent = Number(body.currentRent ?? 0);
  const indexType = String(body.indexType ?? "").trim();
  const adjustmentFrequencyMonths = Number(body.adjustmentFrequencyMonths ?? 0);
  const contractStartDate = String(body.contractStartDate ?? "").trim();
  const nextAdjustmentDate = String(body.nextAdjustmentDate ?? "").trim();
  const notes = String(body.notes ?? "").trim();
  const autoNotify = Boolean(body.autoNotify ?? true);
  const status = String(body.status ?? "Activo").trim();

  if (
    !propertyId ||
    !tenantName ||
    !tenantPhone ||
    !currentRent ||
    !adjustmentFrequencyMonths ||
    !contractStartDate ||
    !nextAdjustmentDate
  ) {
    return NextResponse.json(
      { error: "Completa todos los campos del contrato." },
      { status: 400 }
    );
  }

  const admin = createAdminClient();
  const { data: property, error: propertyError } = await admin
    .from("properties")
    .select("id, agency_id, operation, agencies!inner(slug)")
    .eq("id", propertyId)
    .maybeSingle();

  if (propertyError || !property) {
    return NextResponse.json(
      { error: "No encontramos la propiedad." },
      { status: 404 }
    );
  }

  if (property.operation !== "Alquiler") {
    return NextResponse.json(
      { error: "Solo puedes configurar contratos en propiedades de alquiler." },
      { status: 400 }
    );
  }

  const propertyAgencySlug = Array.isArray(property.agencies)
    ? property.agencies[0]?.slug ?? null
    : ((property.agencies as { slug?: string } | null)?.slug ?? null);

  if (
    current.profile.role === "agency_admin" &&
    current.profile.agency_slug !== propertyAgencySlug
  ) {
    return NextResponse.json(
      { error: "Solo puedes editar contratos de tu inmobiliaria." },
      { status: 403 }
    );
  }

  const { data: existingContract, error: existingContractError } = await admin
    .from("rental_contracts")
    .select("id, rent_reference_date, last_adjustment_date")
    .eq("property_id", property.id)
    .maybeSingle();

  if (existingContractError) {
    return NextResponse.json(
      { error: "No se pudo leer el contrato actual." },
      { status: 400 }
    );
  }

  const upsertPayload = {
    property_id: property.id,
    agency_id: property.agency_id,
    tenant_name: tenantName,
    tenant_phone: tenantPhone,
    tenant_email: tenantEmail || null,
    current_rent: currentRent,
    currency: "ARS",
    index_type: indexType,
    adjustment_frequency_months: adjustmentFrequencyMonths,
    contract_start_date: contractStartDate,
    rent_reference_date: existingContract?.rent_reference_date ?? contractStartDate,
    next_adjustment_date: nextAdjustmentDate,
    last_adjustment_date: existingContract?.last_adjustment_date ?? null,
    auto_notify: autoNotify,
    notification_channel: "whatsapp",
    status,
    notes,
    created_by: current.user.id,
  };

  const { error } = await admin.from("rental_contracts").upsert(upsertPayload, {
    onConflict: "property_id",
  });

  if (error) {
    return NextResponse.json(
      { error: "No se pudo guardar el contrato." },
      { status: 400 }
    );
  }

  return NextResponse.json({ ok: true });
}
