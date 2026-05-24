import "server-only";

import { Prisma } from "@/prisma/generated/client";
import type {
  FinanceCurrencyBreakdown,
  UserFinanceSummary,
} from "@/lib/user-finance.types";

export const ZERO = new Prisma.Decimal(0);

export type MutableCurrencyTotals = {
  grossEarnings: Prisma.Decimal;
  withdrawnTotal: Prisma.Decimal;
  pendingWithdrawals: Prisma.Decimal;
};

export type MutablePlatformRevenueTotals = {
  grossVolume: Prisma.Decimal;
  platformFees: Prisma.Decimal;
  paymentPaypalFees: Prisma.Decimal;
  payoutPaypalFees: Prisma.Decimal;
  adminNetProfit: Prisma.Decimal;
  artistPayouts: Prisma.Decimal;
  syncedPaymentFeePayments: number;
  pendingPaymentFeeSyncPayments: number;
};

export type MutableUserFinance = {
  totalOrders: number;
  completedOrders: number;
  completedPayments: number;
  totalPayouts: number;
  sentPayouts: number;
  pendingPayouts: number;
  lastPaidAt: Date | null;
  lastPayoutAt: Date | null;
  currencies: Map<string, MutableCurrencyTotals>;
};

export function normalizeCurrency(value?: string | null) {
  return value?.trim().toUpperCase() || "USD";
}

export function createEmptyUserFinance(): MutableUserFinance {
  return {
    totalOrders: 0,
    completedOrders: 0,
    completedPayments: 0,
    totalPayouts: 0,
    sentPayouts: 0,
    pendingPayouts: 0,
    lastPaidAt: null,
    lastPayoutAt: null,
    currencies: new Map<string, MutableCurrencyTotals>(),
  };
}

export function getOrCreateUserFinance(
  map: Map<number, MutableUserFinance>,
  userId: number,
) {
  let value = map.get(userId);
  if (!value) {
    value = createEmptyUserFinance();
    map.set(userId, value);
  }
  return value;
}

export function getOrCreateCurrencyTotals(
  finance: MutableUserFinance,
  currency: string,
) {
  let totals = finance.currencies.get(currency);
  if (!totals) {
    totals = {
      grossEarnings: ZERO,
      withdrawnTotal: ZERO,
      pendingWithdrawals: ZERO,
    };
    finance.currencies.set(currency, totals);
  }
  return totals;
}

export function updateLatestDate(current: Date | null, incoming?: Date | null) {
  if (!incoming) return current;
  if (!current || incoming > current) return incoming;
  return current;
}

export function serializeCurrencyTotals(
  currency: string,
  totals: MutableCurrencyTotals,
): FinanceCurrencyBreakdown {
  const availableBalance = totals.grossEarnings
    .sub(totals.withdrawnTotal)
    .sub(totals.pendingWithdrawals);

  return {
    currency,
    grossEarnings: totals.grossEarnings.toFixed(2),
    withdrawnTotal: totals.withdrawnTotal.toFixed(2),
    pendingWithdrawals: totals.pendingWithdrawals.toFixed(2),
    availableBalance: availableBalance.toFixed(2),
  };
}

export function serializeUserFinance(
  finance?: MutableUserFinance,
): UserFinanceSummary {
  if (!finance) {
    return {
      totalOrders: 0,
      completedOrders: 0,
      completedPayments: 0,
      totalPayouts: 0,
      sentPayouts: 0,
      pendingPayouts: 0,
      lastPaidAt: null,
      lastPayoutAt: null,
      hasMixedCurrencies: false,
      currencies: [],
    };
  }

  const currencies = [...finance.currencies.entries()]
    .map(([currency, totals]) => serializeCurrencyTotals(currency, totals))
    .sort((left, right) => left.currency.localeCompare(right.currency));

  return {
    totalOrders: finance.totalOrders,
    completedOrders: finance.completedOrders,
    completedPayments: finance.completedPayments,
    totalPayouts: finance.totalPayouts,
    sentPayouts: finance.sentPayouts,
    pendingPayouts: finance.pendingPayouts,
    lastPaidAt: finance.lastPaidAt?.toISOString() ?? null,
    lastPayoutAt: finance.lastPayoutAt?.toISOString() ?? null,
    hasMixedCurrencies: currencies.length > 1,
    currencies,
  };
}

export function toDecimal(
  value: Prisma.Decimal | string | number | null | undefined,
): Prisma.Decimal {
  if (value === null || value === undefined) return ZERO;
  if (value instanceof Prisma.Decimal) return value;
  return new Prisma.Decimal(value);
}
