import "server-only";

import prisma from "@/lib/prisma";
import { normalizeCurrency, serializeUserFinance } from "./_shared";
import { getUserFinanceSummaries } from "./summaries";

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
