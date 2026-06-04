"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  CheckCircle2,
  Clock3,
  Copy,
  CreditCard,
  ExternalLink,
  KeyRound,
  Loader2,
  MessageCircle,
  QrCode,
  RefreshCcw,
  Save,
  Smartphone,
  Webhook,
  WifiOff,
} from "lucide-react";

import type { CurrentUserContext } from "@/lib/auth/current-user";
import type { AgencyMessageTemplateSummary } from "@/lib/crm-types";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

type ManagedAgency = {
  id: string;
  slug: string;
  name: string;
  email: string;
  phone: string;
  city: string;
  tagline: string;
  owner_name: string;
  owner_email: string;
  plan?: "Starter" | "Growth" | "Scale";
  status?: "Activa" | "En onboarding";
  messaging_instance: string;
  whatsapp_ai_enabled?: boolean;
  business_hours?: string | null;
  website_url?: string | null;
  instagram_url?: string | null;
  facebook_url?: string | null;
};

type ConnectionState = "loading" | "open" | "close" | "error";

type PortalIntegration = {
  id: string;
  portal: "email" | "zonaprop" | "argenprop" | "mercadolibre" | "otro";
  label: string;
  inboundToken: string;
  enabled: boolean;
  lastEventAt: string | null;
};

function normalizeInstance(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function getStatusCopy(state: ConnectionState) {
  switch (state) {
    case "open":
      return {
        label: "Conectado",
        tone: "bg-emerald-500/15 text-emerald-700",
        icon: <CheckCircle2 className="size-4" />,
      };
    case "close":
      return {
        label: "Desconectado",
        tone: "bg-amber-500/15 text-amber-700",
        icon: <WifiOff className="size-4" />,
      };
    case "error":
      return {
        label: "Sin respuesta",
        tone: "bg-red-500/15 text-red-700",
        icon: <WifiOff className="size-4" />,
      };
    default:
      return {
        label: "Verificando",
        tone: "bg-slate-500/15 text-slate-700",
        icon: <Loader2 className="size-4 animate-spin" />,
      };
  }
}

function buildInitialForm(agency: ManagedAgency | null) {
  return {
    email: agency?.email ?? "",
    phone: agency?.phone ?? "",
    city: agency?.city ?? "",
    tagline: agency?.tagline ?? "",
    messagingInstance: agency?.messaging_instance ?? "",
    whatsappAiEnabled: agency?.whatsapp_ai_enabled ?? true,
    businessHours: agency?.business_hours ?? "",
    websiteUrl: agency?.website_url ?? "",
    instagramUrl: agency?.instagram_url ?? "",
    facebookUrl: agency?.facebook_url ?? "",
  };
}

export function AgencySettingsWorkspace({
  currentUser,
  agencies,
}: {
  currentUser: CurrentUserContext;
  agencies: ManagedAgency[];
}) {
  const [selectedSlug, setSelectedSlug] = useState<string>(agencies[0]?.slug ?? "");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
  const [templates, setTemplates] = useState<AgencyMessageTemplateSummary[]>([]);
  const [templatesBusy, setTemplatesBusy] = useState(false);
  const [subscriptionBusy, setSubscriptionBusy] = useState(false);
  const [subscriptionError, setSubscriptionError] = useState<string | null>(null);
  const [portalIntegrations, setPortalIntegrations] = useState<PortalIntegration[]>([]);
  const [portalBusy, setPortalBusy] = useState(false);
  const [portalMessage, setPortalMessage] = useState<string | null>(null);
  const [portalError, setPortalError] = useState<string | null>(null);
  const [portalEndpoint, setPortalEndpoint] = useState("/api/integrations/portal-leads");
  const selectedAgency = useMemo(
    () => agencies.find((agency) => agency.slug === selectedSlug) ?? null,
    [agencies, selectedSlug]
  );
  const [form, setForm] = useState(() => buildInitialForm(selectedAgency));

  const [connectionState, setConnectionState] = useState<ConnectionState>("loading");
  const [connectionMeta, setConnectionMeta] = useState<{
    owner?: string;
    profileName?: string;
    messagingInstance?: string;
  } | null>(null);
  const [qrOpen, setQrOpen] = useState(false);
  const [qrLoading, setQrLoading] = useState(false);
  const [qrError, setQrError] = useState<string | null>(null);
  const [qrImage, setQrImage] = useState<string | null>(null);
  const [pairingCode, setPairingCode] = useState<string | null>(null);
  const [qrCount, setQrCount] = useState<number>(0);
  const qrSessionStartedRef = useRef(false);

  useEffect(() => {
    setForm(buildInitialForm(selectedAgency));
    setSaveError(null);
    setSaveSuccess(null);
  }, [selectedAgency]);

  useEffect(() => {
    setPortalEndpoint(`${window.location.origin}/api/integrations/portal-leads`);
  }, []);

  useEffect(() => {
    if (!selectedAgency) return;

    let cancelled = false;
    const agencySlug = selectedAgency.slug;

    async function loadTemplates() {
      setTemplatesBusy(true);
      const response = await fetch(
        `/api/admin/templates?agencySlug=${encodeURIComponent(agencySlug)}`,
        { cache: "no-store" }
      );
      const payload = await response.json().catch(() => null);
      if (cancelled) return;
      setTemplatesBusy(false);
      if (response.ok) {
        setTemplates(payload?.templates ?? []);
      }
    }

    void loadTemplates();

    return () => {
      cancelled = true;
    };
  }, [selectedAgency]);

  useEffect(() => {
    if (!selectedAgency) return;

    let cancelled = false;
    const agencySlug = selectedAgency.slug;

    async function loadPortalIntegrations() {
      setPortalBusy(true);
      setPortalError(null);

      const response = await fetch(
        `/api/admin/portal-integrations?agencySlug=${encodeURIComponent(agencySlug)}`,
        { cache: "no-store" }
      );
      const payload = await response.json().catch(() => null);

      if (cancelled) return;
      setPortalBusy(false);

      if (!response.ok) {
        setPortalError(payload?.error ?? "No se pudieron cargar las integraciones.");
        return;
      }

      setPortalIntegrations(payload?.integrations ?? []);
    }

    void loadPortalIntegrations();

    return () => {
      cancelled = true;
    };
  }, [selectedAgency]);

  const loadStatus = useCallback(async () => {
    if (!selectedAgency) {
      setConnectionState("error");
      return;
    }

    setConnectionState((prev) => (prev === "open" ? prev : "loading"));

    try {
      const response = await fetch(
        `/api/admin/evolution/status?agencySlug=${encodeURIComponent(selectedAgency.slug)}`,
        { cache: "no-store" }
      );
      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(payload?.error ?? "No se pudo consultar el estado de WhatsApp.");
      }

      const state = payload?.connection?.instance?.state;
      setConnectionState(state === "open" ? "open" : "close");
      setConnectionMeta({
        owner: payload?.connection?.instance?.owner,
        profileName: payload?.connection?.instance?.profileName,
        messagingInstance: payload?.agency?.messagingInstance,
      });
    } catch {
      setConnectionState("error");
    }
  }, [selectedAgency]);

  useEffect(() => {
    void loadStatus();
    const interval = setInterval(() => {
      void loadStatus();
    }, 15000);

    return () => clearInterval(interval);
  }, [loadStatus]);

  const loadQr = useCallback(
    async (reconnect = false) => {
      if (!selectedAgency) {
        return;
      }

      setQrLoading(true);
      setQrError(null);

      try {
        const response = await fetch(
          reconnect ? "/api/admin/evolution/reconnect" : `/api/admin/evolution/qr?agencySlug=${encodeURIComponent(selectedAgency.slug)}`,
          reconnect
            ? {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({ agencySlug: selectedAgency.slug }),
              }
            : { cache: "no-store" }
        );
        const payload = await response.json().catch(() => null);

        if (!response.ok) {
          throw new Error(payload?.error ?? "No se pudo generar el QR.");
        }

        const qr = payload?.qr ?? {};
        const state = qr?.instance?.state ?? qr?.status;

        if (state === "open") {
          setConnectionState("open");
          setQrImage(null);
          setPairingCode(null);
          return;
        }

        setConnectionState("close");
        setQrImage(qr.base64 ?? (qr.code ? `data:image/png;base64,${qr.code}` : null));
        setPairingCode(qr.pairingCode ?? null);
        setQrCount(Number(qr.count ?? 0));
      } catch (error) {
        setQrError(error instanceof Error ? error.message : "No se pudo generar el QR.");
      } finally {
        setQrLoading(false);
      }
    },
    [selectedAgency]
  );

  useEffect(() => {
    if (!qrOpen) {
      return;
    }

    if (!qrSessionStartedRef.current) {
      qrSessionStartedRef.current = true;
      void loadQr(false);
    }

    const interval = setInterval(() => {
      void loadQr(false);
    }, 10000);

    return () => clearInterval(interval);
  }, [connectionState, loadQr, qrOpen]);

  async function handleSave() {
    if (!selectedAgency) {
      return;
    }

    setSaving(true);
    setSaveError(null);
    setSaveSuccess(null);

    const response = await fetch("/api/admin/agency-settings", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        agencySlug: selectedAgency.slug,
        email: form.email,
        phone: form.phone,
        city: form.city,
        tagline: form.tagline,
        websiteUrl: form.websiteUrl,
        instagramUrl: form.instagramUrl,
        facebookUrl: form.facebookUrl,
        businessHours: form.businessHours,
        messagingInstance: normalizeInstance(form.messagingInstance),
        whatsappAiEnabled: form.whatsappAiEnabled,
      }),
    });

    const payload = await response.json().catch(() => null);

    if (!response.ok) {
      setSaving(false);
      setSaveError(payload?.error ?? "No se pudo guardar la configuracion.");
      return;
    }

    setSaving(false);
    setSaveSuccess("Ajustes guardados.");
    setForm((prev) => ({
      ...prev,
      messagingInstance: payload?.agency?.messaging_instance ?? prev.messagingInstance,
    }));
    await loadStatus();
  }

  async function handleSaveTemplates() {
    if (!selectedAgency) return;
    setTemplatesBusy(true);
    setSaveError(null);
    setSaveSuccess(null);

    const response = await fetch("/api/admin/templates", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        agencySlug: selectedAgency.slug,
        templates: templates.map((template) => ({
          templateKey: template.templateKey,
          label: template.label,
          body: template.body,
        })),
      }),
    });

    const payload = await response.json().catch(() => null);
    setTemplatesBusy(false);

    if (!response.ok) {
      setSaveError(payload?.error ?? "No se pudieron guardar las plantillas.");
      return;
    }

    setTemplates(payload?.templates ?? templates);
    setSaveSuccess("Plantillas guardadas.");
  }

  async function handleSubscribe() {
    if (!selectedAgency) return;
    setSubscriptionBusy(true);
    setSubscriptionError(null);

    const response = await fetch("/api/admin/subscriptions/mercadopago", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ agencySlug: selectedAgency.slug }),
    });

    const payload = await response.json().catch(() => null);
    setSubscriptionBusy(false);

    if (!response.ok || !payload?.checkoutUrl) {
      setSubscriptionError(
        [payload?.error, payload?.detail].filter(Boolean).join(" ") ||
          "No se pudo iniciar la suscripcion."
      );
      return;
    }

    window.location.href = payload.checkoutUrl;
  }

  async function handleCopyPortalText(text: string, label: string) {
    await navigator.clipboard.writeText(text);
    setPortalMessage(`${label} copiado.`);
    setTimeout(() => setPortalMessage(null), 2500);
  }

  async function handleRegeneratePortalToken(portal: PortalIntegration["portal"]) {
    if (!selectedAgency) return;
    setPortalBusy(true);
    setPortalError(null);
    setPortalMessage(null);

    const response = await fetch("/api/admin/portal-integrations", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        agencySlug: selectedAgency.slug,
        portal,
        action: "regenerate_token",
      }),
    });

    const payload = await response.json().catch(() => null);
    setPortalBusy(false);

    if (!response.ok) {
      setPortalError(payload?.error ?? "No se pudo generar un nuevo token.");
      return;
    }

    setPortalIntegrations((current) =>
      current.map((integration) =>
        integration.portal === portal ? payload.integration : integration
      )
    );
    setPortalMessage("Clave actualizada. Si ya estaba conectada, reemplazala en la integracion externa.");
  }

  const statusCopy = getStatusCopy(connectionState);

  return (
    <div className="space-y-8">
      <PageHeader
        title="Ajustes"
        description="Ajusta los datos operativos de la inmobiliaria y deja conectado su WhatsApp para responder consultas y enviar avisos."
      />

      {currentUser.profile.role === "superadmin" && agencies.length > 1 ? (
        <Card className="rounded-[28px] border-0 shadow-sm">
          <CardContent className="p-5">
            <div className="grid gap-2 md:max-w-sm">
              <label className="text-sm font-medium">Inmobiliaria</label>
              <select
                className="flex h-11 w-full rounded-xl border bg-background px-3 text-sm outline-none"
                value={selectedSlug}
                onChange={(event) => setSelectedSlug(event.target.value)}
              >
                {agencies.map((agency) => (
                  <option key={agency.id} value={agency.slug}>
                    {agency.name}
                  </option>
                ))}
              </select>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <Card className="rounded-[32px] border-0 shadow-sm">
          <CardHeader>
            <CardTitle>Perfil de la inmobiliaria</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-5 md:grid-cols-2">
            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-medium">Nombre</label>
              <Input value={selectedAgency?.name ?? ""} disabled />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Email comercial</label>
              <Input
                value={form.email}
                onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Teléfono</label>
              <Input
                value={form.phone}
                onChange={(event) => setForm((prev) => ({ ...prev, phone: event.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Ciudad</label>
              <Input
                value={form.city}
                onChange={(event) => setForm((prev) => ({ ...prev, city: event.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Email del admin</label>
              <Input value={selectedAgency?.owner_email ?? ""} disabled />
            </div>
            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-medium">Texto público de presentación</label>
              <Textarea
                rows={3}
                value={form.tagline}
                onChange={(event) => setForm((prev) => ({ ...prev, tagline: event.target.value }))}
              />
            </div>
            <div className="space-y-2 md:col-span-2 rounded-[24px] border bg-muted/20 p-4">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 rounded-2xl bg-primary/10 p-2 text-primary">
                  <Clock3 className="size-4" />
                </div>
                <div className="flex-1 space-y-2">
                  <label className="text-sm font-semibold">Horarios de atención</label>
                  <Textarea
                    rows={4}
                    value={form.businessHours}
                    onChange={(event) =>
                      setForm((prev) => ({ ...prev, businessHours: event.target.value }))
                    }
                    placeholder="Ej: lunes a viernes de 9 a 18 hs. Sábados de 9 a 13 hs. Domingos cerrado."
                  />
                  <p className="text-xs leading-5 text-muted-foreground">
                    La IA usa este horario solo para responder si la inmobiliaria está abierta o cerrada. Las consultas se siguen atendiendo igual fuera de horario.
                  </p>
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Sitio web</label>
              <Input
                value={form.websiteUrl}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, websiteUrl: event.target.value }))
                }
                placeholder="https://tuinmobiliaria.com"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Instagram</label>
              <Input
                value={form.instagramUrl}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, instagramUrl: event.target.value }))
                }
                placeholder="instagram.com/tuinmobiliaria"
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-medium">Facebook</label>
              <Input
                value={form.facebookUrl}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, facebookUrl: event.target.value }))
                }
                placeholder="facebook.com/tuinmobiliaria"
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-medium">Identificador de WhatsApp</label>
              <Input
                value={form.messagingInstance}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    messagingInstance: normalizeInstance(event.target.value),
                  }))
                }
                placeholder="props-mi-inmobiliaria"
              />
              <p className="text-xs text-muted-foreground">
                Props usa este identificador para mantener conectados los mensajes de WhatsApp de esta inmobiliaria.
              </p>
            </div>
            <div className="md:col-span-2 rounded-[22px] border bg-muted/20 p-4">
              <label className="flex items-start gap-3">
                <input
                  type="checkbox"
                  className="mt-1"
                  checked={form.whatsappAiEnabled}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, whatsappAiEnabled: event.target.checked }))
                  }
                />
                <span>
                  <span className="block text-sm font-semibold">Responder WhatsApp automáticamente con IA</span>
                  <span className="mt-1 block text-sm text-muted-foreground">
                    Si está apagado, Props sigue recibiendo mensajes y mostrándolos en Mensajes, pero no contesta solo. El equipo puede responder manualmente.
                  </span>
                </span>
              </label>
            </div>

            {saveError ? (
              <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 md:col-span-2">
                {saveError}
              </div>
            ) : null}

            {saveSuccess ? (
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 md:col-span-2">
                {saveSuccess}
              </div>
            ) : null}

            <div className="md:col-span-2">
              <Button className="rounded-2xl" onClick={handleSave} disabled={saving}>
                {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
                Guardar cambios
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-[32px] border-0 shadow-sm xl:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Webhook className="size-5 text-primary" />
              Consultas de portales
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid gap-4 lg:grid-cols-[0.85fr_1.15fr]">
              <div className="rounded-[26px] border bg-muted/25 p-4">
                <p className="text-sm font-semibold">URL de recepción</p>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  Usala para que un correo derivado o una integracion directa envie consultas externas a la bandeja de Props.
                </p>
                <div className="mt-4 flex gap-2 rounded-2xl border bg-background p-2">
                  <code className="min-w-0 flex-1 truncate px-2 py-1 text-xs text-muted-foreground">
                    {portalEndpoint}
                  </code>
                  <Button
                    variant="outline"
                    size="sm"
                    className="rounded-xl"
                    onClick={() => void handleCopyPortalText(portalEndpoint, "URL")}
                  >
                    <Copy className="size-3.5" />
                    Copiar
                  </Button>
                </div>
              </div>

              <div className="rounded-[26px] border bg-muted/25 p-4">
                <p className="text-sm font-semibold">Formato esperado</p>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  Enviar por POST: token, portal, nombre, email o telefono, mensaje y, si existe, titulo o link de la propiedad.
                </p>
                <pre className="mt-4 overflow-x-auto rounded-2xl bg-slate-950 p-4 text-xs leading-5 text-slate-100">
{`{
  "token": "TOKEN",
  "portal": "zonaprop",
  "name": "Maria Gomez",
  "phone": "5491123456789",
  "message": "Consulta por visita",
  "propertyTitle": "Depto 2 ambientes"
}`}
                </pre>
              </div>
            </div>

            {portalError ? (
              <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {portalError}
              </div>
            ) : null}

            {portalMessage ? (
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                {portalMessage}
              </div>
            ) : null}

            <div className="grid gap-3 lg:grid-cols-2">
              {portalIntegrations.map((integration) => (
                <div key={integration.id} className="rounded-[24px] border bg-background p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold">{integration.label}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {integration.lastEventAt
                          ? `Ultima consulta: ${new Date(integration.lastEventAt).toLocaleString("es-AR")}`
                          : "Todavia no recibio consultas."}
                      </p>
                    </div>
                    <Badge className="rounded-full border-0 bg-primary/10 px-3 py-1 text-primary">
                      {integration.enabled ? "Activo" : "Pausado"}
                    </Badge>
                  </div>

                  <div className="mt-4 flex gap-2 rounded-2xl border bg-muted/20 p-2">
                    <code className="min-w-0 flex-1 truncate px-2 py-1 text-xs text-muted-foreground">
                      {integration.inboundToken}
                    </code>
                    <Button
                      variant="outline"
                      size="sm"
                      className="rounded-xl"
                      onClick={() => void handleCopyPortalText(integration.inboundToken, "Token")}
                    >
                      <Copy className="size-3.5" />
                      Copiar
                    </Button>
                  </div>

                  <Button
                    variant="ghost"
                    size="sm"
                    className="mt-3 rounded-xl"
                    disabled={portalBusy}
                    onClick={() => void handleRegeneratePortalToken(integration.portal)}
                  >
                    <KeyRound className="size-3.5" />
                    Generar nuevo token
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-[32px] border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageCircle className="size-5 text-primary" />
              WhatsApp
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="flex flex-wrap items-center gap-3">
              <Badge className={`rounded-full border-0 px-3 py-1 ${statusCopy.tone}`}>
                <span className="mr-2 inline-flex">{statusCopy.icon}</span>
                {statusCopy.label}
              </Badge>
              <Badge className="rounded-full border-0 bg-primary/10 px-3 py-1 text-primary">
                {(connectionMeta?.messagingInstance ?? form.messagingInstance) ? "Conexion configurada" : "Sin conexion"}
              </Badge>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-[24px] border bg-muted/25 p-4">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Smartphone className="size-4 text-primary" />
                  Estado del número
                </div>
                <p className="mt-3 text-sm text-muted-foreground">
                  {connectionState === "open"
                    ? "El número está conectado y listo para enviar mensajes y avisos desde Props."
                    : "Si está desconectado, abre el QR y escanealo desde WhatsApp > Dispositivos vinculados."}
                </p>
                {connectionMeta?.profileName ? (
                  <p className="mt-3 text-sm font-medium">
                    Perfil detectado: {connectionMeta.profileName}
                  </p>
                ) : null}
                {connectionMeta?.owner ? (
                  <p className="mt-1 text-xs text-muted-foreground">Owner: {connectionMeta.owner}</p>
                ) : null}
              </div>

              <div className="rounded-[24px] border bg-muted/25 p-4">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Webhook className="size-4 text-primary" />
                  Mensajeria lista
                </div>
                <p className="mt-3 text-sm text-muted-foreground">
                  Al vincular WhatsApp, Props deja listo este número para recibir consultas y enviar avisos automáticos.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <Button className="rounded-2xl" onClick={() => setQrOpen(true)}>
                <QrCode className="size-4" />
                {connectionState === "open" ? "Ver WhatsApp conectado" : "Vincular WhatsApp"}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-[32px] border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="size-5 text-primary" />
              Suscripcion
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="rounded-[28px] border bg-[linear-gradient(135deg,hsl(var(--primary)/0.12),hsl(var(--card))_48%,hsl(var(--muted)/0.35))] p-5">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Plan mensual</p>
                  <p className="mt-2 text-3xl font-semibold">$ 50.000</p>
                  <p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">
                    Incluye panel operativo, portafolio público, automatizaciones de WhatsApp, aumentos, morosos, liquidaciones y asistente IA.
                  </p>
                </div>
                <Badge className="w-fit rounded-full border-0 bg-primary/10 px-3 py-1 text-primary">
                  {selectedAgency?.plan ?? "Starter"}
                </Badge>
              </div>
            </div>

            <div className="grid gap-3 text-sm text-muted-foreground">
              <div className="flex items-start gap-2">
                <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-500" />
                Se abre Mercado Pago para completar el alta con tarjeta o medio disponible.
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-500" />
                La suscripción queda asociada a {selectedAgency?.name ?? "esta inmobiliaria"}.
              </div>
            </div>

            {subscriptionError ? (
              <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {subscriptionError}
              </div>
            ) : null}

            <Button className="w-full rounded-2xl" onClick={handleSubscribe} disabled={subscriptionBusy || !selectedAgency}>
              {subscriptionBusy ? <Loader2 className="size-4 animate-spin" /> : <ExternalLink className="size-4" />}
              Suscribirme con Mercado Pago
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card className="rounded-[32px] border-0 shadow-sm">
        <CardHeader>
          <CardTitle>Plantillas vivas para el equipo</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Cada inmobiliaria puede adaptar sus respuestas base para alquiler, venta, seguimiento, visita y rechazo amable. Props usa este tono al sugerir mensajes.
          </p>
          <div className="grid gap-4 lg:grid-cols-2">
            {templates.map((template) => (
              <div key={template.id} className="rounded-[24px] border bg-background p-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Etiqueta</label>
                  <Input
                    value={template.label}
                    onChange={(event) =>
                      setTemplates((current) =>
                        current.map((item) =>
                          item.id === template.id ? { ...item, label: event.target.value } : item
                        )
                      )
                    }
                  />
                </div>
                <div className="mt-3 space-y-2">
                  <label className="text-sm font-medium">Mensaje base</label>
                  <Textarea
                    rows={5}
                    value={template.body}
                    onChange={(event) =>
                      setTemplates((current) =>
                        current.map((item) =>
                          item.id === template.id ? { ...item, body: event.target.value } : item
                        )
                      )
                    }
                  />
                </div>
              </div>
            ))}
          </div>
          <Button className="rounded-2xl" onClick={handleSaveTemplates} disabled={templatesBusy}>
            {templatesBusy ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
            Guardar plantillas
          </Button>
        </CardContent>
      </Card>

      <Dialog
        open={qrOpen}
        onOpenChange={(nextOpen) => {
          setQrOpen(nextOpen);
          if (!nextOpen) {
            qrSessionStartedRef.current = false;
            setQrError(null);
            setQrImage(null);
            setPairingCode(null);
            void loadStatus();
          }
        }}
      >
        <DialogContent className="max-w-xl rounded-[32px] p-0">
          <div className="p-6 sm:p-8">
            <DialogHeader>
              <DialogTitle>Vincular WhatsApp</DialogTitle>
              <DialogDescription>
                Escaneá el QR desde WhatsApp en el teléfono de la inmobiliaria. Cuando conecte, Props usará este número para mensajes y avisos automáticos.
              </DialogDescription>
            </DialogHeader>

            <div className="mt-6 flex flex-col items-center gap-5">
              <div className="flex size-[320px] items-center justify-center overflow-hidden rounded-[32px] border bg-white p-4 shadow-sm">
                {qrLoading && !qrImage ? (
                  <div className="flex flex-col items-center gap-3 text-muted-foreground">
                    <Loader2 className="size-8 animate-spin text-primary" />
                    <p className="text-sm">Generando QR...</p>
                  </div>
                ) : qrImage ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={qrImage} alt="QR de WhatsApp" className="h-full w-full rounded-[20px] object-contain" />
                ) : connectionState === "open" ? (
                  <div className="flex flex-col items-center gap-3 text-center">
                    <CheckCircle2 className="size-12 text-emerald-500" />
                    <p className="text-lg font-semibold">WhatsApp conectado</p>
                    <p className="text-sm text-muted-foreground">El número ya quedó listo para enviar y recibir mensajes.</p>
                  </div>
                ) : (
                  <div className="text-center text-sm text-muted-foreground">
                    No pudimos obtener el QR todavia. Genera uno nuevo y volve a intentarlo.
                  </div>
                )}
              </div>

              {pairingCode ? (
                <div className="rounded-2xl border bg-muted/25 px-4 py-3 text-center">
                  <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Pairing code</p>
                  <p className="mt-1 text-2xl font-semibold tracking-[0.18em]">{pairingCode}</p>
                </div>
              ) : null}

              <div className="w-full rounded-[24px] border bg-muted/25 p-4 text-sm text-muted-foreground">
                <p className="font-medium text-foreground">Cómo vincularlo</p>
                <p className="mt-2">
                  En el teléfono: WhatsApp → menú → <strong>Dispositivos vinculados</strong> → <strong>Vincular dispositivo</strong>. Luego escaneá este QR.
                </p>
                {qrCount > 0 ? (
                  <p className="mt-3 text-xs">QR regenerado {qrCount} veces.</p>
                ) : null}
              </div>

              {qrError ? (
                <div className="w-full rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {qrError}
                </div>
              ) : null}

              {connectionState !== "open" ? (
                <Button
                  variant="outline"
                  className="w-full rounded-2xl"
                  onClick={() => void loadQr(true)}
                  disabled={qrLoading}
                >
                  {qrLoading ? <Loader2 className="size-4 animate-spin" /> : <RefreshCcw className="size-4" />}
                  Generar nuevo QR
                </Button>
              ) : null}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
