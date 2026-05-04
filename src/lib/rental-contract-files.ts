import "server-only";

import { createRequire } from "node:module";

import mammoth from "mammoth";

import { createAdminClient } from "@/lib/supabase/admin";

const require = createRequire(import.meta.url);

const BUCKET = "rental-contracts";
const MAX_FILE_SIZE = 12 * 1024 * 1024;
const ALLOWED_MIME_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
];

function getMimeTypeFromFilename(fileName: string) {
  const normalized = fileName.toLowerCase();

  if (normalized.endsWith(".pdf")) return "application/pdf";
  if (normalized.endsWith(".doc")) return "application/msword";
  if (normalized.endsWith(".docx")) {
    return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  }
  if (normalized.endsWith(".txt")) return "text/plain";
  return null;
}

function sanitizeFilename(name: string) {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .toLowerCase();
}

async function ensureBucket() {
  const admin = createAdminClient();
  const { data: buckets, error } = await admin.storage.listBuckets();

  if (error) {
    throw error;
  }

  if (!buckets?.some((bucket) => bucket.name === BUCKET)) {
    const { error: createError } = await admin.storage.createBucket(BUCKET, {
      public: false,
      fileSizeLimit: MAX_FILE_SIZE,
      allowedMimeTypes: ALLOWED_MIME_TYPES,
    });

    if (createError && !String(createError.message).includes("already exists")) {
      throw createError;
    }
  } else {
    const { error: updateError } = await admin.storage.updateBucket(BUCKET, {
      public: false,
      fileSizeLimit: MAX_FILE_SIZE,
      allowedMimeTypes: ALLOWED_MIME_TYPES,
    });

    if (updateError) {
      throw updateError;
    }
  }
}

async function extractText(buffer: Buffer, mimeType: string) {
  if (mimeType === "application/pdf") {
    const { PDFParse } = require("pdf-parse") as typeof import("pdf-parse");
    const parser = new PDFParse({ data: buffer });
    const parsed = await parser.getText();
    await parser.destroy();
    return parsed.text.trim();
  }

  if (mimeType === "application/msword") {
    const wordExtractorModule = (await import("word-extractor")) as {
      default?: new () => { extract(input: Buffer): Promise<{ getBody(): string }> };
    };
    const WordExtractor = wordExtractorModule.default;
    if (!WordExtractor) {
      throw new Error("No se pudo leer el formato DOC.");
    }
    const extractor = new WordExtractor();
    const parsed = await extractor.extract(buffer);
    return parsed.getBody().trim();
  }

  if (mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
    const parsed = await mammoth.extractRawText({ buffer });
    return parsed.value.trim();
  }

  return buffer.toString("utf8").trim();
}

export type UploadedRentalContractFile = {
  fileName: string;
  filePath: string;
  mimeType: string;
  sizeBytes: number;
  extractedText: string;
};

export async function uploadRentalContractFile({
  tenantSlug,
  propertyId,
  file,
}: {
  tenantSlug: string;
  propertyId: string;
  file: File;
}): Promise<UploadedRentalContractFile> {
  if (!(file instanceof File) || file.size === 0) {
    throw new Error("Archivo de contrato invalido.");
  }

  const normalizedMimeType =
    (file.type && ALLOWED_MIME_TYPES.includes(file.type) ? file.type : null) ??
    getMimeTypeFromFilename(file.name);

  if (!normalizedMimeType || !ALLOWED_MIME_TYPES.includes(normalizedMimeType)) {
    throw new Error("Formato de contrato no soportado.");
  }

  if (file.size > MAX_FILE_SIZE) {
    throw new Error("El contrato supera el limite permitido.");
  }

  await ensureBucket();

  const admin = createAdminClient();
  const buffer = Buffer.from(await file.arrayBuffer());
  const filename = sanitizeFilename(file.name || `${crypto.randomUUID()}.pdf`);
  const filePath = `${tenantSlug}/${propertyId}/${Date.now()}-${crypto.randomUUID()}-${filename}`;

  const { error } = await admin.storage.from(BUCKET).upload(filePath, buffer, {
    contentType: normalizedMimeType,
    upsert: true,
  });

  if (error) {
    throw error;
  }

  const extractedText = await extractText(buffer, normalizedMimeType);

  return {
    fileName: filename,
    filePath,
    mimeType: normalizedMimeType,
    sizeBytes: file.size,
    extractedText,
  };
}

export async function createRentalContractSignedUrl(path: string, expiresInSeconds = 300) {
  const admin = createAdminClient();
  const { data, error } = await admin.storage
    .from(BUCKET)
    .createSignedUrl(path, expiresInSeconds);

  if (error || !data?.signedUrl) {
    throw error ?? new Error("No se pudo generar el acceso al contrato.");
  }

  return data.signedUrl;
}
