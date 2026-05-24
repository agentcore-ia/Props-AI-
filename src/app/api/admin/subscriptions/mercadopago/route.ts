import { NextResponse } from "next/server";

import { getManagedAgency } from "@/lib/agency-access";
import { getCurrentUserContext } from "@/lib/auth/current-user";

const MONTHLY_SUBSCRIPTION_AMOUNT = 50000;

function getAppBaseUrl(request: Request) {
  const configured =
    process.env.PROPS_APP_BASE_URL?.trim() ||
    process.env.NEXT_PUBLIC_APP_URL?.trim();

  if (configured) {
    return configured.replace(/\/+$/, "");
  }

  const origin = request.headers.get("origin");
  if (origin) {
    return origin.replace(/\/+$/, "");
  }

  return "https://props.com.ar";
}

function normalizeMercadoPagoError(payload: unknown) {
  if (!payload || typeof payload !== "object") {
    return "Mercado Pago no devolvio detalles del error.";
  }

  const record = payload as Record<string, unknown>;
  const message = typeof record.message === "string" ? record.message : "";
  const error = typeof record.error === "string" ? record.error : "";
  const cause = Array.isArray(record.cause)
    ? record.cause
        .map((item) => {
          if (!item || typeof item !== "object") return "";
          const causeRecord = item as Record<string, unknown>;
          return [causeRecord.code, causeRecord.description].filter(Boolean).join(": ");
        })
        .filter(Boolean)
        .join(" | ")
    : "";

  return [message, error, cause].filter(Boolean).join(" - ") || "Mercado Pago rechazo la suscripcion.";
}

export async function POST(request: Request) {
  const current = await getCurrentUserContext();

  if (!current) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  if (!["superadmin", "agency_admin"].includes(current.profile.role)) {
    return NextResponse.json({ error: "No tienes permisos para crear suscripciones." }, { status: 403 });
  }

  const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN?.trim();
  if (!accessToken) {
    return NextResponse.json(
      { error: "Falta configurar MERCADOPAGO_ACCESS_TOKEN en el entorno." },
      { status: 500 }
    );
  }

  const body = await request.json().catch(() => ({}));
  const agencySlug = typeof body.agencySlug === "string" ? body.agencySlug : null;
  const agency = await getManagedAgency(current, agencySlug);

  if (!agency) {
    return NextResponse.json({ error: "No encontramos la inmobiliaria." }, { status: 404 });
  }

  const payerEmail = (agency.owner_email || agency.email || current.user.email || "").trim().toLowerCase();

  if (!payerEmail) {
    return NextResponse.json(
      { error: "La inmobiliaria no tiene email para crear la suscripcion." },
      { status: 400 }
    );
  }

  const baseUrl = getAppBaseUrl(request);
  const externalReference = `props-agency:${agency.id}`;

  const mercadoPagoResponse = await fetch("https://api.mercadopago.com/preapproval", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      reason: "Props Control Inmobiliario - suscripcion mensual",
      external_reference: externalReference,
      payer_email: payerEmail,
      auto_recurring: {
        frequency: 1,
        frequency_type: "months",
        transaction_amount: MONTHLY_SUBSCRIPTION_AMOUNT,
        currency_id: "ARS",
      },
      back_url: `${baseUrl}/configuracion?subscription=mercadopago`,
      status: "pending",
    }),
  });

  const payload = (await mercadoPagoResponse.json().catch(() => null)) as Record<string, unknown> | null;

  if (!mercadoPagoResponse.ok || !payload) {
    return NextResponse.json(
      {
        error: "No se pudo crear la suscripcion en Mercado Pago.",
        detail: normalizeMercadoPagoError(payload),
      },
      { status: 502 }
    );
  }

  const checkoutUrl =
    typeof payload.init_point === "string"
      ? payload.init_point
      : typeof payload.sandbox_init_point === "string"
        ? payload.sandbox_init_point
        : "";

  if (!checkoutUrl) {
    return NextResponse.json(
      { error: "Mercado Pago creo la suscripcion pero no devolvio link de pago." },
      { status: 502 }
    );
  }

  return NextResponse.json({
    ok: true,
    checkoutUrl,
    subscription: {
      id: payload.id ?? null,
      status: payload.status ?? null,
      externalReference,
      amount: MONTHLY_SUBSCRIPTION_AMOUNT,
      currency: "ARS",
    },
  });
}
