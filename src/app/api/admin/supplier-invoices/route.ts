import { NextResponse } from "next/server";

import { getCurrentUserContext } from "@/lib/auth/current-user";
import { createAdminClient } from "@/lib/supabase/admin";

async function resolveAgencyId(agencySlug: string | null) {
  const admin = createAdminClient();
  const { data } = await admin.from("agencies").select("id").eq("slug", agencySlug).maybeSingle();
  return data?.id ?? null;
}

export async function POST(request: Request) {
  const current = await getCurrentUserContext();
  if (!current) return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  if (!["superadmin", "agency_admin"].includes(current.profile.role)) {
    return NextResponse.json({ error: "Sin permisos." }, { status: 403 });
  }

  const body = (await request.json().catch(() => null)) as
    | {
        supplierId?: string | null;
        invoiceNumber?: string;
        concept?: string;
        totalAmount?: number;
        dueDate?: string | null;
        status?: "Borrador" | "Emitida" | "Pagada" | "Anulada";
        notes?: string;
      }
    | null;

  const agencyId = await resolveAgencyId(current.profile.agency_slug);
  if (!agencyId && current.profile.role !== "superadmin") {
    return NextResponse.json({ error: "No encontramos tu inmobiliaria." }, { status: 404 });
  }

  const concept = String(body?.concept ?? "").trim();
  if (!concept) return NextResponse.json({ error: "Falta el concepto." }, { status: 400 });

  const { error } = await createAdminClient().from("supplier_invoices").insert({
    agency_id: agencyId,
    supplier_id: body?.supplierId || null,
    invoice_number: String(body?.invoiceNumber ?? "").trim(),
    concept,
    total_amount: Number(body?.totalAmount ?? 0),
    due_date: body?.dueDate ? String(body.dueDate).slice(0, 10) : null,
    status: body?.status ?? "Emitida",
    notes: String(body?.notes ?? "").trim(),
    created_by: current.user.id,
  });

  if (error) {
    return NextResponse.json({ error: "No se pudo registrar la factura." }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}

export async function PATCH(request: Request) {
  const current = await getCurrentUserContext();
  if (!current) return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  const body = (await request.json().catch(() => null)) as
    | {
        invoiceId?: string;
        status?: "Borrador" | "Emitida" | "Pagada" | "Anulada";
      }
    | null;
  const invoiceId = String(body?.invoiceId ?? "").trim();
  if (!invoiceId) return NextResponse.json({ error: "Falta la factura." }, { status: 400 });

  const { error } = await createAdminClient()
    .from("supplier_invoices")
    .update({ status: body?.status ?? "Pagada" })
    .eq("id", invoiceId);

  if (error) {
    return NextResponse.json({ error: "No se pudo actualizar la factura." }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
