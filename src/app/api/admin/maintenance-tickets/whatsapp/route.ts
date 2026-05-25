import { NextResponse } from "next/server";

import { getEffectiveMessagingInstance } from "@/lib/agency-access";
import { getCurrentUserContext } from "@/lib/auth/current-user";
import { ensureEvolutionInstance, sendEvolutionTextMessage } from "@/lib/evolution";
import { createAdminClient } from "@/lib/supabase/admin";

type RecipientRole = "supplier" | "tenant" | "owner";

function cleanText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function sanitizeRole(value: unknown): RecipientRole {
  return value === "tenant" || value === "owner" || value === "supplier" ? value : "supplier";
}

export async function POST(request: Request) {
  const current = await getCurrentUserContext();
  if (!current || !["superadmin", "agency_admin", "agent"].includes(current.profile.role)) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const ticketId = cleanText(body?.ticketId);
  const message = cleanText(body?.message);
  const recipientRole = sanitizeRole(body?.recipientRole);

  if (!ticketId || !message) {
    return NextResponse.json({ error: "Falta el reclamo o el mensaje." }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: ticket, error } = await admin
    .from("maintenance_tickets")
    .select(
      "id, agency_id, supplier_id, supplier_name, tenant_name, owner_name, contract_id, title, agencies!inner(id, slug, name, messaging_instance)"
    )
    .eq("id", ticketId)
    .maybeSingle();

  if (error || !ticket) {
    return NextResponse.json({ error: error?.message ?? "No encontramos el reclamo." }, { status: 404 });
  }

  const agency = Array.isArray(ticket.agencies) ? ticket.agencies[0] : ticket.agencies;
  if (!agency) {
    return NextResponse.json({ error: "No encontramos la inmobiliaria del reclamo." }, { status: 404 });
  }

  if (current.profile.role !== "superadmin" && agency.slug !== current.profile.agency_slug) {
    return NextResponse.json({ error: "No tienes permisos para este reclamo." }, { status: 403 });
  }

  const recipient = await resolveRecipient(admin, {
    role: recipientRole,
    supplierId: ticket.supplier_id,
    supplierName: ticket.supplier_name,
    tenantName: ticket.tenant_name,
    ownerName: ticket.owner_name,
    contractId: ticket.contract_id,
  });

  if (!recipient.phone) {
    return NextResponse.json(
      {
        error:
          recipientRole === "supplier"
            ? "El proveedor seleccionado no tiene teléfono cargado."
            : `No encontramos teléfono para ${recipient.label}.`,
      },
      { status: 400 }
    );
  }

  const instanceName = getEffectiveMessagingInstance({
    slug: agency.slug,
    messaging_instance: agency.messaging_instance,
  });

  await ensureEvolutionInstance(instanceName);
  await sendEvolutionTextMessage({
    instanceName,
    number: recipient.phone,
    text: message,
  });

  await admin.from("employee_tasks").insert({
    agency_id: ticket.agency_id,
    title: `WhatsApp enviado por reclamo: ${ticket.title}`,
    details: `Se envió mensaje a ${recipient.label}: ${message.slice(0, 220)}`,
    due_at: new Date().toISOString(),
    task_type: "General",
    priority: "Media",
    automation_source: "maintenance_whatsapp",
    completed_at: new Date().toISOString(),
    created_by: current.user.id,
  });

  return NextResponse.json({
    ok: true,
    sentTo: recipient.label,
    phone: recipient.phone,
  });
}

async function resolveRecipient(
  admin: ReturnType<typeof createAdminClient>,
  input: {
    role: RecipientRole;
    supplierId: string | null;
    supplierName: string;
    tenantName: string;
    ownerName: string;
    contractId: string | null;
  }
) {
  if (input.role === "supplier" && input.supplierId) {
    const { data } = await admin
      .from("suppliers")
      .select("name, phone")
      .eq("id", input.supplierId)
      .maybeSingle();
    return {
      label: data?.name ?? input.supplierName ?? "Proveedor",
      phone: data?.phone ?? null,
    };
  }

  if (input.contractId) {
    const { data: contract } = await admin
      .from("rental_contracts")
      .select("tenant_name, tenant_phone, owner_name, owner_phone")
      .eq("id", input.contractId)
      .maybeSingle();

    if (input.role === "tenant") {
      return {
        label: contract?.tenant_name ?? input.tenantName ?? "Inquilino",
        phone: contract?.tenant_phone ?? null,
      };
    }

    if (input.role === "owner") {
      if (contract?.owner_phone) {
        return {
          label: contract.owner_name ?? input.ownerName ?? "Propietario",
          phone: contract.owner_phone,
        };
      }

      const { data: owner } = await admin
        .from("contract_owners")
        .select("full_name, phone")
        .eq("contract_id", input.contractId)
        .not("phone", "is", null)
        .order("display_order", { ascending: true })
        .limit(1)
        .maybeSingle();

      return {
        label: owner?.full_name ?? contract?.owner_name ?? input.ownerName ?? "Propietario",
        phone: owner?.phone ?? null,
      };
    }
  }

  return {
    label:
      input.role === "supplier"
        ? input.supplierName || "Proveedor"
        : input.role === "owner"
          ? input.ownerName || "Propietario"
          : input.tenantName || "Inquilino",
    phone: null,
  };
}
