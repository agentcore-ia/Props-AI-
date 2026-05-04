import { NextResponse } from "next/server";

import { ensureAgencyMessagingInstance, getManagedAgency } from "@/lib/agency-access";
import { getCurrentUserContext } from "@/lib/auth/current-user";
import {
  ensureEvolutionInstance,
  getEvolutionQr,
  restartEvolutionInstance,
} from "@/lib/evolution";

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function POST(request: Request) {
  const current = await getCurrentUserContext();

  if (!current) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  if (!["superadmin", "agency_admin"].includes(current.profile.role)) {
    return NextResponse.json({ error: "No tienes permisos para reconectar WhatsApp." }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const requestedSlug = typeof body.agencySlug === "string" ? body.agencySlug : null;
  const agency = await getManagedAgency(current, requestedSlug);

  if (!agency) {
    return NextResponse.json({ error: "No encontramos la inmobiliaria." }, { status: 404 });
  }

  try {
    const managedAgency = await ensureAgencyMessagingInstance(current, agency);
    await ensureEvolutionInstance(managedAgency.messaging_instance);
    await restartEvolutionInstance(managedAgency.messaging_instance);
    await sleep(2500);
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
        error: error instanceof Error ? error.message : "No se pudo reconectar la instancia de WhatsApp.",
      },
      { status: 502 }
    );
  }
}
