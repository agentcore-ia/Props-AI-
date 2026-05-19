import "server-only";

import { randomUUID } from "node:crypto";

import { createAdminClient } from "@/lib/supabase/admin";
import { formatMoney } from "@/lib/utils";

const BUCKET = "rental-receipts";

type TenantReceiptPdfInput = {
  agencyName: string;
  receiptNumber: string;
  tenantName: string;
  propertyTitle: string;
  propertyLocation: string;
  collectionMonth: string;
  paymentMethod: string;
  paymentDate: string;
  expectedRent: number;
  collectedAmount: number;
  balance: number;
};

function normalizePdfText(value: string) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\x20-\x7E]/g, "")
    .trim();
}

function escapePdfText(value: string) {
  return normalizePdfText(value).replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

function wrapLine(value: string, maxLength = 86) {
  const words = normalizePdfText(value).split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (next.length > maxLength && current) {
      lines.push(current);
      current = word;
    } else {
      current = next;
    }
  }

  if (current) lines.push(current);
  return lines.length ? lines : [""];
}

function buildPdf(lines: string[]) {
  const contentLines = [
    "BT",
    "/F1 18 Tf",
    "50 790 Td",
    "(Comprobante de alquiler) Tj",
    "0 -28 Td",
    "/F1 11 Tf",
    "16 TL",
    ...lines.flatMap((line) => wrapLine(line).map((wrapped) => `(${escapePdfText(wrapped)}) Tj T*`)),
    "ET",
  ];
  const content = contentLines.join("\n");
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    `<< /Length ${Buffer.byteLength(content, "ascii")} >>\nstream\n${content}\nendstream`,
  ];

  const parts = ["%PDF-1.4\n"];
  const offsets = [0];

  for (let index = 0; index < objects.length; index += 1) {
    offsets.push(Buffer.byteLength(parts.join(""), "ascii"));
    parts.push(`${index + 1} 0 obj\n${objects[index]}\nendobj\n`);
  }

  const xrefOffset = Buffer.byteLength(parts.join(""), "ascii");
  parts.push(`xref\n0 ${objects.length + 1}\n`);
  parts.push("0000000000 65535 f \n");
  for (let index = 1; index < offsets.length; index += 1) {
    parts.push(`${String(offsets[index]).padStart(10, "0")} 00000 n \n`);
  }
  parts.push(`trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`);

  return Buffer.from(parts.join(""), "ascii");
}

async function ensureReceiptBucket() {
  const admin = createAdminClient();
  const { data: buckets, error } = await admin.storage.listBuckets();

  if (error) throw error;

  const options = {
    public: true,
    fileSizeLimit: 2 * 1024 * 1024,
    allowedMimeTypes: ["application/pdf"],
  };

  if (!buckets?.some((bucket) => bucket.name === BUCKET)) {
    const { error: createError } = await admin.storage.createBucket(BUCKET, options);
    if (createError && !String(createError.message).includes("already exists")) throw createError;
    return;
  }

  const { error: updateError } = await admin.storage.updateBucket(BUCKET, options);
  if (updateError) throw updateError;
}

export async function uploadTenantRentReceiptPdf(input: TenantReceiptPdfInput) {
  await ensureReceiptBucket();

  const admin = createAdminClient();
  const lines = [
    `Inmobiliaria: ${input.agencyName}`,
    `Comprobante: ${input.receiptNumber}`,
    `Inquilino: ${input.tenantName}`,
    `Propiedad: ${input.propertyTitle}`,
    `Ubicacion: ${input.propertyLocation}`,
    `Periodo: ${input.collectionMonth}`,
    `Metodo de pago: ${input.paymentMethod || "No informado"}`,
    `Fecha de pago: ${input.paymentDate || "Pendiente"}`,
    "",
    `Alquiler esperado: ${formatMoney(input.expectedRent, "ARS")}`,
    `Importe abonado: ${formatMoney(input.collectedAmount, "ARS")}`,
    `Saldo pendiente: ${formatMoney(input.balance, "ARS")}`,
    "",
    "Este comprobante confirma el pago informado para el periodo indicado.",
    `Emitido por ${input.agencyName}.`,
  ];
  const buffer = buildPdf(lines);
  const safeReceipt = normalizePdfText(input.receiptNumber).replace(/[^a-zA-Z0-9._-]+/g, "-") || randomUUID();
  const path = `${normalizePdfText(input.agencyName).toLowerCase().replace(/[^a-z0-9]+/g, "-")}/${Date.now()}-${safeReceipt}.pdf`;

  const { error } = await admin.storage.from(BUCKET).upload(path, buffer, {
    contentType: "application/pdf",
    upsert: true,
  });

  if (error) throw error;

  const { data } = admin.storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl;
}
