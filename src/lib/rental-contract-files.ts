import "server-only";

import { createRequire } from "node:module";
import zlib from "node:zlib";

import mammoth from "mammoth";

import { getOpenAIEnv } from "@/lib/openai-env";
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

function decodeAscii85(input: string) {
  const normalized = input
    .replace(/^\s*<~/, "")
    .replace(/~>\s*$/, "")
    .replace(/\s+/g, "");
  const bytes: number[] = [];
  let group = "";

  for (const char of normalized) {
    if (char === "z" && group.length === 0) {
      bytes.push(0, 0, 0, 0);
      continue;
    }

    group += char;

    if (group.length === 5) {
      let value = 0;
      for (const item of group) {
        value = value * 85 + (item.charCodeAt(0) - 33);
      }
      bytes.push((value >>> 24) & 255, (value >>> 16) & 255, (value >>> 8) & 255, value & 255);
      group = "";
    }
  }

  if (group.length > 0) {
    const originalLength = group.length;
    group = group.padEnd(5, "u");
    let value = 0;
    for (const item of group) {
      value = value * 85 + (item.charCodeAt(0) - 33);
    }
    const paddedBytes = [
      (value >>> 24) & 255,
      (value >>> 16) & 255,
      (value >>> 8) & 255,
      value & 255,
    ];
    bytes.push(...paddedBytes.slice(0, originalLength - 1));
  }

  return Buffer.from(bytes);
}

function decodePdfLiteralString(raw: string) {
  let output = "";

  for (let index = 0; index < raw.length; index += 1) {
    const char = raw[index];
    if (char !== "\\") {
      output += char;
      continue;
    }

    const next = raw[index + 1];
    if (!next) continue;

    if (/[0-7]/.test(next)) {
      const octal = raw.slice(index + 1).match(/^[0-7]{1,3}/)?.[0] ?? next;
      output += String.fromCharCode(parseInt(octal, 8));
      index += octal.length;
      continue;
    }

    const escapes: Record<string, string> = {
      n: "\n",
      r: "\r",
      t: "\t",
      b: "\b",
      f: "\f",
      "(": "(",
      ")": ")",
      "\\": "\\",
    };

    output += escapes[next] ?? next;
    index += 1;
  }

  return output;
}

function extractPdfTextOperators(content: string) {
  const chunks: string[] = [];
  const literalPattern = /\(((?:\\.|[^\\()])*)\)\s*Tj/g;
  const arrayPattern = /\[((?:.|\n)*?)\]\s*TJ/g;
  let literalMatch: RegExpExecArray | null;
  let arrayMatch: RegExpExecArray | null;

  while ((literalMatch = literalPattern.exec(content))) {
    chunks.push(decodePdfLiteralString(literalMatch[1]));
  }

  while ((arrayMatch = arrayPattern.exec(content))) {
    const arrayContent = arrayMatch[1];
    const arrayLiteralPattern = /\(((?:\\.|[^\\()])*)\)/g;
    let arrayLiteralMatch: RegExpExecArray | null;
    while ((arrayLiteralMatch = arrayLiteralPattern.exec(arrayContent))) {
      chunks.push(decodePdfLiteralString(arrayLiteralMatch[1]));
    }
  }

  return chunks.join("\n").replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
}

function extractPdfTextFromRawStreams(buffer: Buffer) {
  const raw = buffer.toString("latin1");
  const streamPattern = /(<<[\s\S]*?>>)\s*stream\r?\n([\s\S]*?)\r?\nendstream/g;
  const chunks: string[] = [];
  let streamMatch: RegExpExecArray | null;

  while ((streamMatch = streamPattern.exec(raw))) {
    const dictionary = streamMatch[1];
    const stream = streamMatch[2];
    const candidates: Buffer[] = [];

    candidates.push(Buffer.from(stream, "latin1"));

    if (/ASCII85Decode/i.test(dictionary)) {
      try {
        candidates.push(decodeAscii85(stream));
      } catch {
        // Keep trying other decoders.
      }
    }

    for (const candidate of [...candidates]) {
      if (/FlateDecode/i.test(dictionary)) {
        try {
          candidates.push(zlib.inflateSync(candidate));
        } catch {
          // Some streams are not compressed even if another candidate was.
        }
      }
    }

    for (const candidate of candidates) {
      const extracted = extractPdfTextOperators(candidate.toString("latin1"));
      if (extracted) {
        chunks.push(extracted);
      }
    }
  }

  return Array.from(new Set(chunks)).join("\n").trim();
}

function extractOpenAIOutputText(payload: unknown) {
  if (!payload || typeof payload !== "object") return "";
  const directOutput = (payload as { output_text?: unknown }).output_text;
  if (typeof directOutput === "string" && directOutput.trim()) {
    return directOutput.trim();
  }

  const output = (payload as { output?: unknown }).output;
  if (!Array.isArray(output)) return "";

  const chunks: string[] = [];

  for (const item of output) {
    if (!item || typeof item !== "object") continue;
    const content = (item as { content?: unknown }).content;
    if (!Array.isArray(content)) continue;

    for (const part of content) {
      if (!part || typeof part !== "object") continue;
      const text = (part as { text?: unknown }).text;
      if (typeof text === "string" && text.trim()) {
        chunks.push(text.trim());
      }
    }
  }

  return chunks.join("\n").trim();
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
    try {
      const parsed = await parser.getText();
      const parsedText = parsed.text.trim();
      return parsedText || extractPdfTextFromRawStreams(buffer);
    } finally {
      await parser.destroy();
    }
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

async function extractPdfTextWithOpenAI(buffer: Buffer, fileName: string) {
  const openAI = getOpenAIEnv();
  if (!openAI.configured) {
    return "";
  }

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${openAI.apiKey}`,
    },
    body: JSON.stringify({
      model: openAI.model,
      input: [
        {
          role: "system",
          content: [
            {
              type: "input_text",
              text:
                "Extrae el texto legible del contrato adjunto en espanol. Devuelve solo texto plano, preservando montos, fechas, indice de ajuste, frecuencia y nombres propios cuando existan. No resumas ni inventes datos.",
            },
          ],
        },
        {
          role: "user",
          content: [
            {
              type: "input_file",
              filename: fileName,
              file_data: `data:application/pdf;base64,${buffer.toString("base64")}`,
            },
            {
              type: "input_text",
              text: "Lee el PDF y transcribe el texto util del contrato.",
            },
          ],
        },
      ],
    }),
  });

  if (!response.ok) {
    throw new Error("No se pudo hacer OCR del PDF con OpenAI.");
  }

  const payload = await response.json();
  return extractOpenAIOutputText(payload);
}

export type UploadedRentalContractFile = {
  fileName: string;
  filePath: string;
  mimeType: string;
  sizeBytes: number;
  extractedText: string;
  extractionWarning?: string | null;
};

export type ExtractedRentalContractFile = {
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  extractedText: string;
  extractionWarning?: string | null;
};

export async function extractRentalContractFileText(file: File): Promise<ExtractedRentalContractFile> {
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

  const buffer = Buffer.from(await file.arrayBuffer());
  const filename = sanitizeFilename(file.name || `${crypto.randomUUID()}.pdf`);
  let extractedText = "";
  let extractionWarning: string | null = null;
  let parserWarning: string | null = null;
  const openAI = getOpenAIEnv();

  try {
    extractedText = await extractText(buffer, normalizedMimeType);
    console.info("[rental-contract] preview extraction finished", {
      fileName: filename,
      mimeType: normalizedMimeType,
      extractedLength: extractedText.length,
    });
  } catch (error) {
    parserWarning =
      error instanceof Error
        ? error.message
        : "No se pudo extraer el texto del contrato.";
    if (normalizedMimeType === "application/pdf") {
      extractedText = extractPdfTextFromRawStreams(buffer);
    }
    console.warn("[rental-contract] preview extraction failed", {
      fileName: filename,
      mimeType: normalizedMimeType,
      parserWarning,
      rawFallbackLength: extractedText.length,
      openAIConfigured: openAI.configured,
      openAIModel: openAI.model,
    });
  }

  try {
    if (!extractedText && normalizedMimeType === "application/pdf") {
      extractedText = extractPdfTextFromRawStreams(buffer);
    }

    try {
      if (!extractedText && normalizedMimeType === "application/pdf") {
      if (openAI.configured) {
        extractedText = await extractPdfTextWithOpenAI(buffer, file.name || filename);
      } else {
        extractedText = await extractText(buffer, normalizedMimeType);
      }
      if (!extractedText) {
        extractionWarning =
          "El PDF no trae texto seleccionable y el OCR no pudo recuperar contenido legible.";
      }
      }
    } catch (ocrError) {
      extractionWarning =
        ocrError instanceof Error
          ? ocrError.message
          : "No se pudo extraer el texto del contrato.";
    }

    if (!extractedText && normalizedMimeType === "application/msword") {
      extractionWarning =
        "No pudimos leer texto del archivo .doc. Si es posible, conviertelo a .docx o exportalo como PDF con texto.";
    }
  } catch (error) {
    extractionWarning =
      error instanceof Error
        ? error.message
        : "No se pudo extraer el texto del contrato.";
  }

  if (!extractedText && parserWarning && !extractionWarning) {
    extractionWarning = parserWarning;
  }

  return {
    fileName: filename,
    mimeType: normalizedMimeType,
    sizeBytes: file.size,
    extractedText,
    extractionWarning,
  };
}

export async function uploadRentalContractFile({
  tenantSlug,
  propertyId,
  file,
}: {
  tenantSlug: string;
  propertyId: string;
  file: File;
}): Promise<UploadedRentalContractFile> {
  console.info("[rental-contract] extractor version 2026-05-04-local-first-a839ac4", {
    tenantSlug,
    propertyId,
    fileName: file?.name ?? null,
  });

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

  const extracted = await extractRentalContractFileText(file);

  return {
    fileName: filename,
    filePath,
    mimeType: normalizedMimeType,
    sizeBytes: file.size,
    extractedText: extracted.extractedText,
    extractionWarning: extracted.extractionWarning,
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
