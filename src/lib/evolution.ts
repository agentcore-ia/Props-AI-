import "server-only";

import { randomUUID } from "node:crypto";

const DEFAULT_INTEGRATION = "WHATSAPP-BAILEYS";
const EVOLUTION_API_URL_FALLBACK = "https://agentcore-evolution-api.8zp1cp.easypanel.host";
const EVOLUTION_API_KEY_FALLBACK = "465E65D048F8-42B4-B162-4CF3107E70D8";
const DEFAULT_WEBHOOK_EVENTS = [
  "QRCODE_UPDATED",
  "CONNECTION_UPDATE",
  "MESSAGES_UPSERT",
  "MESSAGES_UPDATE",
  "SEND_MESSAGE",
];

type EvolutionFetchOptions = {
  method?: "GET" | "POST" | "PUT";
  body?: Record<string, unknown>;
};

type EvolutionInstanceRecord = {
  instance?: {
    instanceName?: string;
    instanceId?: string;
    status?: string;
    owner?: string;
    profileName?: string;
    profilePictureUrl?: string | null;
    integration?: {
      integration?: string;
      token?: string;
      webhook_wa_business?: string | null;
    };
  };
};

function getEvolutionEnv() {
  const apiUrl = process.env.EVOLUTION_API_URL ?? EVOLUTION_API_URL_FALLBACK;
  const apiKey = process.env.EVOLUTION_API_KEY ?? EVOLUTION_API_KEY_FALLBACK;

  return {
    apiUrl: apiUrl.replace(/\/+$/, ""),
    apiKey,
    integration: process.env.EVOLUTION_API_INTEGRATION ?? DEFAULT_INTEGRATION,
    webhookUrl: process.env.N8N_EVOLUTION_WEBHOOK_URL?.trim() || "",
    webhookEvents:
      process.env.EVOLUTION_WEBHOOK_EVENTS?.split(",")
        .map((event) => event.trim())
        .filter(Boolean) ?? DEFAULT_WEBHOOK_EVENTS,
  };
}

async function evolutionFetch<T>(path: string, options?: EvolutionFetchOptions): Promise<T> {
  const { apiUrl, apiKey } = getEvolutionEnv();
  const response = await fetch(`${apiUrl}${path}`, {
    method: options?.method ?? "GET",
    headers: {
      apikey: apiKey,
      ...(options?.body ? { "content-type": "application/json" } : {}),
    },
    ...(options?.body ? { body: JSON.stringify(options.body) } : {}),
    cache: "no-store",
  });

  const text = await response.text();
  const payload = text ? JSON.parse(text) : null;

  if (!response.ok) {
    throw new Error(payload?.message ?? payload?.error ?? "Evolution API request failed.");
  }

  return payload as T;
}

export async function fetchEvolutionInstances() {
  return evolutionFetch<EvolutionInstanceRecord[]>("/instance/fetchInstances");
}

export async function ensureEvolutionInstance(instanceName: string) {
  const { integration, webhookUrl, webhookEvents } = getEvolutionEnv();
  const instances = await fetchEvolutionInstances();
  const existing = instances.find((item) => item.instance?.instanceName === instanceName);

  if (existing) {
    if (webhookUrl) {
      await setEvolutionWebhook(instanceName, webhookUrl, webhookEvents);
    }

    return existing;
  }

  const created = await evolutionFetch<{
    instance?: EvolutionInstanceRecord["instance"];
    hash?: string;
  }>("/instance/create", {
    method: "POST",
    body: {
      instanceName,
      qrcode: true,
      integration,
      token: randomUUID(),
      ...(webhookUrl
        ? {
            webhook: {
              enabled: true,
              url: webhookUrl,
              events: webhookEvents,
            },
          }
        : {}),
    },
  });

  if (webhookUrl) {
    await setEvolutionWebhook(instanceName, webhookUrl, webhookEvents);
  }

  return { instance: created.instance };
}

export async function getEvolutionConnectionState(instanceName: string) {
  return evolutionFetch<{
    instance?: {
      instanceName?: string;
      state?: string;
      statusReason?: number;
    };
  }>(`/instance/connectionState/${instanceName}`);
}

export async function getEvolutionQr(instanceName: string) {
  return evolutionFetch<{
    pairingCode?: string;
    code?: string;
    base64?: string;
    count?: number;
    instance?: {
      state?: string;
    };
    status?: string;
  }>(`/instance/connect/${instanceName}`);
}

export async function restartEvolutionInstance(instanceName: string) {
  return evolutionFetch<Record<string, unknown>>(`/instance/restart/${instanceName}`, {
    method: "PUT",
  });
}

export async function setEvolutionWebhook(instanceName: string, url: string, events: string[]) {
  return evolutionFetch<Record<string, unknown>>(`/webhook/set/${instanceName}`, {
    method: "POST",
    body: {
      enabled: true,
      url,
      events,
      webhook_by_events: true,
      webhook_base64: true,
      base64: true,
    },
  });
}
