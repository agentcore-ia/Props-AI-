import { NextResponse } from "next/server";

import { getManagedAgency } from "@/lib/agency-access";
import { getCurrentUserContext } from "@/lib/auth/current-user";
import {
  ensurePortalIntegrations,
  normalizePortalKey,
  regeneratePortalToken,
} from "@/lib/portal-integrations";

export async function GET(request: Request) {
  const current = await getCurrentUserContext();

  if (!current) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  if (!["superadmin", "agency_admin"].includes(current.profile.role)) {
    return NextResponse.json({ error: "No tienes permisos para ver integraciones." }, { status: 403 });
  }

  const url = new URL(request.url);
  const agency = await getManagedAgency(current, url.searchParams.get("agencySlug"));

  if (!agency) {
    return NextResponse.json({ error: "No encontramos la inmobiliaria." }, { status: 404 });
  }

  const integrations = await ensurePortalIntegrations(agency.id);

  return NextResponse.json({
    ok: true,
    agency: {
      id: agency.id,
      slug: agency.slug,
      name: agency.name,
    },
    integrations,
  });
}

export async function POST(request: Request) {
  const current = await getCurrentUserContext();

  if (!current) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  if (!["superadmin", "agency_admin"].includes(current.profile.role)) {
    return NextResponse.json({ error: "No tienes permisos para editar integraciones." }, { status: 403 });
  }

  const body = await request.json();
  const agency = await getManagedAgency(current, typeof body.agencySlug === "string" ? body.agencySlug : null);

  if (!agency) {
    return NextResponse.json({ error: "No encontramos la inmobiliaria." }, { status: 404 });
  }

  await ensurePortalIntegrations(agency.id);

  const action = String(body.action ?? "").trim();
  const portal = normalizePortalKey(body.portal);

  if (action !== "regenerate_token") {
    return NextResponse.json({ error: "Accion no soportada." }, { status: 400 });
  }

  const integration = await regeneratePortalToken({
    agencyId: agency.id,
    portal,
  });

  return NextResponse.json({ ok: true, integration });
}
