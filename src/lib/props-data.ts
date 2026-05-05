import type { Agency, Metric, Property } from "@/lib/mock-data";
import type { PropertyCurrency, PropertyType } from "@/lib/mock-data";
import type {
  CrmLeadSummary,
  EmployeeTaskSummary,
  TodayWorkspaceSnapshot,
  VisitAppointmentSummary,
} from "@/lib/crm-types";
import type {
  RentalAdjustmentSummary,
  RentalContractSummary,
  RentalDashboardSummary,
} from "@/lib/rental-types";
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
  messaging_instance: string;
  created_at: string;
  updated_at: string;
};

type PropertyRow = {
  id: string;
  agency_id: string;
  title: string;
  price: number;
  currency: PropertyCurrency;
  location: string;
  exact_address: string;
  status: Property["status"];
  operation: Property["operation"];
  description: string;
  image: string;
  images: string[] | null;
  property_type: PropertyType;
  bedrooms: number | null;
  bathrooms: number | null;
  area: number | null;
  parking_spots: number | null;
  furnished: boolean | null;
  expenses: number | null;
  expenses_currency: PropertyCurrency | null;
  available_from: string | null;
  pets_policy: string | null;
  requirements: string | null;
  amenities: string[] | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  agencies: Pick<AgencyRow, "slug" | "name"> | null;
};

type RentalContractRow = {
  id: string;
  property_id: string;
  agency_id: string;
  tenant_name: string;
  tenant_phone: string;
  tenant_email: string | null;
  current_rent: number;
  currency: "ARS";
  index_type: "IPC" | "ICL";
  adjustment_frequency_months: number;
  contract_start_date: string;
  rent_reference_date: string;
  next_adjustment_date: string;
  last_adjustment_date: string | null;
  auto_notify: boolean;
  notification_channel: "whatsapp";
  status: "Activo" | "Pausado" | "Finalizado";
  notes: string;
  contract_file_name: string | null;
  contract_file_path: string | null;
  contract_file_mime_type: string | null;
  contract_file_size_bytes: number | null;
  contract_text: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

type RentalAdjustmentRow = {
  id: string;
  contract_id: string;
  property_id: string;
  agency_id: string;
  index_type: "IPC" | "ICL";
  applied_on: string;
  reference_start_date: string;
  reference_end_date: string;
  factor: number;
  previous_rent: number;
  new_rent: number;
  source_label: string;
  notification_status: "Pendiente" | "Enviado" | "Fallido";
  notified_at: string | null;
  created_at: string;
};

export type AgencySummary = Agency & {
  authUserId: string | null;
  propertyCount: number;
};

export type LeaseRosterItem = {
  contractId: string;
  propertyId: string;
  agencyId: string;
  agencyName: string;
  agencySlug: string;
  propertyTitle: string;
  propertyLocation: string;
  exactAddress: string;
  tenantName: string;
  tenantPhone: string;
  tenantEmail: string | null;
  currentRent: number;
  currency: "ARS";
  indexType: "IPC" | "ICL";
  adjustmentFrequencyMonths: number;
  contractStartDate: string;
  nextAdjustmentDate: string;
  lastAdjustmentDate: string | null;
  status: "Activo" | "Pausado" | "Finalizado";
  autoNotify: boolean;
  requirements: string;
};

export type DashboardSnapshot = {
  metrics: Metric[];
  recentActivity: string[];
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

type CrmLeadRow = {
  id: string;
  agency_id: string;
  property_id: string | null;
  conversation_id: string | null;
  inquiry_id: string | null;
  customer_id: string | null;
  full_name: string;
  email: string | null;
  phone: string | null;
  source: string;
  stage: "Nuevo" | "Precalificado" | "Visita" | "Seguimiento" | "Propuesta" | "Cerrado" | "Descartado";
  priority: "Alta" | "Media" | "Baja";
  score: number;
  qualification_summary: string;
  ai_reply_draft: string;
  intent: string | null;
  desired_operation: string | null;
  desired_location: string | null;
  desired_timeline: string | null;
  budget: string | null;
  requirements_summary: string | null;
  last_customer_message: string;
  needs_response: boolean;
  next_follow_up_at: string | null;
  last_contacted_at: string | null;
  last_activity_at: string;
  owner_user_id: string | null;
  created_at: string;
  updated_at: string;
  agencies:
    | Pick<AgencyRow, "slug" | "name">
    | Pick<AgencyRow, "slug" | "name">[]
    | null;
  properties:
    | Pick<PropertyRow, "id" | "title" | "location" | "price" | "currency" | "operation" | "status">
    | Pick<PropertyRow, "id" | "title" | "location" | "price" | "currency" | "operation" | "status">[]
    | null;
};

type VisitAppointmentRow = {
  id: string;
  lead_id: string;
  agency_id: string;
  property_id: string | null;
  scheduled_for: string;
  status: "Programada" | "Confirmada" | "Realizada" | "Reprogramar" | "Cancelada";
  notes: string;
  reminder_sent_at: string | null;
  created_at: string;
  updated_at: string;
  crm_leads:
    | { full_name: string; phone: string | null }
    | { full_name: string; phone: string | null }[]
    | null;
  properties:
    | { title: string; location: string }
    | { title: string; location: string }[]
    | null;
};

type EmployeeTaskRow = {
  id: string;
  agency_id: string;
  lead_id: string | null;
  property_id: string | null;
  visit_id: string | null;
  title: string;
  details: string;
  due_at: string;
  task_type: "Responder" | "Seguimiento" | "Visita" | "Contrato" | "General";
  priority: "Alta" | "Media" | "Baja";
  status: "Pendiente" | "Hecha";
  automation_source: string | null;
  assigned_user_id: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
};

const PROPERTY_SELECT = `
  id,
  agency_id,
  title,
  price,
  currency,
  location,
  exact_address,
  status,
  operation,
  description,
  image,
  images,
  property_type,
  bedrooms,
  bathrooms,
  area,
  parking_spots,
  furnished,
  expenses,
  expenses_currency,
  available_from,
  pets_policy,
  requirements,
  amenities,
  created_by,
  created_at,
  updated_at,
  agencies!inner(slug, name)
`;

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

function mapCrmLead(row: CrmLeadRow): CrmLeadSummary {
  const agency = Array.isArray(row.agencies) ? row.agencies[0] : row.agencies;
  const property = Array.isArray(row.properties) ? row.properties[0] : row.properties;

  return {
    id: row.id,
    agencyId: row.agency_id,
    agencySlug: agency?.slug ?? "",
    agencyName: agency?.name ?? "",
    propertyId: row.property_id,
    propertyTitle: property?.title ?? null,
    propertyLocation: property?.location ?? null,
    propertyPrice: property?.price ? Number(property.price) : null,
    propertyCurrency: property?.currency ?? null,
    propertyOperation: property?.operation ?? null,
    propertyStatus: property?.status ?? null,
    customerId: row.customer_id,
    conversationId: row.conversation_id,
    inquiryId: row.inquiry_id,
    fullName: row.full_name,
    email: row.email,
    phone: row.phone,
    source: row.source,
    stage: row.stage,
    priority: row.priority,
    score: Number(row.score ?? 0),
    qualificationSummary: row.qualification_summary,
    aiReplyDraft: row.ai_reply_draft,
    intent: row.intent,
    desiredOperation: row.desired_operation,
    desiredLocation: row.desired_location,
    desiredTimeline: row.desired_timeline,
    budget: row.budget,
    requirementsSummary: row.requirements_summary,
    lastCustomerMessage: row.last_customer_message,
    needsResponse: row.needs_response,
    nextFollowUpAt: row.next_follow_up_at,
    lastContactedAt: row.last_contacted_at,
    lastActivityAt: row.last_activity_at,
    ownerUserId: row.owner_user_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapVisitAppointment(row: VisitAppointmentRow): VisitAppointmentSummary {
  const lead = Array.isArray(row.crm_leads) ? row.crm_leads[0] : row.crm_leads;
  const property = Array.isArray(row.properties) ? row.properties[0] : row.properties;

  return {
    id: row.id,
    leadId: row.lead_id,
    agencyId: row.agency_id,
    propertyId: row.property_id,
    leadName: lead?.full_name ?? "",
    leadPhone: lead?.phone ?? null,
    propertyTitle: property?.title ?? null,
    propertyLocation: property?.location ?? null,
    scheduledFor: row.scheduled_for,
    status: row.status,
    notes: row.notes,
    reminderSentAt: row.reminder_sent_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapEmployeeTask(row: EmployeeTaskRow): EmployeeTaskSummary {
  return {
    id: row.id,
    agencyId: row.agency_id,
    leadId: row.lead_id,
    propertyId: row.property_id,
    visitId: row.visit_id,
    title: row.title,
    details: row.details,
    dueAt: row.due_at,
    taskType: row.task_type,
    priority: row.priority,
    status: row.status,
    automationSource: row.automation_source,
    assignedUserId: row.assigned_user_id,
    completedAt: row.completed_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

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
    messagingInstance: row.messaging_instance,
  };
}

function mapRentalContract(row: RentalContractRow, agencyMessagingInstance = "agentcore"): RentalContractSummary {
  return {
    id: row.id,
    propertyId: row.property_id,
    agencyId: row.agency_id,
    tenantName: row.tenant_name,
    tenantPhone: row.tenant_phone,
    tenantEmail: row.tenant_email,
    currentRent: Number(row.current_rent),
    currency: row.currency,
    indexType: row.index_type,
    adjustmentFrequencyMonths: row.adjustment_frequency_months,
    contractStartDate: row.contract_start_date,
    rentReferenceDate: row.rent_reference_date,
    nextAdjustmentDate: row.next_adjustment_date,
    lastAdjustmentDate: row.last_adjustment_date,
    autoNotify: row.auto_notify,
    notificationChannel: row.notification_channel,
    status: row.status,
    notes: row.notes,
    agencyMessagingInstance,
    contractFileName: row.contract_file_name,
    contractFilePath: row.contract_file_path,
    contractFileMimeType: row.contract_file_mime_type,
    contractFileSizeBytes: row.contract_file_size_bytes,
    contractText: row.contract_text ?? "",
  };
}

function mapRentalAdjustment(row: RentalAdjustmentRow): RentalAdjustmentSummary {
  return {
    id: row.id,
    contractId: row.contract_id,
    propertyId: row.property_id,
    agencyId: row.agency_id,
    indexType: row.index_type,
    appliedOn: row.applied_on,
    referenceStartDate: row.reference_start_date,
    referenceEndDate: row.reference_end_date,
    factor: Number(row.factor),
    previousRent: Number(row.previous_rent),
    newRent: Number(row.new_rent),
    sourceLabel: row.source_label,
    notificationStatus: row.notification_status,
    notifiedAt: row.notified_at,
    createdAt: row.created_at,
  };
}

function mapProperty(
  row: PropertyRow,
  rentalContract: RentalContractSummary | null = null
): Property {
  return {
    id: row.id,
    tenantSlug: row.agencies?.slug ?? "",
    title: row.title,
    price: Number(row.price),
    currency: row.currency,
    location: row.location,
    exactAddress: row.exact_address,
    status: row.status,
    operation: row.operation,
    description: row.description,
    image: row.image,
    images:
      row.images && row.images.length > 0
        ? row.images
        : [row.image, row.image, row.image],
    propertyType: row.property_type,
    bedrooms: Number(row.bedrooms ?? 0),
    bathrooms: Number(row.bathrooms ?? 0),
    area: Number(row.area ?? 0),
    parkingSpots: Number(row.parking_spots ?? 0),
    furnished: Boolean(row.furnished),
    expenses: row.expenses !== null ? Number(row.expenses) : null,
    expensesCurrency: row.expenses_currency,
    availableFrom: row.available_from,
    petsPolicy: row.pets_policy ?? "",
    requirements: row.requirements ?? "",
    amenities: row.amenities ?? [],
    rentalContract,
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
    .select(PROPERTY_SELECT)
    .order("created_at", { ascending: false });

  if (options?.tenantSlug) {
    query = query.eq("agencies.slug", options.tenantSlug);
  }

  const { data, error } = await query;

  if (error) {
    throw error;
  }

  const rows = (data ?? []) as unknown as PropertyRow[];
  const propertyIds = rows.map((row) => row.id);
  const agencyIds = Array.from(new Set(rows.map((row) => row.agency_id)));

  const [contractsResult, agenciesResult] = await Promise.all([
    propertyIds.length > 0
      ? admin
          .from("rental_contracts")
          .select("*")
          .in("property_id", propertyIds)
          .in("agency_id", agencyIds)
      : Promise.resolve({ data: [], error: null }),
    agencyIds.length > 0
      ? admin.from("agencies").select("id, messaging_instance").in("id", agencyIds)
      : Promise.resolve({ data: [], error: null }),
  ]);

  if (contractsResult.error) {
    throw contractsResult.error;
  }

  if (agenciesResult.error) {
    throw agenciesResult.error;
  }

  const messagingInstanceByAgency = new Map<string, string>(
    ((agenciesResult.data ?? []) as Array<{ id: string; messaging_instance: string }>).map((agency) => [
      agency.id,
      agency.messaging_instance,
    ])
  );

  const rentalByPropertyId = new Map<string, RentalContractSummary>();

  for (const contract of (contractsResult.data ?? []) as RentalContractRow[]) {
    rentalByPropertyId.set(
      contract.property_id,
      mapRentalContract(contract, messagingInstanceByAgency.get(contract.agency_id) ?? "agentcore")
    );
  }

  return rows.map((row) => mapProperty(row, rentalByPropertyId.get(row.id) ?? null));
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
    .select(PROPERTY_SELECT)
    .eq("id", propertyId)
    .eq("agencies.slug", slug)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    return null;
  }

  const [contractResult, agencyResult] = await Promise.all([
    admin.from("rental_contracts").select("*").eq("property_id", propertyId).maybeSingle(),
    admin.from("agencies").select("id, messaging_instance").eq("slug", slug).maybeSingle(),
  ]);

  if (contractResult.error) {
    throw contractResult.error;
  }

  if (agencyResult.error) {
    throw agencyResult.error;
  }

  return mapProperty(
    data as unknown as PropertyRow,
    contractResult.data
      ? mapRentalContract(
          contractResult.data as RentalContractRow,
          agencyResult.data?.messaging_instance ?? "agentcore"
        )
      : null
  );
}

export async function listRentalContracts(options?: { agencySlug?: string }) {
  const admin = createAdminClient();
  const agenciesResult = options?.agencySlug
    ? await admin
        .from("agencies")
        .select("id, slug, messaging_instance")
        .eq("slug", options.agencySlug)
    : await admin.from("agencies").select("id, slug, messaging_instance");

  if (agenciesResult.error) {
    throw agenciesResult.error;
  }

  const agencies = agenciesResult.data ?? [];
  const agencyIds = agencies.map((agency) => agency.id);

  if (agencyIds.length === 0) {
    return [];
  }

  const contractsResult = await admin
    .from("rental_contracts")
    .select("*")
    .in("agency_id", agencyIds)
    .order("next_adjustment_date", { ascending: true });

  if (contractsResult.error) {
    throw contractsResult.error;
  }

  const instanceByAgency = new Map(
    agencies.map((agency) => [agency.id, agency.messaging_instance])
  );

  return ((contractsResult.data ?? []) as RentalContractRow[]).map((contract) =>
    mapRentalContract(contract, instanceByAgency.get(contract.agency_id) ?? "agentcore")
  );
}

export async function listLeaseRoster(options?: { agencySlug?: string }) {
  const admin = createAdminClient();
  let query = admin
    .from("rental_contracts")
    .select(
      "id, property_id, agency_id, tenant_name, tenant_phone, tenant_email, current_rent, currency, index_type, adjustment_frequency_months, contract_start_date, next_adjustment_date, last_adjustment_date, auto_notify, status, agencies!inner(name, slug), properties!inner(title, location, exact_address, requirements)"
    )
    .order("next_adjustment_date", { ascending: true });

  if (options?.agencySlug) {
    query = query.eq("agencies.slug", options.agencySlug);
  }

  const { data, error } = await query;

  if (error) {
    throw error;
  }

  return ((data ?? []) as Array<{
    id: string;
    property_id: string;
    agency_id: string;
    tenant_name: string;
    tenant_phone: string;
    tenant_email: string | null;
    current_rent: number;
    currency: "ARS";
    index_type: "IPC" | "ICL";
    adjustment_frequency_months: number;
    contract_start_date: string;
    next_adjustment_date: string;
    last_adjustment_date: string | null;
    auto_notify: boolean;
    status: "Activo" | "Pausado" | "Finalizado";
    agencies: { name: string; slug: string } | { name: string; slug: string }[] | null;
    properties:
      | { title: string; location: string; exact_address: string; requirements: string | null }
      | { title: string; location: string; exact_address: string; requirements: string | null }[]
      | null;
  }>).map((item) => {
    const agency = Array.isArray(item.agencies) ? item.agencies[0] : item.agencies;
    const property = Array.isArray(item.properties) ? item.properties[0] : item.properties;

    return {
      contractId: item.id,
      propertyId: item.property_id,
      agencyId: item.agency_id,
      agencyName: agency?.name ?? "",
      agencySlug: agency?.slug ?? "",
      propertyTitle: property?.title ?? "",
      propertyLocation: property?.location ?? "",
      exactAddress: property?.exact_address ?? "",
      tenantName: item.tenant_name,
      tenantPhone: item.tenant_phone,
      tenantEmail: item.tenant_email,
      currentRent: Number(item.current_rent),
      currency: item.currency,
      indexType: item.index_type,
      adjustmentFrequencyMonths: item.adjustment_frequency_months,
      contractStartDate: item.contract_start_date,
      nextAdjustmentDate: item.next_adjustment_date,
      lastAdjustmentDate: item.last_adjustment_date,
      status: item.status,
      autoNotify: item.auto_notify,
      requirements: property?.requirements ?? "",
    } satisfies LeaseRosterItem;
  });
}

export async function listRecentRentalAdjustments(options?: { agencySlug?: string; limit?: number }) {
  const admin = createAdminClient();
  let agencyIds: string[] | null = null;

  if (options?.agencySlug) {
    const agencyResult = await admin
      .from("agencies")
      .select("id")
      .eq("slug", options.agencySlug);

    if (agencyResult.error) {
      throw agencyResult.error;
    }

    agencyIds = (agencyResult.data ?? []).map((agency) => agency.id);

    if (agencyIds.length === 0) {
      return [];
    }
  }

  let query = admin
    .from("rental_adjustments")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(options?.limit ?? 12);

  if (agencyIds) {
    query = query.in("agency_id", agencyIds);
  }

  const { data, error } = await query;

  if (error) {
    throw error;
  }

  return ((data ?? []) as RentalAdjustmentRow[]).map(mapRentalAdjustment);
}

export async function getRentalDashboardSummary(options?: { agencySlug?: string }): Promise<RentalDashboardSummary> {
  const contracts = await listRentalContracts(options);
  const adjustments = await listRecentRentalAdjustments({ agencySlug: options?.agencySlug, limit: 50 });

  const today = new Date().toISOString().slice(0, 10);
  const inSevenDays = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  return {
    totalActiveContracts: contracts.filter((contract) => contract.status === "Activo").length,
    dueToday: contracts.filter(
      (contract) => contract.status === "Activo" && contract.nextAdjustmentDate <= today
    ).length,
    dueThisWeek: contracts.filter(
      (contract) =>
        contract.status === "Activo" &&
        contract.nextAdjustmentDate > today &&
        contract.nextAdjustmentDate <= inSevenDays
    ).length,
    failedNotifications: adjustments.filter(
      (adjustment) => adjustment.notificationStatus === "Fallido"
    ).length,
  };
}

export async function getDashboardSnapshot(options?: { agencySlug?: string }): Promise<DashboardSnapshot> {
  const admin = createAdminClient();
  let recentPropertiesQuery = admin
    .from("properties")
    .select("id, title, location, created_at, agencies!inner(slug)")
    .order("created_at", { ascending: false })
    .limit(6);

  if (options?.agencySlug) {
    recentPropertiesQuery = recentPropertiesQuery.eq("agencies.slug", options.agencySlug);
  }

  const [properties, contracts, rentalSummary, recentAdjustments, recentPropertiesResult] = await Promise.all([
    listProperties(options?.agencySlug ? { tenantSlug: options.agencySlug } : undefined),
    listRentalContracts(options),
    getRentalDashboardSummary(options),
    listRecentRentalAdjustments({ agencySlug: options?.agencySlug, limit: 4 }),
    recentPropertiesQuery,
  ]);

  if (recentPropertiesResult.error) {
    throw recentPropertiesResult.error;
  }

  const recentPropertyRows = (recentPropertiesResult.data ?? []) as Array<{
    id: string;
    title: string;
    location: string;
    created_at: string;
  }>;

  let agencyIds: string[] | null = null;

  if (options?.agencySlug) {
    const agencyResult = await admin.from("agencies").select("id").eq("slug", options.agencySlug);
    if (agencyResult.error) {
      throw agencyResult.error;
    }
    agencyIds = (agencyResult.data ?? []).map((agency) => agency.id);
  }

  let conversationQuery = admin
    .from("marketplace_conversations")
    .select("id, title, status, created_at, updated_at, property_id, properties(title)")
    .order("updated_at", { ascending: false })
    .limit(6);

  if (agencyIds?.length) {
    conversationQuery = conversationQuery.in("agency_id", agencyIds);
  }

  const { data: conversationRows, error: conversationsError } = await conversationQuery;

  if (conversationsError) {
    throw conversationsError;
  }

  const conversations = (conversationRows ?? []) as Array<{
    id: string;
    title: string;
    status: "Abierta" | "Cerrada";
    created_at: string;
    updated_at: string;
    property_id: string | null;
    properties: { title: string } | { title: string }[] | null;
  }>;

  const activeProperties = properties.filter((property) =>
    property.status === "Disponible" || property.status === "Reservada"
  ).length;
  const openConversations = conversations.filter((conversation) => conversation.status === "Abierta").length;
  const recentPropertyCount = recentPropertyRows.filter((property) => {
    const createdAt = new Date(property.created_at).getTime();
    return createdAt >= Date.now() - 7 * 24 * 60 * 60 * 1000;
  }).length;
  const pausedContracts = contracts.filter((contract) => contract.status === "Pausado").length;

  const activityItems = [
    ...recentPropertyRows.slice(0, 3).map((property) => ({
      at: property.created_at,
      text: `Se cargó la propiedad ${property.title} en ${property.location}.`,
    })),
    ...conversations.map((conversation) => {
      const property = Array.isArray(conversation.properties)
        ? conversation.properties[0]
        : conversation.properties;
      return {
        at: conversation.updated_at,
        text: property?.title
          ? `Nueva conversación en ${property.title}.`
          : `Nueva conversación recibida en la bandeja comercial.`,
      };
    }),
    ...recentAdjustments.map((adjustment) => ({
      at: adjustment.createdAt,
      text: `Se registró un ajuste ${adjustment.indexType}: ${adjustment.previousRent} → ${adjustment.newRent}.`,
    })),
  ]
    .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
    .slice(0, 5)
    .map((item) => item.text);

  return {
    metrics: [
      {
        label: "Propiedades activas",
        value: String(activeProperties),
        delta: recentPropertyCount > 0 ? `${recentPropertyCount} nuevas` : undefined,
        hint: "publicadas y disponibles para operar",
      },
      {
        label: "Consultas abiertas",
        value: String(openConversations),
        delta: openConversations > 0 ? "requieren seguimiento" : undefined,
        hint: "conversaciones activas del portal",
      },
      {
        label: "Alquileres activos",
        value: String(rentalSummary.totalActiveContracts),
        delta: rentalSummary.dueThisWeek > 0 ? `${rentalSummary.dueThisWeek} por ajustar` : undefined,
        hint: "contratos vigentes en seguimiento",
      },
      {
        label: "Contratos en revisión",
        value: String(pausedContracts),
        delta: pausedContracts > 0 ? "revisar datos" : undefined,
        hint: "pendientes de validación antes de automatizar",
      },
    ],
    recentActivity:
      activityItems.length > 0
        ? activityItems
        : ["Todavía no hay movimientos recientes para esta cuenta."],
  };
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

export async function listCrmLeads(options?: { agencySlug?: string }) {
  const admin = createAdminClient();
  let query = admin
    .from("crm_leads")
    .select(
      "*, agencies!inner(slug, name), properties(id, title, location, price, currency, operation, status)"
    )
    .order("last_activity_at", { ascending: false });

  if (options?.agencySlug) {
    query = query.eq("agencies.slug", options.agencySlug);
  }

  const { data, error } = await query;
  if (error) throw error;
  return ((data ?? []) as unknown as CrmLeadRow[]).map(mapCrmLead);
}

export async function getCrmLeadById(leadId: string) {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("crm_leads")
    .select(
      "*, agencies!inner(slug, name), properties(id, title, location, price, currency, operation, status)"
    )
    .eq("id", leadId)
    .maybeSingle();

  if (error) throw error;
  return data ? mapCrmLead(data as unknown as CrmLeadRow) : null;
}

export async function listVisitAppointments(options?: { agencySlug?: string }) {
  const admin = createAdminClient();
  let query = admin
    .from("visit_appointments")
    .select(
      "id, lead_id, agency_id, property_id, scheduled_for, status, notes, reminder_sent_at, created_at, updated_at, crm_leads!inner(full_name, phone), properties(title, location), agencies!inner(slug)"
    )
    .order("scheduled_for", { ascending: true });

  if (options?.agencySlug) {
    query = query.eq("agencies.slug", options.agencySlug);
  }

  const { data, error } = await query;
  if (error) throw error;
  return ((data ?? []) as unknown as VisitAppointmentRow[]).map(mapVisitAppointment);
}

export async function listEmployeeTasks(options?: { agencySlug?: string; includeDone?: boolean }) {
  const admin = createAdminClient();
  let query = admin
    .from("employee_tasks")
    .select("*, agencies!inner(slug)")
    .order("due_at", { ascending: true });

  if (options?.agencySlug) {
    query = query.eq("agencies.slug", options.agencySlug);
  }

  if (!options?.includeDone) {
    query = query.eq("status", "Pendiente");
  }

  const { data, error } = await query;
  if (error) throw error;
  return ((data ?? []) as unknown as EmployeeTaskRow[]).map(mapEmployeeTask);
}

export async function getTodayWorkspaceSnapshot(options?: { agencySlug?: string }): Promise<TodayWorkspaceSnapshot> {
  const [leads, visits, tasks] = await Promise.all([
    listCrmLeads(options),
    listVisitAppointments(options),
    listEmployeeTasks(options),
  ]);

  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(startOfDay);
  endOfDay.setDate(endOfDay.getDate() + 1);

  const visitsToday = visits.filter((visit) => {
    const at = new Date(visit.scheduledFor).getTime();
    return at >= startOfDay.getTime() && at < endOfDay.getTime();
  });

  const dueNow = tasks.filter((task) => new Date(task.dueAt).getTime() <= Date.now());
  const leadsToAnswer = leads.filter((lead) => lead.needsResponse).slice(0, 8);
  const automaticFollowUps = leads.filter(
    (lead) =>
      Boolean(lead.nextFollowUpAt) &&
      new Date(lead.nextFollowUpAt!).getTime() <= Date.now() + 24 * 60 * 60 * 1000
  ).length;

  return {
    myDay: {
      dueNow,
      visitsToday,
      leadsToAnswer,
    },
    counters: {
      pendingTasks: tasks.length,
      visitsToday: visitsToday.length,
      urgentLeads: leads.filter((lead) => lead.priority === "Alta" || lead.needsResponse).length,
      automaticFollowUps,
    },
  };
}
