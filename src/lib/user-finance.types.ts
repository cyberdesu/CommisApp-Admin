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

export type PlatformFinanceStats = {
  artistsWithEarnings: number;
  artistsWithWithdrawals: number;
  completedPayments: number;
  processedPayouts: number;
  currencies: FinanceCurrencyBreakdown[];
};
