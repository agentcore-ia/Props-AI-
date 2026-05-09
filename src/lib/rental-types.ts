export type RentIndexType = "IPC" | "ICL";

export type RentalContractStatus = "Activo" | "Pausado" | "Finalizado";

export type RentalNotificationStatus = "Pendiente" | "Enviado" | "Fallido";

export type RentalNotificationChannel = "whatsapp";

export type OwnerSettlementStatus = "Borrador" | "Emitida" | "Pagada";
export type OwnerSettlementItemEffect = "Suma" | "Descuento" | "Informativo";

export type ContractOwnerSummary = {
  id: string;
  contractId: string;
  propertyId: string;
  agencyId: string;
  fullName: string;
  email: string | null;
  phone: string | null;
  participationPercent: number;
  bankAlias: string | null;
  bankAccount: string | null;
  notes: string;
  displayOrder: number;
};

export type RentalContractSummary = {
  id: string;
  propertyId: string;
  agencyId: string;
  tenantName: string;
  tenantPhone: string;
  tenantEmail: string | null;
  currentRent: number;
  currency: "ARS";
  indexType: RentIndexType;
  adjustmentFrequencyMonths: number;
  contractStartDate: string;
  rentReferenceDate: string;
  nextAdjustmentDate: string;
  lastAdjustmentDate: string | null;
  autoNotify: boolean;
  notificationChannel: RentalNotificationChannel;
  status: RentalContractStatus;
  notes: string;
  agencyMessagingInstance: string;
  contractFileName: string | null;
  contractFilePath: string | null;
  contractFileMimeType: string | null;
  contractFileSizeBytes: number | null;
  contractText: string;
  ownerName: string | null;
  ownerPhone: string | null;
  ownerEmail: string | null;
  managementFeePercent: number;
  monthlyOwnerCosts: number;
  ownerNotes: string;
  owners: ContractOwnerSummary[];
};

export type RentalAdjustmentSummary = {
  id: string;
  contractId: string;
  propertyId: string;
  agencyId: string;
  indexType: RentIndexType;
  appliedOn: string;
  referenceStartDate: string;
  referenceEndDate: string;
  factor: number;
  previousRent: number;
  newRent: number;
  sourceLabel: string;
  notificationStatus: RentalNotificationStatus;
  notifiedAt: string | null;
  createdAt: string;
};

export type RentalDashboardSummary = {
  totalActiveContracts: number;
  dueToday: number;
  dueThisWeek: number;
  failedNotifications: number;
  ownerSettlementsThisMonth: number;
  pendingOwnerPayouts: number;
};

export type OwnerSettlementSummary = {
  id: string;
  contractId: string;
  contractOwnerId: string | null;
  propertyId: string;
  agencyId: string;
  ownerName: string;
  ownerEmail: string | null;
  ownerPhone: string | null;
  propertyTitle: string;
  propertyLocation: string;
  settlementMonth: string;
  participationPercent: number;
  rentCollected: number;
  managementFeePercent: number;
  managementFeeAmount: number;
  monthlyOwnerCosts: number;
  otherChargesAmount: number;
  otherChargesDetail: string;
  ownerPayoutAmount: number;
  status: OwnerSettlementStatus;
  sentAt: string | null;
  paidAt: string | null;
  createdAt: string;
};

export type OwnerSettlementItemSummary = {
  id: string;
  settlementId: string;
  contractId: string;
  contractOwnerId: string | null;
  label: string;
  amount: number;
  effect: OwnerSettlementItemEffect;
  applyManagementFee: boolean;
  notes: string;
  createdAt: string;
};
