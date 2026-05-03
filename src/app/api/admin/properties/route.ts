import { NextResponse } from "next/server";

import { getCurrentUserContext } from "@/lib/auth/current-user";
import { createAdminClient } from "@/lib/supabase/admin";

const fallbackImage =
  "https://images.unsplash.com/photo-1494526585095-c41746248156?auto=format&fit=crop&w=1200&q=80";

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

  const body = await request.json();
  const tenantSlug = String(body.tenantSlug ?? "").trim().toLowerCase();
  const title = String(body.title ?? "").trim();
  const price = Number(body.price ?? 0);
  const location = String(body.location ?? "").trim();
  const description = String(body.description ?? "").trim();
  const image = String(body.image ?? "").trim() || fallbackImage;
  const status = String(body.status ?? "").trim();
  const operation = String(body.operation ?? "").trim();

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
    .select("id, slug")
    .eq("slug", tenantSlug)
    .maybeSingle();

  if (agencyError || !agency) {
    return NextResponse.json(
      { error: "No encontramos la inmobiliaria elegida." },
      { status: 404 }
    );
  }

  const { error } = await admin.from("properties").insert({
    agency_id: agency.id,
    title,
    price,
    location,
    description,
    status,
    operation,
    image,
    images: [image, fallbackImage, fallbackImage],
    created_by: current.user.id,
  });

  if (error) {
    return NextResponse.json(
      { error: "No se pudo guardar la propiedad." },
      { status: 400 }
    );
  }

  return NextResponse.json({ ok: true });
}
