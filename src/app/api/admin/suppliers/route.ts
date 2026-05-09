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
        name?: string;
        serviceType?: string;
        contactName?: string;
        phone?: string;
        email?: string;
        notes?: string;
        status?: "Activo" | "Inactivo";
      }
    | null;

  const agencyId = await resolveAgencyId(current.profile.agency_slug);
  if (!agencyId && current.profile.role !== "superadmin") {
    return NextResponse.json({ error: "No encontramos tu inmobiliaria." }, { status: 404 });
  }

  const name = String(body?.name ?? "").trim();
  if (!name) return NextResponse.json({ error: "Falta el nombre del proveedor." }, { status: 400 });

  const { error } = await createAdminClient().from("suppliers").insert({
    agency_id: agencyId,
    name,
    service_type: String(body?.serviceType ?? "").trim(),
    contact_name: String(body?.contactName ?? "").trim() || null,
    phone: String(body?.phone ?? "").trim() || null,
    email: String(body?.email ?? "").trim() || null,
    notes: String(body?.notes ?? "").trim(),
    status: body?.status ?? "Activo",
    created_by: current.user.id,
  });

  if (error) {
    return NextResponse.json({ error: "No se pudo crear el proveedor." }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}

export async function PATCH(request: Request) {
  const current = await getCurrentUserContext();
  if (!current) return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  const body = (await request.json().catch(() => null)) as
    | {
        supplierId?: string;
        status?: "Activo" | "Inactivo";
        notes?: string;
      }
    | null;
  const supplierId = String(body?.supplierId ?? "").trim();
  if (!supplierId) return NextResponse.json({ error: "Falta el proveedor." }, { status: 400 });

  const { error } = await createAdminClient()
    .from("suppliers")
    .update({
      status: body?.status ?? "Activo",
      notes: String(body?.notes ?? "").trim(),
    })
    .eq("id", supplierId);

  if (error) {
    return NextResponse.json({ error: "No se pudo actualizar el proveedor." }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
