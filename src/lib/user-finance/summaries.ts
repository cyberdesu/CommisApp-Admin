import "server-only";

import prisma from "@/lib/prisma";
import type { UserFinanceSummary } from "@/lib/user-finance.types";
import {
  createEmptyUserFinance,
  getOrCreateCurrencyTotals,
  getOrCreateUserFinance,
  normalizeCurrency,
  serializeUserFinance,
  updateLatestDate,
  type MutableUserFinance,
} from "./_shared";

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
