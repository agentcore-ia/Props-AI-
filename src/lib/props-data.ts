import type { Agency, Metric, Property } from "@/lib/mock-data";
import type { PropertyCurrency, PropertyType } from "@/lib/mock-data";
import type {
  AgencyMessageTemplateSummary,
  CrmLeadMessageSummary,
  CrmLeadSummary,
  EmployeeTaskSummary,
  TodayWorkspaceSnapshot,
  VisitAppointmentSummary,
} from "@/lib/crm-types";
import { getDefaultAgencyTemplates } from "@/lib/crm-insights";
import type {
  CashMovementSummary,
  ContractRescissionSummary,
  DelinquentTenantSummary,
  OwnerTransferSummary,
  RentalCollectionSummary,
  SupplierInvoiceSummary,
  SupplierSummary,
  TenantRosterSummary,
  OwnerRosterSummary,
} from "@/lib/operations-types";
import type {
  ContractOwnerSummary,
  OwnerSettlementSummary,
  OwnerSettlementItemSummary,
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
  website_url?: string | null;
  instagram_url?: string | null;
  facebook_url?: string | null;
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

const PROPERTY_IMAGE_BUCKET = "property-images";
const FALLBACK_PROPERTY_IMAGE =
  "https://images.unsplash.com/photo-1494526585095-c41746248156?auto=format&fit=crop&w=1200&q=80";

function normalizePropertyImageUrl(value: string | null | undefined) {
  const rawValue = String(value ?? "").trim();

  if (!rawValue) {
    return FALLBACK_PROPERTY_IMAGE;
  }

  if (/^https?:\/\//i.test(rawValue) || rawValue.startsWith("/")) {
    return rawValue;
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!supabaseUrl) {
    return rawValue;
  }

  const cleanPath = rawValue
    .replace(/^\/+/, "")
    .replace(new RegExp(`^${PROPERTY_IMAGE_BUCKET}/`), "");

  return `${supabaseUrl.replace(/\/+$/, "")}/storage/v1/object/public/${PROPERTY_IMAGE_BUCKET}/${encodeURI(cleanPath)}`;
}

function normalizePropertyImages(image: string, images: string[] | null) {
  const normalizedImages = (images && images.length > 0 ? images : [image])
    .map((item) => normalizePropertyImageUrl(item))
    .filter(Boolean);

  if (normalizedImages.length === 0) {
    return [FALLBACK_PROPERTY_IMAGE];
  }

  return normalizedImages;
}

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
  late_fee_daily_amount: number | null;
  late_fee_grace_days: number | null;
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
  owner_name: string | null;
  owner_phone: string | null;
  owner_email: string | null;
  management_fee_percent: number | null;
  monthly_owner_costs: number | null;
  owner_notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

type ContractOwnerRow = {
  id: string;
  contract_id: string;
  property_id: string;
  agency_id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  participation_percent: number;
  bank_alias: string | null;
  bank_account: string | null;
  notes: string | null;
  display_order: number;
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

type OwnerSettlementRow = {
  id: string;
  contract_id: string;
  contract_owner_id: string | null;
  property_id: string;
  agency_id: string;
  settlement_month: string;
  owner_name: string;
  owner_email: string | null;
  owner_phone: string | null;
  participation_percent: number | null;
  rent_collected: number;
  management_fee_percent: number;
  management_fee_amount: number;
  monthly_owner_costs: number;
  other_charges_amount: number;
  other_charges_detail: string;
  owner_payout_amount: number;
  status: "Borrador" | "Emitida" | "Pagada";
  sent_at: string | null;
  paid_at: string | null;
  created_at: string;
  properties:
    | { title: string; location: string }
    | { title: string; location: string }[]
    | null;
};

type OwnerSettlementItemRow = {
  id: string;
  settlement_id: string;
  contract_id: string;
  contract_owner_id: string | null;
  agency_id: string;
  label: string;
  amount: number;
  effect: "Suma" | "Descuento" | "Informativo";
  apply_management_fee: boolean;
  notes: string | null;
  created_at: string;
};

type RentalCollectionRow = {
  id: string;
  contract_id: string;
  property_id: string;
  agency_id: string;
  collection_month: string;
  expected_rent: number;
  collected_amount: number;
  payment_method: string;
  payment_date: string | null;
  status: "Pendiente" | "Parcial" | "Cobrada" | "Mora";
  notes: string;
  created_at: string;
  rental_contracts:
    | { tenant_name: string }
    | { tenant_name: string }[]
    | null;
  properties:
    | { title: string; location: string }
    | { title: string; location: string }[]
    | null;
};

type OwnerTransferRow = {
  id: string;
  settlement_id: string | null;
  contract_id: string;
  contract_owner_id: string | null;
  property_id: string;
  agency_id: string;
  owner_name: string;
  amount: number;
  destination_label: string;
  transfer_date: string | null;
  status: "Pendiente" | "Programada" | "Enviada" | "Confirmada";
  notes: string;
  created_at: string;
  properties:
    | { title: string }
    | { title: string }[]
    | null;
};

type CashMovementRow = {
  id: string;
  agency_id: string;
  occurred_on: string;
  kind: "Ingreso" | "Egreso" | "Transferencia";
  category: string;
  amount: number;
  reference: string;
  notes: string;
  created_at: string;
};

type SupplierRow = {
  id: string;
  agency_id: string;
  name: string;
  service_type: string;
  contact_name: string | null;
  phone: string | null;
  email: string | null;
  notes: string;
  status: "Activo" | "Inactivo";
  created_at: string;
};

type SupplierInvoiceRow = {
  id: string;
  agency_id: string;
  supplier_id: string | null;
  invoice_number: string;
  concept: string;
  total_amount: number;
  due_date: string | null;
  status: "Borrador" | "Emitida" | "Pagada" | "Anulada";
  notes: string;
  created_at: string;
  suppliers:
    | { name: string }
    | { name: string }[]
    | null;
};

type ContractRescissionRow = {
  id: string;
  contract_id: string;
  property_id: string;
  agency_id: string;
  requested_on: string;
  effective_date: string | null;
  reason: string;
  settlement_terms: string;
  status: "Borrador" | "En negociacion" | "Aprobada" | "Cerrada";
  created_at: string;
  rental_contracts:
    | { tenant_name: string }
    | { tenant_name: string }[]
    | null;
  properties:
    | { title: string }
    | { title: string }[]
    | null;
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
  lateFeeDailyAmount: number;
  lateFeeGraceDays: number;
  contractStartDate: string;
  nextAdjustmentDate: string;
  lastAdjustmentDate: string | null;
  status: "Activo" | "Pausado" | "Finalizado";
  autoNotify: boolean;
  requirements: string;
  ownerName: string | null;
  ownerPhone: string | null;
  ownerEmail: string | null;
  managementFeePercent: number;
  monthlyOwnerCosts: number;
  ownerNotes: string;
};

export type DashboardSnapshot = {
  metrics: Metric[];
  recentActivity: string[];
};

export type AdminDashboardSnapshot = {
  metrics: Metric[];
  recentActivity: string[];
  agencies: AgencySummary[];
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

type CrmLeadMessageRow = {
  id: string;
  lead_id: string;
  agency_id: string;
  property_id: string | null;
  channel: "whatsapp" | "web" | "instagram" | "crm";
  direction: "incoming" | "outgoing";
  sender_role: "customer" | "assistant" | "agent" | "system";
  content: string;
  wa_message_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
};

type AgencyMessageTemplateRow = {
  id: string;
  agency_id: string;
  template_key: string;
  label: string;
  body: string;
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

function mapCrmLeadMessage(row: CrmLeadMessageRow): CrmLeadMessageSummary {
  return {
    id: row.id,
    leadId: row.lead_id,
    agencyId: row.agency_id,
    propertyId: row.property_id,
    channel: row.channel,
    direction: row.direction,
    senderRole: row.sender_role,
    content: row.content,
    waMessageId: row.wa_message_id,
    metadata: row.metadata ?? {},
    createdAt: row.created_at,
  };
}

function mapAgencyMessageTemplate(row: AgencyMessageTemplateRow): AgencyMessageTemplateSummary {
  return {
    id: row.id,
    agencyId: row.agency_id,
    templateKey: row.template_key as AgencyMessageTemplateSummary["templateKey"],
    label: row.label,
    body: row.body,
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
    websiteUrl: row.website_url ?? null,
    instagramUrl: row.instagram_url ?? null,
    facebookUrl: row.facebook_url ?? null,
  };
}

function mapContractOwner(row: ContractOwnerRow): ContractOwnerSummary {
  return {
    id: row.id,
    contractId: row.contract_id,
    propertyId: row.property_id,
    agencyId: row.agency_id,
    fullName: row.full_name,
    email: row.email,
    phone: row.phone,
    participationPercent: Number(row.participation_percent ?? 0),
    bankAlias: row.bank_alias,
    bankAccount: row.bank_account,
    notes: row.notes ?? "",
    displayOrder: Number(row.display_order ?? 0),
  };
}

function mapRentalContract(
  row: RentalContractRow,
  agencyMessagingInstance = "agentcore",
  owners: ContractOwnerSummary[] = []
): RentalContractSummary {
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
    lateFeeDailyAmount: Number(row.late_fee_daily_amount ?? 0),
    lateFeeGraceDays: Number(row.late_fee_grace_days ?? 10),
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
    ownerName: row.owner_name,
    ownerPhone: row.owner_phone,
    ownerEmail: row.owner_email,
    managementFeePercent: Number(row.management_fee_percent ?? 0),
    monthlyOwnerCosts: Number(row.monthly_owner_costs ?? 0),
    ownerNotes: row.owner_notes ?? "",
    owners,
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

function mapOwnerSettlement(row: OwnerSettlementRow): OwnerSettlementSummary {
  const property = Array.isArray(row.properties) ? row.properties[0] : row.properties;

    return {
      id: row.id,
      contractId: row.contract_id,
      contractOwnerId: row.contract_owner_id,
      propertyId: row.property_id,
      agencyId: row.agency_id,
      ownerName: row.owner_name,
      ownerEmail: row.owner_email,
      ownerPhone: row.owner_phone,
      propertyTitle: property?.title ?? "",
      propertyLocation: property?.location ?? "",
      settlementMonth: row.settlement_month,
      participationPercent: Number(row.participation_percent ?? 100),
      rentCollected: Number(row.rent_collected ?? 0),
    managementFeePercent: Number(row.management_fee_percent ?? 0),
    managementFeeAmount: Number(row.management_fee_amount ?? 0),
    monthlyOwnerCosts: Number(row.monthly_owner_costs ?? 0),
    otherChargesAmount: Number(row.other_charges_amount ?? 0),
    otherChargesDetail: row.other_charges_detail ?? "",
    ownerPayoutAmount: Number(row.owner_payout_amount ?? 0),
    status: row.status,
    sentAt: row.sent_at,
    paidAt: row.paid_at,
    createdAt: row.created_at,
  };
}

function mapOwnerSettlementItem(row: OwnerSettlementItemRow): OwnerSettlementItemSummary {
  return {
    id: row.id,
    settlementId: row.settlement_id,
    contractId: row.contract_id,
    contractOwnerId: row.contract_owner_id,
    label: row.label,
    amount: Number(row.amount ?? 0),
    effect: row.effect,
    applyManagementFee: Boolean(row.apply_management_fee),
    notes: row.notes ?? "",
    createdAt: row.created_at,
  };
}

function mapRentalCollection(row: RentalCollectionRow): RentalCollectionSummary {
  const contract = Array.isArray(row.rental_contracts) ? row.rental_contracts[0] : row.rental_contracts;
  const property = Array.isArray(row.properties) ? row.properties[0] : row.properties;

  return {
    id: row.id,
    contractId: row.contract_id,
    propertyId: row.property_id,
    agencyId: row.agency_id,
    collectionMonth: row.collection_month,
    tenantName: contract?.tenant_name ?? "",
    propertyTitle: property?.title ?? "",
    propertyLocation: property?.location ?? "",
    expectedRent: Number(row.expected_rent ?? 0),
    collectedAmount: Number(row.collected_amount ?? 0),
    paymentMethod: row.payment_method,
    paymentDate: row.payment_date,
    status: row.status,
    notes: row.notes,
    createdAt: row.created_at,
  };
}

function mapOwnerTransfer(row: OwnerTransferRow): OwnerTransferSummary {
  const property = Array.isArray(row.properties) ? row.properties[0] : row.properties;

  return {
    id: row.id,
    settlementId: row.settlement_id,
    contractId: row.contract_id,
    contractOwnerId: row.contract_owner_id,
    propertyId: row.property_id,
    agencyId: row.agency_id,
    ownerName: row.owner_name,
    propertyTitle: property?.title ?? "",
    transferDate: row.transfer_date,
    amount: Number(row.amount ?? 0),
    destinationLabel: row.destination_label,
    status: row.status,
    notes: row.notes,
    createdAt: row.created_at,
  };
}

function mapCashMovement(row: CashMovementRow): CashMovementSummary {
  return {
    id: row.id,
    agencyId: row.agency_id,
    occurredOn: row.occurred_on,
    kind: row.kind,
    category: row.category,
    amount: Number(row.amount ?? 0),
    reference: row.reference,
    notes: row.notes,
    createdAt: row.created_at,
  };
}

function mapSupplier(row: SupplierRow): SupplierSummary {
  return {
    id: row.id,
    agencyId: row.agency_id,
    name: row.name,
    serviceType: row.service_type,
    contactName: row.contact_name,
    phone: row.phone,
    email: row.email,
    notes: row.notes,
    status: row.status,
    createdAt: row.created_at,
  };
}

function mapSupplierInvoice(row: SupplierInvoiceRow): SupplierInvoiceSummary {
  const supplier = Array.isArray(row.suppliers) ? row.suppliers[0] : row.suppliers;

  return {
    id: row.id,
    agencyId: row.agency_id,
    supplierId: row.supplier_id,
    supplierName: supplier?.name ?? "Sin proveedor",
    invoiceNumber: row.invoice_number,
    concept: row.concept,
    totalAmount: Number(row.total_amount ?? 0),
    dueDate: row.due_date,
    status: row.status,
    notes: row.notes,
    createdAt: row.created_at,
  };
}

function mapContractRescission(row: ContractRescissionRow): ContractRescissionSummary {
  const contract = Array.isArray(row.rental_contracts) ? row.rental_contracts[0] : row.rental_contracts;
  const property = Array.isArray(row.properties) ? row.properties[0] : row.properties;

  return {
    id: row.id,
    contractId: row.contract_id,
    propertyId: row.property_id,
    agencyId: row.agency_id,
    tenantName: contract?.tenant_name ?? "",
    propertyTitle: property?.title ?? "",
    requestedOn: row.requested_on,
    effectiveDate: row.effective_date,
    reason: row.reason,
    settlementTerms: row.settlement_terms,
    status: row.status,
    createdAt: row.created_at,
  };
}

async function fetchContractOwnersByContractId(
  admin: ReturnType<typeof createAdminClient>,
  contractIds: string[]
) {
  if (contractIds.length === 0) {
    return new Map<string, ContractOwnerSummary[]>();
  }

  const { data, error } = await admin
    .from("rental_contract_owners")
    .select("*")
    .in("contract_id", contractIds)
    .order("display_order", { ascending: true });

  if (error) {
    if (/rental_contract_owners/i.test(error.message ?? "")) {
      return new Map<string, ContractOwnerSummary[]>();
    }
    throw error;
  }

  const grouped = new Map<string, ContractOwnerSummary[]>();
  for (const row of (data ?? []) as ContractOwnerRow[]) {
    const mapped = mapContractOwner(row);
    const current = grouped.get(mapped.contractId) ?? [];
    current.push(mapped);
    grouped.set(mapped.contractId, current);
  }

  return grouped;
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
    image: normalizePropertyImageUrl(row.image),
    images: normalizePropertyImages(row.image, row.images),
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

export async function listAgencyMessageTemplates(options?: { agencySlug?: string }) {
  const admin = createAdminClient();

  const agencySlug = options?.agencySlug;
  const agencies: Agency[] = agencySlug ? [] : await listAgencies();

  if (agencySlug) {
    const agency = await getAgencyBySlug(agencySlug);
    if (agency) agencies.push(agency);
  }

  if (agencies.length === 0) {
    return [];
  }

  let query = admin
    .from("agency_message_templates")
    .select("*")
    .order("updated_at", { ascending: false });

  if (agencySlug) {
    query = query.in(
      "agency_id",
      agencies.map((agency) => agency!.id)
    );
  }

  const { data, error } = await query;

  if (error) {
    if (/agency_message_templates/i.test(error.message ?? "")) {
      return agencies.flatMap((agency) =>
        getDefaultAgencyTemplates(agency.name).map((template) => ({
          id: `${agency.id}-${template.templateKey}`,
          agencyId: agency.id,
          templateKey: template.templateKey,
          label: template.label,
          body: template.body,
          updatedAt: new Date().toISOString(),
        }))
      );
    }
    throw error;
  }

  const mapped = ((data ?? []) as AgencyMessageTemplateRow[]).map(mapAgencyMessageTemplate);
  const templatesByAgency = new Map<string, AgencyMessageTemplateSummary[]>();

  for (const template of mapped) {
    const current = templatesByAgency.get(template.agencyId) ?? [];
    current.push(template);
    templatesByAgency.set(template.agencyId, current);
  }

  return agencies.flatMap((agency) => {
    const existing = templatesByAgency.get(agency.id) ?? [];
    const existingKeys = new Set(existing.map((template) => template.templateKey));
    const defaults = getDefaultAgencyTemplates(agency.name)
      .filter((template) => !existingKeys.has(template.templateKey))
      .map((template) => ({
        id: `${agency.id}-${template.templateKey}`,
        agencyId: agency.id,
        templateKey: template.templateKey,
        label: template.label,
        body: template.body,
        updatedAt: new Date().toISOString(),
      }));
    return [...existing, ...defaults];
  });
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

  const contractRows = (contractsResult.data ?? []) as RentalContractRow[];
  const ownersByContractId = await fetchContractOwnersByContractId(
    admin,
    contractRows.map((contract) => contract.id)
  );

  const rentalByPropertyId = new Map<string, RentalContractSummary>();

  for (const contract of contractRows) {
      rentalByPropertyId.set(
        contract.property_id,
        mapRentalContract(
          contract,
          messagingInstanceByAgency.get(contract.agency_id) ?? "agentcore",
          ownersByContractId.get(contract.id) ?? []
        )
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

  const ownersByContractId = await fetchContractOwnersByContractId(
    admin,
    contractResult.data ? [(contractResult.data as RentalContractRow).id] : []
  );

  return mapProperty(
    data as unknown as PropertyRow,
    contractResult.data
      ? mapRentalContract(
            contractResult.data as RentalContractRow,
            agencyResult.data?.messaging_instance ?? "agentcore",
            ownersByContractId.get((contractResult.data as RentalContractRow).id) ?? []
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

  const contractRows = (contractsResult.data ?? []) as RentalContractRow[];
  const ownersByContractId = await fetchContractOwnersByContractId(
    admin,
    contractRows.map((contract) => contract.id)
  );

  const instanceByAgency = new Map(
      agencies.map((agency) => [agency.id, agency.messaging_instance])
  );

  return contractRows.map((contract) =>
      mapRentalContract(
        contract,
        instanceByAgency.get(contract.agency_id) ?? "agentcore",
        ownersByContractId.get(contract.id) ?? []
      )
  );
}

export async function listLeaseRoster(options?: { agencySlug?: string }) {
  const admin = createAdminClient();
  const leaseRosterSelect =
    "id, property_id, agency_id, tenant_name, tenant_phone, tenant_email, current_rent, currency, index_type, adjustment_frequency_months, late_fee_daily_amount, late_fee_grace_days, contract_start_date, next_adjustment_date, last_adjustment_date, auto_notify, status, owner_name, owner_phone, owner_email, management_fee_percent, monthly_owner_costs, owner_notes, agencies!inner(name, slug), properties!inner(title, location, exact_address, requirements)";
  const legacyLeaseRosterSelect =
    "id, property_id, agency_id, tenant_name, tenant_phone, tenant_email, current_rent, currency, index_type, adjustment_frequency_months, contract_start_date, next_adjustment_date, last_adjustment_date, auto_notify, status, agencies!inner(name, slug), properties!inner(title, location, exact_address, requirements)";

  const buildQuery = (selectClause: string) => {
    let query = admin
      .from("rental_contracts")
      .select(selectClause)
      .order("next_adjustment_date", { ascending: true });

    if (options?.agencySlug) {
      query = query.eq("agencies.slug", options.agencySlug);
    }

    return query;
  };

  let { data, error } = await buildQuery(leaseRosterSelect);

  if (
    error &&
    /owner_name|owner_phone|owner_email|management_fee_percent|monthly_owner_costs|owner_notes|late_fee_daily_amount|late_fee_grace_days/i.test(
      error.message ?? ""
    )
  ) {
    const fallbackResult = await buildQuery(legacyLeaseRosterSelect);
    data = fallbackResult.data;
    error = fallbackResult.error;
  }

  if (error) {
    throw error;
  }

  const leaseRows = (data ?? []) as unknown as Array<{
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
    late_fee_daily_amount: number | null;
    late_fee_grace_days: number | null;
    contract_start_date: string;
    next_adjustment_date: string;
    last_adjustment_date: string | null;
    auto_notify: boolean;
    status: "Activo" | "Pausado" | "Finalizado";
    owner_name: string | null;
    owner_phone: string | null;
    owner_email: string | null;
    management_fee_percent: number | null;
    monthly_owner_costs: number | null;
    owner_notes: string | null;
    agencies: { name: string; slug: string } | { name: string; slug: string }[] | null;
    properties:
      | { title: string; location: string; exact_address: string; requirements: string | null }
      | { title: string; location: string; exact_address: string; requirements: string | null }[]
      | null;
  }>;
  const ownersByContractId = await fetchContractOwnersByContractId(
    admin,
    leaseRows.map((item) => item.id)
  );

  return leaseRows.map((item) => {
    const agency = Array.isArray(item.agencies) ? item.agencies[0] : item.agencies;
    const property = Array.isArray(item.properties) ? item.properties[0] : item.properties;
    const owners = ownersByContractId.get(item.id) ?? [];
    const primaryOwner = owners[0] ?? null;
    const rosterOwnerName = primaryOwner?.fullName ?? item.owner_name ?? null;

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
      lateFeeDailyAmount: Number(item.late_fee_daily_amount ?? 0),
      lateFeeGraceDays: Number(item.late_fee_grace_days ?? 10),
      contractStartDate: item.contract_start_date,
      nextAdjustmentDate: item.next_adjustment_date,
      lastAdjustmentDate: item.last_adjustment_date,
      status: item.status,
      autoNotify: item.auto_notify,
      requirements: property?.requirements ?? "",
      ownerName:
        owners.length > 1
          ? `${primaryOwner?.fullName ?? "Propietario principal"} + ${owners.length - 1} copropietario${owners.length > 2 ? "s" : ""}`
          : rosterOwnerName,
      ownerPhone: primaryOwner?.phone ?? item.owner_phone,
      ownerEmail: primaryOwner?.email ?? item.owner_email,
      managementFeePercent: Number(item.management_fee_percent ?? 0),
      monthlyOwnerCosts: Number(item.monthly_owner_costs ?? 0),
      ownerNotes: item.owner_notes ?? "",
    } satisfies LeaseRosterItem;
  });
}

export async function listOwnerSettlements(options?: { agencySlug?: string; limit?: number }) {
  const admin = createAdminClient();
  let query = admin
    .from("owner_settlements")
    .select(
      "id, contract_id, contract_owner_id, property_id, agency_id, settlement_month, owner_name, owner_email, owner_phone, participation_percent, rent_collected, management_fee_percent, management_fee_amount, monthly_owner_costs, other_charges_amount, other_charges_detail, owner_payout_amount, status, sent_at, paid_at, created_at, agencies!inner(slug), properties!inner(title, location)"
    )
    .order("created_at", { ascending: false })
    .limit(options?.limit ?? 16);

  if (options?.agencySlug) {
    query = query.eq("agencies.slug", options.agencySlug);
  }

  const { data, error } = await query;

  if (error) {
    if (/owner_settlements/i.test(error.message ?? "")) {
      return [];
    }
    throw error;
  }

  return ((data ?? []) as Array<OwnerSettlementRow & {
    agencies: { slug: string } | { slug: string }[] | null;
  }>).map(mapOwnerSettlement);
}

export async function listOwnerSettlementItems(options?: {
  settlementId?: string;
  contractId?: string;
  agencySlug?: string;
  limit?: number;
}) {
  const admin = createAdminClient();
  let query = admin
    .from("owner_settlement_items")
    .select("id, settlement_id, contract_id, contract_owner_id, agency_id, label, amount, effect, apply_management_fee, notes, created_at, agencies!inner(slug)")
    .order("created_at", { ascending: false })
    .limit(options?.limit ?? 100);

  if (options?.settlementId) {
    query = query.eq("settlement_id", options.settlementId);
  }

  if (options?.contractId) {
    query = query.eq("contract_id", options.contractId);
  }

  if (options?.agencySlug) {
    query = query.eq("agencies.slug", options.agencySlug);
  }

  const { data, error } = await query;
  if (error) {
    if (/owner_settlement_items/i.test(error.message ?? "")) {
      return [] as OwnerSettlementItemSummary[];
    }
    throw error;
  }

  return ((data ?? []) as Array<OwnerSettlementItemRow & {
    agencies: { slug: string } | { slug: string }[] | null;
  }>).map(mapOwnerSettlementItem);
}

export async function listRentalCollections(options?: { agencySlug?: string; limit?: number }) {
  const admin = createAdminClient();
  let query = admin
    .from("rental_collections")
    .select(
      "id, contract_id, property_id, agency_id, collection_month, expected_rent, collected_amount, payment_method, payment_date, status, notes, created_at, agencies!inner(slug), rental_contracts!inner(tenant_name), properties!inner(title, location)"
    )
    .order("created_at", { ascending: false })
    .limit(options?.limit ?? 24);

  if (options?.agencySlug) {
    query = query.eq("agencies.slug", options.agencySlug);
  }

  const { data, error } = await query;
  if (error) {
    if (/rental_collections/i.test(error.message ?? "")) {
      return [];
    }
    throw error;
  }

  return ((data ?? []) as Array<RentalCollectionRow & {
    agencies: { slug: string } | { slug: string }[] | null;
  }>).map(mapRentalCollection);
}

function getMonthLabel(date = new Date()) {
  return date.toISOString().slice(0, 7);
}

function daysInMonth(year: number, monthIndex: number) {
  return new Date(year, monthIndex + 1, 0).getDate();
}

function getRentDueDay(contractStartDate: string) {
  const parsed = new Date(`${contractStartDate}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return 1;
  return Math.min(Math.max(parsed.getDate(), 1), 28);
}

function buildDelinquencyMessage(item: {
  tenantName: string;
  propertyTitle: string;
  collectionMonth: string;
  rentDebtAmount: number;
  lateFeeAmount: number;
  totalDebtAmount: number;
  currency: "ARS";
}) {
  const firstName = item.tenantName.split(" ")[0] || item.tenantName;
  const amount = new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: item.currency,
    maximumFractionDigits: 0,
  }).format(item.totalDebtAmount);

  const lateFeeText =
    item.lateFeeAmount > 0
      ? ` Incluye punitorios por ${new Intl.NumberFormat("es-AR", {
          style: "currency",
          currency: item.currency,
          maximumFractionDigits: 0,
        }).format(item.lateFeeAmount)}.`
      : "";

  return `Hola ${firstName}, te escribimos por el alquiler de ${item.propertyTitle}. Tenemos pendiente el periodo ${item.collectionMonth} por ${amount}.${lateFeeText} Cuando puedas, envianos el comprobante o avisame si ya fue transferido para actualizar la cuenta.`;
}

export async function listDelinquentTenants(options?: {
  agencySlug?: string;
  month?: string;
  graceDays?: number;
}) {
  const leases = await listLeaseRoster(options?.agencySlug ? { agencySlug: options.agencySlug } : undefined);
  const month = options?.month?.slice(0, 7) || getMonthLabel();
  const graceDays = Number.isFinite(Number(options?.graceDays)) ? Math.max(0, Number(options?.graceDays)) : 10;
  const activeLeases = leases.filter((lease) => lease.status === "Activo");

  if (activeLeases.length === 0) {
    return [] as DelinquentTenantSummary[];
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("rental_collections")
    .select("contract_id, collection_month, expected_rent, collected_amount, payment_date, status")
    .eq("collection_month", month)
    .in("contract_id", activeLeases.map((lease) => lease.contractId));

  if (error) {
    if (/rental_collections/i.test(error.message ?? "")) {
      return [];
    }
    throw error;
  }

  const collectionByContractId = new Map(
    ((data ?? []) as Array<{
      contract_id: string;
      collection_month: string;
      expected_rent: number;
      collected_amount: number;
      payment_date: string | null;
      status: "Pendiente" | "Parcial" | "Cobrada" | "Mora";
    }>).map((collection) => [collection.contract_id, collection])
  );

  const [year, monthNumber] = month.split("-").map((part) => Number(part));
  const monthIndex = Math.max(0, (monthNumber || 1) - 1);
  const today = new Date();
  const isCurrentMonth = getMonthLabel(today) === month;
  const referenceDate = isCurrentMonth
    ? today
    : new Date(year || today.getFullYear(), monthIndex, daysInMonth(year || today.getFullYear(), monthIndex));

  return activeLeases
    .map<DelinquentTenantSummary | null>((lease) => {
      const collection = collectionByContractId.get(lease.contractId);
      const expectedRent = Number(collection?.expected_rent ?? lease.currentRent ?? 0);
      const collectedAmount = Number(collection?.collected_amount ?? 0);
      const rentDebtAmount = Math.max(0, expectedRent - collectedAmount);

      if (rentDebtAmount <= 0 && collection?.status === "Cobrada") {
        return null;
      }

      const dueDay = getRentDueDay(lease.contractStartDate);
      const cappedDueDay = Math.min(dueDay, daysInMonth(year || today.getFullYear(), monthIndex));
      const dueDate = new Date(year || today.getFullYear(), monthIndex, cappedDueDay);
      const contractGraceDays = Number.isFinite(Number(lease.lateFeeGraceDays))
        ? Math.max(0, Number(lease.lateFeeGraceDays))
        : graceDays;
      const graceLimit = new Date(dueDate);
      graceLimit.setDate(graceLimit.getDate() + contractGraceDays);
      const daysLate = Math.max(
        0,
        Math.floor((referenceDate.getTime() - graceLimit.getTime()) / (24 * 60 * 60 * 1000))
      );
      const collectionStatus = collection?.status ?? (daysLate > 0 ? "Mora" : "Pendiente");
      const lateFeeDailyAmount = Math.max(0, Number(lease.lateFeeDailyAmount ?? 0));
      const lateFeeAmount = rentDebtAmount > 0 ? lateFeeDailyAmount * daysLate : 0;
      const totalDebtAmount = rentDebtAmount + lateFeeAmount;
      const risk =
        daysLate >= 20 || totalDebtAmount >= expectedRent * 1.5
          ? "Alta"
          : daysLate >= 7 || collectionStatus === "Mora"
            ? "Media"
            : "Baja";
      const aiReason =
        risk === "Alta"
          ? "Prioridad alta: deuda vencida con varios dias de atraso. Conviene contacto humano y dejar compromiso de pago."
          : risk === "Media"
            ? "Mora moderada: corresponde aviso firme por WhatsApp y seguimiento en 24 horas."
            : "Todavia esta cerca del vencimiento o dentro de margen operativo. Conviene aviso amable.";
      const suggestedAction =
        risk === "Alta"
          ? "Llamar y enviar WhatsApp con pedido de comprobante o fecha exacta de pago."
          : risk === "Media"
            ? "Enviar WhatsApp y programar seguimiento para manana."
            : "Enviar recordatorio amable sin escalar.";

      return {
        contractId: lease.contractId,
        propertyId: lease.propertyId,
        agencyId: lease.agencyId,
        agencySlug: lease.agencySlug,
        agencyName: lease.agencyName,
        tenantName: lease.tenantName,
        tenantPhone: lease.tenantPhone,
        tenantEmail: lease.tenantEmail,
        propertyTitle: lease.propertyTitle,
        propertyLocation: lease.propertyLocation,
        exactAddress: lease.exactAddress,
        ownerName: lease.ownerName,
        currency: lease.currency,
        collectionMonth: month,
        dueDay,
        graceDays: contractGraceDays,
        daysLate,
        lateFeeDailyAmount,
        lateFeeAmount,
        expectedRent,
        collectedAmount,
        rentDebtAmount,
        extraDebtAmount: 0,
        totalDebtAmount,
        collectionStatus,
        risk,
        aiReason,
        suggestedAction,
        suggestedMessage: buildDelinquencyMessage({
          tenantName: lease.tenantName,
          propertyTitle: lease.propertyTitle,
          collectionMonth: month,
          rentDebtAmount,
          lateFeeAmount,
          totalDebtAmount,
          currency: lease.currency,
        }),
        lastPaymentDate: collection?.payment_date ?? null,
      };
    })
    .filter((item): item is DelinquentTenantSummary => Boolean(item))
    .sort((left, right) => {
      const riskWeight = { Alta: 3, Media: 2, Baja: 1 };
      return (
        riskWeight[right.risk] - riskWeight[left.risk] ||
        right.daysLate - left.daysLate ||
        right.totalDebtAmount - left.totalDebtAmount
      );
    });
}

export async function listOwnerTransfers(options?: { agencySlug?: string; limit?: number }) {
  const admin = createAdminClient();
  let query = admin
    .from("owner_transfers")
    .select(
      "id, settlement_id, contract_id, contract_owner_id, property_id, agency_id, owner_name, amount, destination_label, transfer_date, status, notes, created_at, agencies!inner(slug), properties!inner(title)"
    )
    .order("created_at", { ascending: false })
    .limit(options?.limit ?? 24);

  if (options?.agencySlug) {
    query = query.eq("agencies.slug", options.agencySlug);
  }

  const { data, error } = await query;
  if (error) {
    if (/owner_transfers/i.test(error.message ?? "")) {
      return [];
    }
    throw error;
  }

  return ((data ?? []) as Array<OwnerTransferRow & {
    agencies: { slug: string } | { slug: string }[] | null;
  }>).map(mapOwnerTransfer);
}

export async function listCashMovements(options?: { agencySlug?: string; limit?: number }) {
  const admin = createAdminClient();
  let query = admin
    .from("cash_movements")
    .select("id, agency_id, occurred_on, kind, category, amount, reference, notes, created_at, agencies!inner(slug)")
    .order("occurred_on", { ascending: false })
    .limit(options?.limit ?? 40);

  if (options?.agencySlug) {
    query = query.eq("agencies.slug", options.agencySlug);
  }

  const { data, error } = await query;
  if (error) {
    if (/cash_movements/i.test(error.message ?? "")) {
      return [];
    }
    throw error;
  }

  return ((data ?? []) as Array<CashMovementRow & {
    agencies: { slug: string } | { slug: string }[] | null;
  }>).map(mapCashMovement);
}

export async function listSuppliers(options?: { agencySlug?: string; limit?: number }) {
  const admin = createAdminClient();
  let query = admin
    .from("suppliers")
    .select("id, agency_id, name, service_type, contact_name, phone, email, notes, status, created_at, agencies!inner(slug)")
    .order("name", { ascending: true })
    .limit(options?.limit ?? 40);

  if (options?.agencySlug) {
    query = query.eq("agencies.slug", options.agencySlug);
  }

  const { data, error } = await query;
  if (error) {
    if (/suppliers/i.test(error.message ?? "")) {
      return [];
    }
    throw error;
  }

  return ((data ?? []) as Array<SupplierRow & {
    agencies: { slug: string } | { slug: string }[] | null;
  }>).map(mapSupplier);
}

export async function listSupplierInvoices(options?: { agencySlug?: string; limit?: number }) {
  const admin = createAdminClient();
  let query = admin
    .from("supplier_invoices")
    .select(
      "id, agency_id, supplier_id, invoice_number, concept, total_amount, due_date, status, notes, created_at, agencies!inner(slug), suppliers(name)"
    )
    .order("created_at", { ascending: false })
    .limit(options?.limit ?? 40);

  if (options?.agencySlug) {
    query = query.eq("agencies.slug", options.agencySlug);
  }

  const { data, error } = await query;
  if (error) {
    if (/supplier_invoices/i.test(error.message ?? "")) {
      return [];
    }
    throw error;
  }

  return ((data ?? []) as Array<SupplierInvoiceRow & {
    agencies: { slug: string } | { slug: string }[] | null;
  }>).map(mapSupplierInvoice);
}

export async function listContractRescissions(options?: { agencySlug?: string; limit?: number }) {
  const admin = createAdminClient();
  let query = admin
    .from("contract_rescissions")
    .select(
      "id, contract_id, property_id, agency_id, requested_on, effective_date, reason, settlement_terms, status, created_at, agencies!inner(slug), rental_contracts!inner(tenant_name), properties!inner(title)"
    )
    .order("created_at", { ascending: false })
    .limit(options?.limit ?? 24);

  if (options?.agencySlug) {
    query = query.eq("agencies.slug", options.agencySlug);
  }

  const { data, error } = await query;
  if (error) {
    if (/contract_rescissions/i.test(error.message ?? "")) {
      return [];
    }
    throw error;
  }

  return ((data ?? []) as Array<ContractRescissionRow & {
    agencies: { slug: string } | { slug: string }[] | null;
  }>).map(mapContractRescission);
}

export async function listOwnerRoster(options?: { agencySlug?: string }): Promise<OwnerRosterSummary[]> {
  const [leases, contracts, settlements] = await Promise.all([
    listLeaseRoster(options),
    listRentalContracts(options),
    listOwnerSettlements({ agencySlug: options?.agencySlug, limit: 100 }),
  ]);

  const contractById = new Map(contracts.map((contract) => [contract.id, contract]));
  const roster: OwnerRosterSummary[] = [];

  for (const lease of leases) {
    const contract = contractById.get(lease.contractId);
    const owners = contract?.owners ?? [];

    if (owners.length > 0) {
      for (const owner of owners) {
        const latestSettlement =
          settlements.find((settlement) => settlement.contractOwnerId === owner.id) ??
          settlements.find(
            (settlement) =>
              settlement.contractId === lease.contractId && settlement.ownerName === owner.fullName
          ) ??
          null;

        roster.push({
          agencyId: lease.agencyId,
          agencySlug: lease.agencySlug,
          propertyId: lease.propertyId,
          contractId: lease.contractId,
          contractOwnerId: owner.id,
          ownerName: owner.fullName,
          ownerPhone: owner.phone,
          ownerEmail: owner.email,
          participationPercent: owner.participationPercent,
          propertyTitle: lease.propertyTitle,
          propertyLocation: lease.propertyLocation,
          currentRent: lease.currentRent,
          managementFeePercent: lease.managementFeePercent,
          monthlyOwnerCosts: lease.monthlyOwnerCosts,
          latestSettlementMonth: latestSettlement?.settlementMonth ?? null,
          latestOwnerPayoutAmount: latestSettlement?.ownerPayoutAmount ?? null,
        });
      }
      continue;
    }

    if (!lease.ownerName) {
      continue;
    }

    const latestSettlement = settlements.find((settlement) => settlement.contractId === lease.contractId) ?? null;
    roster.push({
      agencyId: lease.agencyId,
      agencySlug: lease.agencySlug,
      propertyId: lease.propertyId,
      contractId: lease.contractId,
      contractOwnerId: null,
      ownerName: lease.ownerName,
      ownerPhone: lease.ownerPhone,
      ownerEmail: lease.ownerEmail,
      participationPercent: 100,
      propertyTitle: lease.propertyTitle,
      propertyLocation: lease.propertyLocation,
      currentRent: lease.currentRent,
      managementFeePercent: lease.managementFeePercent,
      monthlyOwnerCosts: lease.monthlyOwnerCosts,
      latestSettlementMonth: latestSettlement?.settlementMonth ?? null,
      latestOwnerPayoutAmount: latestSettlement?.ownerPayoutAmount ?? null,
    });
  }

  return roster;
}

export async function listTenantRoster(options?: { agencySlug?: string }): Promise<TenantRosterSummary[]> {
  const leases = await listLeaseRoster(options);
  const collections = await listRentalCollections({ agencySlug: options?.agencySlug, limit: 100 });

  return leases.map((lease) => {
    const latestCollection = collections.find((collection) => collection.contractId === lease.contractId) ?? null;
    return {
      agencyId: lease.agencyId,
      agencySlug: lease.agencySlug,
      propertyId: lease.propertyId,
      contractId: lease.contractId,
      tenantName: lease.tenantName,
      tenantPhone: lease.tenantPhone,
      tenantEmail: lease.tenantEmail,
      propertyTitle: lease.propertyTitle,
      propertyLocation: lease.propertyLocation,
      currentRent: lease.currentRent,
      nextAdjustmentDate: lease.nextAdjustmentDate,
      contractStatus: lease.status,
      latestCollectionStatus: latestCollection?.status ?? null,
      latestCollectionMonth: latestCollection?.collectionMonth ?? null,
    };
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
  const settlements = await listOwnerSettlements({ agencySlug: options?.agencySlug, limit: 80 });

  const today = new Date().toISOString().slice(0, 10);
  const inSevenDays = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const currentMonth = new Date().toISOString().slice(0, 7);

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
    ownerSettlementsThisMonth: settlements.filter(
      (settlement) => settlement.settlementMonth === currentMonth
    ).length,
    pendingOwnerPayouts: settlements.filter(
      (settlement) => settlement.status !== "Pagada"
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

export async function getAdminDashboardSnapshot(): Promise<AdminDashboardSnapshot> {
  const admin = createAdminClient();
  const agencies = await listAgencySummaries();

  const [
    usersResult,
    propertyCountResult,
    openLeadsResult,
    activeLeasesResult,
    recentPropertiesResult,
    recentAgenciesResult,
    recentLeadsResult,
  ] = await Promise.all([
    admin
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .in("role", ["agency_admin", "agent"]),
    admin.from("properties").select("id", { count: "exact", head: true }),
    admin
      .from("crm_leads")
      .select("id", { count: "exact", head: true })
      .not("stage", "in", "(Cerrado,Descartado)"),
    admin
      .from("rental_contracts")
      .select("id", { count: "exact", head: true })
      .eq("status", "Activo"),
    admin
      .from("properties")
      .select("title, location, created_at, agencies!inner(name)")
      .order("created_at", { ascending: false })
      .limit(4),
    admin
      .from("agencies")
      .select("name, city, created_at")
      .order("created_at", { ascending: false })
      .limit(4),
    admin
      .from("crm_leads")
      .select("full_name, stage, created_at, agencies!inner(name)")
      .order("created_at", { ascending: false })
      .limit(4),
  ]);

  if (usersResult.error) throw usersResult.error;
  if (propertyCountResult.error) throw propertyCountResult.error;
  if (openLeadsResult.error) throw openLeadsResult.error;
  if (activeLeasesResult.error) throw activeLeasesResult.error;
  if (recentPropertiesResult.error) throw recentPropertiesResult.error;
  if (recentAgenciesResult.error) throw recentAgenciesResult.error;
  if (recentLeadsResult.error) throw recentLeadsResult.error;

  const recentAgencyItems = ((recentAgenciesResult.data ?? []) as Array<{
    name: string;
    city: string;
    created_at: string;
  }>).map((agency) => ({
    at: agency.created_at,
    text: `Se dio de alta ${agency.name} en ${agency.city}.`,
  }));

  const recentPropertyItems = ((recentPropertiesResult.data ?? []) as Array<{
    title: string;
    location: string;
    created_at: string;
    agencies: { name: string } | { name: string }[] | null;
  }>).map((property) => {
    const agency = Array.isArray(property.agencies) ? property.agencies[0] : property.agencies;
    return {
      at: property.created_at,
      text: `${agency?.name ?? "Una inmobiliaria"} publico ${property.title} en ${property.location}.`,
    };
  });

  const recentLeadItems = ((recentLeadsResult.data ?? []) as Array<{
    full_name: string;
    stage: string;
    created_at: string;
    agencies: { name: string } | { name: string }[] | null;
  }>).map((lead) => {
    const agency = Array.isArray(lead.agencies) ? lead.agencies[0] : lead.agencies;
    return {
      at: lead.created_at,
      text: `${agency?.name ?? "Una inmobiliaria"} recibio un lead nuevo: ${lead.full_name} (${lead.stage}).`,
    };
  });

  const recentActivity = [...recentAgencyItems, ...recentPropertyItems, ...recentLeadItems]
    .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
    .slice(0, 6)
    .map((item) => item.text);

  return {
    metrics: [
      {
        label: "Inmobiliarias activas",
        value: String(agencies.filter((agency) => agency.status === "Activa").length),
        delta: `${agencies.length} cuentas`,
        hint: "clientes administrados desde Props",
      },
      {
        label: "Usuarios de inmobiliarias",
        value: String(usersResult.count ?? 0),
        hint: "admins y empleados con acceso al CRM",
      },
      {
        label: "Propiedades publicadas",
        value: String(propertyCountResult.count ?? 0),
        hint: "inventario total cargado en la plataforma",
      },
      {
        label: "Consultas activas",
        value: String(openLeadsResult.count ?? 0),
        delta: `${activeLeasesResult.count ?? 0} alquileres activos`,
        hint: "oportunidades abiertas en seguimiento",
      },
    ],
    recentActivity:
      recentActivity.length > 0
        ? recentActivity
        : ["Todavia no hubo movimientos recientes en la plataforma."],
    agencies,
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

export async function listCrmLeadMessages(options?: {
  agencySlug?: string;
  leadIds?: string[];
}) {
  const admin = createAdminClient();
  let agencyIds: string[] | null = null;

  if (options?.agencySlug) {
    const { data: agencies, error: agencyError } = await admin
      .from("agencies")
      .select("id")
      .eq("slug", options.agencySlug);

    if (agencyError) {
      throw agencyError;
    }

    agencyIds = (agencies ?? []).map((agency) => agency.id);

    if (agencyIds.length === 0) {
      return [];
    }
  }

  let query = admin
    .from("crm_lead_messages")
    .select("id, lead_id, agency_id, property_id, channel, direction, sender_role, content, wa_message_id, metadata, created_at")
    .order("created_at", { ascending: true });

  if (agencyIds?.length) {
    query = query.in("agency_id", agencyIds);
  }

  if (options?.leadIds?.length) {
    query = query.in("lead_id", options.leadIds);
  }

  const { data, error } = await query;
  if (error) throw error;
  const crmMessages = ((data ?? []) as unknown as CrmLeadMessageRow[]).map(mapCrmLeadMessage);

  const leadRowsQuery = admin
    .from("crm_leads")
    .select("id, agency_id, property_id, conversation_id");

  if (agencyIds?.length) {
    leadRowsQuery.in("agency_id", agencyIds);
  }

  if (options?.leadIds?.length) {
    leadRowsQuery.in("id", options.leadIds);
  }

  const { data: leadRows, error: leadRowsError } = await leadRowsQuery;
  if (leadRowsError) throw leadRowsError;

  const existingLeadIds = new Set(crmMessages.map((message) => message.leadId));
  const missingConversationLeads = ((leadRows ?? []) as Array<{
    id: string;
    agency_id: string;
    property_id: string | null;
    conversation_id: string | null;
  }>).filter((lead) => lead.conversation_id && !existingLeadIds.has(lead.id));

  if (missingConversationLeads.length === 0) {
    return crmMessages;
  }

  const conversationIds = missingConversationLeads
    .map((lead) => lead.conversation_id)
    .filter((value): value is string => Boolean(value));

  const { data: marketplaceMessages, error: marketplaceError } = await admin
    .from("marketplace_messages")
    .select("id, conversation_id, sender_role, content, metadata, created_at")
    .in("conversation_id", conversationIds)
    .order("created_at", { ascending: true });

  if (marketplaceError) throw marketplaceError;

  const leadByConversation = new Map(
    missingConversationLeads.map((lead) => [
      lead.conversation_id as string,
      {
        leadId: lead.id,
        agencyId: lead.agency_id,
        propertyId: lead.property_id,
      },
    ])
  );

  const mirroredMessages = ((marketplaceMessages ?? []) as Array<{
    id: string;
    conversation_id: string;
    sender_role: "customer" | "assistant";
    content: string;
    metadata: Record<string, unknown> | null;
    created_at: string;
  }>)
    .map((message) => {
      const owner = leadByConversation.get(message.conversation_id);
      if (!owner) return null;

      return {
        id: `marketplace-${message.id}`,
        leadId: owner.leadId,
        agencyId: owner.agencyId,
        propertyId: owner.propertyId,
        channel: "web" as const,
        direction: message.sender_role === "customer" ? "incoming" as const : "outgoing" as const,
        senderRole: message.sender_role,
        content: message.content,
        waMessageId: null,
        metadata: message.metadata ?? {},
        createdAt: message.created_at,
      };
    })
    .filter((message): message is NonNullable<typeof message> => Boolean(message));

  return [...crmMessages, ...mirroredMessages].sort((left, right) =>
    left.createdAt.localeCompare(right.createdAt)
  );
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
  const [leads, visits, tasks, leases] = await Promise.all([
    listCrmLeads(options),
    listVisitAppointments(options),
    listEmployeeTasks(options),
    listLeaseRoster(options),
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
  const contractReviewTasks: EmployeeTaskSummary[] = leases
    .filter((lease) => lease.status === "Pausado")
    .slice(0, 3)
    .map((lease) => ({
      id: `contract-review-${lease.contractId}`,
      agencyId: lease.agencyId,
      leadId: null,
      propertyId: lease.propertyId,
      visitId: null,
      title: `Revisar contrato de ${lease.tenantName}`,
      details: `${lease.propertyTitle}: revisar fechas, indice y activar automatizacion si ya esta correcto.`,
      dueAt: new Date().toISOString(),
      taskType: "Contrato",
      priority: "Alta",
      status: "Pendiente",
      automationSource: "rental_review",
      assignedUserId: null,
      completedAt: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }));
  const allDueNow = [...dueNow, ...contractReviewTasks];
  const pendingTaskLeadIds = new Set(
    allDueNow
      .filter((task) => task.status === "Pendiente" && Boolean(task.leadId))
      .map((task) => task.leadId as string)
  );
  const isSelfServedWebLead = (lead: CrmLeadSummary) =>
    /web|marketplace|catalog/i.test(lead.source) &&
    lead.stage === "Nuevo" &&
    !pendingTaskLeadIds.has(lead.id);
  const automaticFollowUpLeads = leads
    .filter((lead) => {
      if (!lead.needsResponse || !lead.phone || !lead.nextFollowUpAt) return false;
      if (!["Nuevo", "Precalificado", "Seguimiento", "Visita"].includes(lead.stage)) return false;
      return new Date(lead.nextFollowUpAt).getTime() <= Date.now();
    })
    .slice(0, 8);
  const leadsToAnswer = leads
    .filter((lead) => lead.needsResponse && !pendingTaskLeadIds.has(lead.id) && !isSelfServedWebLead(lead))
    .slice(0, 8);
  const aiResolved = leads.filter((lead) => isSelfServedWebLead(lead)).slice(0, 8);

  return {
    myDay: {
      dueNow: allDueNow,
      visitsToday,
      leadsToAnswer,
      aiResolved,
      automaticFollowUps: automaticFollowUpLeads,
    },
    counters: {
      pendingTasks: tasks.length + contractReviewTasks.length,
      visitsToday: visitsToday.length,
      urgentLeads: leads.filter((lead) => lead.priority === "Alta" || lead.needsResponse).length,
      automaticFollowUps: automaticFollowUpLeads.length,
      aiResolved: aiResolved.length,
    },
  };
}
