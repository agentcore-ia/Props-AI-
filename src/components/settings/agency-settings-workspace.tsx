"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
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
  messaging_instance: string;
};

type ConnectionState = "loading" | "open" | "close" | "error";

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
  const [reconnecting, setReconnecting] = useState(false);

  useEffect(() => {
    setForm(buildInitialForm(selectedAgency));
    setSaveError(null);
    setSaveSuccess(null);
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

    void loadQr(false);
    const interval = setInterval(() => {
      void loadQr(false);
    }, 10000);

    return () => clearInterval(interval);
  }, [loadQr, qrOpen]);

  async function handleReconnect() {
    setReconnecting(true);
    setQrOpen(true);
    await loadQr(true);
    setReconnecting(false);
    await loadStatus();
  }

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
        messagingInstance: normalizeInstance(form.messagingInstance),
      }),
    });

    const payload = await response.json().catch(() => null);

    if (!response.ok) {
      setSaving(false);
      setSaveError(payload?.error ?? "No se pudo guardar la configuracion.");
      return;
    }

    setSaving(false);
    setSaveSuccess("Configuracion guardada.");
    setForm((prev) => ({
      ...prev,
      messagingInstance: payload?.agency?.messaging_instance ?? prev.messagingInstance,
    }));
    await loadStatus();
  }

  const statusCopy = getStatusCopy(connectionState);

  return (
    <div className="space-y-8">
      <PageHeader
        title="Configuracion"
        description="Ajusta los datos operativos de la inmobiliaria y deja conectado su WhatsApp para que Props y n8n puedan automatizar respuestas y avisos."
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
              <label className="text-sm font-medium">Telefono</label>
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
              <label className="text-sm font-medium">Tagline publica</label>
              <Textarea
                rows={3}
                value={form.tagline}
                onChange={(event) => setForm((prev) => ({ ...prev, tagline: event.target.value }))}
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-medium">Messaging instance</label>
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
                Esta instancia se usa tanto para vincular WhatsApp por QR como para disparar mensajes automáticos desde n8n.
              </p>
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

        <Card className="rounded-[32px] border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageCircle className="size-5 text-primary" />
              WhatsApp y automatizaciones
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="flex flex-wrap items-center gap-3">
              <Badge className={`rounded-full border-0 px-3 py-1 ${statusCopy.tone}`}>
                <span className="mr-2 inline-flex">{statusCopy.icon}</span>
                {statusCopy.label}
              </Badge>
              <Badge className="rounded-full border-0 bg-primary/10 px-3 py-1 text-primary">
                {(connectionMeta?.messagingInstance ?? form.messagingInstance) || "sin instancia"}
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
                    ? "El número está conectado y listo para que n8n y Props envíen automatizaciones."
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
                  n8n conectado
                </div>
                <p className="mt-3 text-sm text-muted-foreground">
                  Al crear o verificar la instancia, Props intenta dejar listo el webhook de Evolution hacia n8n para que entren eventos y salgan mensajes automáticos.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <Button className="rounded-2xl" onClick={() => setQrOpen(true)}>
                <QrCode className="size-4" />
                Vincular con QR
              </Button>
              <Button
                variant="outline"
                className="rounded-2xl"
                onClick={handleReconnect}
                disabled={reconnecting}
              >
                {reconnecting ? <Loader2 className="size-4 animate-spin" /> : <RefreshCcw className="size-4" />}
                Reconectar instancia
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <Dialog
        open={qrOpen}
        onOpenChange={(nextOpen) => {
          setQrOpen(nextOpen);
          if (!nextOpen) {
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
                Escanea el QR desde WhatsApp en el teléfono de la inmobiliaria. Cuando conecte, Props usará esta misma instancia para automatizaciones y avisos por n8n.
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
                    <p className="text-sm text-muted-foreground">La instancia ya quedó lista para enviar y recibir automatizaciones.</p>
                  </div>
                ) : (
                  <div className="text-center text-sm text-muted-foreground">
                    No pudimos obtener el QR todavía. Intenta reconectar la instancia.
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
                  <p className="mt-3 text-xs">QR regenerado {qrCount} veces por Evolution.</p>
                ) : null}
              </div>

              {qrError ? (
                <div className="w-full rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {qrError}
                </div>
              ) : null}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
