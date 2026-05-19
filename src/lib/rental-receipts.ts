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

function rgb(r: number, g: number, b: number) {
  return `${(r / 255).toFixed(3)} ${(g / 255).toFixed(3)} ${(b / 255).toFixed(3)}`;
}

function fillRect(x: number, y: number, width: number, height: number, color: string) {
  return `q ${color} rg ${x} ${y} ${width} ${height} re f Q`;
}

function strokeRect(x: number, y: number, width: number, height: number, color: string, lineWidth = 1) {
  return `q ${color} RG ${lineWidth} w ${x} ${y} ${width} ${height} re S Q`;
}

function textLine({
  text,
  x,
  y,
  size = 11,
  color = rgb(15, 23, 42),
  font = "F1",
}: {
  text: string;
  x: number;
  y: number;
  size?: number;
  color?: string;
  font?: "F1" | "F2";
}) {
  return `BT ${color} rg /${font} ${size} Tf ${x} ${y} Td (${escapePdfText(text)}) Tj ET`;
}

function wrappedText({
  text,
  x,
  y,
  maxLength,
  lineHeight = 15,
  size = 10,
  color = rgb(71, 85, 105),
  font = "F1",
}: {
  text: string;
  x: number;
  y: number;
  maxLength: number;
  lineHeight?: number;
  size?: number;
  color?: string;
  font?: "F1" | "F2";
}) {
  return wrapLine(text, maxLength).map((line, index) =>
    textLine({ text: line, x, y: y - index * lineHeight, size, color, font })
  );
}

function buildPdf(commands: string[]) {
  const content = commands.join("\n");
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R /F2 5 0 R >> >> /Contents 6 0 R >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>",
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
  const buffer = buildTenantRentReceiptPdf(input);
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

export function buildTenantRentReceiptPdf(input: TenantReceiptPdfInput) {
  const dark = rgb(15, 23, 42);
  const muted = rgb(71, 85, 105);
  const soft = rgb(241, 245, 249);
  const border = rgb(203, 213, 225);
  const primary = rgb(37, 99, 235);
  const success = rgb(5, 150, 105);
  const white = rgb(255, 255, 255);
  const balanceColor = input.balance > 0 ? rgb(220, 38, 38) : success;

  const commands = [
    fillRect(0, 0, 595, 842, rgb(248, 250, 252)),
    fillRect(0, 742, 595, 100, rgb(239, 246, 255)),
    fillRect(42, 690, 511, 100, white),
    strokeRect(42, 690, 511, 100, border),
    textLine({ text: "PROPS", x: 62, y: 755, size: 17, font: "F2", color: dark }),
    textLine({ text: "CONTROL INMOBILIARIO", x: 62, y: 738, size: 8, font: "F2", color: muted }),
    textLine({ text: "Comprobante de alquiler", x: 62, y: 710, size: 25, font: "F2", color: dark }),
    textLine({ text: input.receiptNumber, x: 380, y: 756, size: 11, font: "F2", color: primary }),
    textLine({ text: "Comprobante", x: 380, y: 738, size: 8, font: "F2", color: muted }),
    textLine({ text: input.agencyName, x: 380, y: 715, size: 14, font: "F2", color: dark }),
    textLine({ text: "Inmobiliaria emisora", x: 380, y: 698, size: 8, color: muted }),

    fillRect(42, 530, 511, 136, white),
    strokeRect(42, 530, 511, 136, border),
    textLine({ text: "Datos del pago", x: 62, y: 638, size: 9, font: "F2", color: primary }),
    textLine({ text: "Inquilino", x: 62, y: 613, size: 8, font: "F2", color: muted }),
    textLine({ text: input.tenantName, x: 62, y: 595, size: 15, font: "F2", color: dark }),
    textLine({ text: "Periodo", x: 360, y: 613, size: 8, font: "F2", color: muted }),
    textLine({ text: input.collectionMonth, x: 360, y: 595, size: 15, font: "F2", color: dark }),
    textLine({ text: "Metodo de pago", x: 360, y: 568, size: 8, font: "F2", color: muted }),
    textLine({ text: input.paymentMethod || "No informado", x: 360, y: 550, size: 12, font: "F2", color: dark }),
    textLine({ text: "Fecha de pago", x: 62, y: 568, size: 8, font: "F2", color: muted }),
    textLine({ text: input.paymentDate || "Pendiente", x: 62, y: 550, size: 12, font: "F2", color: dark }),

    fillRect(42, 412, 511, 94, white),
    strokeRect(42, 412, 511, 94, border),
    textLine({ text: "Propiedad", x: 62, y: 478, size: 8, font: "F2", color: muted }),
    ...wrappedText({
      text: input.propertyTitle,
      x: 62,
      y: 458,
      maxLength: 54,
      size: 15,
      lineHeight: 18,
      font: "F2",
      color: dark,
    }),
    textLine({ text: "Ubicacion", x: 62, y: 424, size: 8, font: "F2", color: muted }),
    ...wrappedText({
      text: input.propertyLocation || "Sin ubicacion informada",
      x: 128,
      y: 424,
      maxLength: 62,
      size: 10,
      lineHeight: 13,
      color: muted,
    }),

    fillRect(42, 278, 155, 94, soft),
    fillRect(220, 278, 155, 94, soft),
    fillRect(398, 278, 155, 94, soft),
    strokeRect(42, 278, 155, 94, border),
    strokeRect(220, 278, 155, 94, border),
    strokeRect(398, 278, 155, 94, border),
    textLine({ text: "Alquiler esperado", x: 62, y: 342, size: 8, font: "F2", color: muted }),
    textLine({ text: formatMoney(input.expectedRent, "ARS"), x: 62, y: 312, size: 19, font: "F2", color: dark }),
    textLine({ text: "Importe abonado", x: 240, y: 342, size: 8, font: "F2", color: muted }),
    textLine({ text: formatMoney(input.collectedAmount, "ARS"), x: 240, y: 312, size: 19, font: "F2", color: success }),
    textLine({ text: "Saldo pendiente", x: 418, y: 342, size: 8, font: "F2", color: muted }),
    textLine({ text: formatMoney(input.balance, "ARS"), x: 418, y: 312, size: 19, font: "F2", color: balanceColor }),

    fillRect(42, 182, 511, 58, white),
    strokeRect(42, 182, 511, 58, border),
    textLine({ text: "Observacion", x: 62, y: 214, size: 8, font: "F2", color: muted }),
    textLine({
      text: "Este comprobante confirma el pago informado para el periodo indicado.",
      x: 62,
      y: 196,
      size: 11,
      color: dark,
    }),

    textLine({ text: `Emitido por ${input.agencyName} desde Props.`, x: 62, y: 120, size: 10, color: muted }),
    textLine({ text: "Documento generado automaticamente para gestion inmobiliaria.", x: 62, y: 104, size: 9, color: muted }),
  ];

  return buildPdf(commands);
}

export function buildTenantRentReceiptPdfDataUri(input: TenantReceiptPdfInput) {
  return `data:application/pdf;base64,${buildTenantRentReceiptPdf(input).toString("base64")}`;
}
