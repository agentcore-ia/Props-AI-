export type LeadStage =
  | "Nuevo"
  | "Precalificado"
  | "Visita"
  | "Seguimiento"
  | "Propuesta"
  | "Cerrado"
  | "Descartado";

export type LeadPriority = "Alta" | "Media" | "Baja";

export type VisitStatus =
  | "Programada"
  | "Confirmada"
  | "Realizada"
  | "Reprogramar"
  | "Cancelada";

export type TaskType =
  | "Responder"
  | "Seguimiento"
  | "Visita"
  | "Contrato"
  | "General";

export type TaskStatus = "Pendiente" | "Hecha";

export type CrmLeadSummary = {
  id: string;
  agencyId: string;
  agencySlug: string;
  agencyName: string;
  propertyId: string | null;
  propertyTitle: string | null;
  propertyLocation: string | null;
  propertyPrice: number | null;
  propertyCurrency: "USD" | "ARS" | null;
  propertyOperation: "Venta" | "Alquiler" | null;
  propertyStatus: "Disponible" | "Reservada" | "Vendida" | "Alquilada" | null;
  customerId: string | null;
  conversationId: string | null;
  inquiryId: string | null;
  fullName: string;
  email: string | null;
  phone: string | null;
  source: string;
  stage: LeadStage;
  priority: LeadPriority;
  score: number;
  qualificationSummary: string;
  aiReplyDraft: string;
  intent: string | null;
  desiredOperation: string | null;
  desiredLocation: string | null;
  desiredTimeline: string | null;
  budget: string | null;
  requirementsSummary: string | null;
  lastCustomerMessage: string;
  needsResponse: boolean;
  nextFollowUpAt: string | null;
  lastContactedAt: string | null;
  lastActivityAt: string;
  ownerUserId: string | null;
  createdAt: string;
  updatedAt: string;
};

export type AgencyMessageTemplateKey =
  | "rental_requirements"
  | "sale_reply"
  | "follow_up"
  | "visit_confirmation"
  | "gentle_rejection";

export type AgencyMessageTemplateSummary = {
  id: string;
  agencyId: string;
  templateKey: AgencyMessageTemplateKey;
  label: string;
  body: string;
  updatedAt: string;
};

export type CrmLeadMessageSummary = {
  id: string;
  leadId: string;
  agencyId: string;
  propertyId: string | null;
  channel: "whatsapp" | "web" | "instagram" | "crm";
  direction: "incoming" | "outgoing";
  senderRole: "customer" | "assistant" | "agent" | "system";
  content: string;
  waMessageId: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
};

export type VisitAppointmentSummary = {
  id: string;
  leadId: string;
  agencyId: string;
  propertyId: string | null;
  leadName: string;
  leadPhone: string | null;
  propertyTitle: string | null;
  propertyLocation: string | null;
  scheduledFor: string;
  status: VisitStatus;
  notes: string;
  reminderSentAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type EmployeeTaskSummary = {
  id: string;
  agencyId: string;
  leadId: string | null;
  propertyId: string | null;
  visitId: string | null;
  title: string;
  details: string;
  dueAt: string;
  taskType: TaskType;
  priority: LeadPriority;
  status: TaskStatus;
  automationSource: string | null;
  assignedUserId: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type TodayWorkspaceSnapshot = {
  myDay: {
    dueNow: EmployeeTaskSummary[];
    visitsToday: VisitAppointmentSummary[];
    leadsToAnswer: CrmLeadSummary[];
    aiResolved: CrmLeadSummary[];
  };
  counters: {
    pendingTasks: number;
    visitsToday: number;
    urgentLeads: number;
    automaticFollowUps: number;
    aiResolved: number;
  };
};
