export type FinanceCurrencyBreakdown = {
  currency: string;
  grossEarnings: string;
  withdrawnTotal: string;
  pendingWithdrawals: string;
  availableBalance: string;
};

export type UserFinanceSummary = {
  totalOrders: number;
  completedOrders: number;
  completedPayments: number;
  totalPayouts: number;
  sentPayouts: number;
  pendingPayouts: number;
  lastPaidAt: string | null;
  lastPayoutAt: string | null;
  hasMixedCurrencies: boolean;
  currencies: FinanceCurrencyBreakdown[];
};

export type RecentPaymentActivity = {
  id: string;
  orderId: string;
  amount: string;
  platformFee: string;
  artistNet: string;
  paypalFee: string;
  paypalFeeCurrency: string | null;
  paypalNetAmount: string;
  paypalNetCurrency: string | null;
  adminNetRevenue: string;
  paypalFeeSyncedAt: string | null;
  currency: string;
  status: "PENDING" | "COMPLETED" | "FAILED" | "REFUNDED";
  paidAt: string | null;
  createdAt: string;
};

export type RecentPayoutActivity = {
  id: string;
  amount: string;
  currency: string;
  status: "PENDING" | "SENT" | "FRAUD";
  paypalEmail: string;
  paypalBatchId: string | null;
  paypalItemId: string | null;
  paypalBatchStatus: string | null;
  paypalItemStatus: string | null;
  paypalFee: string;
  paypalFeeCurrency: string | null;
  paypalFeeSyncedAt: string | null;
  reviewNote: string | null;
  createdAt: string;
  reviewedAt: string | null;
};

export type PlatformRevenueCurrencyBreakdown = {
  currency: string;
  grossVolume: string;
  platformFees: string;
  paymentPaypalFees: string;
  payoutPaypalFees: string;
  adminNetProfit: string;
  artistPayouts: string;
  syncedPaymentFeePayments: number;
  pendingPaymentFeeSyncPayments: number;
};

export type PlatformFinanceStats = {
  artistsWithEarnings: number;
  artistsWithWithdrawals: number;
  completedPayments: number;
  syncedPaymentFeePayments: number;
  pendingPaymentFeeSyncPayments: number;
  processedPayouts: number;
  syncedPayoutFeePayouts: number;
  pendingPayoutFeeSyncPayouts: number;
  currencies: FinanceCurrencyBreakdown[];
  revenue: PlatformRevenueCurrencyBreakdown[];
};
