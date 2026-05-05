import { NextResponse } from "next/server";

import { getCurrentUserContext } from "@/lib/auth/current-user";
import {
  getManagedAgency,
  getEffectiveMessagingInstance,
  persistMessagingInstance,
} from "@/lib/agency-access";
import { createAdminClient } from "@/lib/supabase/admin";

function normalizeMessagingInstance(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function normalizeOptionalUrl(value: unknown) {
  const raw = String(value ?? "").trim();

  if (!raw) {
    return null;
  }

  if (/^https?:\/\//i.test(raw)) {
    return raw;
  }

  return `https://${raw}`;
}

export async function POST(request: Request) {
  const current = await getCurrentUserContext();

  if (!current) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  if (!["superadmin", "agency_admin"].includes(current.profile.role)) {
    return NextResponse.json({ error: "No tienes permisos para editar la configuracion." }, { status: 403 });
  }

  const body = await request.json();
  const requestedSlug = typeof body.agencySlug === "string" ? body.agencySlug : null;

  const agency = await getManagedAgency(current, requestedSlug);

  if (!agency) {
    return NextResponse.json({ error: "No encontramos la inmobiliaria." }, { status: 404 });
  }

  const email = String(body.email ?? "").trim().toLowerCase();
  const phone = String(body.phone ?? "").trim();
  const city = String(body.city ?? "").trim();
  const tagline = String(body.tagline ?? "").trim();
  const websiteUrl = normalizeOptionalUrl(body.websiteUrl);
  const instagramUrl = normalizeOptionalUrl(body.instagramUrl);
  const facebookUrl = normalizeOptionalUrl(body.facebookUrl);
  const messagingInstanceInput = String(body.messagingInstance ?? "").trim();
  const messagingInstance = messagingInstanceInput
    ? normalizeMessagingInstance(messagingInstanceInput)
    : getEffectiveMessagingInstance(agency);

  if (!email || !phone || !city) {
    return NextResponse.json(
      { error: "Email, telefono y ciudad son obligatorios." },
      { status: 400 }
    );
  }

  const admin = createAdminClient();
  const basePayload = {
    email,
    phone,
    city,
    tagline,
    messaging_instance: messagingInstance,
  };
  const extendedPayload = {
    ...basePayload,
    website_url: websiteUrl,
    instagram_url: instagramUrl,
    facebook_url: facebookUrl,
  };

  let updated: Record<string, unknown> | null = null;
  let error: { message?: string } | null = null;

  const firstAttempt = await admin
    .from("agencies")
    .update(extendedPayload)
    .eq("id", agency.id)
    .select("*")
    .single();

  updated = firstAttempt.data as Record<string, unknown> | null;
  error = firstAttempt.error;

  if (
    error?.message &&
    /(website_url|instagram_url|facebook_url)/i.test(error.message)
  ) {
    const fallbackAttempt = await admin
      .from("agencies")
      .update(basePayload)
      .eq("id", agency.id)
      .select("*")
      .single();

    updated = fallbackAttempt.data as Record<string, unknown> | null;
    error = fallbackAttempt.error;
  }

  if (error || !updated) {
    return NextResponse.json(
      { error: "No se pudo guardar la configuracion de la inmobiliaria." },
      { status: 400 }
    );
  }

  if (updated.messaging_instance !== messagingInstance) {
    await persistMessagingInstance(String(updated.id), messagingInstance);
  }

  return NextResponse.json({
    ok: true,
    agency: updated,
  });
}
