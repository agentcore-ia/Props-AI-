import { NextResponse } from "next/server";

import { getCurrentUserContext } from "@/lib/auth/current-user";
import { createRentalContractSignedUrl } from "@/lib/rental-contract-files";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(
  _request: Request,
  context: { params: { contractId: string } }
) {
  const current = await getCurrentUserContext();

  if (!current) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  if (!["superadmin", "agency_admin"].includes(current.profile.role)) {
    return NextResponse.json({ error: "No tienes permisos para ver contratos." }, { status: 403 });
  }

  const { contractId } = context.params;
  const admin = createAdminClient();

  const { data: contract, error } = await admin
    .from("rental_contracts")
    .select("id, agency_id, contract_file_path, agencies!inner(slug)")
    .eq("id", contractId)
    .maybeSingle();

  if (error || !contract?.contract_file_path) {
    return NextResponse.json({ error: "No encontramos el archivo del contrato." }, { status: 404 });
  }

  const agencySlug = Array.isArray(contract.agencies)
    ? contract.agencies[0]?.slug ?? null
    : ((contract.agencies as { slug?: string } | null)?.slug ?? null);

  if (current.profile.role === "agency_admin" && current.profile.agency_slug !== agencySlug) {
    return NextResponse.json({ error: "Solo puedes abrir contratos de tu inmobiliaria." }, { status: 403 });
  }

  const signedUrl = await createRentalContractSignedUrl(contract.contract_file_path, 300);
  return NextResponse.redirect(signedUrl);
}
