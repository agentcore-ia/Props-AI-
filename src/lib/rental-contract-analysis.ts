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
};

function normalizeWhitespace(text: string) {
  return text.replace(/\s+/g, " ").trim();
}

function toIsoDate(day: string, month: string, year: string) {
  const normalizedYear = year.length === 2 ? `20${year}` : year;
  const dd = day.padStart(2, "0");
  const mm = month.padStart(2, "0");
  return `${normalizedYear}-${mm}-${dd}`;
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

function addMonthsIsoDate(isoDate: string, months: number) {
  const [year, month, day] = isoDate.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1 + months, 1));
  const lastDay = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0)).getUTCDate();
  date.setUTCDate(Math.min(day, lastDay));
  return date.toISOString().slice(0, 10);
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
  const candidates = [
    /(?:inicio|vigencia|comienza|comenzara|inicia|fecha de inicio)[^0-9]{0,25}(\d{1,2})[\/-](\d{1,2})[\/-](\d{2,4})/i,
    /(\d{1,2})[\/-](\d{1,2})[\/-](\d{2,4})/i,
  ];

  for (const pattern of candidates) {
    const match = text.match(pattern);
    if (match) {
      return toIsoDate(match[1], match[2], match[3]);
    }
  }

  return null;
}

function inferNextAdjustmentDate(text: string) {
  const match = text.match(
    /(?:proximo|primer|siguiente)\s+(?:ajuste|aumento|actualizacion)[^0-9]{0,25}(\d{1,2})[\/-](\d{1,2})[\/-](\d{2,4})/i
  );

  if (!match) return null;
  return toIsoDate(match[1], match[2], match[3]);
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

async function inferWithOpenAI(text: string): Promise<Partial<RentalContractAnalysis> | null> {
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
                "Extrae datos de contratos de alquiler argentinos. Devuelve solo JSON valido con las claves tenantName, currentRent, indexType, adjustmentFrequencyMonths, contractStartDate, nextAdjustmentDate y summary. Usa null si no encuentras algo. Las fechas deben estar en formato YYYY-MM-DD. indexType solo puede ser IPC o ICL.",
            },
          ],
        },
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text: normalizeWhitespace(text).slice(0, 14000),
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
    return JSON.parse(normalized) as Partial<RentalContractAnalysis>;
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

  const tenantName = ai?.tenantName ?? inferTenantName(normalizedText);
  const currentRent =
    ai?.currentRent && ai.currentRent > 0
      ? ai.currentRent
      : inferCurrentRent(normalizedText) ?? fallbackRent;
  const indexType = ai?.indexType ?? inferIndexType(normalizedText) ?? "IPC";
  const adjustmentFrequencyMonths =
    ai?.adjustmentFrequencyMonths && ai.adjustmentFrequencyMonths > 0
      ? ai.adjustmentFrequencyMonths
      : inferFrequencyMonths(normalizedText) ?? 6;
  const contractStartDate = ai?.contractStartDate ?? inferContractStartDate(normalizedText);
  const nextAdjustmentDate =
    ai?.nextAdjustmentDate ??
    inferNextAdjustmentDate(normalizedText) ??
    (contractStartDate ? addMonthsIsoDate(contractStartDate, adjustmentFrequencyMonths) : null);

  return {
    tenantName: tenantName ?? null,
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
        nextAdjustmentDate ? `Proximo ajuste estimado: ${nextAdjustmentDate}.` : null,
        `Indice detectado: ${indexType}.`,
        `Frecuencia: cada ${adjustmentFrequencyMonths} meses.`,
      ]
        .filter(Boolean)
        .join(" "),
  };
}
