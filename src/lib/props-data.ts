import type { Agency, Property } from "@/lib/mock-data";
import { createAdminClient } from "@/lib/supabase/admin";

type AgencyRow = {
  id: string;
  auth_user_id: string | null;
  name: string;
  slug: string;
  email: string;
  phone: string;
  owner_name: string;
  owner_email: string;
  plan: Agency["plan"];
  status: Agency["status"];
  city: string;
  tagline: string;
  created_at: string;
  updated_at: string;
};

type PropertyRow = {
  id: string;
  agency_id: string;
  title: string;
  price: number;
  location: string;
  status: Property["status"];
  operation: Property["operation"];
  description: string;
  image: string;
  images: string[] | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  agencies: Pick<AgencyRow, "slug" | "name"> | null;
};

export type AgencySummary = Agency & {
  authUserId: string | null;
  propertyCount: number;
};

function mapAgency(row: AgencyRow): Agency {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    email: row.email,
    phone: row.phone,
    ownerName: row.owner_name,
    ownerEmail: row.owner_email,
    plan: row.plan,
    status: row.status,
    city: row.city,
    tagline: row.tagline,
  };
}

function mapProperty(row: PropertyRow): Property {
  return {
    id: row.id,
    tenantSlug: row.agencies?.slug ?? "",
    title: row.title,
    price: Number(row.price),
    location: row.location,
    status: row.status,
    operation: row.operation,
    description: row.description,
    image: row.image,
    images:
      row.images && row.images.length > 0
        ? row.images
        : [row.image, row.image, row.image],
  };
}

export async function listAgencies() {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("agencies")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return ((data ?? []) as AgencyRow[]).map(mapAgency);
}

export async function listAgencySummaries() {
  const admin = createAdminClient();
  const [agenciesResult, propertiesResult] = await Promise.all([
    admin.from("agencies").select("*").order("created_at", { ascending: false }),
    admin
      .from("properties")
      .select("id, agency_id")
      .order("created_at", { ascending: false }),
  ]);

  if (agenciesResult.error) {
    throw agenciesResult.error;
  }

  if (propertiesResult.error) {
    throw propertiesResult.error;
  }

  const propertyCountByAgency = new Map<string, number>();

  for (const property of propertiesResult.data ?? []) {
    propertyCountByAgency.set(
      property.agency_id,
      (propertyCountByAgency.get(property.agency_id) ?? 0) + 1
    );
  }

  return ((agenciesResult.data ?? []) as AgencyRow[]).map((row) => ({
    ...mapAgency(row),
    authUserId: row.auth_user_id,
    propertyCount: propertyCountByAgency.get(row.id) ?? 0,
  }));
}

export async function listProperties(options?: { tenantSlug?: string }) {
  const admin = createAdminClient();
  let query = admin
    .from("properties")
    .select(
      "id, agency_id, title, price, location, status, operation, description, image, images, created_by, created_at, updated_at, agencies!inner(slug, name)"
    )
    .order("created_at", { ascending: false });

  if (options?.tenantSlug) {
    query = query.eq("agencies.slug", options.tenantSlug);
  }

  const { data, error } = await query;

  if (error) {
    throw error;
  }

  return ((data ?? []) as unknown as PropertyRow[]).map(mapProperty);
}

export async function getAgencyBySlug(slug: string) {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("agencies")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data ? mapAgency(data as AgencyRow) : null;
}

export async function getPropertyBySlugAndId(slug: string, propertyId: string) {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("properties")
    .select(
      "id, agency_id, title, price, location, status, operation, description, image, images, created_by, created_at, updated_at, agencies!inner(slug, name)"
    )
    .eq("id", propertyId)
    .eq("agencies.slug", slug)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data ? mapProperty(data as unknown as PropertyRow) : null;
}
