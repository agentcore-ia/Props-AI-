import { NextResponse } from "next/server";

import { getCurrentUserContext } from "@/lib/auth/current-user";
import { uploadPropertyImages } from "@/lib/property-images";
import {
  analyzeRentalContractText,
  buildFallbackContractSchedule,
} from "@/lib/rental-contract-analysis";
import { uploadRentalContractFile } from "@/lib/rental-contract-files";
import { createAdminClient } from "@/lib/supabase/admin";

const fallbackImage =
  "https://images.unsplash.com/photo-1494526585095-c41746248156?auto=format&fit=crop&w=1200&q=80";

type RentalContractDraft = {
  enabled: boolean;
  tenantName: string;
  tenantPhone: string;
  tenantEmail: string;
  currentRent: string;
  indexType: "IPC" | "ICL";
  adjustmentFrequencyMonths: string;
  lateFeeDailyAmount?: string;
  lateFeeGraceDays?: string;
  contractStartDate: string;
  nextAdjustmentDate: string;
  notes: string;
  autoNotify: boolean;
};

function parseRentalContract(raw: FormDataEntryValue | null): RentalContractDraft | null {
  if (typeof raw !== "string" || !raw.trim()) {
    return null;
  }

  try {
    return JSON.parse(raw) as RentalContractDraft;
  } catch {
    return null;
  }
}

export async function POST(request: Request) {
  return handleUpsertProperty(request, "create");
}

export async function PUT(request: Request) {
  return handleUpsertProperty(request, "update");
}

async function handleUpsertProperty(request: Request, mode: "create" | "update") {
  const current = await getCurrentUserContext();

  if (!current) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  if (!["superadmin", "agency_admin"].includes(current.profile.role)) {
    return NextResponse.json(
      { error: "No tienes permisos para publicar propiedades." },
      { status: 403 }
    );
  }

  const formData = await request.formData();
  const propertyId = String(formData.get("propertyId") ?? "").trim();
  const tenantSlug = String(formData.get("tenantSlug") ?? "").trim().toLowerCase();
  const title = String(formData.get("title") ?? "").trim();
  const price = Number(formData.get("price") ?? 0);
  const currency = String(formData.get("currency") ?? "USD").trim();
  const location = String(formData.get("location") ?? "").trim();
  const exactAddress = String(formData.get("exactAddress") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const propertyType = String(formData.get("propertyType") ?? "Departamento").trim();
  const bedrooms = Number(formData.get("bedrooms") ?? 0);
  const bathrooms = Number(formData.get("bathrooms") ?? 0);
  const area = Number(formData.get("area") ?? 0);
  const parkingSpots = Number(formData.get("parkingSpots") ?? 0);
  const furnished = String(formData.get("furnished") ?? "false") === "true";
  const expensesRaw = String(formData.get("expenses") ?? "").trim();
  const expenses = expensesRaw ? Number(expensesRaw) : null;
  const expensesCurrencyRaw = String(formData.get("expensesCurrency") ?? "").trim();
  const expensesCurrency = expensesRaw ? expensesCurrencyRaw || "ARS" : null;
  const availableFromRaw = String(formData.get("availableFrom") ?? "").trim();
  const availableFrom = availableFromRaw || null;
  const petsPolicy = String(formData.get("petsPolicy") ?? "").trim();
  const requirements = String(formData.get("requirements") ?? "").trim();
  const amenities = String(formData.get("amenities") ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
  const manualImageUrl = String(formData.get("manualImageUrl") ?? "").trim();
  const status = String(formData.get("status") ?? "").trim();
  const operation = String(formData.get("operation") ?? "").trim();
  const rentalContract = parseRentalContract(formData.get("rentalContract"));
  const keepExistingImages = String(formData.get("keepExistingImages") ?? "false") === "true";

  if (!tenantSlug || !title || !location || !exactAddress || !description || !status || !operation || !price) {
    return NextResponse.json(
      { error: "Completa todos los campos de la propiedad." },
      { status: 400 }
    );
  }

  if (
    current.profile.role === "agency_admin" &&
    current.profile.agency_slug !== tenantSlug
  ) {
    return NextResponse.json(
      { error: "Solo puedes publicar en tu propia inmobiliaria." },
      { status: 403 }
    );
  }

  const admin = createAdminClient();
  const { data: agency, error: agencyError } = await admin
    .from("agencies")
    .select("id, slug, messaging_instance")
    .eq("slug", tenantSlug)
    .maybeSingle();

  if (agencyError || !agency) {
    return NextResponse.json(
      { error: "No encontramos la inmobiliaria elegida." },
      { status: 404 }
    );
  }

  const imageFiles = formData
    .getAll("images")
    .filter((entry): entry is File => entry instanceof File && entry.size > 0);
  const contractFileEntry = formData.get("contractFile");
  const contractFile =
    contractFileEntry instanceof File && contractFileEntry.size > 0 ? contractFileEntry : null;
  const isUpdate = mode === "update";

  if (isUpdate && !propertyId) {
    return NextResponse.json({ error: "Falta la propiedad a editar." }, { status: 400 });
  }

  let existingProperty:
    | {
        id: string;
        agency_id: string;
        image: string;
        images: string[] | null;
      }
    | null = null;

  if (isUpdate) {
    const { data: foundProperty, error: propertyLookupError } = await admin
      .from("properties")
      .select("id, agency_id, image, images")
      .eq("id", propertyId)
      .maybeSingle();

    if (propertyLookupError || !foundProperty) {
      return NextResponse.json({ error: "No encontramos la propiedad a editar." }, { status: 404 });
    }

    if (foundProperty.agency_id !== agency.id && current.profile.role !== "superadmin") {
      return NextResponse.json({ error: "No puedes editar una propiedad de otra inmobiliaria." }, { status: 403 });
    }

    existingProperty = foundProperty;
  }

  let uploadedImages: string[] = [];

  try {
    uploadedImages = await uploadPropertyImages({
      tenantSlug,
      files: imageFiles,
    });
  } catch {
    return NextResponse.json(
      { error: "No se pudieron subir las imagenes." },
      { status: 400 }
    );
  }

  const images =
    uploadedImages.length > 0 || manualImageUrl
      ? [...uploadedImages, ...(manualImageUrl ? [manualImageUrl] : [])]
      : keepExistingImages && existingProperty
        ? existingProperty.images && existingProperty.images.length > 0
          ? existingProperty.images
          : [existingProperty.image]
        : [];
  const primaryImage = images[0] ?? fallbackImage;

  const propertyPayload = {
    agency_id: agency.id,
    title,
    price,
    currency,
    location,
    exact_address: exactAddress,
    description,
    status,
    operation,
    image: primaryImage,
    images: images.length > 0 ? images : [primaryImage],
    property_type: propertyType,
    bedrooms,
    bathrooms,
    area,
    parking_spots: parkingSpots,
    furnished,
    expenses,
    expenses_currency: expensesCurrency,
    available_from: availableFrom,
    pets_policy: petsPolicy,
    requirements,
    amenities,
  };

  const propertyQuery = isUpdate
    ? admin
        .from("properties")
        .update(propertyPayload)
        .eq("id", propertyId)
        .select("id")
        .single()
    : admin
        .from("properties")
        .insert({
          ...propertyPayload,
          created_by: current.user.id,
        })
        .select("id")
        .single();

  const { data: property, error } = await propertyQuery;

  if (error || !property) {
    return NextResponse.json(
      { error: isUpdate ? "No se pudo actualizar la propiedad." : "No se pudo guardar la propiedad." },
      { status: 400 }
    );
  }

  if (operation !== "Alquiler" && isUpdate) {
    await admin.from("rental_contracts").delete().eq("property_id", property.id);
  }

  if (operation === "Alquiler" && rentalContract?.enabled) {
    if (!rentalContract.tenantName?.trim() || !rentalContract.tenantPhone?.trim()) {
      await admin.from("properties").delete().eq("id", property.id);

      return NextResponse.json(
        { error: "Completa al menos el nombre y WhatsApp del inquilino." },
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
          tenantSlug,
          propertyId: property.id,
          file: contractFile,
        });
      } catch (uploadError) {
        if (!isUpdate) {
          await admin.from("properties").delete().eq("id", property.id);
        }

        return NextResponse.json(
          {
            error:
              uploadError instanceof Error
                ? uploadError.message
                : "No se pudo subir el contrato de alquiler.",
          },
          { status: 400 }
        );
      }
    }

    const analyzedContract =
      uploadedContract?.extractedText?.trim()
        ? await analyzeRentalContractText({
            text: uploadedContract.extractedText,
            fallbackRent: price,
          })
        : null;
    const missingReadableContract = contractFile && !uploadedContract?.extractedText?.trim();

    const draftCurrentRent = Number(rentalContract.currentRent ?? 0);
    const draftFrequency = Number(rentalContract.adjustmentFrequencyMonths ?? 0);
    const draftLateFeeDailyAmount = Number(rentalContract.lateFeeDailyAmount ?? 0);
    const draftLateFeeGraceDays = Number(rentalContract.lateFeeGraceDays ?? 10);
    const resolvedCurrentRent =
      analyzedContract?.currentRent ??
      (draftCurrentRent > 0 ? draftCurrentRent : null) ??
      price;
    const resolvedIndexType =
      analyzedContract?.indexType ??
      rentalContract.indexType ??
      "IPC";
    const resolvedAdjustmentFrequencyMonths =
      analyzedContract?.adjustmentFrequencyMonths ??
      (draftFrequency > 0 ? draftFrequency : null) ??
      6;
    const resolvedLateFeeDailyAmount = Math.max(
      0,
      analyzedContract?.lateFeeDailyAmount ??
        (Number.isFinite(draftLateFeeDailyAmount) ? draftLateFeeDailyAmount : 0)
    );
    const resolvedLateFeeGraceDays = Math.max(
      0,
      analyzedContract?.lateFeeGraceDays ??
        (Number.isFinite(draftLateFeeGraceDays) ? Math.round(draftLateFeeGraceDays) : 10)
    );
    const resolvedContractStartDate =
      analyzedContract?.contractStartDate ?? rentalContract.contractStartDate ?? null;
    const resolvedNextAdjustmentDate =
      analyzedContract?.nextAdjustmentDate ?? rentalContract.nextAdjustmentDate ?? null;
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
    const safeStatus: "Activo" | "Pausado" | "Finalizado" = requiresReview ? "Pausado" : "Activo";
    const safeAutoNotify = requiresReview ? false : rentalContract.autoNotify;
    const mergedNotes = [rentalContract.notes?.trim() ?? "", ...reviewReasons.map((reason) => `[Revision requerida] ${reason}`)]
      .filter(Boolean)
      .join("\n");

    const { data: existingContract } = await admin
      .from("rental_contracts")
      .select("id, contract_file_name, contract_file_path, contract_file_mime_type, contract_file_size_bytes, contract_text")
      .eq("property_id", property.id)
      .maybeSingle();

    const contractPayload = {
      property_id: property.id,
      agency_id: agency.id,
      tenant_name: rentalContract.tenantName.trim(),
      tenant_phone: rentalContract.tenantPhone.trim(),
      tenant_email: rentalContract.tenantEmail.trim() || null,
      current_rent: resolvedCurrentRent,
      currency: "ARS" as const,
      index_type: resolvedIndexType,
      adjustment_frequency_months: resolvedAdjustmentFrequencyMonths,
      late_fee_daily_amount: resolvedLateFeeDailyAmount,
      late_fee_grace_days: resolvedLateFeeGraceDays,
      contract_start_date: schedule.contractStartDate,
      rent_reference_date: schedule.contractStartDate,
      next_adjustment_date: schedule.nextAdjustmentDate,
      auto_notify: safeAutoNotify,
      notification_channel: "whatsapp" as const,
      status: safeStatus,
      notes: mergedNotes,
      contract_file_name: uploadedContract?.fileName ?? existingContract?.contract_file_name ?? null,
      contract_file_path: uploadedContract?.filePath ?? existingContract?.contract_file_path ?? null,
      contract_file_mime_type: uploadedContract?.mimeType ?? existingContract?.contract_file_mime_type ?? null,
      contract_file_size_bytes: uploadedContract?.sizeBytes ?? existingContract?.contract_file_size_bytes ?? null,
      contract_text: uploadedContract?.extractedText ?? existingContract?.contract_text ?? "",
    };

    const contractQuery = existingContract?.id
      ? admin.from("rental_contracts").update(contractPayload).eq("id", existingContract.id)
      : admin.from("rental_contracts").insert({
          ...contractPayload,
          created_by: current.user.id,
        });

    const { error: contractError } = await contractQuery;

    if (contractError) {
      if (!isUpdate) {
        await admin.from("properties").delete().eq("id", property.id);
      }

      return NextResponse.json(
        { error: isUpdate ? "La propiedad se actualizo, pero fallo el contrato de alquiler." : "La propiedad se creo, pero fallo el contrato de alquiler." },
        { status: 400 }
      );
    }
  }

  return NextResponse.json({ ok: true, propertyId: property.id, mode });
}
