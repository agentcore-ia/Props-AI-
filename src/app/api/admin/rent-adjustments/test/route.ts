import { NextResponse } from "next/server";

import { getCurrentUserContext } from "@/lib/auth/current-user";
import { sendTestRentIncreaseMessage } from "@/lib/rent-automation";

export async function POST(request: Request) {
  const current = await getCurrentUserContext();

  if (!current) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  if (!["superadmin", "agency_admin"].includes(current.profile.role)) {
    return NextResponse.json(
      { error: "No tienes permisos para enviar pruebas de WhatsApp." },
      { status: 403 }
    );
  }

  const body = await request.json().catch(() => ({}));
  const contractId = String(body.contractId ?? "").trim();

  if (!contractId) {
    return NextResponse.json(
      { error: "Selecciona un contrato para enviar la prueba." },
      { status: 400 }
    );
  }

  try {
    const result = await sendTestRentIncreaseMessage(contractId);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "No se pudo enviar la prueba del aumento.",
      },
      { status: 400 }
    );
  }
}
