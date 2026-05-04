import "server-only";

import * as XLSX from "xlsx";

import { sendEvolutionTextMessage } from "@/lib/evolution";
import type { RentIndexType, RentalContractSummary } from "@/lib/rental-types";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatArsCurrency } from "@/lib/utils";

const IPC_SERIES_URL = "https://www.indec.gob.ar/ftp/cuadros/economia/serie_ipc_divisiones.csv";
const ICL_SERIES_URL = "https://www.bcra.gob.ar/archivos/pdfs/PublicacionesEstadisticas/diar_icl.xls";
const RENT_AUTOMATION_SECRET_FALLBACK = "props-rent-automation-2026-7f0b0b7d";
const N8N_NOTIFICATION_WEBHOOK_FALLBACK =
  "https://agentcore-n8n.8zp1cp.easypanel.host/webhook/props-rent-adjustment-notification";

type DueContractRow = {
  id: string;
  property_id: string;
  agency_id: string;
  tenant_name: string;
  tenant_phone: string;
  tenant_email: string | null;
  current_rent: number;
  currency: "ARS";
  index_type: RentIndexType;
  adjustment_frequency_months: number;
  contract_start_date: string;
  rent_reference_date: string;
  next_adjustment_date: string;
  last_adjustment_date: string | null;
  auto_notify: boolean;
  notification_channel: "whatsapp";
  status: "Activo" | "Pausado" | "Finalizado";
  notes: string;
  agencies:
    | {
        id: string;
        name: string;
        slug: string;
        phone: string;
        messaging_instance: string;
      }
    | Array<{
        id: string;
        name: string;
        slug: string;
        phone: string;
        messaging_instance: string;
      }>
    | null;
  properties:
    | {
        id: string;
        title: string;
        location: string;
      }
    | Array<{
        id: string;
        title: string;
        location: string;
      }>
    | null;
};

type IndexComputation = {
  factor: number;
  referenceEndDate: string;
  sourceLabel: string;
  sourceSnapshot: Record<string, unknown>;
};

function getAutomationSecret() {
  return process.env.PROPS_RENT_AUTOMATION_SECRET ?? RENT_AUTOMATION_SECRET_FALLBACK;
}

function getNotificationWebhookUrl() {
  return (
    process.env.N8N_RENT_NOTIFICATION_WEBHOOK_URL ??
    N8N_NOTIFICATION_WEBHOOK_FALLBACK
  );
}

function parseDateParts(isoDate: string) {
  const [year, month, day] = isoDate.split("-").map(Number);
  return { year, month, day };
}

function addMonthsIsoDate(isoDate: string, months: number) {
  const { year, month, day } = parseDateParts(isoDate);
  const date = new Date(Date.UTC(year, month - 1 + months, 1));
  const lastDay = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0)).getUTCDate();
  date.setUTCDate(Math.min(day, lastDay));
  return date.toISOString().slice(0, 10);
}

function normalizePhone(phone: string) {
  const digits = phone.replace(/[^\d]/g, "");
  if (!digits) return "";
  return digits.includes("54") ? digits : `54${digits}`;
}

function formatMonthKeyFromIso(isoDate: string) {
  const { year, month } = parseDateParts(isoDate);
  return year * 100 + month;
}

function getLatestPeriodOnOrBefore(periods: number[], target: number) {
  const sorted = [...periods].sort((a, b) => a - b);
  const candidate = sorted.filter((period) => period <= target).at(-1);

  if (!candidate) {
    throw new Error("No encontramos un periodo valido para calcular el IPC.");
  }

  return candidate;
}

async function fetchIpcSeries() {
  const response = await fetch(IPC_SERIES_URL, {
    next: { revalidate: 60 * 60 * 12 },
  });

  if (!response.ok) {
    throw new Error("No se pudo descargar la serie oficial de IPC.");
  }

  const csv = await response.text();
  const lines = csv.split(/\r?\n/).filter(Boolean);
  const series = new Map<number, number>();

  for (const line of lines.slice(1)) {
    const [codigo, descripcion, , periodo, indice, , , region] = line.split(";");

    if (codigo !== "0" || descripcion !== "NIVEL GENERAL" || region !== "Nacional") {
      continue;
    }

    const period = Number(periodo);
    const value = Number(String(indice).replace(",", "."));

    if (!Number.isNaN(period) && !Number.isNaN(value)) {
      series.set(period, value);
    }
  }

  return series;
}

async function fetchIclSeries() {
  const response = await fetch(ICL_SERIES_URL, {
    next: { revalidate: 60 * 60 * 12 },
  });

  if (!response.ok) {
    throw new Error("No se pudo descargar la serie oficial del ICL.");
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  const workbook = XLSX.read(buffer, { type: "buffer", cellDates: true });
  const sheetName = workbook.SheetNames[0];
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(workbook.Sheets[sheetName], {
    raw: false,
  });

  const series = new Map<string, number>();

  for (const row of rows) {
    const dateCandidate =
      row["Fecha"] ??
      row["fecha"] ??
      row["FECHA"] ??
      row["Unnamed: 0"] ??
      row["__EMPTY"];
    const valueCandidate =
      row["ICL"] ??
      row["Indice"] ??
      row["Índice"] ??
      row["Valor"] ??
      row["Unnamed: 1"] ??
      row["INTEREST RATES AND ADJUSTMENT COEFFICIENTS ESTABLISHED BY THE BCRA"];

    if (!dateCandidate || !valueCandidate) {
      continue;
    }

    if (!/^\d{2}\/\d{2}\/\d{4}$/.test(String(dateCandidate).trim())) {
      continue;
    }

    const [day, month, year] = String(dateCandidate).trim().split("/");
    const parsedDate = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
    const value = Number(String(valueCandidate).replace(",", "."));

    if (Number.isNaN(parsedDate.getTime()) || Number.isNaN(value)) {
      continue;
    }

    series.set(parsedDate.toISOString().slice(0, 10), value);
  }

  return series;
}

async function computeAdjustmentFactor(
  indexType: RentIndexType,
  referenceDate: string,
  dueDate: string
): Promise<IndexComputation> {
  if (indexType === "ICL") {
    const series = await fetchIclSeries();
    const start = series.get(referenceDate);
    const end = series.get(dueDate);

    if (!start || !end) {
      throw new Error("No encontramos valores suficientes del ICL para calcular el aumento.");
    }

    return {
      factor: end / start,
      referenceEndDate: dueDate,
      sourceLabel: `ICL BCRA (${referenceDate} -> ${dueDate})`,
      sourceSnapshot: {
        source: "BCRA",
        url: ICL_SERIES_URL,
        startValue: start,
        endValue: end,
      },
    };
  }

  const series = await fetchIpcSeries();
  const availablePeriods = Array.from(series.keys());
  const startPeriod = getLatestPeriodOnOrBefore(availablePeriods, formatMonthKeyFromIso(referenceDate));
  const endPeriod = getLatestPeriodOnOrBefore(availablePeriods, formatMonthKeyFromIso(dueDate));
  const start = series.get(startPeriod);
  const end = series.get(endPeriod);

  if (!start || !end) {
    throw new Error("No encontramos valores suficientes del IPC para calcular el aumento.");
  }

  return {
    factor: end / start,
    referenceEndDate: `${String(endPeriod).slice(0, 4)}-${String(endPeriod).slice(4)}-01`,
    sourceLabel: `IPC nacional INDEC (${startPeriod} -> ${endPeriod})`,
    sourceSnapshot: {
      source: "INDEC",
      url: IPC_SERIES_URL,
      startPeriod,
      endPeriod,
      startValue: start,
      endValue: end,
    },
  };
}

function buildTenantMessage({
  contract,
  propertyTitle,
  agencyName,
  agencyPhone,
  factor,
  nextAdjustmentDate,
  newRent,
}: {
  contract: DueContractRow;
  propertyTitle: string;
  agencyName: string;
  agencyPhone: string;
  factor: number;
  nextAdjustmentDate: string;
  newRent: number;
}) {
  const percent = ((factor - 1) * 100).toFixed(2).replace(".", ",");

  return [
    `Hola ${contract.tenant_name}, te escribimos desde ${agencyName}.`,
    `Te compartimos la actualizacion del alquiler de ${propertyTitle}.`,
    `Indice aplicado: ${contract.index_type}.`,
    `Aumento acumulado: ${percent}%.`,
    `Valor anterior: ${formatArsCurrency(Number(contract.current_rent))}.`,
    `Nuevo valor: ${formatArsCurrency(newRent)}.`,
    `Proximo ajuste estimado: ${nextAdjustmentDate}.`,
    agencyPhone ? `Cualquier duda, respondé a este mensaje o llamanos al ${agencyPhone}.` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

async function sendNotificationViaN8n(payload: {
  instance: string;
  number: string;
  text: string;
  adjustmentId: string;
  agencySlug: string;
}) {
  try {
    const response = await fetch(getNotificationWebhookUrl(), {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-props-secret": getAutomationSecret(),
      },
      body: JSON.stringify(payload),
    });

    const body = await response.text();

    if (response.ok) {
      return {
        ok: true,
        status: response.status,
        body,
        transport: "n8n",
      };
    }

    const direct = await sendEvolutionTextMessage({
      instanceName: payload.instance,
      number: payload.number,
      text: payload.text,
    });

    return {
      ok: true,
      status: response.status,
      body,
      transport: "evolution-fallback",
      fallbackResponse: direct,
    };
  } catch (error) {
    const direct = await sendEvolutionTextMessage({
      instanceName: payload.instance,
      number: payload.number,
      text: payload.text,
    });

    return {
      ok: true,
      status: 200,
      body: error instanceof Error ? error.message : "Webhook n8n no disponible.",
      transport: "evolution-fallback",
      fallbackResponse: direct,
    };
  }
}

export async function sendTestRentIncreaseMessage(contractId: string) {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("rental_contracts")
    .select(
      "id, tenant_name, tenant_phone, current_rent, index_type, adjustment_frequency_months, next_adjustment_date, auto_notify, agencies(name, slug, phone, messaging_instance), properties(title, location)"
    )
    .eq("id", contractId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    throw new Error("No encontramos el contrato para enviar la prueba.");
  }

  const agency = Array.isArray(data.agencies) ? data.agencies[0] : data.agencies;
  const property = Array.isArray(data.properties) ? data.properties[0] : data.properties;

  if (!agency) {
    throw new Error("No encontramos la inmobiliaria asociada al contrato.");
  }

  if (!data.tenant_phone) {
    throw new Error("Este contrato no tiene WhatsApp del inquilino.");
  }

  const factor = 1.12;
  const previousRent = Number(data.current_rent);
  const newRent = Number((previousRent * factor).toFixed(2));
  const nextAdjustmentDate = addMonthsIsoDate(
    data.next_adjustment_date,
    data.adjustment_frequency_months
  );

  const text = buildTenantMessage({
    contract: {
      id: data.id,
      property_id: "",
      agency_id: "",
      tenant_name: data.tenant_name,
      tenant_phone: data.tenant_phone,
      tenant_email: null,
      current_rent: previousRent,
      currency: "ARS",
      index_type: data.index_type,
      adjustment_frequency_months: data.adjustment_frequency_months,
      contract_start_date: "",
      rent_reference_date: "",
      next_adjustment_date: data.next_adjustment_date,
      last_adjustment_date: null,
      auto_notify: true,
      notification_channel: "whatsapp",
      status: "Activo",
      notes: "",
      agencies: {
        id: "test-agency",
        name: agency.name,
        slug: agency.slug,
        phone: agency.phone,
        messaging_instance: agency.messaging_instance,
      },
      properties: property
        ? {
            id: "test-property",
            title: property.title,
            location: property.location,
          }
        : null,
    },
    propertyTitle: property?.title ?? "la propiedad",
    agencyName: agency.name,
    agencyPhone: agency.phone ?? "",
    factor,
    nextAdjustmentDate,
    newRent,
  });

  const notification = await sendNotificationViaN8n({
    instance: agency.messaging_instance ?? "agentcore",
    number: normalizePhone(data.tenant_phone),
    text,
    adjustmentId: `test-${contractId}`,
    agencySlug: agency.slug ?? "",
  });

  if (!notification.ok) {
    throw new Error("n8n rechazo la prueba de WhatsApp.");
  }

  return {
    ok: true,
    tenantName: data.tenant_name,
    propertyTitle: property?.title ?? "la propiedad",
    previousRent,
    newRent,
    messageBody: text,
  };
}

export async function runDueRentAdjustments(options?: {
  agencyIds?: string[];
  dryRun?: boolean;
}) {
  const admin = createAdminClient();
  let query = admin
    .from("rental_contracts")
    .select(
      "id, property_id, agency_id, tenant_name, tenant_phone, tenant_email, current_rent, currency, index_type, adjustment_frequency_months, contract_start_date, rent_reference_date, next_adjustment_date, last_adjustment_date, auto_notify, notification_channel, status, notes, agencies(id, name, slug, phone, messaging_instance), properties(id, title, location)"
    )
    .eq("status", "Activo")
    .lte("next_adjustment_date", new Date().toISOString().slice(0, 10))
    .order("next_adjustment_date", { ascending: true });

  if (options?.agencyIds?.length) {
    query = query.in("agency_id", options.agencyIds);
  }

  const { data, error } = await query;

  if (error) {
    throw error;
  }

  const results: Array<Record<string, unknown>> = [];

  for (const contract of (data ?? []) as unknown as DueContractRow[]) {
    try {
      const agency = Array.isArray(contract.agencies) ? contract.agencies[0] : contract.agencies;
      const property = Array.isArray(contract.properties) ? contract.properties[0] : contract.properties;
      const computation = await computeAdjustmentFactor(
        contract.index_type,
        contract.rent_reference_date,
        contract.next_adjustment_date
      );

      const previousRent = Number(contract.current_rent);
      const newRent = Number((previousRent * computation.factor).toFixed(2));
      const nextAdjustmentDate = addMonthsIsoDate(
        contract.next_adjustment_date,
        contract.adjustment_frequency_months
      );
      const messageBody = buildTenantMessage({
        contract,
        propertyTitle: property?.title ?? "la propiedad",
        agencyName: agency?.name ?? "la inmobiliaria",
        agencyPhone: agency?.phone ?? "",
        factor: computation.factor,
        nextAdjustmentDate,
        newRent,
      });

      if (options?.dryRun) {
        results.push({
          contractId: contract.id,
          tenant: contract.tenant_name,
          previousRent,
          newRent,
          nextAdjustmentDate,
          messageBody,
          dryRun: true,
        });
        continue;
      }

      const { data: adjustment, error: adjustmentError } = await admin
        .from("rental_adjustments")
        .insert({
          contract_id: contract.id,
          property_id: contract.property_id,
          agency_id: contract.agency_id,
          index_type: contract.index_type,
          applied_on: contract.next_adjustment_date,
          reference_start_date: contract.rent_reference_date,
          reference_end_date: computation.referenceEndDate,
          factor: Number(computation.factor.toFixed(8)),
          previous_rent: previousRent,
          new_rent: newRent,
          source_label: computation.sourceLabel,
          source_snapshot: computation.sourceSnapshot,
          message_body: messageBody,
          notification_status: contract.auto_notify ? "Pendiente" : "Fallido",
        })
        .select("id")
        .single();

      if (adjustmentError || !adjustment) {
        throw adjustmentError ?? new Error("No se pudo registrar el ajuste.");
      }

      let notificationStatus: "Enviado" | "Fallido" = "Fallido";
      let notificationResponse: Record<string, unknown> = {};
      let notifiedAt: string | null = null;

      if (contract.auto_notify) {
        const notification = await sendNotificationViaN8n({
          instance: agency?.messaging_instance ?? "agentcore",
          number: normalizePhone(contract.tenant_phone),
          text: messageBody,
          adjustmentId: adjustment.id,
          agencySlug: agency?.slug ?? "",
        });

        notificationStatus = notification.ok ? "Enviado" : "Fallido";
        notificationResponse = notification;
        notifiedAt = notification.ok ? new Date().toISOString() : null;
      }

      const { error: updateContractError } = await admin
        .from("rental_contracts")
        .update({
          current_rent: newRent,
          rent_reference_date: contract.next_adjustment_date,
          last_adjustment_date: contract.next_adjustment_date,
          next_adjustment_date: nextAdjustmentDate,
        })
        .eq("id", contract.id);

      if (updateContractError) {
        throw updateContractError;
      }

      const { error: updateAdjustmentError } = await admin
        .from("rental_adjustments")
        .update({
          notification_status: notificationStatus,
          notification_response: notificationResponse,
          notified_at: notifiedAt,
        })
        .eq("id", adjustment.id);

      if (updateAdjustmentError) {
        throw updateAdjustmentError;
      }

      results.push({
        contractId: contract.id,
        adjustmentId: adjustment.id,
        tenant: contract.tenant_name,
        previousRent,
        newRent,
        nextAdjustmentDate,
        notificationStatus,
      });
    } catch (error) {
      results.push({
        contractId: contract.id,
        tenant: contract.tenant_name,
        error: error instanceof Error ? error.message : "No se pudo calcular el aumento.",
      });
    }
  }

  return {
    ok: true,
    processed: results.length,
    results,
  };
}

export function validateRentAutomationSecret(secret: string | null) {
  return secret === getAutomationSecret();
}

export function buildRentalContractPayload(contract: RentalContractSummary) {
  return {
    tenantName: contract.tenantName,
    nextAdjustmentDate: contract.nextAdjustmentDate,
    currentRent: contract.currentRent,
    indexType: contract.indexType,
    adjustmentFrequencyMonths: contract.adjustmentFrequencyMonths,
  };
}
