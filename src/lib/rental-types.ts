export type RentIndexType = "IPC" | "ICL";

export type RentalContractStatus = "Activo" | "Pausado" | "Finalizado";

export type RentalNotificationStatus = "Pendiente" | "Enviado" | "Fallido";

export type RentalNotificationChannel = "whatsapp";

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
};
