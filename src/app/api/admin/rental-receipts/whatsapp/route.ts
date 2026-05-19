import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";

import { getCurrentUserContext } from "@/lib/auth/current-user";
import { recordOutboundWhatsAppForContact } from "@/lib/crm-automation";
import {
  normalizeEvolutionRecipient,
  sendEvolutionMediaMessage,
  sendEvolutionTextMessage,
} from "@/lib/evolution";
import {
  uploadTenantRentReceiptPdf,
} from "@/lib/rental-receipts";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatMoney } from "@/lib/utils";

function formatDeliveryError(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

export async function POST(request: Request) {
  const requestId = randomUUID();
  const current = await getCurrentUserContext();
  if (!current) return NextResponse.json({ error: "No autorizado.", requestId }, { status: 401 });
  if (!["superadmin", "agency_admin", "agent"].includes(current.profile.role)) {
    return NextResponse.json({ error: "Sin permisos.", requestId }, { status: 403 });
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

  console.info("[rental-receipts] WhatsApp receipt request started", {
    requestId,
    contractId,
    collectionMonth,
    receiptNumber,
    actorRole: current.profile.role,
    actorAgency: current.profile.agency_slug,
  });

  if (!contractId || !collectionMonth) {
    return NextResponse.json({ error: "Falta contrato o periodo del comprobante.", requestId }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: collection, error: collectionError } = await admin
    .from("rental_collections")
    .select(
      "id, contract_id, property_id, agency_id, collection_month, expected_rent, collected_amount, payment_method, payment_date, status, rental_contracts!inner(tenant_name, tenant_phone, tenant_email, agencies!inner(id, name, slug, messaging_instance), properties!inner(id, title, location))"
    )
    .eq("contract_id", contractId)
    .eq("collection_month", collectionMonth)
    .maybeSingle();

  if (collectionError || !collection) {
    console.error("[rental-receipts] receipt lookup failed", {
      requestId,
      contractId,
      collectionMonth,
      receiptNumber,
      error: collectionError?.message ?? null,
    });

    return NextResponse.json({
      error: "No encontramos el comprobante de alquiler.",
      detail: collectionError?.message ?? "No existe una cobranza registrada para ese contrato y periodo.",
      requestId,
    }, { status: 404 });
  }

  const contract = Array.isArray(collection.rental_contracts)
    ? collection.rental_contracts[0]
    : collection.rental_contracts;
  const agency = Array.isArray(contract?.agencies) ? contract?.agencies[0] : contract?.agencies;
  const property = Array.isArray(contract?.properties) ? contract?.properties[0] : contract?.properties;

  if (current.profile.role !== "superadmin" && agency?.slug !== current.profile.agency_slug) {
    return NextResponse.json({ error: "No puedes enviar comprobantes de otra inmobiliaria.", requestId }, { status: 403 });
  }

  const instanceName = String(agency?.messaging_instance ?? "").trim();
  const number = normalizeEvolutionRecipient(contract?.tenant_phone);

  if (!instanceName) {
    return NextResponse.json({ error: "La inmobiliaria no tiene WhatsApp conectado.", requestId }, { status: 400 });
  }
  if (!number) {
    return NextResponse.json({ error: "El inquilino no tiene WhatsApp cargado.", requestId }, { status: 400 });
  }

  const balance = Math.max(0, Number(collection.expected_rent ?? 0) - Number(collection.collected_amount ?? 0));
  const finalReceiptNumber = receiptNumber || collection.id;
  const receiptInput = {
    agencyName: agency?.name ?? "Inmobiliaria",
    receiptNumber: finalReceiptNumber,
    tenantName: contract?.tenant_name ?? "Inquilino",
    propertyTitle: property?.title ?? "Propiedad",
    propertyLocation: property?.location ?? "",
    collectionMonth: collection.collection_month,
    paymentMethod: collection.payment_method ?? "No informado",
    paymentDate: collection.payment_date ?? "Pendiente",
    expectedRent: Number(collection.expected_rent ?? 0),
    collectedAmount: Number(collection.collected_amount ?? 0),
    balance,
  };
  const caption = [
    `Hola ${contract?.tenant_name ?? ""}, te enviamos adjunto el comprobante de alquiler ${finalReceiptNumber}.`,
    `Importe abonado: ${formatMoney(Number(collection.collected_amount ?? 0), "ARS")}.`,
    `Gracias. ${agency?.name ?? ""}`,
  ]
    .filter(Boolean)
    .join("\n");

  let receiptUrl: string | null = null;
  let documentError: string | null = null;
  let linkFallbackError: string | null = null;

  try {
    console.info("[rental-receipts] sending receipt text", {
      requestId,
      instanceName,
      number,
      collectionId: collection.id,
    });
    await sendEvolutionTextMessage({
      instanceName,
      number,
      text: caption,
    });
    try {
      await recordOutboundWhatsAppForContact({
        agencyId: collection.agency_id,
        propertyId: collection.property_id,
        fullName: contract?.tenant_name ?? "Inquilino",
        phone: contract?.tenant_phone ?? number,
        content: caption,
        senderRole: "system",
        source: "rental_receipt_whatsapp",
        propertyTitle: property?.title ?? null,
        propertyLocation: property?.location ?? null,
        metadata: {
          requestId,
          receiptNumber: finalReceiptNumber,
          collectionMonth,
          delivery: "receipt_summary",
        },
      });
    } catch (recordError) {
      console.error("[rental-receipts] failed to record outgoing receipt text", {
        requestId,
        error: formatDeliveryError(recordError),
      });
    }
  } catch (textError) {
    console.error("[rental-receipts] WhatsApp text delivery failed", {
      requestId,
      contractId,
      collectionMonth,
      instanceName,
      number,
      error: formatDeliveryError(textError),
    });

    return NextResponse.json(
      {
        error: "No se pudo enviar el mensaje por WhatsApp.",
        detail: formatDeliveryError(textError),
        requestId,
      },
      { status: 502 }
    );
  }

  try {
    console.info("[rental-receipts] uploading receipt PDF", {
      requestId,
      collectionId: collection.id,
    });
    receiptUrl = await uploadTenantRentReceiptPdf(receiptInput);
  } catch (uploadError) {
    console.error("[rental-receipts] receipt PDF upload failed", {
      requestId,
      contractId,
      collectionMonth,
      error: formatDeliveryError(uploadError),
    });

    return NextResponse.json({
      ok: true,
      delivery: "text_only",
      warning: "Se envio el mensaje, pero no se pudo generar el PDF adjunto.",
      detail: formatDeliveryError(uploadError),
      requestId,
    });
  }

  try {
    console.info("[rental-receipts] sending receipt document", {
      requestId,
      instanceName,
      number,
      receiptUrl,
    });
    await sendEvolutionMediaMessage({
      instanceName,
      number,
      mediaUrl: receiptUrl,
      caption: `Comprobante de alquiler ${finalReceiptNumber}`,
      mediaType: "document",
      mimetype: "application/pdf",
      fileName: `comprobante-alquiler-${finalReceiptNumber}.pdf`,
    });
    try {
      await recordOutboundWhatsAppForContact({
        agencyId: collection.agency_id,
        propertyId: collection.property_id,
        fullName: contract?.tenant_name ?? "Inquilino",
        phone: contract?.tenant_phone ?? number,
        content: `[documento] Comprobante de alquiler ${finalReceiptNumber}: ${receiptUrl}`,
        senderRole: "system",
        source: "rental_receipt_whatsapp_document",
        propertyTitle: property?.title ?? null,
        propertyLocation: property?.location ?? null,
        metadata: {
          requestId,
          receiptNumber: finalReceiptNumber,
          receiptUrl,
          mediaType: "document",
        },
      });
    } catch (recordError) {
      console.error("[rental-receipts] failed to record outgoing receipt document", {
        requestId,
        error: formatDeliveryError(recordError),
      });
    }

    return NextResponse.json({ ok: true, delivery: "text_and_document", receiptUrl, requestId });
  } catch (mediaError) {
    documentError = formatDeliveryError(mediaError);
    console.error("[rental-receipts] document WhatsApp delivery failed", {
      contractId,
      collectionMonth,
      instanceName,
      number,
      receiptUrl,
      error: documentError,
    });
  }

  try {
    await sendEvolutionTextMessage({
      instanceName,
      number,
      text: [
        `No pudimos adjuntar el PDF automaticamente desde WhatsApp.`,
        `Te dejamos el comprobante de alquiler ${finalReceiptNumber} para descargar: ${receiptUrl}`,
      ]
        .filter(Boolean)
        .join("\n"),
    });
    try {
      await recordOutboundWhatsAppForContact({
        agencyId: collection.agency_id,
        propertyId: collection.property_id,
        fullName: contract?.tenant_name ?? "Inquilino",
        phone: contract?.tenant_phone ?? number,
        content: `Link de comprobante de alquiler ${finalReceiptNumber}: ${receiptUrl}`,
        senderRole: "system",
        source: "rental_receipt_whatsapp_link_fallback",
        propertyTitle: property?.title ?? null,
        propertyLocation: property?.location ?? null,
        metadata: {
          requestId,
          receiptNumber: finalReceiptNumber,
          receiptUrl,
          documentError,
        },
      });
    } catch (recordError) {
      console.error("[rental-receipts] failed to record outgoing receipt fallback", {
        requestId,
        error: formatDeliveryError(recordError),
      });
    }
  } catch (fallbackError) {
    linkFallbackError = formatDeliveryError(fallbackError);
    console.error("[rental-receipts] fallback WhatsApp delivery failed", {
      contractId,
      collectionMonth,
      instanceName,
      number,
      receiptUrl,
      error: linkFallbackError,
    });
  }

  return NextResponse.json({
    ok: true,
    delivery: linkFallbackError ? "text_only" : "text_and_link_fallback",
    receiptUrl,
    warning: linkFallbackError
      ? "Se envio el mensaje inicial, pero fallo el adjunto y tambien el link de respaldo."
      : "Se envio el mensaje y el link de respaldo porque WhatsApp rechazo el PDF adjunto.",
    detail: documentError,
    requestId,
  });
}
