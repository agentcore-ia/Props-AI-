import { NextResponse } from "next/server";

import { upsertLeadFromSignal } from "@/lib/crm-automation";
import { listProperties } from "@/lib/props-data";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  const body = await request.json();

  const tenantSlug = String(body.tenantSlug ?? "").trim().toLowerCase();
  const propertyId = String(body.propertyId ?? "").trim() || null;
  const name = String(body.name ?? "").trim();
  const email = String(body.email ?? "").trim().toLowerCase();
  const phone = String(body.phone ?? "").trim();
  const message = String(body.message ?? "").trim();
  const budget = String(body.budget ?? "").trim() || null;
  const operation = String(body.operation ?? "").trim() || null;

  if (!tenantSlug || !name || !email || !phone || !message) {
    return NextResponse.json(
      { error: "Completa nombre, email, telefono y consulta." },
      { status: 400 }
    );
  }

  const admin = createAdminClient();
  const { data: agency, error: agencyError } = await admin
    .from("agencies")
    .select("id, name, slug, city, messaging_instance")
    .eq("slug", tenantSlug)
    .maybeSingle();

  if (agencyError || !agency) {
    return NextResponse.json(
      { error: "No encontramos la inmobiliaria para esta consulta." },
      { status: 404 }
    );
  }

  let validPropertyId: string | null = null;

  if (propertyId) {
    const { data: property } = await admin
      .from("properties")
      .select("id")
      .eq("id", propertyId)
      .eq("agency_id", agency.id)
      .maybeSingle();

    validPropertyId = property?.id ?? null;
  }

  const { data: inquiry, error } = await admin
    .from("catalog_inquiries")
    .insert({
    agency_id: agency.id,
    property_id: validPropertyId,
    name,
    email,
    phone,
    message,
    budget,
    operation,
    source: validPropertyId ? "property_detail" : "catalog",
    })
    .select("id")
    .single();

  if (error) {
    return NextResponse.json(
      { error: "No se pudo guardar la consulta." },
      { status: 400 }
    );
  }

  const property =
    validPropertyId && tenantSlug
      ? (await listProperties({ tenantSlug })).find((item) => item.id === validPropertyId) ?? null
      : null;

  await upsertLeadFromSignal({
    agency: {
      id: agency.id,
      name: agency.name,
      slug: agency.slug,
      city: agency.city,
      messagingInstance: agency.messaging_instance,
    },
    property,
    inquiryId: inquiry?.id ?? null,
    fullName: name,
    email,
    phone,
    source: validPropertyId ? "web_propiedad" : "web_marketplace",
    message,
  });

  return NextResponse.json({ ok: true });
}
