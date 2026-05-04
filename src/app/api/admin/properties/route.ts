import { NextResponse } from "next/server";

import { getCurrentUserContext } from "@/lib/auth/current-user";
import { uploadPropertyImages } from "@/lib/property-images";
import { analyzeRentalContractText } from "@/lib/rental-contract-analysis";
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

  const images = [
    ...uploadedImages,
    ...(manualImageUrl ? [manualImageUrl] : []),
  ];
  const primaryImage = images[0] ?? fallbackImage;

  const { data: property, error } = await admin
    .from("properties")
    .insert({
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
      created_by: current.user.id,
    })
    .select("id")
    .single();

  if (error || !property) {
    return NextResponse.json(
      { error: "No se pudo guardar la propiedad." },
      { status: 400 }
    );
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
        await admin.from("properties").delete().eq("id", property.id);

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

    const draftCurrentRent = Number(rentalContract.currentRent ?? 0);
    const draftFrequency = Number(rentalContract.adjustmentFrequencyMonths ?? 0);
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
    const resolvedContractStartDate =
      analyzedContract?.contractStartDate ?? rentalContract.contractStartDate ?? null;
    const resolvedNextAdjustmentDate =
      analyzedContract?.nextAdjustmentDate ?? rentalContract.nextAdjustmentDate ?? null;

    const { error: contractError } = await admin.from("rental_contracts").insert({
      property_id: property.id,
      agency_id: agency.id,
      tenant_name: rentalContract.tenantName.trim(),
      tenant_phone: rentalContract.tenantPhone.trim(),
      tenant_email: rentalContract.tenantEmail.trim() || null,
      current_rent: resolvedCurrentRent,
      currency: "ARS",
      index_type: resolvedIndexType,
      adjustment_frequency_months: resolvedAdjustmentFrequencyMonths,
      contract_start_date: resolvedContractStartDate,
      rent_reference_date: resolvedContractStartDate,
      next_adjustment_date: resolvedNextAdjustmentDate,
      auto_notify: rentalContract.autoNotify,
      notification_channel: "whatsapp",
      status: "Activo",
      notes: rentalContract.notes?.trim() ?? "",
      contract_file_name: uploadedContract?.fileName ?? null,
      contract_file_path: uploadedContract?.filePath ?? null,
      contract_file_mime_type: uploadedContract?.mimeType ?? null,
      contract_file_size_bytes: uploadedContract?.sizeBytes ?? null,
      contract_text: uploadedContract?.extractedText ?? "",
      created_by: current.user.id,
    });

    if (contractError) {
      await admin.from("properties").delete().eq("id", property.id);

      return NextResponse.json(
        { error: "La propiedad se creo, pero fallo el contrato de alquiler." },
        { status: 400 }
      );
    }
  }

  return NextResponse.json({ ok: true, propertyId: property.id });
}
