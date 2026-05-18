"use client";

import Link from "next/link";
import { useMemo, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import {
  BadgeInfo,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  CircleDollarSign,
  FileText,
  Loader2,
  Plus,
  Sparkles,
  Trash2,
  UploadCloud,
  type LucideIcon,
} from "lucide-react";

import type { Property } from "@/lib/mock-data";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn, formatArsCurrency, formatMoney, formatShortDate } from "@/lib/utils";

type OwnerFormRow = {
  id?: string;
  fullName: string;
  phone: string;
  email: string;
  participationPercent: string;
  bankAlias: string;
  bankAccount: string;
  notes: string;
};

type ContractAnalysis = {
  tenantName: string | null;
  currentRent: number | null;
  indexType: "IPC" | "ICL" | null;
  adjustmentFrequencyMonths: number | null;
  lateFeeDailyAmount: number | null;
  lateFeeGraceDays: number | null;
  contractStartDate: string | null;
  nextAdjustmentDate: string | null;
  summary: string;
  requiresReview: boolean;
  reviewReasons: string[];
};

function getInitialOwners(property: Property): OwnerFormRow[] {
  if (property.rentalContract?.owners?.length) {
    return property.rentalContract.owners.map((owner) => ({
      id: owner.id,
      fullName: owner.fullName,
      phone: owner.phone ?? "",
      email: owner.email ?? "",
      participationPercent: String(owner.participationPercent),
      bankAlias: owner.bankAlias ?? "",
      bankAccount: owner.bankAccount ?? "",
      notes: owner.notes ?? "",
    }));
  }

  if (property.rentalContract?.ownerName) {
    return [
      {
        fullName: property.rentalContract.ownerName,
        phone: property.rentalContract.ownerPhone ?? "",
        email: property.rentalContract.ownerEmail ?? "",
        participationPercent: "100",
        bankAlias: "",
        bankAccount: "",
        notes: property.rentalContract.ownerNotes ?? "",
      },
    ];
  }

  return [
    {
      fullName: "",
      phone: "",
      email: "",
      participationPercent: "100",
      bankAlias: "",
      bankAccount: "",
      notes: "",
    },
  ];
}

function getInitialForm(property: Property) {
  const initialOwners = getInitialOwners(property);
  const primaryOwner = initialOwners[0];

  return {
    tenantName: property.rentalContract?.tenantName ?? "",
    tenantPhone: property.rentalContract?.tenantPhone ?? "",
    tenantEmail: property.rentalContract?.tenantEmail ?? "",
    managementFeePercent: String(property.rentalContract?.managementFeePercent ?? 8),
    monthlyOwnerCosts: String(property.rentalContract?.monthlyOwnerCosts ?? 0),
    ownerName: primaryOwner?.fullName ?? "",
    ownerPhone: primaryOwner?.phone ?? "",
    ownerEmail: primaryOwner?.email ?? "",
    ownerNotes: primaryOwner?.notes ?? property.rentalContract?.ownerNotes ?? "",
    owners: initialOwners,
    currentRent: property.rentalContract?.currentRent
      ? String(property.rentalContract.currentRent)
      : String(property.price),
    indexType: property.rentalContract?.indexType ?? "IPC",
    adjustmentFrequencyMonths: property.rentalContract?.adjustmentFrequencyMonths
      ? String(property.rentalContract.adjustmentFrequencyMonths)
      : "6",
    lateFeeDailyAmount: String(property.rentalContract?.lateFeeDailyAmount ?? 0),
    lateFeeGraceDays: String(property.rentalContract?.lateFeeGraceDays ?? 10),
    contractStartDate: property.rentalContract?.contractStartDate ?? "",
    nextAdjustmentDate: property.rentalContract?.nextAdjustmentDate ?? "",
    notes: property.rentalContract?.notes ?? "",
    autoNotify: property.rentalContract?.autoNotify ?? true,
    status: property.rentalContract?.status ?? "Activo",
  };
}

function getReviewReasons(notes: string) {
  return notes
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.startsWith("[Revision requerida]"))
    .map((line) => line.replace("[Revision requerida]", "").trim());
}

function Field({
  label,
  children,
  hint,
  className,
}: {
  label: string;
  children: ReactNode;
  hint?: string;
  className?: string;
}) {
  return (
    <label className={cn("space-y-2 text-sm font-medium", className)}>
      <span>{label}</span>
      {children}
      {hint ? <span className="block text-xs leading-5 text-muted-foreground">{hint}</span> : null}
    </label>
  );
}

function SectionCard({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-[28px] border bg-card p-5 shadow-sm">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary/70">{eyebrow}</p>
        <h3 className="mt-1 text-lg font-semibold">{title}</h3>
        <p className="mt-1 text-sm leading-6 text-muted-foreground">{description}</p>
      </div>
      <div className="mt-5">{children}</div>
    </section>
  );
}

function MiniInfo({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="rounded-[22px] border bg-background p-4">
      <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
        <Icon className="size-4 text-primary" />
        {label}
      </div>
      <p className="mt-2 text-lg font-semibold">{value}</p>
      {hint ? <p className="mt-1 text-xs leading-5 text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

export function RentalContractDialog({ property }: { property: Property }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [form, setForm] = useState(() => getInitialForm(property));
  const [contractFile, setContractFile] = useState<File | null>(null);
  const [analyzingContract, setAnalyzingContract] = useState(false);
  const [analysisMessage, setAnalysisMessage] = useState<string | null>(null);
  const [analysisSummary, setAnalysisSummary] = useState<string | null>(null);
  const [analysisReviewReasons, setAnalysisReviewReasons] = useState<string[]>([]);

  const reviewReasons = useMemo(
    () => getReviewReasons(property.rentalContract?.notes ?? ""),
    [property.rentalContract?.notes]
  );
  const requiresReview =
    property.rentalContract?.status === "Pausado" && reviewReasons.length > 0;

  const acceptedFormats = useMemo(
    () =>
      [
        ".pdf",
        ".doc",
        ".docx",
        ".txt",
        "application/pdf",
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "text/plain",
      ].join(","),
    []
  );

  const ownerParticipationTotal = form.owners.reduce(
    (sum, owner) => sum + (Number(owner.participationPercent) || 0),
    0
  );

  function updateOwner(index: number, patch: Partial<OwnerFormRow>) {
    setForm((prev) => ({
      ...prev,
      owners: prev.owners.map((owner, ownerIndex) =>
        ownerIndex === index ? { ...owner, ...patch } : owner
      ),
    }));
  }

  function addOwner() {
    setForm((prev) => ({
      ...prev,
      owners: [
        ...prev.owners,
        {
          fullName: "",
          phone: "",
          email: "",
          participationPercent: "0",
          bankAlias: "",
          bankAccount: "",
          notes: "",
        },
      ],
    }));
  }

  function removeOwner(index: number) {
    setForm((prev) => ({
      ...prev,
      owners:
        prev.owners.length === 1
          ? [
              {
                fullName: "",
                phone: "",
                email: "",
                participationPercent: "100",
                bankAlias: "",
                bankAccount: "",
                notes: "",
              },
            ]
          : prev.owners.filter((_, ownerIndex) => ownerIndex !== index),
    }));
  }

  function buildSanitizedOwners() {
    return form.owners
      .map((owner, index) => ({
        id: owner.id,
        fullName: owner.fullName.trim(),
        phone: owner.phone.trim() || null,
        email: owner.email.trim() || null,
        participationPercent: Number(owner.participationPercent || 0),
        bankAlias: owner.bankAlias.trim() || null,
        bankAccount: owner.bankAccount.trim() || null,
        notes: owner.notes.trim(),
        displayOrder: index,
      }))
      .filter((owner) => owner.fullName);
  }

  function applyContractAnalysis(analysis: ContractAnalysis) {
    setForm((prev) => ({
      ...prev,
      tenantName: analysis.tenantName ?? prev.tenantName,
      currentRent: analysis.currentRent ? String(Math.round(analysis.currentRent)) : prev.currentRent,
      indexType: analysis.indexType ?? prev.indexType,
      adjustmentFrequencyMonths: analysis.adjustmentFrequencyMonths
        ? String(analysis.adjustmentFrequencyMonths)
        : prev.adjustmentFrequencyMonths,
      lateFeeDailyAmount:
        analysis.lateFeeDailyAmount !== null && analysis.lateFeeDailyAmount !== undefined
          ? String(Math.round(analysis.lateFeeDailyAmount))
          : prev.lateFeeDailyAmount,
      lateFeeGraceDays:
        analysis.lateFeeGraceDays !== null && analysis.lateFeeGraceDays !== undefined
          ? String(analysis.lateFeeGraceDays)
          : prev.lateFeeGraceDays,
      contractStartDate: analysis.contractStartDate ?? prev.contractStartDate,
      nextAdjustmentDate: analysis.nextAdjustmentDate ?? prev.nextAdjustmentDate,
    }));
  }

  async function handleContractFileChange(file: File | null) {
    setContractFile(file);
    setAnalysisMessage(null);
    setAnalysisSummary(null);
    setAnalysisReviewReasons([]);

    if (!file) return;

    setAnalyzingContract(true);
    setAnalysisMessage("Leyendo contrato y completando datos...");
    setError(null);

    const body = new FormData();
    body.set("contractFile", file);
    body.set("fallbackRent", form.currentRent || String(property.price));

    try {
      const response = await fetch("/api/admin/rental-contracts/analyze", {
        method: "POST",
        body,
      });
      const payload = await response.json().catch(() => null);

      if (!response.ok || !payload?.analysis) {
        setAnalysisMessage(payload?.error ?? "No pudimos analizar el contrato automaticamente.");
        return;
      }

      const analysis = payload.analysis as ContractAnalysis;
      applyContractAnalysis(analysis);
      setAnalysisSummary(analysis.summary || null);
      setAnalysisReviewReasons(analysis.reviewReasons ?? []);
      setAnalysisMessage(
        analysis.requiresReview
          ? "Autocompletamos los datos detectados, pero hay puntos para revisar."
          : "Datos del alquiler autocompletados desde el contrato."
      );
      setShowAdvanced(true);
    } catch (error) {
      setAnalysisMessage(
        error instanceof Error
          ? error.message
          : "No pudimos analizar el contrato automaticamente."
      );
    } finally {
      setAnalyzingContract(false);
    }
  }

  async function handleSave() {
    setSubmitting(true);
    setError(null);

    const sanitizedOwners = buildSanitizedOwners();
    const primaryOwner = sanitizedOwners[0] ?? null;
    const body = new FormData();

    body.set("propertyId", property.id);
    body.set("tenantName", form.tenantName);
    body.set("tenantPhone", form.tenantPhone);
    body.set("tenantEmail", form.tenantEmail);
    body.set("ownerName", primaryOwner?.fullName ?? "");
    body.set("ownerPhone", primaryOwner?.phone ?? "");
    body.set("ownerEmail", primaryOwner?.email ?? "");
    body.set("managementFeePercent", form.managementFeePercent);
    body.set("monthlyOwnerCosts", form.monthlyOwnerCosts);
    body.set("ownerNotes", primaryOwner?.notes ?? "");
    body.set("ownersPayload", JSON.stringify(sanitizedOwners));
    body.set("currentRent", form.currentRent);
    body.set("indexType", form.indexType);
    body.set("adjustmentFrequencyMonths", form.adjustmentFrequencyMonths);
    body.set("lateFeeDailyAmount", form.lateFeeDailyAmount);
    body.set("lateFeeGraceDays", form.lateFeeGraceDays);
    body.set("contractStartDate", form.contractStartDate);
    body.set("nextAdjustmentDate", form.nextAdjustmentDate);
    body.set("notes", form.notes);
    body.set("autoNotify", String(form.autoNotify));
    body.set("status", form.status);

    if (contractFile) {
      body.set("contractFile", contractFile);
    }

    const response = await fetch("/api/admin/rental-contracts", {
      method: "POST",
      body,
    });
    const payload = await response.json().catch(() => null);

    if (!response.ok) {
      setSubmitting(false);
      setError(payload?.error ?? "No se pudo guardar el contrato.");
      return;
    }

    setWarning(payload?.warning ?? null);
    setSubmitting(false);
    setOpen(false);
    setContractFile(null);
    router.refresh();
  }

  async function handleConfirmAutomation() {
    if (!property.rentalContract) return;

    setSubmitting(true);
    setError(null);
    setWarning(null);

    const sanitizedOwners = buildSanitizedOwners();
    const response = await fetch("/api/admin/rental-contracts", {
      method: "PATCH",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        contractId: property.rentalContract.id,
        tenantName: form.tenantName,
        tenantPhone: form.tenantPhone,
        tenantEmail: form.tenantEmail || null,
        ownerName: sanitizedOwners[0]?.fullName || null,
        ownerPhone: sanitizedOwners[0]?.phone || null,
        ownerEmail: sanitizedOwners[0]?.email || null,
        managementFeePercent: Number(form.managementFeePercent),
        monthlyOwnerCosts: Number(form.monthlyOwnerCosts),
        ownerNotes: sanitizedOwners[0]?.notes || "",
        owners: sanitizedOwners,
        currentRent: Number(form.currentRent),
        indexType: form.indexType,
        adjustmentFrequencyMonths: Number(form.adjustmentFrequencyMonths),
        lateFeeDailyAmount: Number(form.lateFeeDailyAmount),
        lateFeeGraceDays: Number(form.lateFeeGraceDays),
        contractStartDate: form.contractStartDate,
        nextAdjustmentDate: form.nextAdjustmentDate,
        autoNotify: form.autoNotify,
        notes: form.notes,
      }),
    });
    const payload = await response.json().catch(() => null);

    if (!response.ok) {
      setSubmitting(false);
      setError(payload?.error ?? "No se pudo confirmar el contrato.");
      return;
    }

    setSubmitting(false);
    setOpen(false);
    router.refresh();
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (!nextOpen) {
          setError(null);
          setWarning(null);
          setContractFile(null);
          setAnalyzingContract(false);
          setAnalysisMessage(null);
          setAnalysisSummary(null);
          setAnalysisReviewReasons([]);
          setShowAdvanced(false);
          setForm(getInitialForm(property));
        }
      }}
    >
      <DialogTrigger render={<Button variant="outline" className="rounded-2xl" />}>
        {requiresReview
          ? "Revisar contrato"
          : property.rentalContract
            ? "Editar contrato"
            : "Configurar alquiler"}
      </DialogTrigger>
      <DialogContent className="h-[min(94vh,920px)] w-[min(96vw,1180px)] max-w-[min(96vw,1180px)] overflow-hidden rounded-[32px] p-0 sm:max-w-[min(96vw,1180px)]">
        <div className="flex max-h-[calc(min(94vh,920px)-76px)] flex-col overflow-y-auto">
          <div className="border-b bg-muted/20 p-5 lg:p-6">
            <DialogHeader>
              <DialogTitle className="text-xl">
                {property.rentalContract ? "Gestionar alquiler" : "Configurar alquiler"}
              </DialogTitle>
              <DialogDescription>
                Un flujo simple: cargamos inquilino, contrato y propietarios. Props usa la IA para leer fechas,
                monto, indice y proximos ajustes cuando adjuntas el documento.
              </DialogDescription>
            </DialogHeader>

            <div className="mt-5 grid gap-3 md:grid-cols-3">
              <MiniInfo
                icon={CircleDollarSign}
                label="Precio publicado"
                value={formatMoney(property.price, property.currency)}
                hint="Se usa como referencia si el contrato no aclara el monto."
              />
              <MiniInfo
                icon={CalendarDays}
                label="Ajuste"
                value={
                  property.rentalContract
                    ? `${property.rentalContract.indexType} cada ${property.rentalContract.adjustmentFrequencyMonths} meses`
                    : "Lo detecta la IA"
                }
                hint={
                  property.rentalContract?.nextAdjustmentDate
                    ? `Proximo: ${formatShortDate(property.rentalContract.nextAdjustmentDate)}`
                    : "Tambien podes completarlo manualmente en avanzados."
                }
              />
              <MiniInfo
                icon={Sparkles}
                label="Contrato"
                value={property.rentalContract?.contractFileName ? "Adjunto" : "Pendiente"}
                hint="PDF, DOCX o TXT. Queda guardado para consultas internas."
              />
            </div>
          </div>

          <div className="grid gap-5 p-5 lg:grid-cols-[1.12fr_0.88fr] lg:p-6">
            <div className="space-y-5">
              <SectionCard
                eyebrow="Paso 1"
                title="Datos minimos del inquilino"
                description="Pedimos solo lo necesario para operar y poder contactarlo. El email queda opcional."
              >
                <div className="grid gap-4 md:grid-cols-2">
                  <Field label="Nombre del inquilino">
                    <Input
                      placeholder="Maria Gomez"
                      value={form.tenantName}
                      onChange={(event) => setForm((prev) => ({ ...prev, tenantName: event.target.value }))}
                    />
                  </Field>
                  <Field label="WhatsApp del inquilino">
                    <Input
                      placeholder="+54 11 5555 1234"
                      value={form.tenantPhone}
                      onChange={(event) => setForm((prev) => ({ ...prev, tenantPhone: event.target.value }))}
                    />
                  </Field>
                  <Field label="Email del inquilino" hint="Opcional. No bloquea la configuracion.">
                    <Input
                      placeholder="inquilino@email.com"
                      value={form.tenantEmail}
                      onChange={(event) => setForm((prev) => ({ ...prev, tenantEmail: event.target.value }))}
                    />
                  </Field>
                  <Field label="Alquiler actual" hint="Si el contrato adjunto dice otro monto, la IA puede priorizarlo.">
                    <Input
                      placeholder="800000"
                      value={form.currentRent}
                      onChange={(event) => setForm((prev) => ({ ...prev, currentRent: event.target.value }))}
                    />
                  </Field>
                </div>
              </SectionCard>

              <SectionCard
                eyebrow="Paso 2"
                title="Propietarios y liquidacion"
                description="Sirve para calcular automaticamente cuanto corresponde pagarle a cada propietario."
              >
                <div className="mb-4 rounded-[22px] border bg-muted/20 p-4 text-sm text-muted-foreground">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span>
                      Participacion cargada:{" "}
                      <strong className={ownerParticipationTotal === 100 ? "text-emerald-700" : "text-amber-700"}>
                        {ownerParticipationTotal}%
                      </strong>
                    </span>
                    {ownerParticipationTotal !== 100 ? (
                      <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700">
                        Revisa que sume 100%
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
                        <CheckCircle2 className="size-3" />
                        Listo para liquidar
                      </span>
                    )}
                  </div>
                </div>

                <div className="space-y-4">
                  {form.owners.map((owner, index) => (
                    <div key={`${owner.id ?? "owner"}-${index}`} className="rounded-[24px] border bg-background p-4">
                      <div className="flex items-center justify-between gap-3">
                        <p className="font-semibold">Propietario {index + 1}</p>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="rounded-2xl"
                          onClick={() => removeOwner(index)}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </div>

                      <div className="mt-4 grid gap-3 md:grid-cols-12">
                        <Field label="Nombre" className="md:col-span-5">
                          <Input
                            placeholder="Carlos Perez"
                            value={owner.fullName}
                            onChange={(event) => updateOwner(index, { fullName: event.target.value })}
                          />
                        </Field>
                        <Field label="% participa" className="md:col-span-3">
                          <Input
                            placeholder="100"
                            value={owner.participationPercent}
                            onChange={(event) => updateOwner(index, { participationPercent: event.target.value })}
                          />
                        </Field>
                        <Field label="WhatsApp" className="md:col-span-4">
                          <Input
                            placeholder="+54 11 5555 8888"
                            value={owner.phone}
                            onChange={(event) => updateOwner(index, { phone: event.target.value })}
                          />
                        </Field>
                        <Field label="Alias / CBU" className="md:col-span-6">
                          <Input
                            placeholder="alias.propietario o CBU"
                            value={owner.bankAlias || owner.bankAccount}
                            onChange={(event) =>
                              updateOwner(index, {
                                bankAlias: event.target.value,
                                bankAccount: event.target.value,
                              })
                            }
                          />
                        </Field>
                        <Field label="Email" className="md:col-span-6">
                          <Input
                            placeholder="Opcional"
                            value={owner.email}
                            onChange={(event) => updateOwner(index, { email: event.target.value })}
                          />
                        </Field>
                      </div>
                    </div>
                  ))}

                  <Button type="button" variant="outline" className="rounded-2xl" onClick={addOwner}>
                    <Plus className="size-4" />
                    Agregar propietario
                  </Button>

                  <div className="grid gap-4 md:grid-cols-2">
                    <Field label="Comision de administracion (%)">
                      <Input
                        placeholder="8"
                        value={form.managementFeePercent}
                        onChange={(event) =>
                          setForm((prev) => ({ ...prev, managementFeePercent: event.target.value }))
                        }
                      />
                    </Field>
                    <Field label="Gastos fijos mensuales">
                      <Input
                        placeholder="0"
                        value={form.monthlyOwnerCosts}
                        onChange={(event) =>
                          setForm((prev) => ({ ...prev, monthlyOwnerCosts: event.target.value }))
                        }
                      />
                    </Field>
                  </div>
                </div>
              </SectionCard>

              <section className="rounded-[28px] border bg-card p-5 shadow-sm">
                <button
                  type="button"
                  className="flex w-full items-center justify-between gap-3 text-left"
                  onClick={() => setShowAdvanced((prev) => !prev)}
                >
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary/70">Opcional</p>
                    <h3 className="mt-1 text-lg font-semibold">Ajustes avanzados</h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Solo tocalos si queres corregir lo que detecto la IA o si no adjuntas contrato.
                    </p>
                  </div>
                  <ChevronDown className={cn("size-5 transition", showAdvanced && "rotate-180")} />
                </button>

                {showAdvanced ? (
                  <div className="mt-5 grid gap-4 md:grid-cols-2">
                    <Field label="Indice">
                      <select
                        className="flex h-11 w-full rounded-xl border bg-background px-3 text-sm outline-none"
                        value={form.indexType}
                        onChange={(event) =>
                          setForm((prev) => ({ ...prev, indexType: event.target.value as "IPC" | "ICL" }))
                        }
                      >
                        <option value="IPC">IPC</option>
                        <option value="ICL">ICL</option>
                      </select>
                    </Field>
                    <Field label="Frecuencia en meses">
                      <Input
                        placeholder="6"
                        value={form.adjustmentFrequencyMonths}
                        onChange={(event) =>
                          setForm((prev) => ({ ...prev, adjustmentFrequencyMonths: event.target.value }))
                        }
                      />
                    </Field>
                    <Field label="Inicio del contrato">
                      <Input
                        type="date"
                        value={form.contractStartDate}
                        onChange={(event) =>
                          setForm((prev) => ({ ...prev, contractStartDate: event.target.value }))
                        }
                      />
                    </Field>
                    <Field label="Proximo aumento">
                      <Input
                        type="date"
                        value={form.nextAdjustmentDate}
                        onChange={(event) =>
                          setForm((prev) => ({ ...prev, nextAdjustmentDate: event.target.value }))
                        }
                      />
                    </Field>
                    <Field label="Punitorio por dia">
                      <Input
                        placeholder="10000"
                        value={form.lateFeeDailyAmount}
                        onChange={(event) =>
                          setForm((prev) => ({ ...prev, lateFeeDailyAmount: event.target.value }))
                        }
                      />
                    </Field>
                    <Field label="Dias de gracia">
                      <Input
                        placeholder="10"
                        value={form.lateFeeGraceDays}
                        onChange={(event) =>
                          setForm((prev) => ({ ...prev, lateFeeGraceDays: event.target.value }))
                        }
                      />
                    </Field>
                    <Field label="Estado del contrato">
                      <select
                        className="flex h-11 w-full rounded-xl border bg-background px-3 text-sm outline-none"
                        value={form.status}
                        onChange={(event) =>
                          setForm((prev) => ({
                            ...prev,
                            status: event.target.value as "Activo" | "Pausado" | "Finalizado",
                          }))
                        }
                      >
                        <option value="Activo">Activo</option>
                        <option value="Pausado">Pausado</option>
                        <option value="Finalizado">Finalizado</option>
                      </select>
                    </Field>
                    <Field label="Aviso automatico">
                      <label className="flex h-11 items-center gap-2 rounded-xl border px-3 text-sm">
                        <input
                          type="checkbox"
                          checked={form.autoNotify}
                          onChange={(event) => setForm((prev) => ({ ...prev, autoNotify: event.target.checked }))}
                        />
                        Enviar WhatsApp automatico
                      </label>
                    </Field>
                    <Field label="Notas internas" className="md:col-span-2">
                      <Textarea
                        rows={4}
                        placeholder="Observaciones, restricciones o contexto del contrato..."
                        value={form.notes}
                        onChange={(event) => setForm((prev) => ({ ...prev, notes: event.target.value }))}
                      />
                    </Field>
                  </div>
                ) : null}
              </section>
            </div>

            <aside className="space-y-5">
              <SectionCard
                eyebrow="Contrato"
                title="Archivo e IA"
                description="Adjunta el contrato real. Props lo guarda y lo usa como fuente para fechas, aumentos y consultas internas."
              >
                <label className="flex cursor-pointer flex-col rounded-[24px] border border-dashed bg-muted/30 px-5 py-6 transition hover:bg-muted/50">
                  <div className="mb-3 flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                    <UploadCloud className="size-5" />
                  </div>
                  <p className="font-medium">{contractFile ? "Contrato seleccionado" : "Subir contrato"}</p>
                  <p className="mt-1 text-sm text-muted-foreground">PDF, DOC, DOCX o TXT. Hasta 12 MB.</p>
                  <input
                    className="hidden"
                    type="file"
                    accept={acceptedFormats}
                    onChange={(event) => void handleContractFileChange(event.target.files?.[0] ?? null)}
                  />
                  <span className="mt-4 rounded-2xl border bg-background px-3 py-2 text-center font-medium">
                    {analyzingContract ? "Analizando contrato..." : contractFile ? contractFile.name : "Elegir archivo"}
                  </span>
                </label>

                {analysisMessage ? (
                  <div
                    className={cn(
                      "mt-4 rounded-[22px] border p-4 text-sm",
                      analysisReviewReasons.length > 0
                        ? "border-amber-200 bg-amber-50 text-amber-800"
                        : "border-emerald-200 bg-emerald-50 text-emerald-800"
                    )}
                  >
                    <div className="flex items-start gap-2">
                      {analyzingContract ? (
                        <Loader2 className="mt-0.5 size-4 animate-spin" />
                      ) : (
                        <Sparkles className="mt-0.5 size-4" />
                      )}
                      <div>
                        <p className="font-semibold">{analysisMessage}</p>
                        {analysisSummary ? (
                          <p className="mt-2 leading-6">{analysisSummary}</p>
                        ) : null}
                        {analysisReviewReasons.length > 0 ? (
                          <ul className="mt-3 space-y-1">
                            {analysisReviewReasons.map((reason) => (
                              <li key={reason}>- {reason}</li>
                            ))}
                          </ul>
                        ) : null}
                      </div>
                    </div>
                  </div>
                ) : null}

                <div className="mt-4 rounded-[22px] border bg-background p-4 text-sm">
                  <div className="flex items-center gap-2 font-medium">
                    <BadgeInfo className="size-4 text-primary" />
                    Props intenta detectar
                  </div>
                  <ul className="mt-3 space-y-2 text-muted-foreground">
                    <li>- Inicio del contrato y proxima fecha de ajuste.</li>
                    <li>- Monto de alquiler, indice y frecuencia.</li>
                    <li>- Clausulas utiles para responder consultas.</li>
                  </ul>
                </div>

                {property.rentalContract?.contractFileName ? (
                  <div className="mt-4 rounded-[22px] border bg-background p-4">
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 rounded-2xl bg-primary/10 p-2 text-primary">
                        <FileText className="size-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium">{property.rentalContract.contractFileName}</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {property.rentalContract.contractFileMimeType ?? "documento"} ·{" "}
                          {property.rentalContract.contractFileSizeBytes
                            ? `${Math.round(property.rentalContract.contractFileSizeBytes / 1024)} KB`
                            : "sin tamano"}
                        </p>
                      </div>
                    </div>
                    <Link
                      href={`/api/admin/rental-contracts/${property.rentalContract.id}/document`}
                      target="_blank"
                      className={buttonVariants({
                        size: "sm",
                        variant: "outline",
                        className: "mt-4 rounded-2xl",
                      })}
                    >
                      Ver contrato
                    </Link>
                  </div>
                ) : null}
              </SectionCard>

              {requiresReview ? (
                <div className="rounded-[28px] border border-amber-200 bg-amber-50 p-5 text-sm text-amber-800">
                  <p className="font-semibold">Revision requerida antes de activar</p>
                  <ul className="mt-3 space-y-2">
                    {reviewReasons.map((reason) => (
                      <li key={reason}>- {reason}</li>
                    ))}
                  </ul>
                  <p className="mt-3 text-amber-700">
                    Podes corregir los datos en avanzados y activar recien cuando este todo claro.
                  </p>
                </div>
              ) : null}

              {property.rentalContract ? (
                <SectionCard
                  eyebrow="Detectado"
                  title="Datos que ya tiene Props"
                  description="Esto queda visible aunque el contrato necesite revision."
                >
                  <div className="grid gap-3">
                    <MiniInfo
                      icon={CircleDollarSign}
                      label="Alquiler"
                      value={formatArsCurrency(property.rentalContract.currentRent)}
                    />
                    <MiniInfo
                      icon={CalendarDays}
                      label="Proximo aumento"
                      value={formatShortDate(property.rentalContract.nextAdjustmentDate)}
                      hint={`${property.rentalContract.indexType} cada ${property.rentalContract.adjustmentFrequencyMonths} meses`}
                    />
                    <MiniInfo
                      icon={CheckCircle2}
                      label="Estado"
                      value={property.rentalContract.status}
                      hint={property.rentalContract.autoNotify ? "Aviso automatico activo" : "Aviso automatico pausado"}
                    />
                  </div>

                  {property.rentalContract.contractText ? (
                    <div className="mt-4 rounded-[22px] border bg-muted/20 p-4 text-sm leading-6 text-muted-foreground">
                      <p className="mb-1 font-medium text-foreground">Texto leido por la IA</p>
                      <p>{property.rentalContract.contractText.slice(0, 420)}...</p>
                    </div>
                  ) : null}
                </SectionCard>
              ) : null}
            </aside>
          </div>

          {error ? (
            <div className="mx-5 mb-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 lg:mx-6">
              {error}
            </div>
          ) : null}

          {warning ? (
            <div className="mx-5 mb-5 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 lg:mx-6">
              {warning}
            </div>
          ) : null}
        </div>

        <DialogFooter className="m-0 border-t bg-background/95 px-5 py-4 lg:px-6">
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          {requiresReview ? (
            <Button onClick={handleConfirmAutomation} disabled={submitting}>
              {submitting ? <Loader2 className="size-4 animate-spin" /> : null}
              Confirmar y activar
            </Button>
          ) : null}
          <Button onClick={handleSave} disabled={submitting}>
            {submitting ? <Loader2 className="size-4 animate-spin" /> : null}
            Guardar alquiler
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
