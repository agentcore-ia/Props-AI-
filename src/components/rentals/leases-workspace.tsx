"use client";

import Link from "next/link";
import { useMemo, useState, type ReactNode } from "react";
import {
  AlertTriangle,
  Building2,
  CalendarDays,
  CheckCircle2,
  CircleDollarSign,
  ClipboardList,
  Download,
  FileText,
  Loader2,
  Mail,
  Phone,
  Printer,
  ReceiptText,
  Search,
  Send,
  Sparkles,
  UserRound,
  Wrench,
  X,
} from "lucide-react";

import { EmptyState } from "@/components/layout/empty-state";
import { PageHeader } from "@/components/layout/page-header";
import { RentAutomationPanel } from "@/components/props/rent-automation-panel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { ContractRescissionSummary, DelinquentTenantSummary, RentalCollectionSummary } from "@/lib/operations-types";
import type { LeaseRosterItem } from "@/lib/props-data";
import type {
  OwnerSettlementItemSummary,
  OwnerSettlementSummary,
  RentalAdjustmentSummary,
  RentalDashboardSummary,
} from "@/lib/rental-types";
import { formatMoney, formatShortDate } from "@/lib/utils";

const statusStyles: Record<LeaseRosterItem["status"], string> = {
  Activo: "bg-emerald-500/10 text-emerald-700",
  Pausado: "bg-amber-500/10 text-amber-700",
  Finalizado: "bg-slate-900/10 text-slate-700",
};

export function LeasesWorkspace({
  leases,
  rentalSummary,
  recentAdjustments,
  ownerSettlements,
  ownerSettlementItems,
  rescissions,
  collections,
  delinquencies,
}: {
  leases: LeaseRosterItem[];
  rentalSummary: RentalDashboardSummary;
  recentAdjustments: RentalAdjustmentSummary[];
  ownerSettlements: OwnerSettlementSummary[];
  ownerSettlementItems: OwnerSettlementItemSummary[];
  rescissions: ContractRescissionSummary[];
  collections: RentalCollectionSummary[];
  delinquencies: DelinquentTenantSummary[];
}) {
  const currentMonth = new Date().toISOString().slice(0, 7);
  const todayDate = new Date().toISOString().slice(0, 10);
  const initialLease = leases[0] ?? null;
  const [employeeMode, setEmployeeMode] = useState<"actions" | "dossier">("actions");
  const [query, setQuery] = useState("");
  const [rentFormOpen, setRentFormOpen] = useState(false);
  const [rentSearch, setRentSearch] = useState("");
  const [registeringRent, setRegisteringRent] = useState(false);
  const [rentReceipt, setRentReceipt] = useState<null | {
    receiptNumber: string;
    contractId: string;
    agencyName: string;
    tenantName: string;
    tenantPhone: string;
    tenantEmail: string | null;
    propertyTitle: string;
    propertyLocation: string;
    collectionMonth: string;
    collectedAmount: number;
    expectedRent: number;
    paymentMethod: string;
    paymentDate: string;
  }>(null);
  const [sendingReceiptChannel, setSendingReceiptChannel] = useState<"whatsapp" | null>(null);
  const [rentForm, setRentForm] = useState({
    contractId: initialLease?.contractId ?? "",
    collectionMonth: currentMonth,
    collectedAmount: initialLease ? String(initialLease.currentRent) : "",
    paymentMethod: "Transferencia",
    paymentDate: todayDate,
    generateSettlement: true,
  });
  const [sendingTestId, setSendingTestId] = useState<string | null>(null);
  const [generatingSettlementId, setGeneratingSettlementId] = useState<string | null>(null);
  const [rescindingContractId, setRescindingContractId] = useState<string | null>(null);
  const [receiptDeliveryStatus, setReceiptDeliveryStatus] = useState<null | {
    type: "info" | "success" | "error";
    message: string;
  }>(null);
  const [editingSettlementId, setEditingSettlementId] = useState<string | null>(null);
  const [conceptForm, setConceptForm] = useState({
    label: "",
    amount: "",
    effect: "Descuento" as OwnerSettlementItemSummary["effect"],
    applyManagementFee: false,
    notes: "",
  });
  const [feedback, setFeedback] = useState<null | { type: "success" | "error"; message: string }>(null);
  const selectedRentLease = leases.find((lease) => lease.contractId === rentForm.contractId) ?? null;

  const filteredLeases = useMemo(() => {
    const normalized = query
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .trim();

    if (!normalized) return leases;

    return leases.filter((lease) => {
      const haystack = [
        lease.tenantName,
        lease.tenantPhone,
        lease.propertyTitle,
        lease.propertyLocation,
        lease.exactAddress,
        lease.ownerName ?? "",
      ]
        .join(" ")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase();

      return haystack.includes(normalized);
    });
  }, [leases, query]);

  const rentFormLeases = useMemo(() => {
    const normalized = rentSearch
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .trim();

    if (!normalized) return leases;

    return leases.filter((lease) => {
      const haystack = [lease.tenantName, lease.propertyTitle, lease.propertyLocation, lease.exactAddress, lease.ownerName ?? ""]
        .join(" ")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase();

      return haystack.includes(normalized);
    });
  }, [leases, rentSearch]);

  const collectionsByContract = useMemo(() => {
    const map = new Map<string, RentalCollectionSummary>();
    for (const collection of collections) {
      if (!map.has(collection.contractId)) {
        map.set(collection.contractId, collection);
      }
    }
    return map;
  }, [collections]);

  const delinquenciesByContract = useMemo(() => {
    return new Map(delinquencies.map((item) => [item.contractId, item]));
  }, [delinquencies]);

  const settlementsByContract = useMemo(() => {
    const map = new Map<string, OwnerSettlementSummary>();
    for (const settlement of ownerSettlements) {
      if (!map.has(settlement.contractId)) {
        map.set(settlement.contractId, settlement);
      }
    }
    return map;
  }, [ownerSettlements]);

  const adjustmentsByContract = useMemo(() => {
    const map = new Map<string, RentalAdjustmentSummary>();
    for (const adjustment of recentAdjustments) {
      if (!map.has(adjustment.contractId)) {
        map.set(adjustment.contractId, adjustment);
      }
    }
    return map;
  }, [recentAdjustments]);

  const employeeActions = useMemo(() => {
    return leases
      .flatMap((lease) => {
        const latestCollection = collectionsByContract.get(lease.contractId);
        const delinquency = delinquenciesByContract.get(lease.contractId);
        const latestSettlement = settlementsByContract.get(lease.contractId);
        const actions: Array<{
          id: string;
          label: string;
          detail: string;
          priority: "Alta" | "Media" | "Baja";
          href?: string;
          contractId?: string;
          kind: "collection" | "settlement" | "delinquency" | "contract" | "maintenance";
        }> = [];

        if (delinquency) {
          actions.push({
            id: `${lease.contractId}-mora`,
            label: `Avisar mora a ${lease.tenantName}`,
            detail: `${formatMoney(delinquency.totalDebtAmount, "ARS")} pendientes - ${delinquency.daysLate} dias de atraso.`,
            priority: delinquency.risk,
            href: "/morosos",
            kind: "delinquency",
          });
        } else if (!latestCollection || latestCollection.collectionMonth !== currentMonth || latestCollection.status !== "Cobrada") {
          actions.push({
            id: `${lease.contractId}-cobrar`,
            label: `Cobrar alquiler de ${lease.tenantName}`,
            detail: `${lease.propertyTitle} - ${formatMoney(lease.currentRent, "ARS")}`,
            priority: "Alta",
            href: `/cobranzas?contract=${lease.contractId}`,
            kind: "collection",
          });
        }

        if (lease.ownerName && (!latestSettlement || latestSettlement.settlementMonth !== currentMonth)) {
          actions.push({
            id: `${lease.contractId}-liquidar`,
            label: `Liquidar a ${lease.ownerName}`,
            detail: `Contrato de ${lease.tenantName} - ${lease.propertyTitle}`,
            priority: "Media",
            contractId: lease.contractId,
            kind: "settlement",
          });
        }

        if (!lease.ownerName || !lease.tenantPhone || !lease.adjustmentFrequencyMonths) {
          actions.push({
            id: `${lease.contractId}-revisar`,
            label: `Completar datos del contrato`,
            detail: `${lease.propertyTitle} necesita datos para operar sin friccion.`,
            priority: "Media",
            href: `/propiedades?edit=${lease.propertyId}`,
            kind: "contract",
          });
        }

        actions.push({
          id: `${lease.contractId}-mantenimiento`,
          label: `Revisar tickets y carteles`,
          detail: `Control operativo de ${lease.propertyTitle}.`,
          priority: "Baja",
          href: "/proveedores",
          kind: "maintenance",
        });

        return actions;
      })
      .sort((a, b) => {
        const weight = { Alta: 0, Media: 1, Baja: 2 };
        return weight[a.priority] - weight[b.priority];
      })
      .slice(0, 8);
  }, [collectionsByContract, currentMonth, delinquenciesByContract, leases, settlementsByContract]);

  async function handleSendTest(contractId: string, tenantName: string) {
    setSendingTestId(contractId);
    setFeedback(null);

    const response = await fetch("/api/admin/rent-adjustments/test", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({ contractId }),
    });

    const payload = await response.json().catch(() => null);

    if (!response.ok) {
      setSendingTestId(null);
      setFeedback({
        type: "error",
        message: payload?.error ?? "No se pudo enviar la prueba.",
      });
      return;
    }

    setSendingTestId(null);
    setFeedback({
      type: "success",
      message: `Prueba enviada a ${tenantName}. Revisa ese WhatsApp para confirmar el aumento simulado.`,
    });
  }

  async function handleGenerateSettlement(contractId?: string, ownerName?: string) {
    setGeneratingSettlementId(contractId ?? "all");
    setFeedback(null);

    const response = await fetch("/api/admin/owner-settlements", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        contractId,
      }),
    });

    const payload = await response.json().catch(() => null);

    if (!response.ok) {
      setGeneratingSettlementId(null);
      setFeedback({
        type: "error",
        message: payload?.error ?? "No se pudo generar la liquidacion.",
      });
      return;
    }

    setGeneratingSettlementId(null);
    setFeedback({
      type: "success",
      message: contractId
        ? `Liquidacion emitida para ${ownerName ?? "el propietario"} en ${payload?.settlementMonth ?? "este mes"}.`
        : `Se emitieron ${payload?.processed ?? 0} liquidaciones de propietarios para ${payload?.settlementMonth ?? "este mes"}.`,
    });
    window.location.reload();
  }

  function openRentRegistration(contractId?: string) {
    const lease = leases.find((item) => item.contractId === contractId) ?? selectedRentLease ?? leases[0] ?? null;
    setRentReceipt(null);
    setReceiptDeliveryStatus(null);
    setRentFormOpen(true);
    if (lease) {
      setRentForm((current) => ({
        ...current,
        contractId: lease.contractId,
        collectedAmount: String(lease.currentRent),
      }));
    }
  }

  async function handleRegisterRent() {
    if (!selectedRentLease) {
      setFeedback({ type: "error", message: "Selecciona una propiedad alquilada para registrar el cobro." });
      return;
    }

    setRegisteringRent(true);
    setFeedback(null);
    setRentReceipt(null);

    const collectedAmount = Number(rentForm.collectedAmount || 0);
    const collectionResponse = await fetch("/api/admin/rental-collections", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        contractId: selectedRentLease.contractId,
        collectionMonth: rentForm.collectionMonth,
        collectedAmount,
        paymentMethod: rentForm.paymentMethod,
        paymentDate: rentForm.paymentDate,
      }),
    });
    const collectionPayload = await collectionResponse.json().catch(() => null);

    if (!collectionResponse.ok) {
      setRegisteringRent(false);
      setFeedback({
        type: "error",
        message: collectionPayload?.error ?? "No se pudo registrar el alquiler.",
      });
      return;
    }

    let settlementProcessed = 0;
    if (rentForm.generateSettlement) {
      const settlementResponse = await fetch("/api/admin/owner-settlements", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          contractId: selectedRentLease.contractId,
          settlementMonth: rentForm.collectionMonth,
        }),
      });
      const settlementPayload = await settlementResponse.json().catch(() => null);
      if (!settlementResponse.ok) {
        setRegisteringRent(false);
        setFeedback({
          type: "error",
          message: `Alquiler registrado, pero no se pudo liquidar al propietario: ${
            settlementPayload?.error ?? "revisa la liquidacion manualmente."
          }`,
        });
        return;
      }
      settlementProcessed = Number(settlementPayload?.processed ?? 0);
    }

    const receipt = {
      receiptNumber: collectionPayload?.receiptNumber ?? buildDocumentNumber("RC", new Date().toISOString(), selectedRentLease.contractId),
      contractId: selectedRentLease.contractId,
      agencyName: selectedRentLease.agencyName,
      tenantName: selectedRentLease.tenantName,
      tenantPhone: selectedRentLease.tenantPhone,
      tenantEmail: selectedRentLease.tenantEmail,
      propertyTitle: selectedRentLease.propertyTitle,
      propertyLocation: selectedRentLease.propertyLocation,
      collectionMonth: rentForm.collectionMonth,
      collectedAmount,
      expectedRent: selectedRentLease.currentRent,
      paymentMethod: rentForm.paymentMethod,
      paymentDate: rentForm.paymentDate,
    };

    setRentReceipt(receipt);
    setRegisteringRent(false);
    setFeedback({
      type: "success",
      message: `Alquiler registrado con comprobante ${receipt.receiptNumber}. ${
        rentForm.generateSettlement ? `Liquidaciones generadas: ${settlementProcessed}.` : "Liquidacion pendiente."
      }`,
    });
  }

  function printRentReceipt(receipt = rentReceipt) {
    if (!receipt) return;
    const balance = Math.max(0, receipt.expectedRent - receipt.collectedAmount);
    const html = `
      <html>
        <head>
          <title>Comprobante de alquiler - ${receipt.receiptNumber}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 32px; color: #0f172a; }
            .box { border: 1px solid #cbd5e1; border-radius: 18px; padding: 24px; }
            h1 { margin: 0 0 8px; font-size: 24px; }
            p { margin: 6px 0; }
            .muted { color: #64748b; }
            .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-top: 24px; }
            .metric { border: 1px solid #e2e8f0; border-radius: 14px; padding: 14px; }
            .label { font-size: 11px; letter-spacing: .16em; text-transform: uppercase; color: #64748b; }
            .value { margin-top: 8px; font-size: 20px; font-weight: 700; }
          </style>
        </head>
        <body>
          <div class="box">
            <p class="label">${receipt.agencyName} - comprobante de alquiler ${receipt.receiptNumber}</p>
            <h1>${receipt.tenantName}</h1>
            <p class="muted">${receipt.propertyTitle} - ${receipt.propertyLocation}</p>
            <p>Periodo: <strong>${receipt.collectionMonth}</strong></p>
            <p>Metodo: <strong>${receipt.paymentMethod}</strong></p>
            <p>Fecha de pago: <strong>${receipt.paymentDate || "Pendiente"}</strong></p>
            <div class="grid">
              <div class="metric"><div class="label">Alquiler esperado</div><div class="value">${formatMoney(receipt.expectedRent, "ARS")}</div></div>
              <div class="metric"><div class="label">Cobrado</div><div class="value">${formatMoney(receipt.collectedAmount, "ARS")}</div></div>
              <div class="metric"><div class="label">Saldo</div><div class="value">${formatMoney(balance, "ARS")}</div></div>
            </div>
            <p class="muted" style="margin-top:24px;">Este comprobante confirma el pago informado para el periodo indicado.</p>
          </div>
          <script>window.print(); window.close();</script>
        </body>
      </html>
    `;
    const printWindow = window.open("", "_blank", "width=900,height=700");
    printWindow?.document.write(html);
    printWindow?.document.close();
  }

  async function sendRentReceiptByWhatsApp() {
    if (!rentReceipt) return;
    setSendingReceiptChannel("whatsapp");
    setReceiptDeliveryStatus({
      type: "info",
      message: `Enviando WhatsApp a ${rentReceipt.tenantName} (${rentReceipt.tenantPhone || "sin telefono"})...`,
    });
    setFeedback(null);

    try {
      const response = await fetch("/api/admin/rental-receipts/whatsapp", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          contractId: rentReceipt.contractId,
          collectionMonth: rentReceipt.collectionMonth,
          receiptNumber: rentReceipt.receiptNumber,
        }),
      });
      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        const errorMessage = payload?.requestId
          ? `${payload?.error ?? "No se pudo enviar el comprobante por WhatsApp."} ID: ${payload.requestId}${
              payload?.detail ? `. Detalle: ${payload.detail}` : ""
            }`
          : payload?.detail
            ? `${payload?.error ?? "No se pudo enviar el comprobante por WhatsApp."} Detalle: ${payload.detail}`
            : payload?.error ?? "No se pudo enviar el comprobante por WhatsApp.";
        setReceiptDeliveryStatus({
          type: "error",
          message: errorMessage,
        });
        setFeedback({
          type: "error",
          message: errorMessage,
        });
        return;
      }

      const successMessage =
        payload?.warning ??
        `Comprobante ${rentReceipt.receiptNumber} enviado por WhatsApp a ${rentReceipt.tenantName}.`;
      setReceiptDeliveryStatus({
        type: payload?.warning ? "error" : "success",
        message: payload?.requestId ? `${successMessage} ID: ${payload.requestId}` : successMessage,
      });
      setFeedback({
        type: payload?.warning ? "error" : "success",
        message: successMessage,
      });
    } catch (error) {
      const errorMessage = `No se pudo contactar al servidor para enviar WhatsApp. Detalle: ${
        error instanceof Error ? error.message : String(error)
      }`;
      setReceiptDeliveryStatus({
        type: "error",
        message: errorMessage,
      });
      setFeedback({
        type: "error",
        message: errorMessage,
      });
    } finally {
      setSendingReceiptChannel(null);
    }
  }

  function buildRentReceiptEmailHref() {
    if (!rentReceipt?.tenantEmail) return "#";
    const balance = Math.max(0, rentReceipt.expectedRent - rentReceipt.collectedAmount);
    const subject = `Comprobante de alquiler ${rentReceipt.receiptNumber}`;
    const body = [
      `Hola ${rentReceipt.tenantName},`,
      "",
      `Te enviamos el comprobante de alquiler de ${rentReceipt.agencyName}.`,
      "",
      `Comprobante: ${rentReceipt.receiptNumber}`,
      `Propiedad: ${rentReceipt.propertyTitle} - ${rentReceipt.propertyLocation}`,
      `Periodo: ${rentReceipt.collectionMonth}`,
      `Importe abonado: ${formatMoney(rentReceipt.collectedAmount, "ARS")}`,
      `Metodo de pago: ${rentReceipt.paymentMethod}`,
      `Fecha: ${rentReceipt.paymentDate || "pendiente"}`,
      `Saldo pendiente: ${formatMoney(balance, "ARS")}`,
      "",
      `Gracias.`,
      rentReceipt.agencyName,
    ].join("\n");

    return `mailto:${encodeURIComponent(rentReceipt.tenantEmail)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  }

  async function handleRescission(contractId: string, tenantName: string) {
    setRescindingContractId(contractId);
    setFeedback(null);

    const response = await fetch("/api/admin/contract-rescissions", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        contractId,
        reason: "Solicitud de rescision iniciada desde el panel de alquileres.",
        settlementTerms: "Pendiente de definir penalidad, estado de pago y entrega de unidad.",
        status: "En negociacion",
      }),
    });
    const payload = await response.json().catch(() => null);
    setRescindingContractId(null);
    if (!response.ok) {
      setFeedback({
        type: "error",
        message: payload?.error ?? "No se pudo iniciar la rescision.",
      });
      return;
    }
    setFeedback({
      type: "success",
      message: `Rescision iniciada para ${tenantName}. Ya queda en seguimiento contractual.`,
    });
    window.location.reload();
  }

  async function handleCreateSettlementItem(settlementId: string) {
    setFeedback(null);

    const response = await fetch("/api/admin/owner-settlement-items", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        settlementId,
        label: conceptForm.label,
        amount: Number(conceptForm.amount),
        effect: conceptForm.effect,
        applyManagementFee: conceptForm.applyManagementFee,
        notes: conceptForm.notes,
      }),
    });

    const payload = await response.json().catch(() => null);
    if (!response.ok) {
      setFeedback({
        type: "error",
        message: payload?.error ?? "No se pudo agregar el concepto particular.",
      });
      return;
    }

    setFeedback({
      type: "success",
      message: "Concepto agregado y liquidacion recalculada.",
    });
    setConceptForm({
      label: "",
      amount: "",
      effect: "Descuento",
      applyManagementFee: false,
      notes: "",
    });
    setEditingSettlementId(null);
    window.location.reload();
  }

  async function handleDeleteSettlementItem(itemId: string) {
    setFeedback(null);

    const response = await fetch("/api/admin/owner-settlement-items", {
      method: "DELETE",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ itemId }),
    });
    const payload = await response.json().catch(() => null);
    if (!response.ok) {
      setFeedback({
        type: "error",
        message: payload?.error ?? "No se pudo eliminar el concepto particular.",
      });
      return;
    }

    setFeedback({
      type: "success",
      message: "Concepto eliminado y liquidacion recalculada.",
    });
    window.location.reload();
  }

  function resetConceptForm() {
    setEditingSettlementId(null);
    setConceptForm({
      label: "",
      amount: "",
      effect: "Descuento",
      applyManagementFee: false,
      notes: "",
    });
  }

  function exportAccountStatements() {
    const rows = [
      [
        "Contrato",
        "Inquilino",
        "Propiedad",
        "Propietario",
        "Alquiler actual",
        "Periodo ultima cobranza",
        "Cobrado",
        "Saldo alquiler",
        "Punitorios",
        "Saldo total",
        "Ultima liquidacion",
        "Neto propietario",
        "Proximo aumento",
      ],
      ...filteredLeases.map((lease) => {
        const collection = collectionsByContract.get(lease.contractId);
        const delinquency = delinquenciesByContract.get(lease.contractId);
        const settlement = settlementsByContract.get(lease.contractId);
        const expectedRent = collection?.expectedRent ?? lease.currentRent;
        const collected = collection?.collectedAmount ?? 0;
        const rentBalance = Math.max(0, expectedRent - collected);
        const lateFees = delinquency?.lateFeeAmount ?? 0;
        const totalBalance = delinquency?.totalDebtAmount ?? rentBalance;

        return [
          lease.contractId,
          lease.tenantName,
          lease.propertyTitle,
          lease.ownerName ?? "",
          String(lease.currentRent),
          collection?.collectionMonth ?? "",
          String(collected),
          String(rentBalance),
          String(lateFees),
          String(totalBalance),
          settlement?.settlementMonth ?? "",
          settlement ? String(settlement.ownerPayoutAmount) : "",
          lease.nextAdjustmentDate,
        ];
      }),
    ];

    downloadCsv(`cuenta-corriente-props-${new Date().toISOString().slice(0, 10)}.csv`, rows);
  }

  function printOwnerSettlement(settlement: OwnerSettlementSummary, items: OwnerSettlementItemSummary[]) {
    const concepts = items
      .map(
        (item) => `
          <tr>
            <td>${item.label}</td>
            <td>${item.effect}</td>
            <td>${formatMoney(item.amount, "ARS")}</td>
          </tr>
        `
      )
      .join("");
    const html = `
      <html>
        <head>
          <title>Liquidacion propietario - ${settlement.ownerName}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 32px; color: #0f172a; }
            .box { border: 1px solid #cbd5e1; border-radius: 18px; padding: 24px; }
            h1 { margin: 0 0 8px; font-size: 24px; }
            p { margin: 6px 0; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border-bottom: 1px solid #e2e8f0; padding: 10px; text-align: left; }
            .muted { color: #64748b; }
            .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-top: 24px; }
            .metric { border: 1px solid #e2e8f0; border-radius: 14px; padding: 14px; }
            .label { font-size: 11px; letter-spacing: .16em; text-transform: uppercase; color: #64748b; }
            .value { margin-top: 8px; font-size: 20px; font-weight: 700; }
          </style>
        </head>
        <body>
          <div class="box">
            <p class="label">Props - liquidacion al propietario</p>
            <h1>${settlement.ownerName}</h1>
            <p class="muted">${settlement.propertyTitle} - ${settlement.propertyLocation}</p>
            <p>Periodo: <strong>${settlement.settlementMonth}</strong></p>
            <p>Participacion: <strong>${settlement.participationPercent}%</strong></p>
            <div class="grid">
              <div class="metric"><div class="label">Alquiler cobrado</div><div class="value">${formatMoney(settlement.rentCollected, "ARS")}</div></div>
              <div class="metric"><div class="label">Comision</div><div class="value">${formatMoney(settlement.managementFeeAmount, "ARS")}</div></div>
              <div class="metric"><div class="label">Gastos</div><div class="value">${formatMoney(settlement.monthlyOwnerCosts + settlement.otherChargesAmount, "ARS")}</div></div>
              <div class="metric"><div class="label">Neto a transferir</div><div class="value">${formatMoney(settlement.ownerPayoutAmount, "ARS")}</div></div>
            </div>
            ${
              concepts
                ? `<table><thead><tr><th>Concepto</th><th>Efecto</th><th>Monto</th></tr></thead><tbody>${concepts}</tbody></table>`
                : ""
            }
            <p class="muted" style="margin-top:24px;">Emitido desde Props Control Inmobiliario.</p>
          </div>
          <script>window.print(); window.close();</script>
        </body>
      </html>
    `;
    const printWindow = window.open("", "_blank", "width=900,height=700");
    printWindow?.document.write(html);
    printWindow?.document.close();
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Alquileres"
        description="Sigue contratos activos, datos de inquilinos, propiedades alquiladas y proximos ajustes desde una sola vista."
      />

      <section className="rounded-[28px] border bg-card p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary/75">
              Cobro rapido
            </p>
            <h2 className="mt-2 text-xl font-semibold">Registrar alquiler desde Alquileres</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Busca la propiedad, registra el pago, genera el comprobante y deja lista la liquidacion al propietario.
            </p>
          </div>
          <Button className="rounded-2xl" disabled={leases.length === 0} onClick={() => openRentRegistration()}>
            <ReceiptText className="size-4" />
            Registrar alquiler
          </Button>
        </div>
      </section>

      <RentAutomationPanel summary={rentalSummary} recentAdjustments={recentAdjustments} />

      {feedback ? (
        <div
          className={`rounded-2xl border px-4 py-3 text-sm ${
            feedback.type === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
              : "border-red-200 bg-red-50 text-red-700"
          }`}
        >
          {feedback.message}
        </div>
      ) : null}

      {leases.length > 0 ? (
        <>
          <section className="grid gap-4 lg:grid-cols-2 xl:grid-cols-4">
            <MiniInfoCard
              label="Contratos activos"
              value={String(rentalSummary.totalActiveContracts)}
              hint="Contratos hoy en marcha."
            />
            <MiniInfoCard
              label="Ajustan hoy"
              value={String(rentalSummary.dueToday)}
              hint="Conviene revisar y avisar."
            />
            <MiniInfoCard
              label="Ajustan en 7 dias"
              value={String(rentalSummary.dueThisWeek)}
              hint="Planifica avisos y seguimiento."
            />
            <MiniInfoCard
              label="Avisos fallidos"
              value={String(rentalSummary.failedNotifications)}
              hint="Necesitan revision manual."
            />
            <MiniInfoCard
              label="Liquidaciones del mes"
              value={String(rentalSummary.ownerSettlementsThisMonth)}
              hint="Emitidas para propietarios."
            />
            <MiniInfoCard
              label="Pagos a propietarios"
              value={String(rentalSummary.pendingOwnerPayouts)}
              hint="Pendientes de marcar como pagados."
            />
          </section>

          <section className="rounded-[30px] border bg-card p-5 shadow-sm">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
              <div>
                <p className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-primary">
                  <Sparkles className="size-4" />
                  Modo empleado
                </p>
                <h2 className="mt-3 text-xl font-semibold">Operacion diaria de alquileres</h2>
                <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
                  Cada contrato funciona como expediente unico: cobranza, cuenta corriente, ajustes, propietario,
                  morosidad, documentos, rescisiones y tareas operativas en una sola vista.
                </p>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Buscar inquilino, propiedad o propietario"
                    className="h-11 w-full rounded-2xl border bg-background pl-10 pr-3 text-sm outline-none transition focus:border-primary sm:w-80"
                  />
                </div>
                <div className="flex rounded-2xl border bg-muted/30 p-1">
                  <button
                    type="button"
                    onClick={() => setEmployeeMode("actions")}
                    className={`rounded-xl px-3 py-2 text-sm font-medium transition ${
                      employeeMode === "actions" ? "bg-primary text-primary-foreground" : "text-muted-foreground"
                    }`}
                  >
                    Acciones
                  </button>
                  <button
                    type="button"
                    onClick={() => setEmployeeMode("dossier")}
                    className={`rounded-xl px-3 py-2 text-sm font-medium transition ${
                      employeeMode === "dossier" ? "bg-primary text-primary-foreground" : "text-muted-foreground"
                    }`}
                  >
                    Expedientes
                  </button>
                </div>
                <Button variant="outline" className="rounded-2xl" onClick={exportAccountStatements}>
                  <Download className="size-4" />
                  Exportar cuenta corriente
                </Button>
              </div>
            </div>

            {employeeMode === "actions" ? (
              <div className="mt-5 grid gap-3 lg:grid-cols-2">
                {employeeActions.length > 0 ? (
                  employeeActions.map((action) => (
                    <DailyActionCard
                      key={action.id}
                      action={action}
                      disabled={action.contractId ? generatingSettlementId === action.contractId : false}
                      onGenerateSettlement={
                        action.contractId
                          ? () => {
                              const lease = leases.find((item) => item.contractId === action.contractId);
                              handleGenerateSettlement(action.contractId, lease?.ownerName ?? undefined);
                            }
                          : undefined
                      }
                    />
                  ))
                ) : (
                  <div className="rounded-[24px] border border-dashed bg-background p-5 text-sm text-muted-foreground lg:col-span-2">
                    No hay acciones urgentes. El equipo puede revisar mensajes, publicaciones o agenda.
                  </div>
                )}
              </div>
            ) : (
              <div className="mt-5 grid gap-4 xl:grid-cols-2">
                {filteredLeases.map((lease) => (
                  <ContractDossierCard
                    key={lease.contractId}
                    lease={lease}
                    collection={collectionsByContract.get(lease.contractId)}
                    delinquency={delinquenciesByContract.get(lease.contractId)}
                    settlement={settlementsByContract.get(lease.contractId)}
                    adjustment={adjustmentsByContract.get(lease.contractId)}
                    sendingTest={sendingTestId === lease.contractId}
                    generatingSettlement={generatingSettlementId === lease.contractId}
                    rescinding={rescindingContractId === lease.contractId}
                    onSendTest={() => handleSendTest(lease.contractId, lease.tenantName)}
                    onGenerateSettlement={() => handleGenerateSettlement(lease.contractId, lease.ownerName ?? undefined)}
                    onRescission={() => handleRescission(lease.contractId, lease.tenantName)}
                  />
                ))}
              </div>
            )}
          </section>

          <section className="rounded-[30px] border bg-card p-5 shadow-sm">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary/75">
                  Liquidaciones automaticas
                </p>
                <h2 className="mt-2 text-xl font-semibold">Liquidaciones para propietarios</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Props calcula el neto a transferir segun alquiler, comision y gastos fijos del contrato.
                </p>
              </div>
              <Button
                variant="outline"
                className="rounded-2xl"
                disabled={generatingSettlementId === "all"}
                onClick={() => handleGenerateSettlement()}
              >
                {generatingSettlementId === "all" ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <CircleDollarSign className="size-4" />
                )}
                Generar liquidaciones del mes
              </Button>
            </div>

            <div className="mt-5 grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
              {ownerSettlements.length > 0 ? (
                ownerSettlements.map((settlement) => {
                  const items = ownerSettlementItems.filter((item) => item.settlementId === settlement.id);

                  return (
                    <article key={settlement.id} className="rounded-[24px] border bg-background p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary/75">
                            {settlement.settlementMonth}
                          </p>
                          <h3 className="mt-2 font-semibold">{settlement.ownerName}</h3>
                          <p className="mt-1 text-sm text-muted-foreground">
                            {settlement.propertyTitle} · {settlement.propertyLocation}
                          </p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            Participacion {settlement.participationPercent}%
                          </p>
                        </div>
                        <Badge variant="outline" className="rounded-full">
                          {settlement.status}
                        </Badge>
                      </div>

                      <div className="mt-4 grid gap-3 sm:grid-cols-2">
                        <InfoMetric label="Alquiler cobrado" value={formatMoney(settlement.rentCollected, "ARS")} />
                        <InfoMetric
                          label={`Comision ${settlement.managementFeePercent}%`}
                          value={formatMoney(settlement.managementFeeAmount, "ARS")}
                        />
                        <InfoMetric label="Gastos fijos" value={formatMoney(settlement.monthlyOwnerCosts, "ARS")} />
                        <InfoMetric
                          label="Neto al propietario"
                          value={formatMoney(settlement.ownerPayoutAmount, "ARS")}
                        />
                      </div>

                      {settlement.otherChargesAmount > 0 || settlement.otherChargesDetail ? (
                        <p className="mt-3 text-sm text-muted-foreground">
                          Otros cargos: {formatMoney(settlement.otherChargesAmount, "ARS")}
                          {settlement.otherChargesDetail ? ` · ${settlement.otherChargesDetail}` : ""}
                        </p>
                      ) : null}

                      <div className="mt-4 flex flex-wrap gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="rounded-2xl"
                          onClick={() => printOwnerSettlement(settlement, items)}
                        >
                          <Printer className="size-4" />
                          Imprimir liquidacion
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="rounded-2xl"
                          onClick={() =>
                            downloadCsv(`liquidacion-${settlement.ownerName}-${settlement.settlementMonth}.csv`, [
                              ["Propietario", "Propiedad", "Periodo", "Alquiler", "Comision", "Gastos", "Otros cargos", "Neto"],
                              [
                                settlement.ownerName,
                                settlement.propertyTitle,
                                settlement.settlementMonth,
                                String(settlement.rentCollected),
                                String(settlement.managementFeeAmount),
                                String(settlement.monthlyOwnerCosts),
                                String(settlement.otherChargesAmount),
                                String(settlement.ownerPayoutAmount),
                              ],
                              ...items.map((item) => [
                                item.label,
                                item.effect,
                                "",
                                "",
                                "",
                                "",
                                String(item.amount),
                                item.notes,
                              ]),
                            ])
                          }
                        >
                          <Download className="size-4" />
                          Exportar
                        </Button>
                      </div>

                      <div className="mt-4 rounded-2xl border bg-muted/15 p-4">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary/75">
                              Conceptos particulares
                            </p>
                            <p className="mt-1 text-sm text-muted-foreground">
                              Suma o descuenta honorarios, arreglos, impuestos o ajustes manuales antes de confirmar.
                            </p>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            className="rounded-full"
                            onClick={() =>
                              setEditingSettlementId((current) => (current === settlement.id ? null : settlement.id))
                            }
                          >
                            {editingSettlementId === settlement.id ? "Cerrar" : "Agregar concepto"}
                          </Button>
                        </div>

                        {items.length > 0 ? (
                          <div className="mt-3 space-y-2">
                            {items.map((item) => (
                              <div
                                key={item.id}
                                className="flex items-start justify-between gap-3 rounded-2xl border bg-background px-3 py-2 text-sm"
                              >
                                <div>
                                  <p className="font-medium">{item.label}</p>
                                  <p className="text-muted-foreground">
                                    {item.effect}
                                    {item.applyManagementFee ? " · aplica comision" : ""}
                                    {item.notes ? ` · ${item.notes}` : ""}
                                  </p>
                                </div>
                                <div className="flex items-center gap-3">
                                  <span className="font-medium">{formatMoney(item.amount, "ARS")}</span>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    className="rounded-full px-2 text-red-600 hover:text-red-700"
                                    onClick={() => handleDeleteSettlementItem(item.id)}
                                  >
                                    Quitar
                                  </Button>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="mt-3 text-sm text-muted-foreground">
                            Todavia no hay conceptos particulares para esta liquidacion.
                          </p>
                        )}

                        {editingSettlementId === settlement.id ? (
                          <div className="mt-4 grid gap-3 rounded-2xl border bg-background p-4">
                            <div className="grid gap-3 sm:grid-cols-2">
                              <label className="space-y-2 text-sm">
                                <span className="font-medium">Concepto</span>
                                <input
                                  className="h-11 w-full rounded-2xl border bg-background px-4 outline-none transition focus:border-primary"
                                  value={conceptForm.label}
                                  onChange={(event) =>
                                    setConceptForm((current) => ({ ...current, label: event.target.value }))
                                  }
                                  placeholder="Ej. honorarios, arreglo, impuesto"
                                />
                              </label>
                              <label className="space-y-2 text-sm">
                                <span className="font-medium">Monto</span>
                                <input
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  className="h-11 w-full rounded-2xl border bg-background px-4 outline-none transition focus:border-primary"
                                  value={conceptForm.amount}
                                  onChange={(event) =>
                                    setConceptForm((current) => ({ ...current, amount: event.target.value }))
                                  }
                                  placeholder="20000"
                                />
                              </label>
                            </div>

                            <div className="grid gap-3 sm:grid-cols-2">
                              <label className="space-y-2 text-sm">
                                <span className="font-medium">Efecto</span>
                                <select
                                  className="h-11 w-full rounded-2xl border bg-background px-4 outline-none transition focus:border-primary"
                                  value={conceptForm.effect}
                                  onChange={(event) =>
                                    setConceptForm((current) => ({
                                      ...current,
                                      effect: event.target.value as OwnerSettlementItemSummary["effect"],
                                    }))
                                  }
                                >
                                  <option value="Descuento">Descontar del propietario</option>
                                  <option value="Suma">Sumar a lo que cobra</option>
                                  <option value="Informativo">Solo informar</option>
                                </select>
                              </label>
                              <label className="space-y-2 text-sm">
                                <span className="font-medium">Notas</span>
                                <input
                                  className="h-11 w-full rounded-2xl border bg-background px-4 outline-none transition focus:border-primary"
                                  value={conceptForm.notes}
                                  onChange={(event) =>
                                    setConceptForm((current) => ({ ...current, notes: event.target.value }))
                                  }
                                  placeholder="Detalle opcional"
                                />
                              </label>
                            </div>

                            <label className="flex items-center gap-3 text-sm text-muted-foreground">
                              <input
                                type="checkbox"
                                checked={conceptForm.applyManagementFee}
                                onChange={(event) =>
                                  setConceptForm((current) => ({
                                    ...current,
                                    applyManagementFee: event.target.checked,
                                  }))
                                }
                              />
                              Aplicar comision de administracion sobre este concepto
                            </label>

                            <div className="flex flex-wrap gap-2">
                              <Button
                                type="button"
                                className="rounded-full"
                                onClick={() => handleCreateSettlementItem(settlement.id)}
                              >
                                Guardar concepto
                              </Button>
                              <Button type="button" variant="outline" className="rounded-full" onClick={resetConceptForm}>
                                Cancelar
                              </Button>
                            </div>
                          </div>
                        ) : null}
                      </div>
                    </article>
                  );
                })
              ) : (
                <div className="rounded-[24px] border border-dashed bg-background p-5 text-sm text-muted-foreground lg:col-span-2 xl:col-span-3">
                  Todavia no hay liquidaciones emitidas. Configura el propietario en el contrato y genera el cierre del
                  mes desde aca.
                </div>
              )}
            </div>
          </section>

          <section className="rounded-[30px] border bg-card p-5 shadow-sm">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary/75">
                  Administracion contractual
                </p>
                <h2 className="mt-2 text-xl font-semibold">Rescisiones y salida de contratos</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Inicia rescisiones, deja asentados terminos y sigue el cierre administrativo de cada alquiler.
                </p>
              </div>
            </div>

            <div className="mt-5 grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
              {rescissions.length > 0 ? (
                rescissions.map((rescission) => (
                  <article key={rescission.id} className="rounded-[24px] border bg-background p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary/75">
                      {rescission.status}
                    </p>
                    <h3 className="mt-2 font-semibold">{rescission.tenantName}</h3>
                    <p className="mt-1 text-sm text-muted-foreground">{rescission.propertyTitle}</p>
                    <p className="mt-3 text-sm text-muted-foreground">
                      Solicitud: {formatShortDate(rescission.requestedOn)}
                    </p>
                    <p className="mt-2 text-sm text-muted-foreground">{rescission.reason}</p>
                  </article>
                ))
              ) : (
                <div className="rounded-[24px] border border-dashed bg-background p-5 text-sm text-muted-foreground lg:col-span-2 xl:col-span-3">
                  Todavia no hay rescisiones abiertas. Puedes iniciarlas desde cada contrato activo cuando haga falta
                  negociar salida, penalidades o entrega.
                </div>
              )}
            </div>
          </section>

          <section className="hidden overflow-hidden rounded-[30px] border bg-card shadow-sm xl:block">
            <div className="grid grid-cols-[1.1fr_1fr_0.8fr_0.9fr_0.8fr_0.7fr_0.8fr] gap-4 border-b px-6 py-4 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              <span>Inquilino</span>
              <span>Propiedad</span>
              <span>Direccion</span>
              <span>Alquiler actual</span>
              <span>Proximo aumento</span>
              <span>Estado</span>
              <span>Acciones</span>
            </div>

            <div className="divide-y">
              {leases.map((lease) => (
                <div
                  key={lease.contractId}
                  className="grid grid-cols-[1.1fr_1fr_0.8fr_0.9fr_0.8fr_0.7fr_0.8fr] gap-4 px-6 py-5"
                >
                  <div className="space-y-1">
                    <p className="font-semibold">{lease.tenantName}</p>
                    <p className="text-sm text-muted-foreground">{lease.tenantEmail || "Sin email"}</p>
                    <p className="text-sm text-muted-foreground">{lease.tenantPhone}</p>
                  </div>

                  <div className="space-y-1">
                    <p className="font-semibold">{lease.propertyTitle}</p>
                    <p className="text-sm text-muted-foreground">{lease.propertyLocation}</p>
                    <p className="text-sm text-muted-foreground">Propietario: {lease.ownerName || "Sin configurar"}</p>
                  </div>

                  <div className="text-sm leading-6 text-muted-foreground">
                    {lease.exactAddress || "Direccion pendiente"}
                  </div>

                  <div className="space-y-1">
                    <p className="font-semibold">{formatMoney(lease.currentRent, lease.currency)}</p>
                    <p className="text-sm text-muted-foreground">
                      {lease.indexType} cada {lease.adjustmentFrequencyMonths} meses
                    </p>
                  </div>

                  <div className="space-y-1">
                    <p className="font-semibold">{formatShortDate(lease.nextAdjustmentDate)}</p>
                    <p className="text-sm text-muted-foreground">Inicio: {formatShortDate(lease.contractStartDate)}</p>
                  </div>

                  <div className="space-y-2">
                    <Badge className={statusStyles[lease.status]}>{lease.status}</Badge>
                    <p className="text-sm text-muted-foreground">
                      {lease.autoNotify ? "Aviso automatico activo" : "Aviso manual"}
                    </p>
                  </div>

                  <div className="flex items-start">
                    <div className="flex flex-col gap-2">
                      <Button
                        variant="outline"
                        className="rounded-2xl"
                        disabled={sendingTestId === lease.contractId}
                        onClick={() => handleSendTest(lease.contractId, lease.tenantName)}
                      >
                        {sendingTestId === lease.contractId ? (
                          <Loader2 className="size-4 animate-spin" />
                        ) : (
                          <Send className="size-4" />
                        )}
                        Enviar prueba
                      </Button>
                      <Button
                        variant="outline"
                        className="rounded-2xl"
                        disabled={!lease.ownerName || generatingSettlementId === lease.contractId}
                        onClick={() => handleGenerateSettlement(lease.contractId, lease.ownerName ?? undefined)}
                      >
                        {generatingSettlementId === lease.contractId ? (
                          <Loader2 className="size-4 animate-spin" />
                        ) : (
                          <CircleDollarSign className="size-4" />
                        )}
                        Liquidar propietario
                      </Button>
                      <Button
                        variant="outline"
                        className="rounded-2xl"
                        disabled={rescindingContractId === lease.contractId}
                        onClick={() => handleRescission(lease.contractId, lease.tenantName)}
                      >
                        {rescindingContractId === lease.contractId ? (
                          <Loader2 className="size-4 animate-spin" />
                        ) : (
                          <CalendarDays className="size-4" />
                        )}
                        Iniciar rescision
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="grid gap-4 xl:hidden">
            {leases.map((lease) => (
              <article key={lease.contractId} className="rounded-[28px] border bg-card p-5 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary/75">
                      {lease.indexType} cada {lease.adjustmentFrequencyMonths} meses
                    </p>
                    <h3 className="mt-2 text-xl font-semibold">{lease.tenantName}</h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {lease.tenantEmail || "Sin email"} · {lease.tenantPhone}
                    </p>
                  </div>
                  <Badge className={statusStyles[lease.status]}>{lease.status}</Badge>
                </div>

                <div className="mt-4 grid gap-3 text-sm text-muted-foreground">
                  <InfoRow icon={<Building2 className="size-4" />} label={lease.propertyTitle} />
                  <InfoRow icon={<UserRound className="size-4" />} label={lease.exactAddress || lease.propertyLocation} />
                  <InfoRow
                    icon={<CircleDollarSign className="size-4" />}
                    label={formatMoney(lease.currentRent, lease.currency)}
                  />
                  <InfoRow
                    icon={<CalendarDays className="size-4" />}
                    label={`Proximo aumento: ${formatShortDate(lease.nextAdjustmentDate)}`}
                  />
                  <InfoRow
                    icon={<Phone className="size-4" />}
                    label={lease.autoNotify ? "Aviso automatico activo" : "Aviso manual"}
                  />
                </div>

                {lease.requirements ? (
                  <div className="mt-4 rounded-[22px] border bg-muted/20 p-4 text-sm leading-6 text-muted-foreground">
                    <span className="font-medium text-foreground">Requisitos del ingreso:</span> {lease.requirements}
                  </div>
                ) : null}

                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  <div className="rounded-[22px] border bg-background p-4 text-sm text-muted-foreground">
                    <p className="text-xs uppercase tracking-[0.2em] text-primary/75">Documentacion</p>
                    <p className="mt-2 font-medium text-foreground">Contrato y soporte del alquiler</p>
                    <p className="mt-1">
                      Todo queda centralizado aca para revisar fechas, clausulas y siguientes pasos.
                    </p>
                  </div>
                  <div className="rounded-[22px] border bg-background p-4 text-sm text-muted-foreground">
                    <p className="text-xs uppercase tracking-[0.2em] text-primary/75">Propietario</p>
                    <p className="mt-2 font-medium text-foreground">
                      {lease.ownerName || "Todavia sin propietario configurado"}
                    </p>
                    <p className="mt-1">
                      {lease.ownerName
                        ? `Comision ${lease.managementFeePercent}% · Gastos fijos ${formatMoney(lease.monthlyOwnerCosts, "ARS")}`
                        : "Completa nombre, contacto y retencion para emitir la liquidacion mensual."}
                    </p>
                  </div>
                  <div className="rounded-[22px] border bg-background p-4 text-sm text-muted-foreground">
                    <p className="text-xs uppercase tracking-[0.2em] text-primary/75">Historial operativo</p>
                    <p className="mt-2 font-medium text-foreground">
                      {recentAdjustments.find((item) => item.contractId === lease.contractId)
                        ? "Ya tiene ajustes registrados"
                        : "Todavia sin ajustes aplicados"}
                    </p>
                    <p className="mt-1">
                      {recentAdjustments.find((item) => item.contractId === lease.contractId)
                        ? "Puedes revisar el ultimo aviso y volver a probar mensajeria si hace falta."
                        : "Cuando se procese el primer aumento, el historial quedara guardado aca."}
                    </p>
                  </div>
                </div>

                <div className="mt-4">
                  <div className="grid gap-3 md:grid-cols-2">
                    <Button
                      variant="outline"
                      className="w-full rounded-2xl"
                      disabled={sendingTestId === lease.contractId}
                      onClick={() => handleSendTest(lease.contractId, lease.tenantName)}
                    >
                      {sendingTestId === lease.contractId ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <Send className="size-4" />
                      )}
                      Enviar prueba de aumento
                    </Button>
                    <Button
                      variant="outline"
                      className="w-full rounded-2xl"
                      disabled={!lease.ownerName || generatingSettlementId === lease.contractId}
                      onClick={() => handleGenerateSettlement(lease.contractId, lease.ownerName ?? undefined)}
                    >
                      {generatingSettlementId === lease.contractId ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <CircleDollarSign className="size-4" />
                      )}
                      Liquidar propietario
                    </Button>
                    <Button
                      variant="outline"
                      className="w-full rounded-2xl"
                      disabled={rescindingContractId === lease.contractId}
                      onClick={() => handleRescission(lease.contractId, lease.tenantName)}
                    >
                      {rescindingContractId === lease.contractId ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <CalendarDays className="size-4" />
                      )}
                      Iniciar rescision
                    </Button>
                  </div>
                </div>
              </article>
            ))}
          </section>
        </>
      ) : (
        <EmptyState
          title="Todavia no hay alquileres cargados"
          description="Cuando una propiedad tenga contrato activo, el inquilino y su cronograma de aumentos apareceran automaticamente en esta seccion."
        />
      )}

      {rentFormOpen ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/45 p-3 backdrop-blur-sm sm:items-center">
          <div className="max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-[30px] border bg-background p-5 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary/75">
                  Registrar alquiler
                </p>
                <h2 className="mt-2 text-2xl font-semibold">Cobro, comprobante y liquidacion</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Selecciona la propiedad alquilada, confirma el monto y Props genera el comprobante. Si esta activado,
                  tambien liquida al propietario.
                </p>
              </div>
              <Button variant="ghost" size="sm" className="rounded-full" onClick={() => setRentFormOpen(false)}>
                <X className="size-4" />
              </Button>
            </div>

            <div className="mt-5 grid gap-5 lg:grid-cols-[0.95fr_1.05fr]">
              <div className="space-y-3">
                <label className="space-y-2 text-sm font-medium">
                  Buscar propiedad, inquilino o propietario
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                    <input
                      value={rentSearch}
                      onChange={(event) => setRentSearch(event.target.value)}
                      placeholder="Ej. Balvanera, Juan, monoambiente"
                      className="h-11 w-full rounded-2xl border bg-background pl-10 pr-3 text-sm outline-none transition focus:border-primary"
                    />
                  </div>
                </label>

                <div className="max-h-80 space-y-2 overflow-y-auto rounded-[24px] border bg-muted/20 p-2">
                  {rentFormLeases.length > 0 ? (
                    rentFormLeases.map((lease) => (
                      <button
                        key={lease.contractId}
                        type="button"
                        className={`w-full rounded-2xl border p-3 text-left transition ${
                          rentForm.contractId === lease.contractId
                            ? "border-primary bg-primary/10"
                            : "bg-background hover:bg-muted"
                        }`}
                        onClick={() =>
                          setRentForm((current) => ({
                            ...current,
                            contractId: lease.contractId,
                            collectedAmount: String(lease.currentRent),
                          }))
                        }
                      >
                        <p className="font-semibold">{lease.propertyTitle}</p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {lease.tenantName} - {lease.propertyLocation}
                        </p>
                        <p className="mt-2 text-sm font-medium">{formatMoney(lease.currentRent, "ARS")}</p>
                      </button>
                    ))
                  ) : (
                    <p className="p-4 text-sm text-muted-foreground">No encontramos contratos con esa busqueda.</p>
                  )}
                </div>
              </div>

              <div className="space-y-4 rounded-[26px] border bg-card p-4">
                {selectedRentLease ? (
                  <div className="rounded-2xl border bg-background p-4">
                    <p className="font-semibold">{selectedRentLease.tenantName}</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {selectedRentLease.propertyTitle} - {selectedRentLease.propertyLocation}
                    </p>
                    <div className="mt-3 grid gap-2 sm:grid-cols-3">
                      <InfoMetric label="Alquiler" value={formatMoney(selectedRentLease.currentRent, "ARS")} />
                      <InfoMetric label="Propietario" value={selectedRentLease.ownerName ?? "Sin configurar"} />
                      <InfoMetric label="Comision" value={`${selectedRentLease.managementFeePercent}%`} />
                    </div>
                  </div>
                ) : null}

                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="space-y-2 text-sm font-medium">
                    Periodo
                    <input
                      type="month"
                      value={rentForm.collectionMonth}
                      onChange={(event) => setRentForm((current) => ({ ...current, collectionMonth: event.target.value }))}
                      className="h-11 w-full rounded-2xl border bg-background px-4 outline-none transition focus:border-primary"
                    />
                  </label>
                  <label className="space-y-2 text-sm font-medium">
                    Fecha de pago
                    <input
                      type="date"
                      value={rentForm.paymentDate}
                      onChange={(event) => setRentForm((current) => ({ ...current, paymentDate: event.target.value }))}
                      className="h-11 w-full rounded-2xl border bg-background px-4 outline-none transition focus:border-primary"
                    />
                  </label>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="space-y-2 text-sm font-medium">
                    Monto cobrado
                    <input
                      type="number"
                      value={rentForm.collectedAmount}
                      onChange={(event) => setRentForm((current) => ({ ...current, collectedAmount: event.target.value }))}
                      className="h-11 w-full rounded-2xl border bg-background px-4 outline-none transition focus:border-primary"
                    />
                  </label>
                  <label className="space-y-2 text-sm font-medium">
                    Metodo de pago
                    <input
                      value={rentForm.paymentMethod}
                      onChange={(event) => setRentForm((current) => ({ ...current, paymentMethod: event.target.value }))}
                      className="h-11 w-full rounded-2xl border bg-background px-4 outline-none transition focus:border-primary"
                    />
                  </label>
                </div>

                <button
                  type="button"
                  className="flex w-full items-start gap-3 rounded-2xl border bg-primary/5 p-4 text-left transition hover:bg-primary/10"
                  onClick={() => setRentForm((current) => ({ ...current, generateSettlement: !current.generateSettlement }))}
                >
                  <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border bg-background">
                    {rentForm.generateSettlement ? <CheckCircle2 className="size-4 text-primary" /> : null}
                  </span>
                  <span>
                    <span className="block font-semibold">Liquidar al propietario automaticamente</span>
                    <span className="mt-1 block text-sm text-muted-foreground">
                      Props usa el monto cobrado, comision, gastos y participacion de propietarios.
                    </span>
                  </span>
                </button>

                <div className="rounded-2xl border bg-background p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                    Resultado
                  </p>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Se registrara un cobro por{" "}
                    <span className="font-semibold text-foreground">
                      {formatMoney(Number(rentForm.collectedAmount || 0), "ARS")}
                    </span>{" "}
                    y se emitira un comprobante numerado.
                  </p>
                  {rentReceipt ? (
                    <div className="mt-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
                      <p className="font-semibold">Comprobante {rentReceipt.receiptNumber}</p>
                      <p className="mt-1">Listo para imprimir o enviar al inquilino por WhatsApp/email.</p>
                    </div>
                  ) : null}
                  {receiptDeliveryStatus ? (
                    <div
                      className={`mt-3 rounded-2xl border p-3 text-sm ${
                        receiptDeliveryStatus.type === "success"
                          ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                          : receiptDeliveryStatus.type === "info"
                            ? "border-blue-200 bg-blue-50 text-blue-800"
                            : "border-red-200 bg-red-50 text-red-800"
                      }`}
                    >
                      {receiptDeliveryStatus.message}
                    </div>
                  ) : null}
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button className="rounded-2xl" disabled={registeringRent || !selectedRentLease} onClick={handleRegisterRent}>
                    {registeringRent ? <Loader2 className="size-4 animate-spin" /> : <ReceiptText className="size-4" />}
                    Registrar y generar comprobante
                  </Button>
                  <Button variant="outline" className="rounded-2xl" disabled={!rentReceipt} onClick={() => printRentReceipt()}>
                    <Printer className="size-4" />
                    Imprimir comprobante
                  </Button>
                  <Button
                    variant="outline"
                    className="rounded-2xl"
                    disabled={!rentReceipt || sendingReceiptChannel === "whatsapp"}
                    onClick={sendRentReceiptByWhatsApp}
                  >
                    {sendingReceiptChannel === "whatsapp" ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
                    Enviar WhatsApp
                  </Button>
                  {rentReceipt?.tenantEmail ? (
                    <a
                      href={buildRentReceiptEmailHref()}
                      className="inline-flex h-10 items-center justify-center gap-2 rounded-2xl border bg-background px-4 text-sm font-medium transition hover:bg-muted"
                    >
                      <Mail className="size-4" />
                      Enviar email
                    </a>
                  ) : (
                    <Button variant="outline" className="rounded-2xl" disabled>
                      <Mail className="size-4" />
                      Enviar email
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function InfoRow({
  icon,
  label,
}: {
  icon: ReactNode;
  label: string;
}) {
  return (
    <div className="inline-flex items-start gap-2">
      <span className="mt-0.5 text-primary">{icon}</span>
      <span>{label}</span>
    </div>
  );
}

function DailyActionCard({
  action,
  disabled,
  onGenerateSettlement,
}: {
  action: {
    label: string;
    detail: string;
    priority: "Alta" | "Media" | "Baja";
    href?: string;
    contractId?: string;
  };
  disabled?: boolean;
  onGenerateSettlement?: () => void;
}) {
  const icon = action.priority === "Alta" ? <AlertTriangle className="size-4" /> : <ClipboardList className="size-4" />;
  const priorityClass =
    action.priority === "Alta"
      ? "bg-red-500/10 text-red-700"
      : action.priority === "Media"
        ? "bg-amber-500/10 text-amber-700"
        : "bg-emerald-500/10 text-emerald-700";

  return (
    <article className="rounded-[24px] border bg-background p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex gap-3">
          <span className="mt-0.5 flex size-9 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            {icon}
          </span>
          <div>
            <p className="font-semibold">{action.label}</p>
            <p className="mt-1 text-sm text-muted-foreground">{action.detail}</p>
          </div>
        </div>
        <Badge className={priorityClass}>{action.priority}</Badge>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {onGenerateSettlement ? (
          <Button className="rounded-2xl" size="sm" disabled={disabled} onClick={onGenerateSettlement}>
            {disabled ? <Loader2 className="size-4 animate-spin" /> : <CircleDollarSign className="size-4" />}
            Liquidar ahora
          </Button>
        ) : null}
        {action.href ? (
          <Link
            href={action.href}
            className="inline-flex h-9 items-center justify-center rounded-2xl border px-3 text-sm font-medium transition hover:bg-muted"
          >
            Abrir modulo
          </Link>
        ) : null}
      </div>
    </article>
  );
}

function ContractDossierCard({
  lease,
  collection,
  delinquency,
  settlement,
  adjustment,
  sendingTest,
  generatingSettlement,
  rescinding,
  onSendTest,
  onGenerateSettlement,
  onRescission,
}: {
  lease: LeaseRosterItem;
  collection?: RentalCollectionSummary;
  delinquency?: DelinquentTenantSummary;
  settlement?: OwnerSettlementSummary;
  adjustment?: RentalAdjustmentSummary;
  sendingTest: boolean;
  generatingSettlement: boolean;
  rescinding: boolean;
  onSendTest: () => void;
  onGenerateSettlement: () => void;
  onRescission: () => void;
}) {
  const currentMonth = new Date().toISOString().slice(0, 7);
  const currentCollection = collection?.collectionMonth === currentMonth ? collection : null;
  const expectedRent = currentCollection?.expectedRent ?? lease.currentRent;
  const collected = currentCollection?.collectedAmount ?? 0;
  const rentBalance = Math.max(0, expectedRent - collected);
  const lateFees = delinquency?.lateFeeAmount ?? 0;
  const totalBalance = delinquency?.totalDebtAmount ?? rentBalance;

  const checklist = [
    {
      label: currentCollection?.status === "Cobrada" ? "Cobranza al dia" : "Cobranza pendiente",
      ok: currentCollection?.status === "Cobrada",
    },
    {
      label: settlement?.settlementMonth === currentMonth ? "Liquidacion emitida" : "Liquidacion pendiente",
      ok: settlement?.settlementMonth === currentMonth,
    },
    {
      label: lease.ownerName ? "Propietario configurado" : "Falta propietario",
      ok: Boolean(lease.ownerName),
    },
    {
      label: lease.autoNotify ? "Avisos automaticos activos" : "Aviso manual",
      ok: lease.autoNotify,
    },
  ];

  return (
    <article className="rounded-[28px] border bg-background p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge className={statusStyles[lease.status]}>{lease.status}</Badge>
            <Badge variant="outline" className="rounded-full">
              Expediente unico
            </Badge>
          </div>
          <h3 className="mt-3 text-xl font-semibold">{lease.tenantName}</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {lease.propertyTitle} - {lease.propertyLocation}
          </p>
        </div>
        <div className="rounded-2xl border bg-card px-4 py-3 text-right">
          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Saldo actual</p>
          <p className="mt-1 text-lg font-semibold">{formatMoney(totalBalance, "ARS")}</p>
        </div>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <InfoMetric label="Alquiler" value={formatMoney(lease.currentRent, "ARS")} />
        <InfoMetric label="Cobrado" value={formatMoney(collected, "ARS")} />
        <InfoMetric label="Punitorios" value={formatMoney(lateFees, "ARS")} />
        <InfoMetric label="Proximo ajuste" value={formatShortDate(lease.nextAdjustmentDate)} />
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-2">
        <div className="rounded-[22px] border bg-card p-4">
          <p className="flex items-center gap-2 text-sm font-semibold">
            <CircleDollarSign className="size-4 text-primary" />
            Cuenta corriente
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            Periodo {currentMonth}: esperado {formatMoney(expectedRent, "ARS")}, cobrado{" "}
            {formatMoney(collected, "ARS")}, saldo {formatMoney(rentBalance, "ARS")}.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Link
              href={`/cobranzas?contract=${lease.contractId}`}
              className="inline-flex h-9 items-center rounded-2xl bg-primary px-3 text-sm font-medium text-primary-foreground"
            >
              Cobrar alquiler
            </Link>
            {delinquency ? (
              <Link
                href="/morosos"
                className="inline-flex h-9 items-center rounded-2xl border px-3 text-sm font-medium transition hover:bg-muted"
              >
                Ver mora
              </Link>
            ) : null}
          </div>
        </div>

        <div className="rounded-[22px] border bg-card p-4">
          <p className="flex items-center gap-2 text-sm font-semibold">
            <UserRound className="size-4 text-primary" />
            Propietario y liquidacion
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            {lease.ownerName
              ? `${lease.ownerName}. Comision ${lease.managementFeePercent}% y gastos fijos ${formatMoney(
                  lease.monthlyOwnerCosts,
                  "ARS"
                )}.`
              : "Falta configurar propietario para poder liquidar y transferir."}
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            {settlement
              ? `Ultima liquidacion: ${settlement.settlementMonth}, neto ${formatMoney(
                  settlement.ownerPayoutAmount,
                  "ARS"
                )}, estado ${settlement.status}.`
              : "Sin liquidacion emitida en los ultimos registros."}
          </p>
        </div>

        <div className="rounded-[22px] border bg-card p-4">
          <p className="flex items-center gap-2 text-sm font-semibold">
            <FileText className="size-4 text-primary" />
            Contrato e indexacion
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            {lease.indexType} cada {lease.adjustmentFrequencyMonths} meses. Inicio{" "}
            {formatShortDate(lease.contractStartDate)}.
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            {adjustment
              ? `Ultimo ajuste: ${formatShortDate(adjustment.appliedOn)}, ${formatMoney(
                  adjustment.previousRent,
                  "ARS"
                )} a ${formatMoney(adjustment.newRent, "ARS")}.`
              : "Aun no hay ajustes aplicados en el historial reciente."}
          </p>
        </div>

        <div className="rounded-[22px] border bg-card p-4">
          <p className="flex items-center gap-2 text-sm font-semibold">
            <Wrench className="size-4 text-primary" />
            Tickets, carteles y tareas
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            Usa este expediente para revisar mantenimiento, fotos, carteles, rescisiones o pendientes comerciales de la
            propiedad.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Link
              href="/proveedores"
              className="inline-flex h-9 items-center rounded-2xl border px-3 text-sm font-medium transition hover:bg-muted"
            >
              Tickets
            </Link>
            <Link
              href="/propiedades"
              className="inline-flex h-9 items-center rounded-2xl border px-3 text-sm font-medium transition hover:bg-muted"
            >
              Carteles/fotos
            </Link>
          </div>
        </div>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {checklist.map((item) => (
          <div key={item.label} className="flex items-center gap-2 rounded-2xl border bg-card px-3 py-2 text-sm">
            {item.ok ? (
              <CheckCircle2 className="size-4 text-emerald-600" />
            ) : (
              <AlertTriangle className="size-4 text-amber-600" />
            )}
            <span>{item.label}</span>
          </div>
        ))}
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <Button variant="outline" className="rounded-2xl" disabled={sendingTest} onClick={onSendTest}>
          {sendingTest ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
          Probar aviso
        </Button>
        <Button variant="outline" className="rounded-2xl" disabled={!lease.ownerName || generatingSettlement} onClick={onGenerateSettlement}>
          {generatingSettlement ? <Loader2 className="size-4 animate-spin" /> : <CircleDollarSign className="size-4" />}
          Liquidar propietario
        </Button>
        <Button variant="outline" className="rounded-2xl" disabled={rescinding} onClick={onRescission}>
          {rescinding ? <Loader2 className="size-4 animate-spin" /> : <CalendarDays className="size-4" />}
          Iniciar rescision
        </Button>
      </div>
    </article>
  );
}

function MiniInfoCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <div className="rounded-[24px] border bg-card p-5 shadow-sm">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-3 text-3xl font-semibold">{value}</p>
      <p className="mt-2 text-sm text-muted-foreground">{hint}</p>
    </div>
  );
}

function InfoMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[18px] border bg-card p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 font-semibold">{value}</p>
    </div>
  );
}

function downloadCsv(fileName: string, rows: string[][]) {
  const csv = rows
    .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
    .join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}

function buildDocumentNumber(prefix: string, dateLike: string, id: string) {
  const datePart = new Date(dateLike).toISOString().slice(0, 10).replace(/-/g, "");
  return `${prefix}-${datePart}-${id.replace(/-/g, "").slice(0, 8).toUpperCase()}`;
}
