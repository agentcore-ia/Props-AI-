import "server-only";

import { randomUUID } from "node:crypto";

const DEFAULT_INTEGRATION = "WHATSAPP-BAILEYS";
const EVOLUTION_API_URL_FALLBACK = "https://agentcore-evolution-api.8zp1cp.easypanel.host";
const EVOLUTION_ADMIN_API_KEY_FALLBACK = "429683C4C977415CAAFCCE10F7D57E11";
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
  const apiUrl = process.env.EVOLUTION_API_URL?.trim() || EVOLUTION_API_URL_FALLBACK;
  const apiKey =
    process.env.EVOLUTION_API_KEY?.trim() ||
    process.env.EVOLUTION_GLOBAL_API_KEY?.trim() ||
    process.env.EVOLUTION_ADMIN_API_KEY?.trim() ||
    EVOLUTION_ADMIN_API_KEY_FALLBACK;

  if (!apiUrl || !apiKey) {
    throw new Error("Faltan EVOLUTION_API_URL o EVOLUTION_API_KEY en el entorno.");
  }

  return {
    apiUrl: apiUrl.replace(/\/+$/, ""),
    apiKey,
    adminApiKeys: uniqueStrings([
      process.env.EVOLUTION_GLOBAL_API_KEY?.trim(),
      process.env.EVOLUTION_ADMIN_API_KEY?.trim(),
      apiKey,
      EVOLUTION_ADMIN_API_KEY_FALLBACK,
    ]),
    integration: process.env.EVOLUTION_API_INTEGRATION ?? DEFAULT_INTEGRATION,
    webhookUrl: resolveEvolutionWebhookUrl(),
    webhookEvents:
      process.env.EVOLUTION_WEBHOOK_EVENTS?.split(",")
        .map((event) => event.trim())
        .filter(Boolean) ?? DEFAULT_WEBHOOK_EVENTS,
  };
}

function resolveEvolutionWebhookUrl() {
  const explicit =
    process.env.PROPS_EVOLUTION_WEBHOOK_URL?.trim() ||
    process.env.N8N_EVOLUTION_WEBHOOK_URL?.trim();

  if (explicit) return explicit;

  const appBaseUrl =
    process.env.PROPS_APP_BASE_URL?.trim() ||
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    "https://props.com.ar";

  return `${appBaseUrl.replace(/\/+$/, "")}/api/internal/whatsapp/inbound`;
}

function uniqueStrings(values: Array<string | null | undefined>) {
  return Array.from(new Set(values.map((value) => value?.trim()).filter(Boolean) as string[]));
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

async function evolutionFetchWithKeys<T>(
  path: string,
  apiKeys: string[],
  options?: EvolutionFetchOptions
): Promise<T> {
  const { apiUrl } = getEvolutionEnv();
  const errors: string[] = [];

  for (const apiKey of apiKeys) {
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

    if (response.ok) {
      return payload as T;
    }

    errors.push(String(payload?.message ?? payload?.error ?? payload?.raw ?? `HTTP ${response.status}`));
  }

  throw new Error(errors.at(-1) ?? "Evolution API request failed.");
}

async function evolutionAdminFetch<T>(path: string, options?: EvolutionFetchOptions): Promise<T> {
  const { adminApiKeys } = getEvolutionEnv();
  return evolutionFetchWithKeys<T>(path, adminApiKeys, options);
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

function extractQrPayload(payload: Record<string, unknown> | null) {
  return normalizeQrPayload((payload?.qrcode ?? payload?.qr ? payload : { qrcode: payload }) as Record<
    string,
    unknown
  > | null) as EvolutionQrPayload;
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
  const payload = await evolutionAdminFetch<EvolutionInstanceRecord[] | { instances?: EvolutionInstanceRecord[] }>(
    "/instance/fetchInstances"
  );

  return Array.isArray(payload) ? payload : payload.instances ?? [];
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

  const created = await evolutionAdminFetch<{
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
  return evolutionAdminFetch<{
    instance?: {
      instanceName?: string;
      state?: string;
      statusReason?: number;
    };
  }>(`/instance/connectionState/${instanceName}`);
}

export async function getEvolutionQr(instanceName: string) {
  let token: string | null = null;

  await fetchEvolutionInstances()
    .then((instances) => {
      token = getInstanceToken(findInstanceByName(instances, instanceName));
    })
    .catch((error) => {
      console.warn("[evolution] could not fetch instances before QR connect", {
        instanceName,
        error: error instanceof Error ? error.message : String(error),
      });
    });

  const { apiUrl, apiKey, adminApiKeys } = getEvolutionEnv();
  const apiKeys = uniqueStrings([...adminApiKeys, apiKey, token]);
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
  await evolutionAdminFetch<Record<string, unknown>>(`/instance/restart/${encodeURIComponent(instanceName)}`, {
    method: "PUT",
  }).catch((error) => {
    console.warn("[evolution] restart endpoint failed, continuing with QR connect", {
      instanceName,
      error: error instanceof Error ? error.message : String(error),
    });
  });

  return getEvolutionQr(instanceName);
}

export async function recreateEvolutionInstance(instanceName: string) {
  const { integration, webhookUrl, webhookEvents } = getEvolutionEnv();

  await evolutionAdminFetch<Record<string, unknown>>(`/instance/logout/${encodeURIComponent(instanceName)}`, {
    method: "DELETE",
  }).catch(() => null);

  await evolutionAdminFetch<Record<string, unknown>>(`/instance/delete/${encodeURIComponent(instanceName)}`, {
    method: "DELETE",
  }).catch((error) => {
    const message = error instanceof Error ? error.message : String(error);
    if (!message.toLowerCase().includes("does not exist")) {
      console.warn("[evolution] delete before reconnect failed, continuing with create", {
        instanceName,
        error: message,
      });
    }
  });

  const created = await evolutionAdminFetch<Record<string, unknown>>("/instance/create", {
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
      console.warn("[evolution] webhook sync failed after recreate", {
        instanceName,
        error: error instanceof Error ? error.message : String(error),
      });
    });
  }

  const qr = extractQrPayload(created);
  return qr.base64 || qr.code || qr.pairingCode ? qr : getEvolutionQr(instanceName);
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
  return evolutionAdminFetch<Record<string, unknown>>(`/webhook/set/${instanceName}`, {
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
  mimetype?: string;
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
        mimetype:
          payload.mimetype ??
          (payload.mediaType === "document"
            ? "application/pdf"
            : payload.mediaType === "video"
              ? "video/mp4"
              : "image/jpeg"),
        media,
        caption,
        fileName: payload.fileName,
        options: {
          delay: 800,
        },
      },
    }
  );
}
