import "server-only";

import crypto from "node:crypto";

import type { Property } from "@/lib/mock-data";
import { listProperties } from "@/lib/props-data";
import { createAdminClient } from "@/lib/supabase/admin";

export type PortalKey = "email" | "zonaprop" | "argenprop" | "mercadolibre" | "otro";

export type PortalIntegrationSummary = {
  id: string;
  agencyId: string;
  portal: PortalKey;
  label: string;
  inboundToken: string;
  enabled: boolean;
  lastEventAt: string | null;
  createdAt: string;
  updatedAt: string;
};

type PortalIntegrationRow = {
  id: string;
  agency_id: string;
  portal: PortalKey;
  label: string;
  inbound_token: string;
  enabled: boolean;
  last_event_at: string | null;
  created_at: string;
  updated_at: string;
};

export const DEFAULT_PORTAL_INTEGRATIONS: Array<{ portal: PortalKey; label: string }> = [
  { portal: "email", label: "Email de portales" },
  { portal: "zonaprop", label: "Zonaprop" },
  { portal: "argenprop", label: "Argenprop" },
  { portal: "mercadolibre", label: "Mercado Libre Inmuebles" },
];

export function createPortalInboundToken() {
  return `props_${crypto.randomBytes(24).toString("hex")}`;
}

export function normalizePortalKey(value: unknown): PortalKey {
  const normalized = String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");

  if (normalized.includes("zonaprop")) return "zonaprop";
  if (normalized.includes("argenprop")) return "argenprop";
  if (normalized.includes("mercadolibre") || normalized.includes("ml")) return "mercadolibre";
  if (normalized.includes("email") || normalized.includes("mail")) return "email";
  return "otro";
}

export function getPortalLabel(portal: PortalKey) {
  return (
    DEFAULT_PORTAL_INTEGRATIONS.find((item) => item.portal === portal)?.label ??
    "Portal externo"
  );
}

function mapPortalIntegration(row: PortalIntegrationRow): PortalIntegrationSummary {
  return {
    id: row.id,
    agencyId: row.agency_id,
    portal: row.portal,
    label: row.label,
    inboundToken: row.inbound_token,
    enabled: row.enabled,
    lastEventAt: row.last_event_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function ensurePortalIntegrations(agencyId: string) {
  const admin = createAdminClient();

  const { data: existingRows, error: existingError } = await admin
    .from("portal_integrations")
    .select("*")
    .eq("agency_id", agencyId);

  if (existingError) {
    throw existingError;
  }

  const existing = new Set(((existingRows ?? []) as PortalIntegrationRow[]).map((row) => row.portal));
  const missing = DEFAULT_PORTAL_INTEGRATIONS.filter((item) => !existing.has(item.portal));

  if (missing.length > 0) {
    const { error: insertError } = await admin.from("portal_integrations").insert(
      missing.map((item) => ({
        agency_id: agencyId,
        portal: item.portal,
        label: item.label,
        inbound_token: createPortalInboundToken(),
      }))
    );

    if (insertError) {
      throw insertError;
    }
  }

  const { data, error } = await admin
    .from("portal_integrations")
    .select("*")
    .eq("agency_id", agencyId)
    .order("created_at", { ascending: true });

  if (error) {
    throw error;
  }

  return ((data ?? []) as PortalIntegrationRow[]).map(mapPortalIntegration);
}

export async function regeneratePortalToken(params: {
  agencyId: string;
  portal: PortalKey;
}) {
  const admin = createAdminClient();
  const token = createPortalInboundToken();

  const { data, error } = await admin
    .from("portal_integrations")
    .update({
      inbound_token: token,
      enabled: true,
      updated_at: new Date().toISOString(),
    })
    .eq("agency_id", params.agencyId)
    .eq("portal", params.portal)
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return mapPortalIntegration(data as PortalIntegrationRow);
}

export function extractPropertyIdFromText(value: unknown) {
  const text = String(value ?? "");
  const fullMatch = text.match(/\/propiedad\/[a-z0-9-]+\/([0-9a-f-]{36})/i);
  if (fullMatch?.[1]) return fullMatch[1];

  const uuidMatch = text.match(/\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/i);
  if (uuidMatch?.[0]) return uuidMatch[0];

  return null;
}

function normalizeSearchText(value: unknown) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function scorePropertyMatch(property: Property, hints: string[]) {
  const haystack = normalizeSearchText(
    [
      property.title,
      property.location,
      property.exactAddress,
      property.operation,
      property.price,
      property.currency,
    ].join(" ")
  );

  return hints.reduce((score, hint) => {
    const normalizedHint = normalizeSearchText(hint);
    if (!normalizedHint) return score;
    if (haystack.includes(normalizedHint)) return score + Math.min(12, normalizedHint.length);

    const words = normalizedHint.split(" ").filter((word) => word.length >= 3);
    const wordScore = words.filter((word) => haystack.includes(word)).length;
    return score + wordScore;
  }, 0);
}

export async function findPropertyForPortalLead(params: {
  agencySlug: string;
  propertyId?: string | null;
  propertyUrl?: string | null;
  propertyTitle?: string | null;
  propertyAddress?: string | null;
  message?: string | null;
}) {
  const properties = await listProperties({
    tenantSlug: params.agencySlug,
    marketplaceOnly: false,
  });

  const hintedId =
    params.propertyId ??
    extractPropertyIdFromText(params.propertyUrl) ??
    extractPropertyIdFromText(params.message);

  if (hintedId) {
    const direct = properties.find((property) => property.id === hintedId);
    if (direct) return direct;
  }

  const shortCodeFromUrl = String(params.propertyUrl ?? "").match(/\/p\/[a-z0-9-]+\/([a-z0-9]{8})/i)?.[1];
  if (shortCodeFromUrl) {
    const direct = properties.find((property) =>
      property.id.replace(/-/g, "").startsWith(shortCodeFromUrl.toLowerCase())
    );
    if (direct) return direct;
  }

  const hints = [
    params.propertyTitle,
    params.propertyAddress,
    params.propertyUrl,
    params.message,
  ].filter((value): value is string => Boolean(String(value ?? "").trim()));

  if (hints.length === 0) {
    return null;
  }

  const [best] = properties
    .map((property) => ({ property, score: scorePropertyMatch(property, hints) }))
    .filter((item) => item.score >= 4)
    .sort((left, right) => right.score - left.score);

  return best?.property ?? null;
}
