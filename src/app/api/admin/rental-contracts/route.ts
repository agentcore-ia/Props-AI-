import { NextResponse } from "next/server";

import { getCurrentUserContext } from "@/lib/auth/current-user";
import { uploadRentalContractFile } from "@/lib/rental-contract-files";
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

  const formData = await request.formData();
  const propertyId = String(formData.get("propertyId") ?? "").trim();
  const tenantName = String(formData.get("tenantName") ?? "").trim();
  const tenantPhone = String(formData.get("tenantPhone") ?? "").trim();
  const tenantEmail = String(formData.get("tenantEmail") ?? "").trim();
  const currentRent = Number(formData.get("currentRent") ?? 0);
  const indexType = String(formData.get("indexType") ?? "").trim();
  const adjustmentFrequencyMonths = Number(formData.get("adjustmentFrequencyMonths") ?? 0);
  const contractStartDate = String(formData.get("contractStartDate") ?? "").trim();
  const nextAdjustmentDate = String(formData.get("nextAdjustmentDate") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim();
  const autoNotify = String(formData.get("autoNotify") ?? "true") === "true";
  const status = String(formData.get("status") ?? "Activo").trim();
  const contractFileEntry = formData.get("contractFile");
  const contractFile =
    contractFileEntry instanceof File && contractFileEntry.size > 0 ? contractFileEntry : null;

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
    .select("id, rent_reference_date, last_adjustment_date, contract_file_name, contract_file_path, contract_file_mime_type, contract_file_size_bytes, contract_text")
    .eq("property_id", property.id)
    .maybeSingle();

  if (existingContractError) {
    return NextResponse.json(
      { error: "No se pudo leer el contrato actual." },
      { status: 400 }
    );
  }

  let uploadedContract:
    | {
        fileName: string;
        filePath: string;
        mimeType: string;
        sizeBytes: number;
        extractedText: string;
      }
    | null = null;

  if (contractFile) {
    try {
      uploadedContract = await uploadRentalContractFile({
        tenantSlug: propertyAgencySlug ?? "agencia",
        propertyId: property.id,
        file: contractFile,
      });
    } catch (uploadError) {
      return NextResponse.json(
        {
          error:
            uploadError instanceof Error
              ? uploadError.message
              : "No se pudo subir el contrato adjunto.",
        },
        { status: 400 }
      );
    }
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
    contract_file_name: uploadedContract?.fileName ?? existingContract?.contract_file_name ?? null,
    contract_file_path: uploadedContract?.filePath ?? existingContract?.contract_file_path ?? null,
    contract_file_mime_type:
      uploadedContract?.mimeType ?? existingContract?.contract_file_mime_type ?? null,
    contract_file_size_bytes:
      uploadedContract?.sizeBytes ?? existingContract?.contract_file_size_bytes ?? null,
    contract_text: uploadedContract?.extractedText ?? existingContract?.contract_text ?? "",
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
