import { NextResponse } from "next/server";

import { getCurrentUserContext } from "@/lib/auth/current-user";
import { analyzeRentalContractText } from "@/lib/rental-contract-analysis";
import type { UploadedRentalContractFile } from "@/lib/rental-contract-files";
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
  const indexType = String(formData.get("indexType") ?? "").trim();
  const adjustmentFrequencyMonths = Number(formData.get("adjustmentFrequencyMonths") ?? 0);
  const notes = String(formData.get("notes") ?? "").trim();
  const autoNotify = String(formData.get("autoNotify") ?? "true") === "true";
  const status = String(formData.get("status") ?? "Activo").trim();
  const contractFileEntry = formData.get("contractFile");
  const contractFile =
    contractFileEntry instanceof File && contractFileEntry.size > 0 ? contractFileEntry : null;

  if (!propertyId) {
    return NextResponse.json(
      { error: "Falta la propiedad a configurar." },
      { status: 400 }
    );
  }

  const admin = createAdminClient();
  const { data: property, error: propertyError } = await admin
    .from("properties")
    .select("id, agency_id, title, price, currency, operation, agencies!inner(slug)")
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
    .select("id, tenant_name, tenant_phone, tenant_email, current_rent, index_type, adjustment_frequency_months, contract_start_date, next_adjustment_date, rent_reference_date, last_adjustment_date, contract_file_name, contract_file_path, contract_file_mime_type, contract_file_size_bytes, contract_text")
    .eq("property_id", property.id)
    .maybeSingle();

  if (existingContractError) {
    return NextResponse.json(
      { error: "No se pudo leer el contrato actual." },
      { status: 400 }
    );
  }

  let uploadedContract: UploadedRentalContractFile | null = null;

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

  const fallbackRent = Number(property.price ?? 0);
  const analyzedContract =
    uploadedContract?.extractedText?.trim()
      ? await analyzeRentalContractText({
          text: uploadedContract.extractedText,
          fallbackRent,
        })
      : null;

  const resolvedTenantName =
    tenantName || analyzedContract?.tenantName || existingContract?.tenant_name || "";
  const resolvedTenantPhone = tenantPhone || existingContract?.tenant_phone || "";
  const resolvedTenantEmail = tenantEmail || existingContract?.tenant_email || null;
  const resolvedCurrentRent =
    analyzedContract?.currentRent ??
    existingContract?.current_rent ??
    fallbackRent;
  const resolvedIndexType =
    (indexType === "IPC" || indexType === "ICL" ? indexType : null) ??
    analyzedContract?.indexType ??
    existingContract?.index_type ??
    "IPC";
  const resolvedAdjustmentFrequencyMonths =
    (Number.isFinite(adjustmentFrequencyMonths) && adjustmentFrequencyMonths > 0
      ? adjustmentFrequencyMonths
      : null) ??
    analyzedContract?.adjustmentFrequencyMonths ??
    existingContract?.adjustment_frequency_months ??
    6;
  const resolvedContractStartDate =
    analyzedContract?.contractStartDate ?? existingContract?.contract_start_date ?? null;
  const resolvedNextAdjustmentDate =
    analyzedContract?.nextAdjustmentDate ?? existingContract?.next_adjustment_date ?? null;

  if (!resolvedTenantName || !resolvedTenantPhone) {
    return NextResponse.json(
      { error: "Completa al menos el nombre y WhatsApp del inquilino." },
      { status: 400 }
    );
  }

  const upsertPayload = {
    property_id: property.id,
    agency_id: property.agency_id,
    tenant_name: resolvedTenantName,
    tenant_phone: resolvedTenantPhone,
    tenant_email: resolvedTenantEmail,
    current_rent: resolvedCurrentRent,
    currency: "ARS",
    index_type: resolvedIndexType,
    adjustment_frequency_months: resolvedAdjustmentFrequencyMonths,
    contract_start_date: resolvedContractStartDate,
    rent_reference_date:
      existingContract?.rent_reference_date ??
      resolvedContractStartDate ??
      existingContract?.contract_start_date ??
      null,
    next_adjustment_date: resolvedNextAdjustmentDate,
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
    contract_text:
      uploadedContract?.extractedText ??
      existingContract?.contract_text ??
      "",
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

  return NextResponse.json({
    ok: true,
    warning:
      uploadedContract?.extractionWarning ??
      (!resolvedContractStartDate || !resolvedNextAdjustmentDate
        ? "Guardamos el contrato, pero todavia no pudimos detectar todas las fechas automaticamente."
        : null),
  });
}
