import "server-only";

import prisma from "@/lib/prisma";
import { Prisma } from "@/prisma/generated/client";
import type {
  PlatformFinanceStats,
  PlatformRevenueCurrencyBreakdown,
} from "@/lib/user-finance.types";
import {
  ZERO,
  normalizeCurrency,
  serializeCurrencyTotals,
  toDecimal,
  type MutableCurrencyTotals,
  type MutablePlatformRevenueTotals,
} from "./_shared";

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

function emptyRevenue(): MutablePlatformRevenueTotals {
  return {
    grossVolume: ZERO,
    platformFees: ZERO,
    paymentPaypalFees: ZERO,
    payoutPaypalFees: ZERO,
    adminNetProfit: ZERO,
    artistPayouts: ZERO,
    syncedPaymentFeePayments: 0,
    pendingPaymentFeeSyncPayments: 0,
  };
}

function emptyCurrencyTotals(): MutableCurrencyTotals {
  return {
    grossEarnings: ZERO,
    withdrawnTotal: ZERO,
    pendingWithdrawals: ZERO,
  };
}

export async function getPlatformFinanceStats(): Promise<PlatformFinanceStats> {
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
      where: { status: { in: ["PENDING", "SENT"] } },
      _count: { _all: true },
      _sum: { amount: true },
    }),
    prisma.payout.findMany({
      where: {
        status: "SENT",
        paypalFeeSyncedAt: { not: null },
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
        paypalBatchId: { not: null },
        paypalFeeSyncedAt: null,
      },
    }),
    prisma.order.groupBy({
      by: ["artistId"],
      where: {
        payments: { some: { status: "COMPLETED" } },
      },
    }),
    prisma.payout.groupBy({
      by: ["artistId"],
      where: { status: "SENT" },
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

    const totals = currencyMap.get(currency) ?? emptyCurrencyTotals();
    totals.grossEarnings = totals.grossEarnings.add(sumAmount);
    currencyMap.set(currency, totals);

    const rev = revenueMap.get(currency) ?? emptyRevenue();
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
    const rev = revenueMap.get(currency) ?? emptyRevenue();
    rev.payoutPaypalFees = rev.payoutPaypalFees.add(payoutFeeRow.paypalFee);
    rev.adminNetProfit = rev.adminNetProfit.sub(payoutFeeRow.paypalFee);
    revenueMap.set(currency, rev);
  }

  let processedPayouts = 0;

  for (const payout of payoutGroups) {
    const currency = normalizeCurrency(payout.currency);
    const totals = currencyMap.get(currency) ?? emptyCurrencyTotals();

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
