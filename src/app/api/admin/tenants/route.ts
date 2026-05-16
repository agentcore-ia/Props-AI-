import { NextResponse } from "next/server";

import { getCurrentUserContext } from "@/lib/auth/current-user";
import { createAdminClient } from "@/lib/supabase/admin";

function normalizeOptionalString(value: unknown) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed || null;
}

export async function PATCH(request: Request) {
  const current = await getCurrentUserContext();

  if (!current) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  if (!["superadmin", "agency_admin", "agent"].includes(current.profile.role)) {
    return NextResponse.json(
      { error: "No tienes permisos para editar inquilinos." },
      { status: 403 }
    );
  }

  const body = (await request.json().catch(() => null)) as
    | {
        contractId?: string;
        tenantName?: string;
        tenantPhone?: string;
        tenantEmail?: string | null;
      }
    | null;

  const contractId = String(body?.contractId ?? "").trim();
  const tenantName = String(body?.tenantName ?? "").trim();
  const tenantPhone = String(body?.tenantPhone ?? "").trim();
  const tenantEmail = normalizeOptionalString(body?.tenantEmail);

  if (!contractId) {
    return NextResponse.json({ error: "Falta el contrato del inquilino." }, { status: 400 });
  }

  if (!tenantName || !tenantPhone) {
    return NextResponse.json(
      { error: "Completa al menos nombre y WhatsApp del inquilino." },
      { status: 400 }
    );
  }

  const admin = createAdminClient();
  const { data: contract, error: contractError } = await admin
    .from("rental_contracts")
    .select("id, agencies!inner(slug)")
    .eq("id", contractId)
    .maybeSingle();

  if (contractError || !contract) {
    return NextResponse.json({ error: "No encontramos el inquilino." }, { status: 404 });
  }

  const contractAgencySlug = Array.isArray(contract.agencies)
    ? contract.agencies[0]?.slug ?? null
    : ((contract.agencies as { slug?: string } | null)?.slug ?? null);

  if (
    current.profile.role !== "superadmin" &&
    current.profile.agency_slug !== contractAgencySlug
  ) {
    return NextResponse.json(
      { error: "Solo puedes editar inquilinos de tu inmobiliaria." },
      { status: 403 }
    );
  }

  const { error: updateError } = await admin
    .from("rental_contracts")
    .update({
      tenant_name: tenantName,
      tenant_phone: tenantPhone,
      tenant_email: tenantEmail,
    })
    .eq("id", contractId);

  if (updateError) {
    return NextResponse.json(
      { error: "No se pudieron guardar los datos del inquilino." },
      { status: 400 }
    );
  }

  return NextResponse.json({
    ok: true,
    tenant: {
      contractId,
      tenantName,
      tenantPhone,
      tenantEmail,
    },
  });
}
