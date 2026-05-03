import { NextResponse } from "next/server";

import { getCurrentUserContext } from "@/lib/auth/current-user";
import { createAdminClient } from "@/lib/supabase/admin";

function normalizeSlug(slug: string) {
  return slug
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export async function POST(request: Request) {
  const current = await getCurrentUserContext();

  if (!current) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  if (current.profile.role !== "superadmin") {
    return NextResponse.json(
      { error: "Solo un superadmin puede crear inmobiliarias." },
      { status: 403 }
    );
  }

  const body = await request.json();

  const name = String(body.name ?? "").trim();
  const slug = normalizeSlug(String(body.slug ?? ""));
  const email = String(body.email ?? "").trim().toLowerCase();
  const phone = String(body.phone ?? "").trim();
  const ownerName = String(body.ownerName ?? "").trim();
  const ownerEmail = String(body.ownerEmail ?? "").trim().toLowerCase();
  const city = String(body.city ?? "").trim();
  const password = String(body.password ?? "");

  if (!name || !slug || !email || !phone || !ownerName || !ownerEmail || !city || !password) {
    return NextResponse.json(
      { error: "Completa todos los campos requeridos." },
      { status: 400 }
    );
  }

  if (password.length < 8) {
    return NextResponse.json(
      { error: "La password debe tener al menos 8 caracteres." },
      { status: 400 }
    );
  }

  const admin = createAdminClient();
  const { data: existingAgency } = await admin
    .from("agencies")
    .select("id")
    .or(`slug.eq.${slug},owner_email.eq.${ownerEmail},email.eq.${email}`)
    .maybeSingle();

  if (existingAgency) {
    return NextResponse.json(
      { error: "Ya existe una inmobiliaria con ese slug o email." },
      { status: 409 }
    );
  }

  const { data: existingProfile } = await admin
    .from("profiles")
    .select("id")
    .eq("email", ownerEmail)
    .maybeSingle();

  if (existingProfile) {
    return NextResponse.json(
      { error: "Ya existe un usuario con ese email de acceso." },
      { status: 409 }
    );
  }

  const { data: createdUser, error: createUserError } = await admin.auth.admin.createUser({
    email: ownerEmail,
    password,
    email_confirm: true,
    user_metadata: {
      full_name: ownerName,
    },
  });

  if (createUserError || !createdUser.user) {
    return NextResponse.json(
      { error: createUserError?.message ?? "No se pudo crear el usuario." },
      { status: 400 }
    );
  }

  const { data: agency, error: agencyError } = await admin
    .from("agencies")
    .insert({
      auth_user_id: createdUser.user.id,
      name,
      slug,
      email,
      phone,
      owner_name: ownerName,
      owner_email: ownerEmail,
      city,
      tagline: `Catalogo digital de ${name}.`,
      plan: "Starter",
      status: "Activa",
    })
    .select("*")
    .single();

  if (agencyError) {
    await admin.auth.admin.deleteUser(createdUser.user.id);

    return NextResponse.json(
      { error: "No se pudo crear la inmobiliaria." },
      { status: 400 }
    );
  }

  const { error: profileError } = await admin
    .from("profiles")
    .update({
      email: ownerEmail,
      full_name: ownerName,
      role: "agency_admin",
      agency_slug: slug,
    })
    .eq("id", createdUser.user.id);

  if (profileError) {
    await admin.from("agencies").delete().eq("id", agency.id);
    await admin.auth.admin.deleteUser(createdUser.user.id);

    return NextResponse.json(
      { error: "No se pudo completar el perfil del usuario." },
      { status: 400 }
    );
  }

  return NextResponse.json({
    agency,
    credentials: {
      email: ownerEmail,
      password,
    },
  });
}
