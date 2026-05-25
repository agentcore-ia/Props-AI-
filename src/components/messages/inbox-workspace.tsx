"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";
import {
  ArrowRight,
  Bot,
  CalendarPlus2,
  CheckCheck,
  Loader2,
  MessageCircle,
  RotateCcw,
  SendHorizonal,
  Sparkles,
} from "lucide-react";

import type { Property } from "@/lib/mock-data";
import { buildShortPropertyPath } from "@/lib/property-links";
import type {
  AgencyMessageTemplateSummary,
  CrmLeadMessageSummary,
  CrmLeadSummary,
  VisitAppointmentSummary,
} from "@/lib/crm-types";
import {
  buildLeadProfileSnapshot,
  buildPropertyComparisonMessage,
  buildQuickReplyScenarios,
  deriveConversationStatus,
  deriveSourceChannel,
  findSimilarProperties,
} from "@/lib/crm-insights";
import { EmptyState } from "@/components/layout/empty-state";
import { PageHeader } from "@/components/layout/page-header";
import { PersonTimeline } from "@/components/operations/person-timeline";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { cn, formatMoney, formatShortDate } from "@/lib/utils";
import type {
  OwnerRosterSummary,
  PersonTimelineEvent,
  TenantRosterSummary,
} from "@/lib/operations-types";

const conversationStatusTone = {
  Nuevo: "bg-sky-500/10 text-sky-700",
  "Esperando respuesta": "bg-amber-500/10 text-amber-700",
  Visita: "bg-violet-500/10 text-violet-700",
  Cerrado: "bg-emerald-500/10 text-emerald-700",
} as const;

const channelTone = {
  whatsapp: "bg-emerald-500/10 text-emerald-700",
  web: "bg-sky-500/10 text-sky-700",
  instagram: "bg-fuchsia-500/10 text-fuchsia-700",
  crm: "bg-slate-500/10 text-slate-700",
} as const;

const senderRoleLabel = {
  customer: "Cliente",
  assistant: "IA",
  agent: "Asesor",
  system: "Sistema",
} as const;

const channelLabel = {
  whatsapp: "WhatsApp",
  web: "Web",
  instagram: "Instagram",
  crm: "CRM",
} as const;

type QuickReplyScenario = {
  key: string;
  label: string;
  message: string;
  tone?: "default" | "outline" | "secondary" | "ghost" | "link" | "destructive";
};

type ContactContext =
  | { kind: "tenant"; label: "Inquilino"; tenant: TenantRosterSummary }
  | { kind: "owner"; label: "Propietario"; owner: OwnerRosterSummary }
  | { kind: "admin"; label: "Administracion" }
  | { kind: "commercial"; label: "Lead comercial" };

function normalizeLookupText(value?: string | null) {
  return (value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function normalizePhone(value?: string | null) {
  return (value ?? "").replace(/\D/g, "");
}

function phonesMatch(a?: string | null, b?: string | null) {
  const first = normalizePhone(a);
  const second = normalizePhone(b);
  if (!first || !second) return false;
  if (first === second) return true;

  const firstLocal = first.slice(-10);
  const secondLocal = second.slice(-10);
  if (firstLocal.length >= 8 && firstLocal === secondLocal) return true;

  return false;
}

function containsAny(text: string, words: string[]) {
  return words.some((word) => text.includes(word));
}

function buildConversationLookupText(
  lead: CrmLeadSummary,
  messages: CrmLeadMessageSummary[]
) {
  return normalizeLookupText(
    [
      lead.fullName,
      lead.email,
      lead.phone,
      lead.source,
      lead.stage,
      lead.intent,
      lead.propertyTitle,
      lead.propertyLocation,
      lead.lastCustomerMessage,
      ...messages.map((message) => message.content),
    ]
      .filter(Boolean)
      .join(" ")
  );
}

function deriveContactContext({
  lead,
  messages,
  tenants,
  owners,
}: {
  lead: CrmLeadSummary;
  messages: CrmLeadMessageSummary[];
  tenants: TenantRosterSummary[];
  owners: OwnerRosterSummary[];
}): ContactContext {
  const lookupText = buildConversationLookupText(lead, messages);
  const leadName = normalizeLookupText(lead.fullName);
  const tenantSignals = [
    "comprobante",
    "pago",
    "pagar",
    "deuda",
    "mora",
    "moroso",
    "aumento",
    "contrato",
    "rescision",
    "punitorio",
    "alquiler pendiente",
    "administracion",
  ];
  const ownerSignals = [
    "propietario",
    "liquidacion",
    "liquidar",
    "transferencia",
    "honorarios",
    "autorizacion",
    "arreglo",
  ];

  const tenantByIdentity = tenants.find((tenant) => {
    const tenantName = normalizeLookupText(tenant.tenantName);
    return (
      phonesMatch(lead.phone, tenant.tenantPhone) ||
      (leadName.length > 2 && tenantName === leadName)
    );
  });

  const ownerByIdentity = owners.find((owner) => {
    const ownerName = normalizeLookupText(owner.ownerName);
    return (
      phonesMatch(lead.phone, owner.ownerPhone) ||
      (leadName.length > 2 && ownerName === leadName)
    );
  });

  if (tenantByIdentity) {
    return { kind: "tenant", label: "Inquilino", tenant: tenantByIdentity };
  }

  if (ownerByIdentity) {
    return { kind: "owner", label: "Propietario", owner: ownerByIdentity };
  }

  const tenantByProperty = tenants.find(
    (tenant) =>
      tenant.propertyId === lead.propertyId &&
      containsAny(lookupText, tenantSignals)
  );

  if (tenantByProperty) {
    return { kind: "tenant", label: "Inquilino", tenant: tenantByProperty };
  }

  const ownerByProperty = owners.find(
    (owner) =>
      owner.propertyId === lead.propertyId &&
      containsAny(lookupText, ownerSignals)
  );

  if (ownerByProperty) {
    return { kind: "owner", label: "Propietario", owner: ownerByProperty };
  }

  if (containsAny(lookupText, [...tenantSignals, ...ownerSignals])) {
    return { kind: "admin", label: "Administracion" };
  }

  return { kind: "commercial", label: "Lead comercial" };
}

function buildTenantQuickReplies(tenant: TenantRosterSummary): QuickReplyScenario[] {
  const rent = formatMoney(tenant.currentRent, "ARS");
  const property = tenant.propertyTitle;
  const nextAdjustment = tenant.nextAdjustmentDate
    ? formatShortDate(tenant.nextAdjustmentDate)
    : "a confirmar";
  const paymentStatus = tenant.latestCollectionStatus ?? "sin estado cargado";
  const month = tenant.latestCollectionMonth ?? "el periodo actual";

  return [
    {
      key: "tenant-payment-status",
      label: "Informar estado de pago",
      message: `Hola ${tenant.tenantName}, te escribimos por ${property}. Para ${month} figura estado ${paymentStatus}. El alquiler registrado es ${rent}. Si ya pagaste, envianos el comprobante asi actualizamos la cuenta.`,
      tone: "default",
    },
    {
      key: "tenant-proof",
      label: "Pedir comprobante",
      message: `Hola ${tenant.tenantName}, ¿nos envias el comprobante del pago de ${property} cuando puedas? Asi dejamos actualizado el alquiler.`,
    },
    {
      key: "tenant-adjustment",
      label: "Explicar aumento",
      message: `Hola ${tenant.tenantName}, tu alquiler actual registrado para ${property} es ${rent}. El proximo ajuste figura para el ${nextAdjustment}. Si queres, administracion te confirma el calculo exacto cuando corresponda aplicarlo.`,
    },
    {
      key: "tenant-admin",
      label: "Derivar administracion",
      message: `Hola ${tenant.tenantName}, dejamos asentada tu consulta sobre ${property} para administracion. Te van a responder con la confirmacion correspondiente.`,
    },
  ];
}

function buildOwnerQuickReplies(owner: OwnerRosterSummary): QuickReplyScenario[] {
  const rent = formatMoney(owner.currentRent, "ARS");
  const payout = owner.latestOwnerPayoutAmount
    ? formatMoney(owner.latestOwnerPayoutAmount, "ARS")
    : "a confirmar";
  const month = owner.latestSettlementMonth ?? "el ultimo periodo";

  return [
    {
      key: "owner-status",
      label: "Enviar estado",
      message: `Hola ${owner.ownerName}, te compartimos el estado de ${owner.propertyTitle}. El alquiler base registrado es ${rent} y la ultima liquidacion (${month}) figura por ${payout}.`,
      tone: "default",
    },
    {
      key: "owner-settlement",
      label: "Enviar liquidacion",
      message: `Hola ${owner.ownerName}, dejamos lista la informacion de liquidacion de ${owner.propertyTitle} para ${month}. Si queres, te enviamos el comprobante por este medio.`,
    },
    {
      key: "owner-authorization",
      label: "Pedir autorizacion",
      message: `Hola ${owner.ownerName}, necesitamos tu autorizacion para avanzar con una gestion vinculada a ${owner.propertyTitle}. Te pasamos el detalle y el costo estimado para que nos confirmes.`,
    },
    {
      key: "owner-admin",
      label: "Derivar administracion",
      message: `Hola ${owner.ownerName}, dejamos tu consulta asentada para administracion. Te respondemos con el detalle correspondiente apenas lo revisen.`,
    },
  ];
}

function buildAdminQuickReplies(lead: CrmLeadSummary): QuickReplyScenario[] {
  return [
    {
      key: "admin-note",
      label: "Tomar nota",
      message: `Hola ${lead.fullName}, dejamos tu consulta asentada para que el equipo la revise y te responda con la informacion correcta.`,
      tone: "default",
    },
    {
      key: "admin-detail",
      label: "Pedir detalle",
      message: `Hola ${lead.fullName}, ¿nos compartis un poco mas de detalle para ubicar el caso correcto? Puede ser propiedad, contrato, periodo o nombre del titular.`,
    },
    {
      key: "admin-followup",
      label: "Avisar seguimiento",
      message: `Hola ${lead.fullName}, ya derivamos tu consulta al area correspondiente. Te contactamos apenas tengamos la confirmacion.`,
    },
  ];
}

function mapRealtimeLeadMessage(row: Record<string, unknown>): CrmLeadMessageSummary | null {
  const id = typeof row.id === "string" ? row.id : null;
  const leadId = typeof row.lead_id === "string" ? row.lead_id : null;
  const agencyId = typeof row.agency_id === "string" ? row.agency_id : null;
  const content = typeof row.content === "string" ? row.content : "";
  const createdAt = typeof row.created_at === "string" ? row.created_at : new Date().toISOString();
  const channel = typeof row.channel === "string" ? row.channel : "whatsapp";
  const direction = typeof row.direction === "string" ? row.direction : "incoming";
  const senderRole = typeof row.sender_role === "string" ? row.sender_role : "customer";

  if (!id || !leadId || !agencyId || !content) {
    return null;
  }

  return {
    id,
    leadId,
    agencyId,
    propertyId: typeof row.property_id === "string" ? row.property_id : null,
    channel: ["whatsapp", "web", "instagram", "crm"].includes(channel)
      ? (channel as CrmLeadMessageSummary["channel"])
      : "whatsapp",
    direction: direction === "outgoing" ? "outgoing" : "incoming",
    senderRole: ["customer", "assistant", "agent", "system"].includes(senderRole)
      ? (senderRole as CrmLeadMessageSummary["senderRole"])
      : "customer",
    content,
    waMessageId: typeof row.wa_message_id === "string" ? row.wa_message_id : null,
    metadata:
      row.metadata && typeof row.metadata === "object"
        ? (row.metadata as Record<string, unknown>)
        : {},
    createdAt,
  };
}

export function InboxWorkspace({
  leads,
  messages,
  properties,
  visits,
  templates,
  tenants,
  owners,
  initialMode = "completo",
  initialLeadId,
  canResetMemory = false,
}: {
  leads: CrmLeadSummary[];
  messages: CrmLeadMessageSummary[];
  properties: Property[];
  visits: VisitAppointmentSummary[];
  templates: AgencyMessageTemplateSummary[];
  tenants: TenantRosterSummary[];
  owners: OwnerRosterSummary[];
  initialMode?: "completo" | "recepcion";
  initialLeadId?: string;
  canResetMemory?: boolean;
}) {
  const router = useRouter();
  const [liveLeads, setLiveLeads] = useState(leads);
  const [liveMessages, setLiveMessages] = useState(messages);
  const [selectedId, setSelectedId] = useState(
    leads.some((lead) => lead.id === initialLeadId) ? initialLeadId ?? "" : leads[0]?.id ?? ""
  );
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [mode, setMode] = useState<"completo" | "recepcion">(initialMode);
  const [compareOpen, setCompareOpen] = useState(false);
  const [compareSelection, setCompareSelection] = useState<string[]>([]);
  const [visitLead, setVisitLead] = useState<CrmLeadSummary | null>(null);
  const [visitForm, setVisitForm] = useState({ scheduledFor: "", notes: "" });
  const messageScrollRef = useRef<HTMLDivElement | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const liveLeadIdsRef = useRef(new Set(leads.map((lead) => lead.id)));
  const snapshotBusyRef = useRef(false);
  const realtimeEventSeenRef = useRef(false);
  const realtimeAgencyId = useMemo(() => {
    const agencyIds = Array.from(new Set(leads.map((lead) => lead.agencyId).filter(Boolean)));
    return agencyIds.length === 1 ? agencyIds[0] : null;
  }, [leads]);

  useEffect(() => {
    setLiveLeads(leads);
  }, [leads]);

  useEffect(() => {
    setLiveMessages(messages);
  }, [messages]);

  useEffect(() => {
    liveLeadIdsRef.current = new Set(liveLeads.map((lead) => lead.id));
  }, [liveLeads]);

  const messagesByLead = useMemo(() => {
    const grouped = new Map<string, CrmLeadMessageSummary[]>();

    for (const message of liveMessages) {
      const current = grouped.get(message.leadId) ?? [];
      current.push(message);
      grouped.set(message.leadId, current);
    }

    return grouped;
  }, [liveMessages]);

  const relatedLeadsByPerson = useMemo(() => {
    const grouped = new Map<string, CrmLeadSummary[]>();
    for (const lead of liveLeads) {
      const key = `${lead.email ?? ""}|${lead.phone ?? ""}|${lead.fullName.toLowerCase()}`;
      const current = grouped.get(key) ?? [];
      current.push(lead);
      grouped.set(key, current);
    }
    return grouped;
  }, [liveLeads]);

  useEffect(() => {
    if (initialLeadId && liveLeads.some((lead) => lead.id === initialLeadId)) {
      setSelectedId(initialLeadId);
    }
  }, [initialLeadId, liveLeads]);

  const syncInboxSnapshot = useCallback(async () => {
    if (snapshotBusyRef.current) return;
    if (document.visibilityState !== "visible") return;

    snapshotBusyRef.current = true;

    try {
      const response = await fetch("/api/admin/messages/snapshot", {
        cache: "no-store",
        credentials: "same-origin",
        headers: {
          accept: "application/json",
        },
      });
      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        return;
      }

      if (Array.isArray(payload?.leads)) {
        setLiveLeads(payload.leads as CrmLeadSummary[]);
      }

      if (Array.isArray(payload?.messages)) {
        setLiveMessages(payload.messages as CrmLeadMessageSummary[]);
      }
    } finally {
      snapshotBusyRef.current = false;
    }
  }, []);

  useEffect(() => {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return;
    }

    const client = createBrowserClient(supabaseUrl, supabaseKey);
    const filter = realtimeAgencyId ? `agency_id=eq.${realtimeAgencyId}` : undefined;
    let refreshTimer: number | null = null;

    const scheduleServerRefresh = () => {
      if (refreshTimer !== null) return;
      refreshTimer = window.setTimeout(() => {
        refreshTimer = null;
        void syncInboxSnapshot();
      }, 700);
    };

    const channel = client
      .channel(`crm-lead-messages-${filter ?? "all"}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "crm_lead_messages",
          ...(filter ? { filter } : {}),
        },
        (payload) => {
          realtimeEventSeenRef.current = true;
          const message = mapRealtimeLeadMessage(payload.new as Record<string, unknown>);
          if (!message) return;

          setLiveMessages((current) => {
            if (current.some((item) => item.id === message.id)) {
              return current;
            }

            return [...current, message].sort(
              (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
            );
          });

          if (!liveLeadIdsRef.current.has(message.leadId)) {
            scheduleServerRefresh();
          } else {
            scheduleServerRefresh();
          }
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "crm_lead_messages",
          ...(filter ? { filter } : {}),
        },
        (payload) => {
          realtimeEventSeenRef.current = true;
          const message = mapRealtimeLeadMessage(payload.new as Record<string, unknown>);
          if (!message) return;

          setLiveMessages((current) =>
            current.map((item) => (item.id === message.id ? message : item))
          );
        }
      );

    void channel.subscribe();

    return () => {
      if (refreshTimer !== null) {
        window.clearTimeout(refreshTimer);
      }
      void client.removeChannel(channel);
    };
  }, [realtimeAgencyId, syncInboxSnapshot]);

  useEffect(() => {
    void syncInboxSnapshot();

    const interval = window.setInterval(() => {
      void syncInboxSnapshot();
    }, realtimeEventSeenRef.current ? 10000 : 2500);

    const handleFocus = () => {
      void syncInboxSnapshot();
    };

    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleFocus);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleFocus);
    };
  }, [syncInboxSnapshot]);

  const filteredLeads = useMemo(() => {
    if (mode === "recepcion") {
      return liveLeads.filter((lead) => deriveConversationStatus(lead) !== "Cerrado");
    }
    return liveLeads;
  }, [liveLeads, mode]);

  const selectedLead = useMemo(
    () => filteredLeads.find((lead) => lead.id === selectedId) ?? filteredLeads[0] ?? null,
    [filteredLeads, selectedId]
  );

  const selectedMessages = useMemo(
    () => (selectedLead ? messagesByLead.get(selectedLead.id) ?? [] : []),
    [messagesByLead, selectedLead]
  );

  const selectedProperty = useMemo(
    () =>
      selectedLead?.propertyId
        ? properties.find((property) => property.id === selectedLead.propertyId) ?? null
        : null,
    [properties, selectedLead]
  );

  const contactContext = useMemo(
    () =>
      selectedLead
        ? deriveContactContext({
            lead: selectedLead,
            messages: selectedMessages,
            tenants,
            owners,
          })
        : null,
    [owners, selectedLead, selectedMessages, tenants]
  );

  const similarProperties = useMemo(
    () =>
      selectedLead && contactContext?.kind === "commercial"
        ? findSimilarProperties(selectedLead, properties, 4)
        : [],
    [contactContext?.kind, properties, selectedLead]
  );

  const selectedTemplates = useMemo(
    () =>
      selectedLead
        ? templates.filter((template) => template.agencyId === selectedLead.agencyId)
        : [],
    [selectedLead, templates]
  );

  const quickReplies = useMemo(
    () => {
      if (!selectedLead || !contactContext) return [];

      if (contactContext.kind === "tenant") {
        return buildTenantQuickReplies(contactContext.tenant);
      }

      if (contactContext.kind === "owner") {
        return buildOwnerQuickReplies(contactContext.owner);
      }

      if (contactContext.kind === "admin") {
        return buildAdminQuickReplies(selectedLead);
      }

      return buildQuickReplyScenarios({
        lead: selectedLead,
        property: selectedProperty,
        similarProperties,
        templates: selectedTemplates,
      });
    },
    [contactContext, selectedLead, selectedProperty, selectedTemplates, similarProperties]
  );

  const selectedProfile = useMemo(() => {
    if (!selectedLead) return null;
    const relatedLeads =
      relatedLeadsByPerson.get(
        `${selectedLead.email ?? ""}|${selectedLead.phone ?? ""}|${selectedLead.fullName.toLowerCase()}`
      ) ?? [];
    return buildLeadProfileSnapshot({
      lead: selectedLead,
      messages: selectedMessages,
      relatedLeads,
      visits,
    });
  }, [relatedLeadsByPerson, selectedLead, selectedMessages, visits]);

  const selectedTimeline = useMemo<PersonTimelineEvent[]>(() => {
    if (!selectedLead) return [];

    const messageEvents = selectedMessages.map((message) => ({
      id: `message-${message.id}`,
      type: "Mensaje" as const,
      title:
        message.senderRole === "customer"
          ? "Mensaje del cliente"
          : message.senderRole === "assistant"
            ? "Respuesta de IA"
            : "Respuesta del equipo",
      description: message.content,
      at: message.createdAt,
      tone: message.senderRole === "customer" ? ("info" as const) : ("success" as const),
      href: `/mensajes?lead=${selectedLead.id}`,
    }));

    const visitEvents = visits
      .filter((visit) => visit.leadId === selectedLead.id)
      .map((visit) => ({
        id: `visit-${visit.id}`,
        type: "Visita" as const,
        title: `Visita ${visit.status}`,
        description: `${visit.propertyTitle ?? selectedLead.propertyTitle ?? "Propiedad"} · ${visit.notes || "Sin notas"}`,
        at: visit.scheduledFor,
        tone: "warning" as const,
        href: "/agenda",
      }));

    return [...messageEvents, ...visitEvents]
      .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
      .slice(0, 8);
  }, [selectedLead, selectedMessages, visits]);

  useEffect(() => {
    const container = messageScrollRef.current;
    if (container) {
      container.scrollTo({ top: container.scrollHeight, behavior: "smooth" });
    } else {
      bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
    }
  }, [selectedId, selectedMessages.length]);

  if (!selectedLead) {
    return (
      <div className="space-y-8">
        <PageHeader
          title="Mensajes"
          description="Bandeja unificada para trabajar consultas web, WhatsApp o cualquier nuevo canal que entre a Props."
        />
        <EmptyState
          title="Todavia no hay conversaciones"
          description="Cuando entren consultas por web o WhatsApp, apareceran aca listas para responder."
        />
      </div>
    );
  }

  async function sendMessage(input?: { directText?: string; customPrompt?: string; resetDraft?: boolean }) {
    if (selectedLead.aiEnabled) {
      setFeedback("La IA esta activa en este chat. Desactivala para responder manualmente y evitar mensajes duplicados.");
      return;
    }

    setBusy(true);
    setFeedback(null);

    const directText = input?.directText ?? (input?.customPrompt ? null : draft.trim() || null);
    const customPrompt = input?.customPrompt ?? null;

    const response = await fetch(`/api/admin/leads/${selectedLead.id}/whatsapp`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ customPrompt, directText }),
    });

    const payload = await response.json().catch(() => null);
    setBusy(false);

    if (!response.ok) {
      setFeedback(payload?.error ?? "No se pudo enviar el mensaje.");
      return;
    }

    setFeedback("Mensaje enviado por WhatsApp y seguimiento actualizado.");
    if (input?.resetDraft !== false) {
      setDraft("");
    }
    router.refresh();
  }

  async function toggleLeadAi(enabled: boolean) {
    setBusy(true);
    setFeedback(null);

    const response = await fetch(`/api/admin/leads/${selectedLead.id}/ai`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ enabled }),
    });

    const payload = await response.json().catch(() => null);
    setBusy(false);

    if (!response.ok) {
      setFeedback(payload?.error ?? "No pudimos actualizar la IA de este chat.");
      return;
    }

    setLiveLeads((current) =>
      current.map((lead) =>
        lead.id === selectedLead.id
          ? {
              ...lead,
              aiEnabled: enabled,
              needsResponse: enabled ? false : true,
              aiReplyDraft: enabled
                ? "IA activada para responder automaticamente este chat."
                : "IA pausada en este chat: el equipo responde manualmente.",
              lastActivityAt: new Date().toISOString(),
            }
          : lead
      )
    );
    setFeedback(
      enabled
        ? "IA activada: Props volvera a responder automaticamente este chat."
        : "IA pausada: ahora podes responder manualmente sin que Props conteste solo."
    );
    void syncInboxSnapshot();
  }

  async function sendComparison() {
    if (!selectedLead || compareSelection.length === 0) return;
    const selectedProperties = properties.filter((property) =>
      compareSelection.includes(property.id)
    );
    if (selectedProperties.length === 0) return;
    const message = buildPropertyComparisonMessage(selectedLead, selectedProperties);
    await sendMessage({ directText: message });
    setCompareOpen(false);
    setCompareSelection([]);
  }

  async function scheduleVisit() {
    if (!visitLead) return;

    setBusy(true);
    setFeedback(null);

    const response = await fetch(`/api/admin/leads/${visitLead.id}/visit`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(visitForm),
    });

    const payload = await response.json().catch(() => null);
    setBusy(false);

    if (!response.ok) {
      setFeedback(payload?.error ?? "No se pudo agendar la visita.");
      return;
    }

    setVisitLead(null);
    setVisitForm({ scheduledFor: "", notes: "" });
    setFeedback("Visita agendada y recordatorio operativo creado.");
    router.refresh();
  }

  async function resetConversationMemory() {
    if (!selectedLead || !canResetMemory || selectedLead.agencySlug !== "ceballos") return;

    const confirmed = window.confirm(
      "Esto borra el historial y los datos de calificacion de este contacto para probar desde cero. No borra el WhatsApp del cliente. ¿Continuar?"
    );

    if (!confirmed) return;

    setBusy(true);
    setFeedback(null);

    const response = await fetch(`/api/admin/leads/${selectedLead.id}/memory`, {
      method: "POST",
    });
    const payload = await response.json().catch(() => null);
    setBusy(false);

    if (!response.ok) {
      setFeedback(payload?.error ?? "No pudimos reiniciar la conversacion.");
      return;
    }

    setFeedback("Memoria reiniciada. El proximo mensaje de este WhatsApp empieza desde cero.");
    router.refresh();
  }

  const activeContactContext =
    contactContext ?? ({ kind: "commercial", label: "Lead comercial" } as ContactContext);
  const isCommercialLead = activeContactContext.kind === "commercial";

  return (
    <div className="space-y-4">
      <PageHeader
        title="Mensajes"
        description="Consultas, contexto y seguimiento en una sola bandeja."
        action={
          <div className="flex flex-wrap gap-2">
            <Button
              variant={mode === "recepcion" ? "default" : "outline"}
              className="h-9 rounded-2xl px-4"
              onClick={() => setMode("recepcion")}
            >
              Vista rapida
            </Button>
            <Button
              variant={mode === "completo" ? "default" : "outline"}
              className="h-9 rounded-2xl px-4"
              onClick={() => setMode("completo")}
            >
              Vista completa
            </Button>
          </div>
        }
      />

      {feedback ? (
        <div className="rounded-2xl border bg-background px-4 py-3 text-sm text-muted-foreground">
          {feedback}
        </div>
      ) : null}

      <div className="grid gap-4 xl:h-[calc(100vh-132px)] xl:min-h-[640px] xl:grid-cols-[280px_minmax(430px,1fr)_300px] xl:overflow-hidden">
        <div className="flex min-h-0 flex-col overflow-hidden rounded-[26px] border bg-card shadow-sm">
          <div className="border-b px-4 py-3">
            <h3 className="font-semibold">Conversaciones</h3>
          </div>
          <ScrollArea className="min-h-[360px] flex-1">
            <div className="space-y-2 p-2.5">
              {filteredLeads.map((lead) => {
                const thread = messagesByLead.get(lead.id) ?? [];
                const lastMessage = thread[thread.length - 1];
                const preview = lastMessage?.content || lead.lastCustomerMessage;
                const status = deriveConversationStatus(lead);
                const channel = deriveSourceChannel(lead.source);

                return (
                  <button
                    key={lead.id}
                    className={cn(
                      "w-full rounded-2xl border p-3 text-left transition-all",
                      selectedLead.id === lead.id
                        ? "border-primary bg-primary/5"
                        : "bg-background hover:bg-muted/40"
                    )}
                    onClick={() => setSelectedId(lead.id)}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate font-medium">{lead.fullName}</p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      <Badge variant="outline" className="rounded-full">
                        {channel}
                      </Badge>
                      <Badge
                        variant="outline"
                        className={cn(
                          "rounded-full",
                          lead.aiEnabled
                            ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                            : "border-slate-200 bg-slate-50 text-slate-600"
                        )}
                      >
                        {lead.aiEnabled ? "IA activa" : "IA pausada"}
                      </Badge>
                      <Badge className={`border-0 ${conversationStatusTone[status]}`}>
                        {status}
                      </Badge>
                        </div>
                      </div>
                      {lead.needsResponse ? (
                        <span className="rounded-full bg-primary px-2 py-1 text-xs font-semibold text-primary-foreground">
                          Nuevo
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-3 line-clamp-1 text-xs font-medium text-muted-foreground">
                      {lead.propertyTitle || "Consulta general"}
                    </p>
                    <p className="mt-1 line-clamp-2 text-sm leading-5 text-muted-foreground">{preview}</p>
                  </button>
                );
              })}
            </div>
          </ScrollArea>
        </div>

        <div className="flex min-h-[620px] min-w-0 flex-col overflow-hidden rounded-[26px] border bg-card shadow-sm xl:min-h-0">
          <div className="flex items-center justify-between border-b px-4 py-3">
            <div className="flex min-w-0 items-center gap-3">
              <Avatar className="rounded-2xl">
                <AvatarFallback className="rounded-2xl bg-primary/10 text-primary">
                  {selectedLead.fullName.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <p className="truncate font-semibold">{selectedLead.fullName}</p>
                <p className="truncate text-sm text-muted-foreground">
                  {selectedLead.propertyTitle || "Consulta general"} ·{" "}
                  {selectedLead.phone || "Sin telefono"}
                </p>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <Button
                type="button"
                variant={selectedLead.aiEnabled ? "default" : "outline"}
                size="sm"
                className={cn(
                  "rounded-full",
                  selectedLead.aiEnabled ? "bg-emerald-600 hover:bg-emerald-700" : ""
                )}
                disabled={busy}
                onClick={() => void toggleLeadAi(!selectedLead.aiEnabled)}
              >
                {busy ? <Loader2 className="size-4 animate-spin" /> : <Bot className="size-4" />}
                {selectedLead.aiEnabled ? "IA activa" : "IA pausada"}
              </Button>
              {canResetMemory && selectedLead.agencySlug === "ceballos" ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="rounded-full"
                  disabled={busy}
                  onClick={() => void resetConversationMemory()}
                >
                  {busy ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <RotateCcw className="size-4" />
                  )}
                  Reiniciar memoria
                </Button>
              ) : null}
              <Badge className={`border-0 ${conversationStatusTone[deriveConversationStatus(selectedLead)]}`}>
                {deriveConversationStatus(selectedLead)}
              </Badge>
            </div>
          </div>

          <div ref={messageScrollRef} className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
            <div className="space-y-3">
              {selectedMessages.length > 0 ? (
                selectedMessages.map((message) => (
                  <MessageBubble
                    key={message.id}
                    role={message.senderRole === "customer" ? "customer" : "assistant"}
                    title={senderRoleLabel[message.senderRole]}
                    channel={message.channel}
                    content={message.content}
                    createdAt={message.createdAt}
                  />
                ))
              ) : (
                <MessageBubble
                  role="customer"
                  title="Ultimo mensaje del cliente"
                  channel="web"
                  content={selectedLead.lastCustomerMessage}
                  createdAt={selectedLead.lastActivityAt}
                />
              )}

              <div ref={bottomRef} />
            </div>
          </div>

          <div className="border-t bg-card/95 px-4 py-3">
            {selectedLead.aiEnabled ? (
              <div className="mb-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
                La IA esta respondiendo este chat. Para intervenir vos, primero pausala desde el boton
                <span className="font-semibold"> IA activa</span>.
              </div>
            ) : (
              <div className="mb-3 rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                IA pausada en este chat. Las respuestas salen solo cuando el equipo las envia manualmente.
              </div>
            )}
            <div className="mb-3 flex gap-2 overflow-x-auto pb-1">
              {quickReplies.map((reply) => (
                <Button
                  key={reply.key}
                  variant={reply.tone ?? "outline"}
                  size="sm"
                  className="shrink-0 rounded-full"
                  disabled={busy || selectedLead.aiEnabled}
                  onClick={() => void sendMessage({ directText: reply.message })}
                >
                  {reply.label}
                </Button>
              ))}
              {isCommercialLead && similarProperties.length >= 2 ? (
                <Button
                  variant="outline"
                  size="sm"
                  className="shrink-0 rounded-full"
                  disabled={busy || selectedLead.aiEnabled}
                  onClick={() => setCompareOpen(true)}
                >
                  Comparar propiedades
                </Button>
              ) : null}
            </div>

            <div className="rounded-[22px] border bg-background p-2.5">
              <div className="mb-2 flex items-center gap-2 text-xs font-medium text-muted-foreground">
                <Bot className="size-4 text-primary" />
                Mensaje manual
              </div>
              <div className="flex items-center gap-2">
                <Input
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  placeholder={
                    selectedLead.aiEnabled
                      ? "Pausa la IA para responder manualmente..."
                      : "Escribi el mensaje exacto que queres enviar por WhatsApp..."
                  }
                  disabled={selectedLead.aiEnabled}
                  className="border-0 shadow-none focus-visible:ring-0"
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && !event.shiftKey) {
                      event.preventDefault();
                      void sendMessage();
                    }
                  }}
                />
                <Button
                  variant="outline"
                  className="rounded-2xl"
                  disabled={busy || selectedLead.aiEnabled || !draft.trim()}
                  onClick={() => void sendMessage({ customPrompt: draft.trim(), resetDraft: false })}
                >
                  IA
                </Button>
                <Button
                  className="rounded-2xl"
                  disabled={busy || selectedLead.aiEnabled || !draft.trim()}
                  onClick={() => void sendMessage()}
                >
                  {busy ? <Loader2 className="size-4 animate-spin" /> : <SendHorizonal className="size-4" />}
                  Enviar
                </Button>
              </div>
            </div>
          </div>
        </div>

        <div className="min-h-0 space-y-3 xl:overflow-y-auto xl:pr-1">
          <ContactProfilePanel
            context={activeContactContext}
            lead={selectedLead}
            profile={selectedProfile}
            timeline={selectedTimeline}
          />

          <section className={cn("rounded-[26px] border bg-card p-4 shadow-sm", !isCommercialLead && "hidden")}>
            <div className="flex items-center gap-2">
              <Sparkles className="size-4 text-primary" />
              <h3 className="font-semibold">Ficha del cliente</h3>
            </div>
            <div className="mt-4 space-y-3 text-sm text-muted-foreground">
              <div className="rounded-2xl border bg-muted/20 p-3">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                  Propiedad
                </p>
                <div className="mt-2 flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="line-clamp-2 font-medium text-foreground">
                      {selectedLead.propertyTitle || "Consulta general"}
                    </p>
                    <p className="mt-1 line-clamp-1 text-xs">
                      {selectedLead.propertyLocation || "Sin ubicacion"}
                    </p>
                  </div>
                  {selectedLead.propertyId ? (
                    <Link
                      href={buildShortPropertyPath(selectedLead.agencySlug, selectedLead.propertyId)}
                      target="_blank"
                      className="inline-flex size-8 shrink-0 items-center justify-center rounded-full border bg-background"
                    >
                      <ArrowRight className="size-4" />
                    </Link>
                  ) : null}
                </div>
              </div>
              <div>
                <p className="font-medium text-foreground">Que busca</p>
                <p className="mt-1 line-clamp-2">{selectedProfile?.whatTheySeek}</p>
              </div>
              <div>
                <p className="font-medium text-foreground">Propiedades vistas</p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {selectedProfile?.viewedProperties.length ? (
                    selectedProfile.viewedProperties.slice(0, 2).map((item) => (
                      <Badge key={item} variant="outline" className="max-w-full rounded-full">
                        <span className="truncate">{item}</span>
                      </Badge>
                    ))
                  ) : (
                    <p>No hay otras fichas vinculadas.</p>
                  )}
                </div>
              </div>
              <div>
                <p className="font-medium text-foreground">Que pregunto</p>
                <ul className="mt-1 space-y-1.5">
                  {selectedProfile?.whatTheyAsked.length ? (
                    selectedProfile.whatTheyAsked.map((item) => (
                      <li key={item} className="line-clamp-2">- {item}</li>
                    ))
                  ) : (
                    <li>- Todavia no tenemos preguntas anteriores guardadas.</li>
                  )}
                </ul>
              </div>
              <div>
                <p className="font-medium text-foreground">Que le respondimos</p>
                <ul className="mt-1 space-y-1.5">
                  {selectedProfile?.whatWeAnswered.length ? (
                    selectedProfile.whatWeAnswered.map((item) => (
                      <li key={item} className="line-clamp-2">- {item}</li>
                    ))
                  ) : (
                    <li>- Todavia no hay respuestas salientes registradas.</li>
                  )}
                </ul>
              </div>
              <div>
                <p className="font-medium text-foreground">Objeciones</p>
                <ul className="mt-1 space-y-1.5">
                  {selectedProfile?.objections.length ? (
                    selectedProfile.objections.map((item) => (
                      <li key={item} className="line-clamp-2">- {item}</li>
                    ))
                  ) : (
                    <li>- No detecte objeciones fuertes por ahora.</li>
                  )}
                </ul>
              </div>
              <div className="rounded-2xl border bg-muted/20 p-3">
                <p className="font-medium text-foreground">
                  Probabilidad de cierre: {selectedProfile?.closeProbability.label}
                </p>
                <p className="mt-1">
                  {selectedProfile?.closeProbability.percentage}% ·{" "}
                  {selectedProfile?.closeProbability.detail}
                </p>
              </div>
              <div className="rounded-2xl border bg-primary/5 p-3 text-primary">
                <p className="font-medium">Siguiente accion sugerida</p>
                <p className="mt-1 line-clamp-3 text-sm text-muted-foreground">
                  {selectedProfile?.nextAction}
                </p>
              </div>
              <PersonTimeline
                compact
                title="Timeline del contacto"
                events={selectedTimeline}
                empty="Todavía no hay movimientos suficientes para este contacto."
              />
            </div>
          </section>

          <section className={cn("rounded-[30px] border bg-card p-5 shadow-sm", !isCommercialLead && "hidden")}>
            <div className="flex items-center gap-2">
              <MessageCircle className="size-4 text-primary" />
              <h3 className="font-semibold">Ademas de esta propiedad, mostrale estas</h3>
            </div>
            <div className="mt-4 space-y-3">
              {similarProperties.length > 0 ? (
                similarProperties.map((property) => (
                  <div key={property.id} className="rounded-2xl border p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-medium">{property.title}</p>
                        <p className="text-sm text-muted-foreground">{property.location}</p>
                        <p className="mt-2 text-sm">
                          {formatMoney(property.price, property.currency)}
                        </p>
                      </div>
                      <Link
                        href={buildShortPropertyPath(selectedLead.agencySlug, property.id)}
                        target="_blank"
                        className="inline-flex size-10 items-center justify-center rounded-full border bg-background"
                      >
                        <ArrowRight className="size-4" />
                      </Link>
                    </div>
                  </div>
                ))
              ) : (
                <div className="rounded-2xl border border-dashed p-4 text-sm text-muted-foreground">
                  No encontre parecidas claras con el inventario actual.
                </div>
              )}
            </div>
          </section>

          <section className={cn("rounded-[30px] border bg-card p-5 shadow-sm", !isCommercialLead && "hidden")}>
            <div className="flex items-center gap-2">
              <CheckCheck className="size-4 text-primary" />
              <h3 className="font-semibold">Visita y seguimiento</h3>
            </div>
            <div className="mt-4 space-y-3 text-sm text-muted-foreground">
              {visits.filter((visit) => visit.leadId === selectedLead.id).length > 0 ? (
                visits
                  .filter((visit) => visit.leadId === selectedLead.id)
                  .slice(0, 2)
                  .map((visit) => (
                    <div key={visit.id} className="rounded-2xl border p-4">
                      <p className="font-medium text-foreground">{visit.status}</p>
                      <p className="mt-1">
                        {formatShortDate(visit.scheduledFor.slice(0, 10))} ·{" "}
                        {new Date(visit.scheduledFor).toLocaleTimeString("es-AR", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                      {visit.notes ? <p className="mt-2">{visit.notes}</p> : null}
                    </div>
                  ))
              ) : (
                <div className="rounded-2xl border border-dashed p-4">
                  Aun no tiene visitas registradas. Si avanza, agenda una desde aca.
                </div>
              )}
              <Button
                variant="outline"
                className="w-full rounded-2xl"
                onClick={() => {
                  setVisitLead(selectedLead);
                  setVisitForm({ scheduledFor: "", notes: "" });
                }}
              >
                <CalendarPlus2 className="size-4" />
                Agendar visita
              </Button>
            </div>
          </section>
        </div>
      </div>

      <Dialog open={compareOpen} onOpenChange={setCompareOpen}>
        <DialogContent className="max-w-2xl rounded-[30px]">
          <DialogHeader>
            <DialogTitle>Comparar propiedades para enviar al cliente</DialogTitle>
            <DialogDescription>
              Selecciona hasta 3 opciones y Props arma un resumen claro para WhatsApp.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3">
            {similarProperties.map((property) => {
              const active = compareSelection.includes(property.id);
              return (
                <button
                  key={property.id}
                  type="button"
                  className={cn(
                    "rounded-2xl border p-4 text-left transition-colors",
                    active ? "border-primary bg-primary/5" : "hover:bg-muted/30"
                  )}
                  onClick={() =>
                    setCompareSelection((current) =>
                      active
                        ? current.filter((id) => id !== property.id)
                        : current.length < 3
                          ? [...current, property.id]
                          : current
                    )
                  }
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium">{property.title}</p>
                      <p className="text-sm text-muted-foreground">{property.location}</p>
                      <p className="mt-1 text-sm">{formatMoney(property.price, property.currency)}</p>
                    </div>
                    <Badge variant={active ? "default" : "outline"} className="rounded-full">
                      {active ? "Seleccionada" : "Agregar"}
                    </Badge>
                  </div>
                </button>
              );
            })}
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" className="rounded-2xl" onClick={() => setCompareOpen(false)}>
              Cancelar
            </Button>
            <Button
              className="rounded-2xl"
              disabled={compareSelection.length === 0 || busy}
              onClick={() => void sendComparison()}
            >
              {busy ? <Loader2 className="size-4 animate-spin" /> : null}
              Enviar comparacion
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(visitLead)}
        onOpenChange={(open) => {
          if (!open) {
            setVisitLead(null);
            setVisitForm({ scheduledFor: "", notes: "" });
          }
        }}
      >
        <DialogContent className="max-w-xl rounded-[30px]">
          <DialogHeader>
            <DialogTitle>Agendar visita</DialogTitle>
            <DialogDescription>
              Deja fecha, hora y notas para que el equipo pueda confirmar la visita sin perder contexto.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4">
            <div className="rounded-2xl border bg-muted/20 p-4 text-sm">
              <p className="font-medium text-foreground">{visitLead?.fullName}</p>
              <p className="mt-1 text-muted-foreground">
                {visitLead?.propertyTitle || "Consulta general"}
              </p>
            </div>

            <label className="grid gap-2 text-sm">
              <span className="font-medium">Fecha y hora</span>
              <Input
                type="datetime-local"
                value={visitForm.scheduledFor}
                onChange={(event) =>
                  setVisitForm((current) => ({
                    ...current,
                    scheduledFor: event.target.value,
                  }))
                }
              />
            </label>

            <label className="grid gap-2 text-sm">
              <span className="font-medium">Notas internas</span>
              <Textarea
                rows={4}
                value={visitForm.notes}
                onChange={(event) =>
                  setVisitForm((current) => ({
                    ...current,
                    notes: event.target.value,
                  }))
                }
                placeholder="Ej. confirmar una hora antes, avisar expensas, llevar llave de cochera..."
              />
            </label>
          </div>

          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              className="rounded-2xl"
              onClick={() => {
                setVisitLead(null);
                setVisitForm({ scheduledFor: "", notes: "" });
              }}
            >
              Cancelar
            </Button>
            <Button
              className="rounded-2xl"
              disabled={busy || !visitForm.scheduledFor}
              onClick={() => void scheduleVisit()}
            >
              {busy ? <Loader2 className="size-4 animate-spin" /> : <CalendarPlus2 className="size-4" />}
              Guardar visita
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function MessageBubble({
  role,
  title,
  channel,
  content,
  createdAt,
}: {
  role: "customer" | "assistant";
  title: string;
  channel: "whatsapp" | "web" | "instagram" | "crm";
  content: string;
  createdAt: string;
}) {
  return (
    <div className={cn("flex", role === "assistant" ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[78%] rounded-[22px] px-4 py-3 text-sm leading-6 shadow-sm",
          role === "assistant"
            ? "bg-primary text-primary-foreground"
            : "border bg-background"
        )}
      >
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <p className="text-[11px] uppercase tracking-[0.2em] opacity-80">{title}</p>
          <span
            className={cn(
              "rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em]",
              role === "assistant"
                ? "bg-white/15 text-white"
                : channelTone[channel]
            )}
          >
            {channelLabel[channel]}
          </span>
          <span className="text-[10px] opacity-70">
            {new Date(createdAt).toLocaleString("es-AR", {
              day: "2-digit",
              month: "2-digit",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
        </div>
        <p>{content}</p>
      </div>
    </div>
  );
}

function ContactProfilePanel({
  context,
  lead,
  profile,
  timeline,
}: {
  context: ContactContext;
  lead: CrmLeadSummary;
  profile: ReturnType<typeof buildLeadProfileSnapshot> | null;
  timeline: PersonTimelineEvent[];
}) {
  if (context.kind === "commercial") {
    return null;
  }

  const asked = profile?.whatTheyAsked.length
    ? profile.whatTheyAsked.slice(0, 3)
    : ["Todavia no tenemos preguntas anteriores guardadas."];
  const answered = profile?.whatWeAnswered.length
    ? profile.whatWeAnswered.slice(0, 3)
    : ["Todavia no hay respuestas salientes registradas."];

  if (context.kind === "tenant") {
    const tenant = context.tenant;
    return (
      <section className="rounded-[26px] border bg-card p-4 shadow-sm">
        <PanelTitle title="Ficha del inquilino" badge="Administracion" />
        <div className="mt-4 space-y-3 text-sm text-muted-foreground">
          <PropertyContextCard
            agencySlug={lead.agencySlug}
            propertyId={tenant.propertyId}
            title={tenant.propertyTitle}
            location={tenant.propertyLocation}
          />
          <div className="grid grid-cols-2 gap-2">
            <InfoTile label="Alquiler actual" value={formatMoney(tenant.currentRent, "ARS")} />
            <InfoTile
              label="Proximo ajuste"
              value={tenant.nextAdjustmentDate ? formatShortDate(tenant.nextAdjustmentDate) : "Sin fecha"}
            />
            <InfoTile label="Contrato" value={tenant.contractStatus} />
            <InfoTile
              label="Cobranza"
              value={tenant.latestCollectionStatus ?? "Sin registrar"}
              detail={tenant.latestCollectionMonth ?? undefined}
            />
          </div>
          <ConversationSummary asked={asked} answered={answered} />
          <div className="rounded-2xl border bg-primary/5 p-3">
            <p className="font-medium text-foreground">Siguiente accion sugerida</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {tenant.latestCollectionStatus === "Mora" || tenant.latestCollectionStatus === "Pendiente"
                ? "Confirmar pago o pedir comprobante antes de seguir la gestion."
                : "Responder solo la consulta administrativa de este contrato."}
            </p>
          </div>
          <PersonTimeline
            compact
            title="Timeline del inquilino"
            events={timeline}
            empty="Todavia no hay movimientos suficientes para este inquilino."
          />
        </div>
      </section>
    );
  }

  if (context.kind === "owner") {
    const owner = context.owner;
    return (
      <section className="rounded-[26px] border bg-card p-4 shadow-sm">
        <PanelTitle title="Ficha del propietario" badge="Administracion" />
        <div className="mt-4 space-y-3 text-sm text-muted-foreground">
          <PropertyContextCard
            agencySlug={lead.agencySlug}
            propertyId={owner.propertyId}
            title={owner.propertyTitle}
            location={owner.propertyLocation}
          />
          <div className="grid grid-cols-2 gap-2">
            <InfoTile label="Participacion" value={`${owner.participationPercent}%`} />
            <InfoTile label="Alquiler base" value={formatMoney(owner.currentRent, "ARS")} />
            <InfoTile
              label="Ultima liquidacion"
              value={owner.latestSettlementMonth ?? "Sin liquidar"}
            />
            <InfoTile
              label="Neto propietario"
              value={
                owner.latestOwnerPayoutAmount
                  ? formatMoney(owner.latestOwnerPayoutAmount, "ARS")
                  : "A confirmar"
              }
            />
          </div>
          <ConversationSummary asked={asked} answered={answered} />
          <div className="rounded-2xl border bg-primary/5 p-3">
            <p className="font-medium text-foreground">Siguiente accion sugerida</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Responder con datos de liquidacion, autorizacion o estado de la propiedad. No ofrecer inventario comercial.
            </p>
          </div>
          <PersonTimeline
            compact
            title="Timeline del propietario"
            events={timeline}
            empty="Todavia no hay movimientos suficientes para este propietario."
          />
        </div>
      </section>
    );
  }

  return (
    <section className="rounded-[26px] border bg-card p-4 shadow-sm">
      <PanelTitle title="Ficha administrativa" badge="Sin identificar" />
      <div className="mt-4 space-y-3 text-sm text-muted-foreground">
        <PropertyContextCard
          agencySlug={lead.agencySlug}
          propertyId={lead.propertyId}
          title={lead.propertyTitle || "Consulta general"}
          location={lead.propertyLocation || "Sin ubicacion"}
        />
        <ConversationSummary asked={asked} answered={answered} />
        <div className="rounded-2xl border bg-amber-500/10 p-3 text-amber-700">
          <p className="font-medium">Falta identificar el contacto</p>
          <p className="mt-1 text-sm">
            Antes de responder, pedi propiedad, contrato o titular para no mezclar datos de otra persona.
          </p>
        </div>
        <PersonTimeline
          compact
          title="Timeline"
          events={timeline}
          empty="Todavia no hay movimientos suficientes para este contacto."
        />
      </div>
    </section>
  );
}

function PanelTitle({ title, badge }: { title: string; badge: string }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <div className="flex items-center gap-2">
        <Sparkles className="size-4 text-primary" />
        <h3 className="font-semibold">{title}</h3>
      </div>
      <Badge variant="outline" className="rounded-full">
        {badge}
      </Badge>
    </div>
  );
}

function PropertyContextCard({
  agencySlug,
  propertyId,
  title,
  location,
}: {
  agencySlug: string;
  propertyId?: string | null;
  title: string;
  location: string;
}) {
  return (
    <div className="rounded-2xl border bg-muted/20 p-3">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
        Propiedad vinculada
      </p>
      <div className="mt-2 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="line-clamp-2 font-medium text-foreground">{title}</p>
          <p className="mt-1 line-clamp-1 text-xs">{location}</p>
        </div>
        {propertyId ? (
          <Link
            href={buildShortPropertyPath(agencySlug, propertyId)}
            target="_blank"
            className="inline-flex size-8 shrink-0 items-center justify-center rounded-full border bg-background"
          >
            <ArrowRight className="size-4" />
          </Link>
        ) : null}
      </div>
    </div>
  );
}

function InfoTile({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail?: string;
}) {
  return (
    <div className="rounded-2xl border bg-muted/20 p-3">
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 font-semibold text-foreground">{value}</p>
      {detail ? <p className="mt-1 text-xs">{detail}</p> : null}
    </div>
  );
}

function ConversationSummary({
  asked,
  answered,
}: {
  asked: string[];
  answered: string[];
}) {
  return (
    <>
      <div>
        <p className="font-medium text-foreground">Resumen de consulta</p>
        <ul className="mt-1 space-y-1.5">
          {asked.map((item) => (
            <li key={item} className="line-clamp-2">
              - {item}
            </li>
          ))}
        </ul>
      </div>
      <div>
        <p className="font-medium text-foreground">Ultimas respuestas</p>
        <ul className="mt-1 space-y-1.5">
          {answered.map((item) => (
            <li key={item} className="line-clamp-2">
              - {item}
            </li>
          ))}
        </ul>
      </div>
    </>
  );
}
