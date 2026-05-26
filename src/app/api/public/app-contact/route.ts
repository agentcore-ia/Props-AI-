import { NextResponse } from "next/server";

import { createAdminClient } from "@/lib/supabase/admin";

function normalizeText(value: unknown) {
  return String(value ?? "").trim();
}

function normalizeEmail(value: unknown) {
  return normalizeText(value).toLowerCase();
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);

  const fullName = normalizeText(body?.fullName);
  const email = normalizeEmail(body?.email);
  const phone = normalizeText(body?.phone);

  if (!fullName || !email || !phone) {
    return NextResponse.json(
      { error: "Completá nombre, email y celular." },
      { status: 400 }
    );
  }

  if (!email.includes("@") || email.length < 6) {
    return NextResponse.json(
      { error: "Ingresá un email válido para poder contactarte." },
      { status: 400 }
    );
  }

  try {
    const admin = createAdminClient();
    const { error } = await admin.from("app_contact_requests").insert({
      full_name: fullName,
      agency_name: "Sin informar",
      email,
      phone,
      message: "Solicitó contacto desde la landing de Props Control.",
      source: "app_control_landing",
      status: "Nuevo",
    });

    if (!error) {
      return NextResponse.json({ ok: true });
    }

    console.error("[app-contact] insert failed", {
      code: error.code,
      message: error.message,
      details: error.details,
    });
  } catch (error) {
    console.error("[app-contact] insert failed", {
      detail: error instanceof Error ? error.message : "unknown",
    });
  }

  return NextResponse.json(
    { error: "No pudimos guardar la consulta. Probá nuevamente en unos minutos." },
    { status: 500 }
  );
}
