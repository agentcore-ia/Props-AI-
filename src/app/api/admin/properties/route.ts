import { NextResponse } from "next/server";

import { getCurrentUserContext } from "@/lib/auth/current-user";
import { uploadPropertyImages } from "@/lib/property-images";
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
  const location = String(formData.get("location") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const manualImageUrl = String(formData.get("manualImageUrl") ?? "").trim();
  const status = String(formData.get("status") ?? "").trim();
  const operation = String(formData.get("operation") ?? "").trim();
  const rentalContract = parseRentalContract(formData.get("rentalContract"));

  if (!tenantSlug || !title || !location || !description || !status || !operation || !price) {
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
      location,
      description,
      status,
      operation,
      image: primaryImage,
      images: images.length > 0 ? images : [primaryImage],
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
    const currentRent = Number(rentalContract.currentRent ?? 0);
    const adjustmentFrequencyMonths = Number(rentalContract.adjustmentFrequencyMonths ?? 0);

    if (
      !rentalContract.tenantName?.trim() ||
      !rentalContract.tenantPhone?.trim() ||
      !rentalContract.contractStartDate ||
      !rentalContract.nextAdjustmentDate ||
      !currentRent ||
      !adjustmentFrequencyMonths
    ) {
      await admin.from("properties").delete().eq("id", property.id);

      return NextResponse.json(
        { error: "Completa los datos del contrato de alquiler." },
        { status: 400 }
      );
    }

    const { error: contractError } = await admin.from("rental_contracts").insert({
      property_id: property.id,
      agency_id: agency.id,
      tenant_name: rentalContract.tenantName.trim(),
      tenant_phone: rentalContract.tenantPhone.trim(),
      tenant_email: rentalContract.tenantEmail.trim() || null,
      current_rent: currentRent,
      currency: "ARS",
      index_type: rentalContract.indexType,
      adjustment_frequency_months: adjustmentFrequencyMonths,
      contract_start_date: rentalContract.contractStartDate,
      rent_reference_date: rentalContract.contractStartDate,
      next_adjustment_date: rentalContract.nextAdjustmentDate,
      auto_notify: rentalContract.autoNotify,
      notification_channel: "whatsapp",
      status: "Activo",
      notes: rentalContract.notes?.trim() ?? "",
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
