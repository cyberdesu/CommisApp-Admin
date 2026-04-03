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
  reviewNote: string | null;
  createdAt: string;
  reviewedAt: string | null;
};

export type PlatformRevenueCurrencyBreakdown = {
  currency: string;
  grossVolume: string;
  platformFees: string;
  paypalFees: string;
  adminNetRevenue: string;
  artistPayouts: string;
  syncedPayments: number;
  pendingFeeSyncPayments: number;
};

export type PlatformFinanceStats = {
  artistsWithEarnings: number;
  artistsWithWithdrawals: number;
  completedPayments: number;
  syncedPaypalFeePayments: number;
  pendingPaypalFeeSyncPayments: number;
  processedPayouts: number;
  currencies: FinanceCurrencyBreakdown[];
  revenue: PlatformRevenueCurrencyBreakdown[];
};
