import type { SupabaseClient } from "@supabase/supabase-js";

type AuditInput = {
  admin: SupabaseClient;
  agencyId: string | null | undefined;
  actorId: string | null | undefined;
  action: string;
  entityTable: string;
  entityId?: string | null;
  documentNumber?: string | null;
  amount?: number | null;
  summary: string;
  metadata?: Record<string, unknown>;
};

export function buildFinancialDocumentNumber(prefix: string, dateLike: string | null | undefined, id: string | null | undefined) {
  const parsed = dateLike ? new Date(dateLike) : new Date();
  const safeDate = Number.isNaN(parsed.getTime()) ? new Date() : parsed;
  const datePart = safeDate.toISOString().slice(0, 10).replace(/-/g, "");
  const idPart = String(id ?? crypto.randomUUID()).replace(/-/g, "").slice(0, 8).toUpperCase();

  return `${prefix}-${datePart}-${idPart}`;
}

export async function logFinancialAudit(input: AuditInput) {
  if (!input.agencyId) return;

  const { error } = await input.admin.from("financial_audit_logs").insert({
    agency_id: input.agencyId,
    actor_id: input.actorId ?? null,
    action: input.action,
    entity_table: input.entityTable,
    entity_id: input.entityId ?? null,
    document_number: input.documentNumber ?? "",
    amount: input.amount ?? null,
    currency: "ARS",
    summary: input.summary,
    metadata: input.metadata ?? {},
  });

  if (error && !/financial_audit_logs|schema cache|Could not find/i.test(error.message ?? "")) {
    console.error("[financial-audit] could not write audit log", {
      action: input.action,
      entityTable: input.entityTable,
      entityId: input.entityId,
      error: error.message,
    });
  }
}
