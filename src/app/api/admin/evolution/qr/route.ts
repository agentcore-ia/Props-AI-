import { NextResponse } from "next/server";

import { ensureAgencyMessagingInstance, getManagedAgency } from "@/lib/agency-access";
import { getCurrentUserContext } from "@/lib/auth/current-user";
import { ensureEvolutionInstance, getEvolutionQr } from "@/lib/evolution";

export async function GET(request: Request) {
  const current = await getCurrentUserContext();

  if (!current) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  if (!["superadmin", "agency_admin"].includes(current.profile.role)) {
    return NextResponse.json({ error: "No tienes permisos para conectar WhatsApp." }, { status: 403 });
  }

  const url = new URL(request.url);
  const requestedSlug = url.searchParams.get("agencySlug");
  const agency = await getManagedAgency(current, requestedSlug);

  if (!agency) {
    return NextResponse.json({ error: "No encontramos la inmobiliaria." }, { status: 404 });
  }

  try {
    const managedAgency = await ensureAgencyMessagingInstance(current, agency);
    await ensureEvolutionInstance(managedAgency.messaging_instance);
    const qr = await getEvolutionQr(managedAgency.messaging_instance);

    return NextResponse.json({
      ok: true,
      agency: {
        id: managedAgency.id,
        slug: managedAgency.slug,
        name: managedAgency.name,
        messagingInstance: managedAgency.messaging_instance,
      },
      qr,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "No se pudo obtener el QR de WhatsApp.",
      },
      { status: 502 }
    );
  }
}
