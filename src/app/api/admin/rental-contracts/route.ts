import { NextResponse } from "next/server";

import { getCurrentUserContext } from "@/lib/auth/current-user";
import {
  analyzeRentalContractText,
  buildFallbackContractSchedule,
} from "@/lib/rental-contract-analysis";
import type { UploadedRentalContractFile } from "@/lib/rental-contract-files";
import { uploadRentalContractFile } from "@/lib/rental-contract-files";
import { createAdminClient } from "@/lib/supabase/admin";

function normalizeOptionalString(value: string | null | undefined) {
  if (!value) return null;
  const trimmed = value.trim();
  return trimmed || null;
}

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
  const currentRentRaw = String(formData.get("currentRent") ?? "").trim();
  const indexType = String(formData.get("indexType") ?? "").trim();
  const adjustmentFrequencyMonths = Number(formData.get("adjustmentFrequencyMonths") ?? 0);
  const contractStartDateRaw = String(formData.get("contractStartDate") ?? "").trim();
  const nextAdjustmentDateRaw = String(formData.get("nextAdjustmentDate") ?? "").trim();
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

  const missingReadableContract = contractFile && !uploadedContract?.extractedText?.trim();

  const resolvedTenantName =
    tenantName || analyzedContract?.tenantName || existingContract?.tenant_name || "";
  const resolvedTenantPhone = tenantPhone || existingContract?.tenant_phone || "";
  const resolvedTenantEmail = normalizeOptionalString(tenantEmail) ?? existingContract?.tenant_email ?? null;
  const resolvedCurrentRent =
    analyzedContract?.currentRent ??
    existingContract?.current_rent ??
    (currentRentRaw ? Number(currentRentRaw) : null) ??
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
    analyzedContract?.contractStartDate ??
    normalizeOptionalString(contractStartDateRaw) ??
    existingContract?.contract_start_date ??
    null;
  const resolvedNextAdjustmentDate =
    analyzedContract?.nextAdjustmentDate ??
    normalizeOptionalString(nextAdjustmentDateRaw) ??
    existingContract?.next_adjustment_date ??
    null;
  const schedule = buildFallbackContractSchedule({
    contractStartDate: resolvedContractStartDate,
    nextAdjustmentDate: resolvedNextAdjustmentDate,
    adjustmentFrequencyMonths: resolvedAdjustmentFrequencyMonths,
  });
  const reviewReasons = [
    ...(analyzedContract?.reviewReasons ?? []),
    ...(missingReadableContract
      ? ["Se adjuntó un contrato, pero no pudimos extraer texto legible del archivo."]
      : []),
  ];
  const requiresReview = reviewReasons.length > 0;
  const safeStatus =
    requiresReview && status === "Activo" ? "Pausado" : status;
  const safeAutoNotify = requiresReview ? false : autoNotify;
  const mergedNotes = [notes, ...reviewReasons.map((reason) => `[Revision requerida] ${reason}`)]
    .filter(Boolean)
    .join("\n");

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
    contract_start_date: schedule.contractStartDate,
    rent_reference_date:
      existingContract?.rent_reference_date ??
      schedule.contractStartDate ??
      existingContract?.contract_start_date ??
      null,
    next_adjustment_date: schedule.nextAdjustmentDate,
    last_adjustment_date: existingContract?.last_adjustment_date ?? null,
    auto_notify: safeAutoNotify,
    notification_channel: "whatsapp",
    status: safeStatus,
    notes: mergedNotes,
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
    console.error("[rental-contract] upsert failed", {
      propertyId: property.id,
      message: error.message,
      details: error.details,
      hint: error.hint,
      code: error.code,
      payload: {
        tenant_name: upsertPayload.tenant_name,
        current_rent: upsertPayload.current_rent,
        index_type: upsertPayload.index_type,
        adjustment_frequency_months: upsertPayload.adjustment_frequency_months,
        contract_start_date: upsertPayload.contract_start_date,
        rent_reference_date: upsertPayload.rent_reference_date,
        next_adjustment_date: upsertPayload.next_adjustment_date,
        status: upsertPayload.status,
      },
    });
    return NextResponse.json(
      { error: "No se pudo guardar el contrato." },
      { status: 400 }
    );
  }

  return NextResponse.json({
    ok: true,
    warning: requiresReview
      ? "Guardamos el contrato, pero quedó pausado para automatización porque faltan datos críticos detectados con certeza. Revisa fechas, índice y frecuencia antes de activarlo."
      : uploadedContract?.extractionWarning ?? null,
    requiresReview,
    reviewReasons,
  });
}

export async function PATCH(request: Request) {
  const current = await getCurrentUserContext();

  if (!current) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  if (!["superadmin", "agency_admin"].includes(current.profile.role)) {
    return NextResponse.json(
      { error: "No tienes permisos para confirmar contratos." },
      { status: 403 }
    );
  }

  const body = (await request.json().catch(() => null)) as
    | {
        contractId?: string;
        tenantName?: string;
        tenantPhone?: string;
        tenantEmail?: string | null;
        currentRent?: number;
        indexType?: "IPC" | "ICL";
        adjustmentFrequencyMonths?: number;
        contractStartDate?: string;
        nextAdjustmentDate?: string;
        autoNotify?: boolean;
        notes?: string;
      }
    | null;

  const contractId = String(body?.contractId ?? "").trim();
  if (!contractId) {
    return NextResponse.json({ error: "Falta el contrato a confirmar." }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: contract, error } = await admin
    .from("rental_contracts")
    .select("id, agency_id, tenant_name, tenant_phone, tenant_email, current_rent, index_type, adjustment_frequency_months, contract_start_date, next_adjustment_date, auto_notify, notes, agencies!inner(slug)")
    .eq("id", contractId)
    .maybeSingle();

  if (error || !contract) {
    return NextResponse.json({ error: "No encontramos el contrato." }, { status: 404 });
  }

  const contractAgencySlug = Array.isArray(contract.agencies)
    ? contract.agencies[0]?.slug ?? null
    : ((contract.agencies as { slug?: string } | null)?.slug ?? null);

  if (
    current.profile.role === "agency_admin" &&
    current.profile.agency_slug !== contractAgencySlug
  ) {
    return NextResponse.json(
      { error: "Solo puedes confirmar contratos de tu inmobiliaria." },
      { status: 403 }
    );
  }

  const tenantName = String(body?.tenantName ?? contract.tenant_name).trim();
  const tenantPhone = String(body?.tenantPhone ?? contract.tenant_phone).trim();
  const tenantEmail = body?.tenantEmail?.trim?.() || null;
  const currentRent = Number(body?.currentRent ?? contract.current_rent);
  const indexType = body?.indexType ?? contract.index_type;
  const adjustmentFrequencyMonths = Number(
    body?.adjustmentFrequencyMonths ?? contract.adjustment_frequency_months
  );
  const contractStartDate = String(body?.contractStartDate ?? contract.contract_start_date).trim();
  const nextAdjustmentDate = String(body?.nextAdjustmentDate ?? contract.next_adjustment_date).trim();
  const autoNotify = Boolean(body?.autoNotify ?? contract.auto_notify);
  const notes = String(body?.notes ?? contract.notes ?? "")
    .split("\n")
    .filter((line) => !line.trim().startsWith("[Revision requerida]"))
    .join("\n")
    .trim();

  if (
    !tenantName ||
    !tenantPhone ||
    !Number.isFinite(currentRent) ||
    currentRent <= 0 ||
    !["IPC", "ICL"].includes(indexType) ||
    !Number.isFinite(adjustmentFrequencyMonths) ||
    adjustmentFrequencyMonths <= 0 ||
    !contractStartDate ||
    !nextAdjustmentDate
  ) {
    return NextResponse.json(
      { error: "Completa los datos críticos del contrato antes de activarlo." },
      { status: 400 }
    );
  }

  const { error: updateError } = await admin
    .from("rental_contracts")
    .update({
      tenant_name: tenantName,
      tenant_phone: tenantPhone,
      tenant_email: tenantEmail,
      current_rent: currentRent,
      index_type: indexType,
      adjustment_frequency_months: adjustmentFrequencyMonths,
      contract_start_date: contractStartDate,
      rent_reference_date: contractStartDate,
      next_adjustment_date: nextAdjustmentDate,
      auto_notify: autoNotify,
      status: "Activo",
      notes,
    })
    .eq("id", contractId);

  if (updateError) {
    return NextResponse.json({ error: "No se pudo confirmar el contrato." }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
