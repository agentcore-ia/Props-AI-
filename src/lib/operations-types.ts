export type RentalCollectionStatus = "Pendiente" | "Parcial" | "Cobrada" | "Mora";
export type OwnerTransferStatus = "Pendiente" | "Programada" | "Enviada" | "Confirmada";
export type SupplierStatus = "Activo" | "Inactivo";
export type SupplierInvoiceStatus = "Borrador" | "Emitida" | "Pagada" | "Anulada";
export type CashMovementKind = "Ingreso" | "Egreso" | "Transferencia";
export type ContractRescissionStatus = "Borrador" | "En negociacion" | "Aprobada" | "Cerrada";

export type OwnerRosterSummary = {
  agencyId: string;
  agencySlug: string;
  propertyId: string;
  contractId: string;
  contractOwnerId: string | null;
  ownerName: string;
  ownerPhone: string | null;
  ownerEmail: string | null;
  participationPercent: number;
  propertyTitle: string;
  propertyLocation: string;
  currentRent: number;
  managementFeePercent: number;
  monthlyOwnerCosts: number;
  latestSettlementMonth: string | null;
  latestOwnerPayoutAmount: number | null;
};

export type TenantRosterSummary = {
  agencyId: string;
  agencySlug: string;
  propertyId: string;
  contractId: string;
  tenantName: string;
  tenantPhone: string;
  tenantEmail: string | null;
  propertyTitle: string;
  propertyLocation: string;
  currentRent: number;
  nextAdjustmentDate: string;
  contractStatus: "Activo" | "Pausado" | "Finalizado";
  latestCollectionStatus: RentalCollectionStatus | null;
  latestCollectionMonth: string | null;
};

export type RentalCollectionSummary = {
  id: string;
  contractId: string;
  propertyId: string;
  agencyId: string;
  collectionMonth: string;
  tenantName: string;
  propertyTitle: string;
  propertyLocation: string;
  expectedRent: number;
  collectedAmount: number;
  paymentMethod: string;
  paymentDate: string | null;
  status: RentalCollectionStatus;
  notes: string;
  createdAt: string;
};

export type OwnerTransferSummary = {
  id: string;
  settlementId: string | null;
  contractId: string;
  contractOwnerId: string | null;
  propertyId: string;
  agencyId: string;
  ownerName: string;
  propertyTitle: string;
  transferDate: string | null;
  amount: number;
  destinationLabel: string;
  status: OwnerTransferStatus;
  notes: string;
  createdAt: string;
};

export type CashMovementSummary = {
  id: string;
  agencyId: string;
  occurredOn: string;
  kind: CashMovementKind;
  category: string;
  amount: number;
  reference: string;
  notes: string;
  createdAt: string;
};

export type SupplierSummary = {
  id: string;
  agencyId: string;
  name: string;
  serviceType: string;
  contactName: string | null;
  phone: string | null;
  email: string | null;
  notes: string;
  status: SupplierStatus;
  createdAt: string;
};

export type SupplierInvoiceSummary = {
  id: string;
  agencyId: string;
  supplierId: string | null;
  supplierName: string;
  invoiceNumber: string;
  concept: string;
  totalAmount: number;
  dueDate: string | null;
  status: SupplierInvoiceStatus;
  notes: string;
  createdAt: string;
};

export type ContractRescissionSummary = {
  id: string;
  contractId: string;
  propertyId: string;
  agencyId: string;
  tenantName: string;
  propertyTitle: string;
  requestedOn: string;
  effectiveDate: string | null;
  reason: string;
  settlementTerms: string;
  status: ContractRescissionStatus;
  createdAt: string;
};
