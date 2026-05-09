import { NextResponse } from "next/server";

import { getCurrentUserContext } from "@/lib/auth/current-user";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  const current = await getCurrentUserContext();
  if (!current) return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  if (!["superadmin", "agency_admin"].includes(current.profile.role)) {
    return NextResponse.json({ error: "Sin permisos." }, { status: 403 });
  }

  const body = (await request.json().catch(() => null)) as
    | {
        occurredOn?: string;
        kind?: "Ingreso" | "Egreso" | "Transferencia";
        category?: string;
        amount?: number;
        reference?: string;
        notes?: string;
      }
    | null;

  const agencySlug = current.profile.agency_slug;
  const admin = createAdminClient();
  const { data: agency, error: agencyError } = await admin
    .from("agencies")
    .select("id")
    .eq("slug", agencySlug)
    .maybeSingle();

  if (current.profile.role !== "superadmin" && (agencyError || !agency)) {
    return NextResponse.json({ error: "No encontramos tu inmobiliaria." }, { status: 404 });
  }

  const targetAgencyId = agency?.id;
  if (!targetAgencyId && current.profile.role !== "superadmin") {
    return NextResponse.json({ error: "Falta la inmobiliaria." }, { status: 400 });
  }

  const { error } = await admin.from("cash_movements").insert({
    agency_id: targetAgencyId,
    occurred_on: String(body?.occurredOn ?? new Date().toISOString().slice(0, 10)).slice(0, 10),
    kind: body?.kind ?? "Ingreso",
    category: String(body?.category ?? "").trim(),
    amount: Number(body?.amount ?? 0),
    reference: String(body?.reference ?? "").trim(),
    notes: String(body?.notes ?? "").trim(),
    created_by: current.user.id,
  });

  if (error) {
    return NextResponse.json({ error: "No se pudo registrar el movimiento de caja." }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
