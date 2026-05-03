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

type MarketplaceConversationRow = {
  id: string;
  customer_id: string;
  agency_id: string;
  property_id: string | null;
  title: string;
  status: "Abierta" | "Cerrada";
  created_at: string;
  updated_at: string;
  agencies: Pick<AgencyRow, "name" | "slug" | "city"> | null;
  properties:
    | Pick<PropertyRow, "id" | "title" | "location" | "image" | "operation" | "status">
    | null;
};

type MarketplaceMessageRow = {
  id: string;
  conversation_id: string;
  sender_role: "customer" | "assistant";
  content: string;
  metadata: Record<string, unknown>;
  created_at: string;
};

export type MarketplaceConversationSummary = {
  id: string;
  title: string;
  status: "Abierta" | "Cerrada";
  createdAt: string;
  updatedAt: string;
  agency: {
    name: string;
    slug: string;
    city: string;
  } | null;
  property: {
    id: string;
    title: string;
    location: string;
    image: string;
    operation: Property["operation"];
    status: Property["status"];
  } | null;
  lastMessage: {
    senderRole: "customer" | "assistant";
    content: string;
    createdAt: string;
  } | null;
};

export type MarketplaceThreadMessage = {
  id: string;
  senderRole: "customer" | "assistant";
  content: string;
  createdAt: string;
  metadata: Record<string, unknown>;
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

export async function listMarketplaceConversationSummaries(customerId: string) {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("marketplace_conversations")
    .select(
      "id, customer_id, agency_id, property_id, title, status, created_at, updated_at, agencies(name, slug, city), properties(id, title, location, image, operation, status)"
    )
    .eq("customer_id", customerId)
    .order("updated_at", { ascending: false });

  if (error) {
    throw error;
  }

  const conversations = (data ?? []) as unknown as MarketplaceConversationRow[];

  const conversationIds = conversations.map((conversation) => conversation.id);
  const lastMessageByConversation = new Map<string, MarketplaceConversationSummary["lastMessage"]>();

  if (conversationIds.length > 0) {
    const { data: messages, error: messagesError } = await admin
      .from("marketplace_messages")
      .select("id, conversation_id, sender_role, content, metadata, created_at")
      .in("conversation_id", conversationIds)
      .order("created_at", { ascending: false });

    if (messagesError) {
      throw messagesError;
    }

    for (const message of (messages ?? []) as MarketplaceMessageRow[]) {
      if (!lastMessageByConversation.has(message.conversation_id)) {
        lastMessageByConversation.set(message.conversation_id, {
          senderRole: message.sender_role,
          content: message.content,
          createdAt: message.created_at,
        });
      }
    }
  }

  return conversations.map((conversation) => ({
    id: conversation.id,
    title: conversation.title,
    status: conversation.status,
    createdAt: conversation.created_at,
    updatedAt: conversation.updated_at,
    agency: conversation.agencies
      ? {
          name: conversation.agencies.name,
          slug: conversation.agencies.slug,
          city: conversation.agencies.city,
        }
      : null,
    property: conversation.properties
      ? {
          id: conversation.properties.id,
          title: conversation.properties.title,
          location: conversation.properties.location,
          image: conversation.properties.image,
          operation: conversation.properties.operation,
          status: conversation.properties.status,
        }
      : null,
    lastMessage: lastMessageByConversation.get(conversation.id) ?? null,
  }));
}

export async function getMarketplaceConversationThread(
  customerId: string,
  conversationId: string
) {
  const admin = createAdminClient();
  const { data: conversation, error: conversationError } = await admin
    .from("marketplace_conversations")
    .select(
      "id, customer_id, agency_id, property_id, title, status, created_at, updated_at, agencies(name, slug, city), properties(id, title, location, image, operation, status)"
    )
    .eq("id", conversationId)
    .eq("customer_id", customerId)
    .maybeSingle();

  if (conversationError) {
    throw conversationError;
  }

  if (!conversation) {
    return null;
  }

  const { data: messages, error: messagesError } = await admin
    .from("marketplace_messages")
    .select("id, conversation_id, sender_role, content, metadata, created_at")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true });

  if (messagesError) {
    throw messagesError;
  }

  const summary = (await listMarketplaceConversationSummaries(customerId)).find(
    (item) => item.id === conversationId
  );

  return {
    conversation: summary ?? null,
    messages: ((messages ?? []) as MarketplaceMessageRow[]).map((message) => ({
      id: message.id,
      senderRole: message.sender_role,
      content: message.content,
      createdAt: message.created_at,
      metadata: message.metadata ?? {},
    })),
  };
}
