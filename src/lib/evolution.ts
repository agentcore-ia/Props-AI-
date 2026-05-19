import "server-only";

import { randomUUID } from "node:crypto";

const DEFAULT_INTEGRATION = "WHATSAPP-BAILEYS";
const DEFAULT_WEBHOOK_EVENTS = [
  "QRCODE_UPDATED",
  "CONNECTION_UPDATE",
  "MESSAGES_UPSERT",
  "MESSAGES_UPDATE",
  "SEND_MESSAGE",
];

type EvolutionFetchOptions = {
  method?: "GET" | "POST" | "PUT" | "DELETE";
  body?: Record<string, unknown>;
};

type EvolutionInstanceRecord = {
  id?: string;
  name?: string;
  connectionStatus?: string;
  ownerJid?: string | null;
  profileName?: string | null;
  profilePicUrl?: string | null;
  integration?: string;
  token?: string | null;
  Websocket?: Record<string, unknown> | null;
  Setting?: Record<string, unknown> | null;
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

export function normalizeEvolutionRecipient(phone: string | null | undefined) {
  const raw = String(phone ?? "")
    .trim()
    .replace(/@s\.whatsapp\.net$/i, "");
  let digits = raw.replace(/[^\d]/g, "");

  if (!digits) return "";
  if (digits.startsWith("00")) digits = digits.slice(2);

  if (digits.startsWith("549")) return digits;

  if (digits.startsWith("54")) {
    const nationalNumber = digits.slice(2).replace(/^0+/, "").replace(/^15/, "");
    return nationalNumber ? `549${nationalNumber}` : digits;
  }

  digits = digits.replace(/^0+/, "");
  digits = digits.replace(/^15/, "");

  if (!digits) return "";
  return `549${digits}`;
}

function getEvolutionEnv() {
  const apiUrl = process.env.EVOLUTION_API_URL?.trim();
  const apiKey = process.env.EVOLUTION_API_KEY?.trim();

  if (!apiUrl || !apiKey) {
    throw new Error("Faltan EVOLUTION_API_URL o EVOLUTION_API_KEY en el entorno.");
  }

  return {
    apiUrl: apiUrl.replace(/\/+$/, ""),
    apiKey,
    integration: process.env.EVOLUTION_API_INTEGRATION ?? DEFAULT_INTEGRATION,
    webhookUrl: process.env.N8N_EVOLUTION_WEBHOOK_URL?.trim() ?? "",
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
  const payload = parseEvolutionJson(text);

  if (!response.ok) {
    throw new Error(payload?.message ?? payload?.error ?? "Evolution API request failed.");
  }

  return payload as T;
}

function parseEvolutionJson(text: string) {
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return { raw: text };
  }
}

function normalizeQrBase64(value: unknown) {
  const raw = String(value ?? "").trim();
  if (!raw) return undefined;
  if (raw.startsWith("data:image")) return raw;
  if (/^[A-Za-z0-9+/=]+$/.test(raw) && raw.length > 80) {
    return `data:image/png;base64,${raw}`;
  }
  return raw;
}

function normalizeQrPayload(payload: Record<string, unknown> | null) {
  const qrcode = (payload?.qrcode ?? payload?.qr) as Record<string, unknown> | undefined;
  const instance = (payload?.instance ?? qrcode?.instance) as Record<string, unknown> | undefined;
  const rawBase64 = normalizeQrBase64(payload?.base64 ?? qrcode?.base64);
  const rawCode = normalizeQrBase64(payload?.code ?? qrcode?.code);
  const base64 = rawBase64 ?? (rawCode?.startsWith("data:image") ? rawCode : undefined);
  const code = rawCode?.startsWith("data:image") ? undefined : rawCode;

  return {
    pairingCode: (payload?.pairingCode ?? payload?.pairing_code ?? qrcode?.pairingCode ?? qrcode?.pairing_code) as
      | string
      | undefined,
    code,
    base64,
    count: Number(payload?.count ?? qrcode?.count ?? 0),
    instance: {
      state: (instance?.state ?? instance?.connectionStatus ?? payload?.status) as string | undefined,
    },
    status: (payload?.status ?? instance?.state ?? instance?.connectionStatus) as string | undefined,
  };
}

function findInstanceByName(instances: EvolutionInstanceRecord[], instanceName: string) {
  return instances.find(
    (item) => item.name === instanceName || item.instance?.instanceName === instanceName
  );
}

function getInstanceToken(instance: EvolutionInstanceRecord | null | undefined) {
  return instance?.token ?? instance?.instance?.integration?.token ?? null;
}

export async function fetchEvolutionInstances() {
  return evolutionFetch<EvolutionInstanceRecord[]>("/instance/fetchInstances");
}

export async function ensureEvolutionInstance(instanceName: string) {
  const { integration, webhookUrl, webhookEvents } = getEvolutionEnv();
  const instances = await fetchEvolutionInstances();
  const existing = findInstanceByName(instances, instanceName);

  if (existing) {
    if (webhookUrl) {
      await setEvolutionWebhook(instanceName, webhookUrl, webhookEvents).catch((error) => {
        console.warn("[evolution] webhook sync failed for existing instance", {
          instanceName,
          error: error instanceof Error ? error.message : String(error),
        });
      });
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
    await setEvolutionWebhook(instanceName, webhookUrl, webhookEvents).catch((error) => {
      console.warn("[evolution] webhook sync failed for created instance", {
        instanceName,
        error: error instanceof Error ? error.message : String(error),
      });
    });
  }

  const refreshedInstances = await fetchEvolutionInstances();
  return findInstanceByName(refreshedInstances, instanceName) ?? { instance: created.instance };
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
  const instances = await fetchEvolutionInstances();
  const instance = findInstanceByName(instances, instanceName);
  const token = getInstanceToken(instance);
  const { apiUrl, apiKey } = getEvolutionEnv();
  const apiKeys = Array.from(new Set([apiKey, token].filter(Boolean) as string[]));
  const errors: string[] = [];

  for (const key of apiKeys) {
    const response = await fetch(`${apiUrl}/instance/connect/${encodeURIComponent(instanceName)}`, {
      method: "GET",
      headers: {
        apikey: key,
      },
      cache: "no-store",
    });

    const text = await response.text();
    const payload = parseEvolutionJson(text) as Record<string, unknown> | null;

    if (response.ok) {
      return normalizeQrPayload(payload) as {
        pairingCode?: string;
        code?: string;
        base64?: string;
        count?: number;
        instance?: {
          state?: string;
        };
        status?: string;
      };
    }

    errors.push(
      String(
        payload?.message ??
          payload?.error ??
          payload?.raw ??
          `HTTP ${response.status} al pedir QR con ${key === apiKey ? "API key global" : "token de instancia"}`
      )
    );
  }

  throw new Error(errors.at(-1) ?? "No se pudo obtener el QR de Evolution.");
}

export async function restartEvolutionInstance(instanceName: string) {
  await evolutionFetch<Record<string, unknown>>(`/instance/restart/${encodeURIComponent(instanceName)}`, {
    method: "PUT",
  }).catch((error) => {
    console.warn("[evolution] restart endpoint failed, continuing with QR connect", {
      instanceName,
      error: error instanceof Error ? error.message : String(error),
    });
  });

  return getEvolutionQr(instanceName);
}

export type EvolutionQrPayload = {
  pairingCode?: string;
  code?: string;
  base64?: string;
  count?: number;
  instance?: {
    state?: string;
  };
  status?: string;
};

export async function setEvolutionWebhook(instanceName: string, url: string, events: string[]) {
  return evolutionFetch<Record<string, unknown>>(`/webhook/set/${instanceName}`, {
    method: "POST",
    body: {
      webhook: {
        enabled: true,
        url,
        events,
        webhook_by_events: true,
        webhook_base64: true,
        base64: true,
      },
    },
  });
}

export async function sendEvolutionTextMessage(payload: {
  instanceName: string;
  number: string;
  text: string;
}) {
  const number = normalizeEvolutionRecipient(payload.number);
  const text = String(payload.text ?? "").trim();

  if (!number || !text) {
    throw new Error("Faltan numero o mensaje para enviar por WhatsApp.");
  }

  return evolutionFetch<Record<string, unknown>>(
    `/message/sendText/${encodeURIComponent(payload.instanceName)}`,
    {
      method: "POST",
      body: {
        number,
        text,
        options: {
          delay: 800,
        },
      },
    }
  );
}

export async function sendEvolutionMediaMessage(payload: {
  instanceName: string;
  number: string;
  mediaUrl: string;
  caption?: string;
  mediaType?: "image" | "video" | "document";
  fileName?: string;
}) {
  const number = normalizeEvolutionRecipient(payload.number);
  const media = String(payload.mediaUrl ?? "").trim();
  const caption = String(payload.caption ?? "").trim();

  if (!number || !media) {
    throw new Error("Faltan numero o media para enviar por WhatsApp.");
  }

  return evolutionFetch<Record<string, unknown>>(
    `/message/sendMedia/${encodeURIComponent(payload.instanceName)}`,
    {
      method: "POST",
      body: {
        number,
        mediatype: payload.mediaType ?? "image",
        media,
        caption,
        fileName: payload.fileName,
      },
    }
  );
}
