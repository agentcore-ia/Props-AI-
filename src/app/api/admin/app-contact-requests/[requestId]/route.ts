import { NextResponse } from "next/server";

import { getCurrentUserContext } from "@/lib/auth/current-user";
import { createAdminClient } from "@/lib/supabase/admin";

const allowedStatuses = new Set(["Nuevo", "Contactado", "Demo agendada", "Cerrado", "Descartado"]);

export async function PATCH(
  request: Request,
  { params }: { params: { requestId: string } }
) {
  const currentUser = await getCurrentUserContext();

  if (!currentUser || currentUser.profile.role !== "superadmin") {
    return NextResponse.json({ error: "No tenés acceso a esta sección." }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const status = String(body?.status ?? "").trim();
  const notes = typeof body?.notes === "string" ? body.notes.trim() : undefined;

  if (!allowedStatuses.has(status)) {
    return NextResponse.json({ error: "Estado inválido." }, { status: 400 });
  }

  const updatePayload: Record<string, string> = {
    status,
    updated_at: new Date().toISOString(),
  };

  if (notes !== undefined) {
    updatePayload.notes = notes;
  }

  const { error } = await createAdminClient()
    .from("app_contact_requests")
    .update(updatePayload)
    .eq("id", params.requestId);

  if (error) {
    return NextResponse.json(
      { error: "No pudimos actualizar la solicitud." },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}
