import { NextResponse } from "next/server";

import { ensureAgencyMessagingInstance, getManagedAgency } from "@/lib/agency-access";
import { getCurrentUserContext } from "@/lib/auth/current-user";
import {
  ensureEvolutionInstance,
  recreateEvolutionInstance,
} from "@/lib/evolution";

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
    const qr = await recreateEvolutionInstance(managedAgency.messaging_instance);

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
    console.error("[evolution-reconnect] failed to reconnect instance", {
      agencySlug: agency.slug,
      messagingInstance: agency.messaging_instance,
      error: error instanceof Error ? error.message : String(error),
    });

    return NextResponse.json(
      {
        error: "No se pudo generar una nueva vinculacion de WhatsApp. Volve a intentarlo en unos segundos.",
      },
      { status: 502 }
    );
  }
}
