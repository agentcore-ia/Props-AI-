import "server-only";

import { getOpenAIEnv } from "@/lib/openai-env";

type RentalContractAnalysis = {
  tenantName: string | null;
  currentRent: number | null;
  indexType: "IPC" | "ICL" | null;
  adjustmentFrequencyMonths: number | null;
  contractStartDate: string | null;
  nextAdjustmentDate: string | null;
  summary: string;
  requiresReview: boolean;
  reviewReasons: string[];
};

type AIRentalContractAnalysis = Partial<RentalContractAnalysis> & {
  confidence?: "high" | "medium" | "low" | null;
  notes?: string[] | null;
};

const SPANISH_MONTHS: Record<string, string> = {
  enero: "01",
  febrero: "02",
  marzo: "03",
  abril: "04",
  mayo: "05",
  junio: "06",
  julio: "07",
  agosto: "08",
  septiembre: "09",
  setiembre: "09",
  octubre: "10",
  noviembre: "11",
  diciembre: "12",
};

function normalizeWhitespace(text: string) {
  return text.replace(/\s+/g, " ").trim();
}

function normalizeTextForMatching(text: string) {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function toIsoDate(day: string, month: string, year: string) {
  const normalizedYear = year.length === 2 ? `20${year}` : year;
  const dd = day.padStart(2, "0");
  const mm = month.padStart(2, "0");
  return `${normalizedYear}-${mm}-${dd}`;
}

function toIsoDateFromMonthName(day: string, monthName: string, year: string) {
  const month = SPANISH_MONTHS[monthName.toLowerCase()];
  if (!month) return null;
  return toIsoDate(day, month, year);
}

function toIsoDateWithFallbackDay(day: string | null, monthName: string, year: string) {
  const month = SPANISH_MONTHS[monthName.toLowerCase()];
  if (!month) return null;
  return `${year}-${month}-${(day ?? "01").padStart(2, "0")}`;
}

function parseAmount(raw: string) {
  const cleaned = raw.replace(/[^\d,.-]/g, "").trim();
  if (!cleaned) return null;

  if (cleaned.includes(",") && cleaned.includes(".")) {
    return Number(cleaned.replace(/\./g, "").replace(",", "."));
  }

  if (cleaned.includes(",")) {
    const commaParts = cleaned.split(",");
    if (commaParts[commaParts.length - 1]?.length === 2) {
      return Number(cleaned.replace(/\./g, "").replace(",", "."));
    }
    return Number(cleaned.replace(/,/g, ""));
  }

  return Number(cleaned.replace(/\./g, ""));
}

function normalizeIndexType(value: unknown): "IPC" | "ICL" | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim().toUpperCase();
  return normalized === "IPC" || normalized === "ICL" ? normalized : null;
}

function normalizePositiveInteger(value: unknown) {
  const numeric =
    typeof value === "number"
      ? value
      : typeof value === "string"
      ? Number(value.replace(/[^\d.-]/g, ""))
      : NaN;
  return Number.isFinite(numeric) && numeric > 0 ? Math.round(numeric) : null;
}

function normalizePositiveAmount(value: unknown) {
  if (typeof value === "number") {
    return Number.isFinite(value) && value > 0 ? value : null;
  }

  if (typeof value === "string") {
    const parsed = parseAmount(value);
    return parsed && Number.isFinite(parsed) && parsed > 0 ? parsed : null;
  }

  return null;
}

function normalizeIsoDate(value: unknown) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(trimmed) ? trimmed : null;
}

function addMonthsIsoDate(isoDate: string, months: number) {
  const [year, month, day] = isoDate.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1 + months, 1));
  const lastDay = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0)).getUTCDate();
  date.setUTCDate(Math.min(day, lastDay));
  return date.toISOString().slice(0, 10);
}

function normalizeOptionalDate(value: string | null | undefined) {
  if (!value) return null;
  const trimmed = value.trim();
  return trimmed || null;
}

export function buildFallbackContractSchedule({
  contractStartDate,
  nextAdjustmentDate,
  adjustmentFrequencyMonths,
}: {
  contractStartDate: string | null;
  nextAdjustmentDate: string | null;
  adjustmentFrequencyMonths: number;
}) {
  const today = new Date().toISOString().slice(0, 10);
  const safeStartDate = normalizeOptionalDate(contractStartDate) ?? today;
  const safeNextAdjustmentDate =
    normalizeOptionalDate(nextAdjustmentDate) ??
    addMonthsIsoDate(safeStartDate, adjustmentFrequencyMonths || 6);

  return {
    contractStartDate: safeStartDate,
    nextAdjustmentDate: safeNextAdjustmentDate,
  };
}

function inferFrequencyMonths(text: string) {
  const lowered = text.toLowerCase();
  const explicit =
    lowered.match(/cada\s+(\d{1,2})\s+mes(?:es)?/) ||
    lowered.match(/periodicidad\s+de\s+(\d{1,2})\s+mes(?:es)?/) ||
    lowered.match(/frecuencia\s+de\s+(\d{1,2})\s+mes(?:es)?/);

  if (explicit) {
    return Number(explicit[1]);
  }

  if (lowered.includes("trimestral")) return 3;
  if (lowered.includes("cuatrimestral")) return 4;
  if (lowered.includes("semestral")) return 6;
  if (lowered.includes("anual")) return 12;

  return null;
}

function inferIndexType(text: string) {
  const lowered = text.toLowerCase();
  if (lowered.includes("icl")) return "ICL";
  if (lowered.includes("ipc")) return "IPC";
  if (lowered.includes("indice de precios al consumidor")) return "IPC";
  return null;
}

function inferContractStartDate(text: string) {
  const normalized = normalizeTextForMatching(text);
  const candidates = [
    /(?:inicio|vigencia|comienza|comenzara|inicia|fecha de inicio)[^0-9]{0,25}(\d{1,2})[\/-](\d{1,2})[\/-](\d{2,4})/i,
    /(\d{1,2})[\/-](\d{1,2})[\/-](\d{2,4})/i,
  ];

  for (const pattern of candidates) {
    const match = normalized.match(pattern);
    if (match) {
      return toIsoDate(match[1], match[2], match[3]);
    }
  }

  const textualCandidates = [
    /(?:a partir del|inicio|vigencia|comienza|comenzara|inicia|fecha de inicio)[^a-z0-9]{0,20}(\d{1,2})\s+de\s+(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|setiembre|octubre|noviembre|diciembre)(?:\s+del?\s+ano)?\s+(\d{4})/i,
    /(\d{1,2})\s+de\s+(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|setiembre|octubre|noviembre|diciembre)(?:\s+del?\s+ano)?\s+(\d{4})/i,
  ];

  for (const pattern of textualCandidates) {
    const match = normalized.match(pattern);
    if (match) {
      return toIsoDateFromMonthName(match[1], match[2], match[3]);
    }
  }

  return null;
}

function inferNextAdjustmentDate(text: string, contractStartDate: string | null) {
  const normalized = normalizeTextForMatching(text);
  const numericMatch = normalized.match(
    /(?:proximo|primer|siguiente)\s+(?:ajuste|aumento|actualizacion)[^0-9]{0,25}(\d{1,2})[\/-](\d{1,2})[\/-](\d{2,4})/i
  );

  if (numericMatch) {
    return toIsoDate(numericMatch[1], numericMatch[2], numericMatch[3]);
  }

  const textualMatch = normalized.match(
    /(?:proximo|primer|siguiente)\s+(?:ajuste|aumento|actualizacion)[^a-z0-9]{0,30}(?:correspondera\s+en\s+el\s+)?mes\s+de\s+(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|setiembre|octubre|noviembre|diciembre)(?:\s+del?\s+ano)?\s+(\d{4})/i
  );

  if (!textualMatch) return null;

  const referenceDay = contractStartDate?.split("-")[2] ?? "01";
  return toIsoDateWithFallbackDay(referenceDay, textualMatch[1], textualMatch[2]);
}

function inferTenantName(text: string) {
  const match = text.match(
    /(?:locatario(?:\/a)?|inquilino(?:\/a)?|arrendatario(?:\/a)?)[^a-zA-ZáéíóúñÁÉÍÓÚÑ]{0,15}([A-ZÁÉÍÓÚÑ][A-Za-zÁÉÍÓÚáéíóúñ'`.-]+(?:\s+[A-ZÁÉÍÓÚÑ][A-Za-zÁÉÍÓÚáéíóúñ'`.-]+){1,3})/
  );
  return match?.[1]?.trim() ?? null;
}

function inferCurrentRent(text: string) {
  const patterns = [
    /(?:canon locativo|alquiler(?: inicial| mensual| actual)?|precio mensual)[^$\d]{0,20}(?:ars|\$)?\s*([\d.,]+)/i,
    /(?:ars|\$)\s*([\d.]{3,}(?:,\d{2})?)/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (!match) continue;
    const amount = parseAmount(match[1]);
    if (amount && !Number.isNaN(amount)) {
      return amount;
    }
  }

  return null;
}

async function inferWithOpenAI(text: string): Promise<AIRentalContractAnalysis | null> {
  const openAI = getOpenAIEnv();
  if (!openAI.configured) return null;

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
                "Lee un contrato de alquiler argentino y extrae datos estructurados. Devuelve solo JSON valido con las claves tenantName, currentRent, indexType, adjustmentFrequencyMonths, contractStartDate, nextAdjustmentDate, summary, confidence y notes. Usa null si un dato no está expresado con claridad suficiente. Las fechas deben salir como YYYY-MM-DD incluso si el contrato usa formatos legales como '01 de Abril del año 2024' o 'mes de OCTUBRE del año 2024'. indexType solo puede ser IPC o ICL. confidence solo puede ser high, medium o low. No inventes datos faltantes.",
            },
          ],
        },
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text: normalizeWhitespace(text).slice(0, 20000),
            },
          ],
        },
      ],
    }),
  });

  if (!response.ok) return null;

  const payload = (await response.json()) as { output_text?: string };
  const output = payload.output_text?.trim();
  if (!output) return null;

  const normalized = output.replace(/^```json\s*/i, "").replace(/```$/i, "").trim();

  try {
    return JSON.parse(normalized) as AIRentalContractAnalysis;
  } catch {
    return null;
  }
}

export async function analyzeRentalContractText({
  text,
  fallbackRent,
}: {
  text: string;
  fallbackRent: number;
}): Promise<RentalContractAnalysis> {
  const normalizedText = normalizeWhitespace(text);
  const ai = await inferWithOpenAI(normalizedText);

  const ruleTenantName = inferTenantName(normalizedText);
  const ruleCurrentRent = inferCurrentRent(normalizedText);
  const ruleIndexType = inferIndexType(normalizedText);
  const ruleAdjustmentFrequencyMonths = inferFrequencyMonths(normalizedText);
  const ruleContractStartDate = inferContractStartDate(normalizedText);
  const ruleNextAdjustmentDate = inferNextAdjustmentDate(normalizedText, ruleContractStartDate);

  const aiTenantName =
    typeof ai?.tenantName === "string" && ai.tenantName.trim() ? ai.tenantName.trim() : null;
  const aiCurrentRent = normalizePositiveAmount(ai?.currentRent);
  const aiIndexType = normalizeIndexType(ai?.indexType);
  const aiAdjustmentFrequencyMonths = normalizePositiveInteger(ai?.adjustmentFrequencyMonths);
  const aiContractStartDate = normalizeIsoDate(ai?.contractStartDate);
  const aiNextAdjustmentDate = normalizeIsoDate(ai?.nextAdjustmentDate);

  const tenantName = aiTenantName ?? ruleTenantName ?? null;
  const detectedCurrentRent = aiCurrentRent ?? ruleCurrentRent;
  const detectedIndexType = aiIndexType ?? ruleIndexType;
  const detectedAdjustmentFrequencyMonths =
    aiAdjustmentFrequencyMonths ?? ruleAdjustmentFrequencyMonths;
  const detectedContractStartDate = aiContractStartDate ?? ruleContractStartDate;
  const detectedNextAdjustmentDate =
    aiNextAdjustmentDate ??
    inferNextAdjustmentDate(normalizedText, detectedContractStartDate) ??
    ruleNextAdjustmentDate;

  const currentRent = detectedCurrentRent ?? fallbackRent;
  const indexType = detectedIndexType ?? null;
  const adjustmentFrequencyMonths = detectedAdjustmentFrequencyMonths ?? null;
  const contractStartDate = detectedContractStartDate ?? null;
  const nextAdjustmentDate =
    detectedNextAdjustmentDate ??
    (detectedContractStartDate && detectedAdjustmentFrequencyMonths
      ? addMonthsIsoDate(detectedContractStartDate, detectedAdjustmentFrequencyMonths)
      : null);

  const reviewReasons: string[] = [];

  if (!detectedCurrentRent) {
    reviewReasons.push("No pudimos detectar con certeza el alquiler actual en el contrato.");
  }

  if (!detectedIndexType) {
    reviewReasons.push("No pudimos detectar con certeza si el ajuste corresponde a IPC o ICL.");
  }

  if (!detectedAdjustmentFrequencyMonths) {
    reviewReasons.push("No pudimos detectar con certeza cada cuántos meses aumenta.");
  }

  if (!detectedContractStartDate) {
    reviewReasons.push("No pudimos detectar con certeza la fecha de inicio del contrato.");
  }

  if (!detectedNextAdjustmentDate && !(detectedContractStartDate && detectedAdjustmentFrequencyMonths)) {
    reviewReasons.push("No pudimos determinar con certeza la próxima fecha de ajuste.");
  }

  if (ai?.confidence === "low") {
    reviewReasons.push("La IA marcó baja confianza en la lectura del contrato.");
  }

  if (Array.isArray(ai?.notes)) {
    for (const note of ai.notes) {
      if (typeof note === "string" && note.trim()) {
        reviewReasons.push(note.trim());
      }
    }
  }

  if (aiCurrentRent && ruleCurrentRent && Math.abs(aiCurrentRent - ruleCurrentRent) > 1) {
    reviewReasons.push("La IA y la validación automática detectaron montos de alquiler diferentes.");
  }

  if (aiIndexType && ruleIndexType && aiIndexType !== ruleIndexType) {
    reviewReasons.push("La IA y la validación automática detectaron índices de ajuste diferentes.");
  }

  if (
    aiAdjustmentFrequencyMonths &&
    ruleAdjustmentFrequencyMonths &&
    aiAdjustmentFrequencyMonths !== ruleAdjustmentFrequencyMonths
  ) {
    reviewReasons.push("La IA y la validación automática detectaron frecuencias de ajuste diferentes.");
  }

  const uniqueReviewReasons = Array.from(new Set(reviewReasons));
  const requiresReview = uniqueReviewReasons.length > 0;

  return {
    tenantName,
    currentRent,
    indexType,
    adjustmentFrequencyMonths,
    contractStartDate,
    nextAdjustmentDate,
    summary:
      ai?.summary ??
      [
        tenantName ? `Inquilino detectado: ${tenantName}.` : null,
        contractStartDate ? `Inicio del contrato: ${contractStartDate}.` : null,
        nextAdjustmentDate ? `Próximo ajuste estimado: ${nextAdjustmentDate}.` : null,
        indexType ? `Índice detectado: ${indexType}.` : "Índice no detectado con certeza.",
        adjustmentFrequencyMonths
          ? `Frecuencia: cada ${adjustmentFrequencyMonths} meses.`
          : "Frecuencia no detectada con certeza.",
      ]
        .filter(Boolean)
        .join(" "),
    requiresReview,
    reviewReasons: uniqueReviewReasons,
  };
}
