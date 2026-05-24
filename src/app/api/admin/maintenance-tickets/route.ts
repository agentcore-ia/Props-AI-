import { NextResponse } from "next/server";

import { getCurrentUserContext } from "@/lib/auth/current-user";
import { getAgencyScopeFromUser } from "@/lib/crm-automation";
import { listLeaseRoster } from "@/lib/props-data";
import { createAdminClient } from "@/lib/supabase/admin";

const allowedStatuses = new Set([
  "Nuevo",
  "En revision",
  "Proveedor asignado",
  "Esperando aprobacion",
  "Resuelto",
  "Cancelado",
]);
const allowedPriorities = new Set(["Alta", "Media", "Baja"]);
const allowedPayers = new Set(["Inquilino", "Propietario", "Inmobiliaria", "A definir"]);

function cleanText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export async function POST(request: Request) {
  const current = await getCurrentUserContext();
  if (!current || !["superadmin", "agency_admin", "agent"].includes(current.profile.role)) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const title = cleanText(body?.title);

  if (!title) {
    return NextResponse.json({ error: "Describe el reclamo o mantenimiento." }, { status: 400 });
  }

  const scope = getAgencyScopeFromUser(current);
  const leases = await listLeaseRoster(scope);
  const selectedLease =
    leases.find((lease) => lease.contractId === body?.contractId) ??
    leases.find((lease) => lease.propertyId === body?.propertyId) ??
    null;

  const admin = createAdminClient();
  let agencyId = selectedLease?.agencyId ?? null;

  if (!agencyId && scope?.agencySlug) {
    const { data: agency, error } = await admin
      .from("agencies")
      .select("id")
      .eq("slug", scope.agencySlug)
      .maybeSingle();
    if (error) throw error;
    agencyId = agency?.id ?? null;
  }

  if (!agencyId) {
    return NextResponse.json({ error: "No encontramos la inmobiliaria para crear el reclamo." }, { status: 404 });
  }

  const requestedPriority = cleanText(body?.priority);
  const requestedStatus = cleanText(body?.status);
  const requestedPayer = cleanText(body?.payer);
  const priority = allowedPriorities.has(requestedPriority) ? requestedPriority : "Media";
  const status = allowedStatuses.has(requestedStatus) ? requestedStatus : "Nuevo";
  const payer = allowedPayers.has(requestedPayer) ? requestedPayer : "A definir";

  const { data, error } = await admin
    .from("maintenance_tickets")
    .insert({
      agency_id: agencyId,
      property_id: selectedLease?.propertyId ?? body?.propertyId ?? null,
      contract_id: selectedLease?.contractId ?? body?.contractId ?? null,
      tenant_name: cleanText(body?.tenantName) || selectedLease?.tenantName || "",
      owner_name: cleanText(body?.ownerName) || selectedLease?.ownerName || "",
      title,
      description: cleanText(body?.description),
      priority,
      status,
      supplier_id: body?.supplierId || null,
      supplier_name: cleanText(body?.supplierName),
      estimated_cost: Number(body?.estimatedCost ?? 0) || 0,
      payer,
      owner_approval_required: Boolean(body?.ownerApprovalRequired),
      next_step: cleanText(body?.nextStep) || "Definir responsable, proveedor y fecha de resolucion.",
      created_by: current.user.id,
    })
    .select("id")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await admin.from("employee_tasks").insert({
    agency_id: agencyId,
    property_id: selectedLease?.propertyId ?? body?.propertyId ?? null,
    title: `Resolver reclamo: ${title}`,
    details: cleanText(body?.nextStep) || cleanText(body?.description) || "Revisar reclamo y definir proximo paso.",
    due_at: new Date().toISOString(),
    task_type: "General",
    priority,
    automation_source: "maintenance_ticket",
    created_by: current.user.id,
  });

  return NextResponse.json({ ok: true, id: data.id });
}

export async function PATCH(request: Request) {
  const current = await getCurrentUserContext();
  if (!current || !["superadmin", "agency_admin", "agent"].includes(current.profile.role)) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const ticketId = cleanText(body?.ticketId);

  if (!ticketId) {
    return NextResponse.json({ error: "Falta el reclamo a actualizar." }, { status: 400 });
  }

  const update: Record<string, unknown> = {};
  const requestedStatus = cleanText(body?.status);
  const requestedPriority = cleanText(body?.priority);
  const requestedPayer = cleanText(body?.payer);
  if (allowedStatuses.has(requestedStatus)) update.status = requestedStatus;
  if (allowedPriorities.has(requestedPriority)) update.priority = requestedPriority;
  if (allowedPayers.has(requestedPayer)) update.payer = requestedPayer;
  if (typeof body?.supplierName === "string") update.supplier_name = body.supplierName.trim();
  if (Number.isFinite(Number(body?.estimatedCost))) update.estimated_cost = Number(body.estimatedCost);
  if (typeof body?.nextStep === "string") update.next_step = body.nextStep.trim();
  if (typeof body?.description === "string") update.description = body.description.trim();
  if (typeof body?.ownerApprovalRequired === "boolean") update.owner_approval_required = body.ownerApprovalRequired;
  if (body?.ownerApproved === true) update.owner_approved_at = new Date().toISOString();

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: "No hay cambios para guardar." }, { status: 400 });
  }

  const { error } = await createAdminClient()
    .from("maintenance_tickets")
    .update(update)
    .eq("id", ticketId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
