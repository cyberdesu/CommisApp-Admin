import "server-only";

import prisma from "@/lib/prisma";
import { Prisma } from "@/prisma/generated/client";
import type {
  FinanceCurrencyBreakdown,
  PlatformFinanceStats,
  PlatformRevenueCurrencyBreakdown,
  UserFinanceSummary,
} from "@/lib/user-finance.types";

const ZERO = new Prisma.Decimal(0);

type MutableCurrencyTotals = {
  grossEarnings: Prisma.Decimal;
  withdrawnTotal: Prisma.Decimal;
  pendingWithdrawals: Prisma.Decimal;
};

type MutablePlatformRevenueTotals = {
  grossVolume: Prisma.Decimal;
  platformFees: Prisma.Decimal;
  paymentPaypalFees: Prisma.Decimal;
  payoutPaypalFees: Prisma.Decimal;
  adminNetProfit: Prisma.Decimal;
  artistPayouts: Prisma.Decimal;
  syncedPaymentFeePayments: number;
  pendingPaymentFeeSyncPayments: number;
};

type MutableUserFinance = {
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

function normalizeCurrency(value?: string | null) {
  return value?.trim().toUpperCase() || "USD";
}

function createEmptyUserFinance(): MutableUserFinance {
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

function getOrCreateUserFinance(
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

function getOrCreateCurrencyTotals(
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

function updateLatestDate(current: Date | null, incoming?: Date | null) {
  if (!incoming) return current;
  if (!current || incoming > current) return incoming;
  return current;
}

function serializeCurrencyTotals(
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

function serializeUserFinance(finance?: MutableUserFinance): UserFinanceSummary {
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

export async function getUserFinanceSummaries(userIds: number[]) {
  if (userIds.length === 0) {
    return new Map<number, UserFinanceSummary>();
  }

  const uniqueUserIds = [...new Set(userIds)];
  const financeMap = new Map<number, MutableUserFinance>();

  for (const userId of uniqueUserIds) {
    financeMap.set(userId, createEmptyUserFinance());
  }

  const [orders, payments, payouts] = await Promise.all([
    prisma.order.findMany({
      where: {
        artistId: { in: uniqueUserIds },
      },
      select: {
        artistId: true,
        status: true,
      },
    }),
    prisma.payment.findMany({
      where: {
        status: "COMPLETED",
        order: {
          artistId: { in: uniqueUserIds },
        },
      },
      select: {
        artistNet: true,
        currency: true,
        paidAt: true,
        paypalFee: true,
        paypalFeeCurrency: true,
        paypalNetAmount: true,
        paypalNetCurrency: true,
        paypalFeeSyncedAt: true,
        order: {
          select: {
            artistId: true,
          },
        },
      },
    }),
    prisma.payout.findMany({
      where: {
        artistId: { in: uniqueUserIds },
      },
      select: {
        artistId: true,
        amount: true,
        currency: true,
        status: true,
        createdAt: true,
        reviewedAt: true,
      },
    }),
  ]);

  for (const order of orders) {
    const finance = getOrCreateUserFinance(financeMap, order.artistId);
    finance.totalOrders += 1;
    if (order.status === "COMPLETED") {
      finance.completedOrders += 1;
    }
  }

  for (const payment of payments) {
    const artistId = payment.order.artistId;
    const finance = getOrCreateUserFinance(financeMap, artistId);
    const currency = normalizeCurrency(payment.currency);
    const totals = getOrCreateCurrencyTotals(finance, currency);

    finance.completedPayments += 1;
    totals.grossEarnings = totals.grossEarnings.add(payment.artistNet);
    finance.lastPaidAt = updateLatestDate(finance.lastPaidAt, payment.paidAt);
  }

  for (const payout of payouts) {
    const finance = getOrCreateUserFinance(financeMap, payout.artistId);
    const currency = normalizeCurrency(payout.currency);
    const totals = getOrCreateCurrencyTotals(finance, currency);

    finance.totalPayouts += 1;
    finance.lastPayoutAt = updateLatestDate(
      finance.lastPayoutAt,
      payout.reviewedAt ?? payout.createdAt,
    );

    if (payout.status === "SENT") {
      finance.sentPayouts += 1;
      totals.withdrawnTotal = totals.withdrawnTotal.add(payout.amount);
    }

    if (payout.status === "PENDING") {
      finance.pendingPayouts += 1;
      totals.pendingWithdrawals = totals.pendingWithdrawals.add(payout.amount);
    }
  }

  const result = new Map<number, UserFinanceSummary>();
  for (const userId of uniqueUserIds) {
    result.set(userId, serializeUserFinance(financeMap.get(userId)));
  }

  return result;
}

export async function getUserFinanceDetail(userId: number) {
  const [summaries, recentPayments, recentPayouts] = await Promise.all([
    getUserFinanceSummaries([userId]),
    prisma.payment.findMany({
      where: {
        order: {
          artistId: userId,
        },
      },
      orderBy: [{ paidAt: "desc" }, { createdAt: "desc" }],
      take: 5,
      select: {
        id: true,
        orderId: true,
        amount: true,
        platformFee: true,
        artistNet: true,
        paypalFee: true,
        paypalFeeCurrency: true,
        paypalNetAmount: true,
        paypalNetCurrency: true,
        paypalFeeSyncedAt: true,
        currency: true,
        status: true,
        paidAt: true,
        createdAt: true,
      },
    }),
    prisma.payout.findMany({
      where: {
        artistId: userId,
      },
      orderBy: [{ reviewedAt: "desc" }, { createdAt: "desc" }],
      take: 5,
      select: {
        id: true,
        amount: true,
        currency: true,
        status: true,
        paypalEmail: true,
        paypalBatchId: true,
        paypalItemId: true,
        paypalBatchStatus: true,
        paypalItemStatus: true,
        paypalFee: true,
        paypalFeeCurrency: true,
        paypalFeeSyncedAt: true,
        reviewNote: true,
        createdAt: true,
        reviewedAt: true,
      },
    }),
  ]);

  return {
    summary: summaries.get(userId) ?? serializeUserFinance(),
    recentPayments: recentPayments.map((payment) => ({
      id: payment.id,
      orderId: payment.orderId,
      amount: payment.amount.toFixed(2),
      platformFee: payment.platformFee.toFixed(2),
      artistNet: payment.artistNet.toFixed(2),
      paypalFee: payment.paypalFee.toFixed(2),
      paypalFeeCurrency: payment.paypalFeeCurrency
        ? normalizeCurrency(payment.paypalFeeCurrency)
        : null,
      paypalNetAmount: payment.paypalNetAmount.toFixed(2),
      paypalNetCurrency: payment.paypalNetCurrency
        ? normalizeCurrency(payment.paypalNetCurrency)
        : null,
      adminNetRevenue: payment.platformFee.sub(payment.paypalFee).toFixed(2),
      paypalFeeSyncedAt: payment.paypalFeeSyncedAt?.toISOString() ?? null,
      currency: normalizeCurrency(payment.currency),
      status: payment.status,
      paidAt: payment.paidAt?.toISOString() ?? null,
      createdAt: payment.createdAt.toISOString(),
    })),
    recentPayouts: recentPayouts.map((payout) => ({
      id: payout.id,
      amount: payout.amount.toFixed(2),
      currency: normalizeCurrency(payout.currency),
      status: payout.status,
      paypalEmail: payout.paypalEmail,
      paypalBatchId: payout.paypalBatchId,
      paypalItemId: payout.paypalItemId,
      paypalBatchStatus: payout.paypalBatchStatus,
      paypalItemStatus: payout.paypalItemStatus,
      paypalFee: payout.paypalFee.toFixed(2),
      paypalFeeCurrency: payout.paypalFeeCurrency
        ? normalizeCurrency(payout.paypalFeeCurrency)
        : null,
      paypalFeeSyncedAt: payout.paypalFeeSyncedAt?.toISOString() ?? null,
      reviewNote: payout.reviewNote,
      createdAt: payout.createdAt.toISOString(),
      reviewedAt: payout.reviewedAt?.toISOString() ?? null,
    })),
  };
}

export async function getPlatformFinanceStats(): Promise<PlatformFinanceStats> {
  type PaymentAggRow = {
    currency: string;
    total_count: number;
    sum_amount: Prisma.Decimal | string | null;
    sum_platform_fee: Prisma.Decimal | string | null;
    sum_artist_net: Prisma.Decimal | string | null;
    sum_paypal_fee: Prisma.Decimal | string | null;
    synced_count: number;
    pending_sync_count: number;
  };

  const toDecimal = (value: Prisma.Decimal | string | null): Prisma.Decimal => {
    if (value === null || value === undefined) return ZERO;
    if (value instanceof Prisma.Decimal) return value;
    return new Prisma.Decimal(value);
  };

  const [
    paymentAggRows,
    payoutGroups,
    payoutFeeRows,
    pendingPayoutFeeSyncPayouts,
    earningArtistGroups,
    withdrawnArtistGroups,
  ] = await Promise.all([
    prisma.$queryRaw<PaymentAggRow[]>(
      Prisma.sql`
        SELECT
          currency,
          COUNT(*)::int AS total_count,
          SUM(amount) AS sum_amount,
          SUM("platformFee") AS sum_platform_fee,
          SUM("artistNet") AS sum_artist_net,
          SUM("paypalFee") AS sum_paypal_fee,
          COUNT(*) FILTER (WHERE "paypalFeeSyncedAt" IS NOT NULL)::int AS synced_count,
          COUNT(*) FILTER (
            WHERE "paypalCaptureId" IS NOT NULL
              AND "paypalFeeSyncedAt" IS NULL
          )::int AS pending_sync_count
        FROM payments
        WHERE status = 'COMPLETED'
        GROUP BY currency
      `,
    ),
    prisma.payout.groupBy({
      by: ["currency", "status"],
      where: {
        status: {
          in: ["PENDING", "SENT"],
        },
      },
      _count: {
        _all: true,
      },
      _sum: {
        amount: true,
      },
    }),
    prisma.payout.findMany({
      where: {
        status: "SENT",
        paypalFeeSyncedAt: {
          not: null,
        },
      },
      select: {
        paypalFee: true,
        paypalFeeCurrency: true,
        currency: true,
      },
    }),
    prisma.payout.count({
      where: {
        status: "SENT",
        paypalBatchId: {
          not: null,
        },
        paypalFeeSyncedAt: null,
      },
    }),
    prisma.order.groupBy({
      by: ["artistId"],
      where: {
        payments: {
          some: {
            status: "COMPLETED",
          },
        },
      },
    }),
    prisma.payout.groupBy({
      by: ["artistId"],
      where: {
        status: "SENT",
      },
    }),
  ]);

  const currencyMap = new Map<string, MutableCurrencyTotals>();
  const revenueMap = new Map<string, MutablePlatformRevenueTotals>();

  for (const row of paymentAggRows) {
    const currency = normalizeCurrency(row.currency);
    const sumAmount = toDecimal(row.sum_amount);
    const sumPlatformFee = toDecimal(row.sum_platform_fee);
    const sumArtistNet = toDecimal(row.sum_artist_net);
    const sumPaypalFee = toDecimal(row.sum_paypal_fee);

    const totals =
      currencyMap.get(currency) ??
      {
        grossEarnings: ZERO,
        withdrawnTotal: ZERO,
        pendingWithdrawals: ZERO,
      };

    totals.grossEarnings = totals.grossEarnings.add(sumAmount);
    currencyMap.set(currency, totals);

    const rev = revenueMap.get(currency) ?? {
      grossVolume: ZERO,
      platformFees: ZERO,
      paymentPaypalFees: ZERO,
      payoutPaypalFees: ZERO,
      adminNetProfit: ZERO,
      artistPayouts: ZERO,
      syncedPaymentFeePayments: 0,
      pendingPaymentFeeSyncPayments: 0,
    };
    rev.grossVolume = rev.grossVolume.add(sumAmount);
    rev.platformFees = rev.platformFees.add(sumPlatformFee);
    rev.paymentPaypalFees = rev.paymentPaypalFees.add(sumPaypalFee);
    rev.adminNetProfit = rev.adminNetProfit.add(sumPlatformFee.sub(sumPaypalFee));
    rev.artistPayouts = rev.artistPayouts.add(sumArtistNet);
    rev.syncedPaymentFeePayments = row.synced_count;
    rev.pendingPaymentFeeSyncPayments = row.pending_sync_count;
    revenueMap.set(currency, rev);
  }

  for (const payoutFeeRow of payoutFeeRows) {
    const currency = normalizeCurrency(
      payoutFeeRow.paypalFeeCurrency ?? payoutFeeRow.currency,
    );
    const rev = revenueMap.get(currency) ?? {
      grossVolume: ZERO,
      platformFees: ZERO,
      paymentPaypalFees: ZERO,
      payoutPaypalFees: ZERO,
      adminNetProfit: ZERO,
      artistPayouts: ZERO,
      syncedPaymentFeePayments: 0,
      pendingPaymentFeeSyncPayments: 0,
    };

    rev.payoutPaypalFees = rev.payoutPaypalFees.add(payoutFeeRow.paypalFee);
    rev.adminNetProfit = rev.adminNetProfit.sub(payoutFeeRow.paypalFee);
    revenueMap.set(currency, rev);
  }

  let processedPayouts = 0;

  for (const payout of payoutGroups) {
    const currency = normalizeCurrency(payout.currency);
    const totals =
      currencyMap.get(currency) ??
      {
        grossEarnings: ZERO,
        withdrawnTotal: ZERO,
        pendingWithdrawals: ZERO,
      };

    if (payout.status === "SENT") {
      totals.withdrawnTotal = totals.withdrawnTotal.add(payout._sum.amount ?? ZERO);
      processedPayouts += payout._count._all;
    }

    if (payout.status === "PENDING") {
      totals.pendingWithdrawals = totals.pendingWithdrawals.add(
        payout._sum.amount ?? ZERO,
      );
    }

    currencyMap.set(currency, totals);
  }

  const revenue: PlatformRevenueCurrencyBreakdown[] = [...revenueMap.entries()]
    .map(([currency, rev]) => ({
      currency,
      grossVolume: rev.grossVolume.toFixed(2),
      platformFees: rev.platformFees.toFixed(2),
      paymentPaypalFees: rev.paymentPaypalFees.toFixed(2),
      payoutPaypalFees: rev.payoutPaypalFees.toFixed(2),
      adminNetProfit: rev.adminNetProfit.toFixed(2),
      artistPayouts: rev.artistPayouts.toFixed(2),
      syncedPaymentFeePayments: rev.syncedPaymentFeePayments,
      pendingPaymentFeeSyncPayments: rev.pendingPaymentFeeSyncPayments,
    }))
    .sort((left, right) => left.currency.localeCompare(right.currency));

  return {
    artistsWithEarnings: earningArtistGroups.length,
    artistsWithWithdrawals: withdrawnArtistGroups.length,
    completedPayments: paymentAggRows.reduce(
      (sum, row) => sum + row.total_count,
      0,
    ),
    syncedPaymentFeePayments: revenue.reduce(
      (sum, item) => sum + item.syncedPaymentFeePayments,
      0,
    ),
    pendingPaymentFeeSyncPayments: revenue.reduce(
      (sum, item) => sum + item.pendingPaymentFeeSyncPayments,
      0,
    ),
    processedPayouts,
    syncedPayoutFeePayouts: payoutFeeRows.length,
    pendingPayoutFeeSyncPayouts,
    currencies: [...currencyMap.entries()]
      .map(([currency, totals]) => serializeCurrencyTotals(currency, totals))
      .sort((left, right) => left.currency.localeCompare(right.currency)),
    revenue,
  };
}
