import { NextResponse } from "next/server";

import { getCurrentUserContext } from "@/lib/auth/current-user";
import { runDueRentAdjustments } from "@/lib/rent-automation";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST() {
  const current = await getCurrentUserContext();

  if (!current) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  if (!["superadmin", "agency_admin"].includes(current.profile.role)) {
    return NextResponse.json(
      { error: "No tienes permisos para ejecutar automatizaciones." },
      { status: 403 }
    );
  }

  let agencyIds: string[] | undefined;

  if (current.profile.role === "agency_admin" && current.profile.agency_slug) {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("agencies")
      .select("id")
      .eq("slug", current.profile.agency_slug);

    if (error) {
      return NextResponse.json(
        { error: "No se pudo resolver la inmobiliaria actual." },
        { status: 400 }
      );
    }

    agencyIds = (data ?? []).map((agency) => agency.id);
  }

  const result = await runDueRentAdjustments({ agencyIds });

  return NextResponse.json(result);
}
