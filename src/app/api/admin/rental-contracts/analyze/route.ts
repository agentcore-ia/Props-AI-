import { NextResponse } from "next/server";

import { getCurrentUserContext } from "@/lib/auth/current-user";
import { analyzeRentalContractText } from "@/lib/rental-contract-analysis";
import { extractRentalContractFileText } from "@/lib/rental-contract-files";

export async function POST(request: Request) {
  const current = await getCurrentUserContext();

  if (!current) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  if (!["superadmin", "agency_admin"].includes(current.profile.role)) {
    return NextResponse.json(
      { error: "No tienes permisos para analizar contratos." },
      { status: 403 }
    );
  }

  const formData = await request.formData();
  const contractFileEntry = formData.get("contractFile");
  const contractFile =
    contractFileEntry instanceof File && contractFileEntry.size > 0 ? contractFileEntry : null;

  if (!contractFile) {
    return NextResponse.json({ error: "Adjunta un contrato para analizar." }, { status: 400 });
  }

  const fallbackRent = Math.max(0, Number(formData.get("fallbackRent") ?? 0) || 0);

  try {
    const extracted = await extractRentalContractFileText(contractFile);

    if (!extracted.extractedText.trim()) {
      return NextResponse.json(
        {
          error: extracted.extractionWarning ?? "No pudimos extraer texto legible del contrato.",
          extractedLength: 0,
        },
        { status: 400 }
      );
    }

    const analysis = await analyzeRentalContractText({
      text: extracted.extractedText,
      fallbackRent,
    });

    return NextResponse.json({
      ok: true,
      fileName: extracted.fileName,
      mimeType: extracted.mimeType,
      sizeBytes: extracted.sizeBytes,
      extractedLength: extracted.extractedText.length,
      extractionWarning: extracted.extractionWarning ?? null,
      analysis,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "No se pudo analizar el contrato.",
      },
      { status: 400 }
    );
  }
}
