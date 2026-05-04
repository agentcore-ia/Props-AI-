import "server-only";

import type { CurrentUserContext } from "@/lib/auth/current-user";
import { createAdminClient } from "@/lib/supabase/admin";

export type ManagedAgency = {
  id: string;
  slug: string;
  name: string;
  email: string;
  phone: string;
  city: string;
  tagline: string;
  owner_name: string;
  owner_email: string;
  messaging_instance: string;
};

function normalizeInstanceSegment(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function buildSuggestedMessagingInstance(slug: string) {
  const normalized = normalizeInstanceSegment(slug);
  return normalized ? `props-${normalized}` : "props-instance";
}

export function getEffectiveMessagingInstance(agency: Pick<ManagedAgency, "slug" | "messaging_instance">) {
  const current = String(agency.messaging_instance ?? "").trim();

  if (!current || current === "agentcore") {
    return buildSuggestedMessagingInstance(agency.slug);
  }

  return normalizeInstanceSegment(current);
}

export async function listManagedAgencies(current: CurrentUserContext) {
  const admin = createAdminClient();
  let query = admin
    .from("agencies")
    .select("id, slug, name, email, phone, city, tagline, owner_name, owner_email, messaging_instance")
    .order("name", { ascending: true });

  if (current.profile.role === "agency_admin") {
    query = query.eq("slug", current.profile.agency_slug ?? "");
  }

  const { data, error } = await query;

  if (error) {
    throw error;
  }

  return (data ?? []) as ManagedAgency[];
}

export async function getManagedAgency(
  current: CurrentUserContext,
  requestedSlug?: string | null
) {
  const agencies = await listManagedAgencies(current);

  if (agencies.length === 0) {
    return null;
  }

  if (current.profile.role === "agency_admin") {
    return agencies[0] ?? null;
  }

  if (requestedSlug) {
    return agencies.find((agency) => agency.slug === requestedSlug) ?? null;
  }

  return agencies[0] ?? null;
}

export async function persistMessagingInstance(
  agencyId: string,
  nextInstance: string
) {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("agencies")
    .update({ messaging_instance: nextInstance })
    .eq("id", agencyId)
    .select("id, slug, name, email, phone, city, tagline, owner_name, owner_email, messaging_instance")
    .single();

  if (error) {
    throw error;
  }

  return data as ManagedAgency;
}

export async function ensureAgencyMessagingInstance(current: CurrentUserContext, agency: ManagedAgency) {
  const effective = getEffectiveMessagingInstance(agency);

  if (effective === agency.messaging_instance) {
    return agency;
  }

  return persistMessagingInstance(agency.id, effective);
}
