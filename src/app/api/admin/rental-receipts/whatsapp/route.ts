import { NextResponse } from "next/server";

import { getCurrentUserContext } from "@/lib/auth/current-user";
import { normalizeEvolutionRecipient, sendEvolutionTextMessage } from "@/lib/evolution";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatMoney } from "@/lib/utils";

export async function POST(request: Request) {
  const current = await getCurrentUserContext();
  if (!current) return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  if (!["superadmin", "agency_admin", "agent"].includes(current.profile.role)) {
    return NextResponse.json({ error: "Sin permisos." }, { status: 403 });
  }

  const body = (await request.json().catch(() => null)) as
    | {
        contractId?: string;
        collectionMonth?: string;
        receiptNumber?: string;
      }
    | null;

  const contractId = String(body?.contractId ?? "").trim();
  const collectionMonth = String(body?.collectionMonth ?? "").slice(0, 7);
  const receiptNumber = String(body?.receiptNumber ?? "").trim();

  if (!contractId || !collectionMonth) {
    return NextResponse.json({ error: "Falta contrato o periodo del comprobante." }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: collection, error: collectionError } = await admin
    .from("rental_collections")
    .select(
      "id, contract_id, agency_id, collection_month, expected_rent, collected_amount, payment_method, payment_date, status, rental_contracts!inner(tenant_name, tenant_phone, tenant_email, agencies!inner(name, slug, messaging_instance), properties!inner(title, location))"
    )
    .eq("contract_id", contractId)
    .eq("collection_month", collectionMonth)
    .maybeSingle();

  if (collectionError || !collection) {
    return NextResponse.json({ error: "No encontramos el comprobante de alquiler." }, { status: 404 });
  }

  const contract = Array.isArray(collection.rental_contracts)
    ? collection.rental_contracts[0]
    : collection.rental_contracts;
  const agency = Array.isArray(contract?.agencies) ? contract?.agencies[0] : contract?.agencies;
  const property = Array.isArray(contract?.properties) ? contract?.properties[0] : contract?.properties;

  if (current.profile.role !== "superadmin" && agency?.slug !== current.profile.agency_slug) {
    return NextResponse.json({ error: "No puedes enviar comprobantes de otra inmobiliaria." }, { status: 403 });
  }

  const instanceName = String(agency?.messaging_instance ?? "").trim();
  const number = normalizeEvolutionRecipient(contract?.tenant_phone);

  if (!instanceName) {
    return NextResponse.json({ error: "La inmobiliaria no tiene WhatsApp conectado." }, { status: 400 });
  }
  if (!number) {
    return NextResponse.json({ error: "El inquilino no tiene WhatsApp cargado." }, { status: 400 });
  }

  const balance = Math.max(0, Number(collection.expected_rent ?? 0) - Number(collection.collected_amount ?? 0));
  const message = [
    `Hola ${contract?.tenant_name ?? ""}, te enviamos el comprobante de alquiler de ${agency?.name ?? "la inmobiliaria"}.`,
    "",
    `Comprobante: ${receiptNumber || collection.id}`,
    `Propiedad: ${property?.title ?? "Propiedad"} - ${property?.location ?? ""}`,
    `Periodo: ${collection.collection_month}`,
    `Importe abonado: ${formatMoney(Number(collection.collected_amount ?? 0), "ARS")}`,
    `Metodo de pago: ${collection.payment_method}`,
    `Fecha: ${collection.payment_date ?? "pendiente"}`,
    balance > 0 ? `Saldo pendiente: ${formatMoney(balance, "ARS")}` : "Saldo pendiente: $ 0",
    "",
    `Gracias. ${agency?.name ?? ""}`,
  ]
    .filter(Boolean)
    .join("\n");

  await sendEvolutionTextMessage({
    instanceName,
    number,
    text: message,
  });

  return NextResponse.json({ ok: true });
}
