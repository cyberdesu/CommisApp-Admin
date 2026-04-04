export type AdminTransactionEntryType = "PAYMENT" | "PAYOUT";

export type AdminTransactionStatus =
  | "PENDING"
  | "COMPLETED"
  | "FAILED"
  | "REFUNDED"
  | "SENT"
  | "FRAUD";

export type AdminTransactionFeeSyncStatus =
  | "SYNCED"
  | "PENDING_SYNC"
  | "NOT_REQUIRED";

export type AdminTransactionLogEntry = {
  id: string;
  entryType: AdminTransactionEntryType;
  status: AdminTransactionStatus;
  currency: string;
  grossAmount: string;
  platformFee: string | null;
  paypalFee: string;
  paypalFeeCurrency: string | null;
  artistAmount: string | null;
  transferAmount: string | null;
  adminImpact: string;
  occurredAt: string;
  settledAt: string | null;
  feeSyncStatus: AdminTransactionFeeSyncStatus;
  orderId: string | null;
  orderTitle: string | null;
  paypalOrderId: string | null;
  paypalCaptureId: string | null;
  paypalBatchId: string | null;
  paypalItemId: string | null;
  paypalBatchStatus: string | null;
  paypalItemStatus: string | null;
  artist: {
    id: number;
    username: string;
    email: string;
    name: string | null;
  };
  client: {
    id: number | null;
    username: string | null;
    email: string | null;
    name: string | null;
  } | null;
};

export type AdminTransactionStats = {
  totalTransactions: number;
  paymentTransactions: number;
  payoutTransactions: number;
  pendingTransactions: number;
  syncedFeeRows: number;
  pendingFeeSyncRows: number;
};
