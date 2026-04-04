import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { broadcastAdminRealtimeTopics } from "@/lib/admin-realtime";
import { isAllowedOrigin } from "@/lib/auth/origin";
import { getSessionAdmin } from "@/lib/auth/session";
import { createRequestLogger } from "@/lib/logger";
import {
  getPaypalPayoutFinancials,
  getPaypalDebugId,
  PaypalPayoutError,
} from "@/lib/paypal";
import prisma from "@/lib/prisma";

const RESPONSE_HEADERS = {
  "Cache-Control": "private, no-store",
  Pragma: "no-cache",
  Expires: "0",
  "X-Content-Type-Options": "nosniff",
} as const;

const syncPaypalPayoutFeesSchema = z.object({
  limit: z.number().int().min(1).max(100).optional(),
  force: z.boolean().optional(),
});

const DEFAULT_SYNC_LIMIT = 25;

export async function POST(req: NextRequest) {
  const logger = createRequestLogger(req, {
    route: "api.finance.paypal-payout-fees.sync",
  });

  try {
    if (!isAllowedOrigin(req)) {
      logger.warn("Rejected PayPal payout fee sync due to invalid origin");
      return NextResponse.json(
        { message: "Forbidden origin" },
        { status: 403, headers: RESPONSE_HEADERS },
      );
    }

    const admin = await getSessionAdmin(req);
    if (!admin) {
      logger.warn("Rejected PayPal payout fee sync due to missing admin session");
      return NextResponse.json(
        { message: "Unauthorized" },
        { status: 401, headers: RESPONSE_HEADERS },
      );
    }

    const rawBody = await req.json().catch(() => ({}));
    const payload = syncPaypalPayoutFeesSchema.safeParse(rawBody);

    if (!payload.success) {
      logger.warn("Rejected PayPal payout fee sync due to validation failure", {
        errors: payload.error.flatten().fieldErrors,
      });
      return NextResponse.json(
        {
          message: "Validation failed",
          errors: payload.error.flatten().fieldErrors,
        },
        { status: 400, headers: RESPONSE_HEADERS },
      );
    }

    const limit = payload.data.limit ?? DEFAULT_SYNC_LIMIT;
    const force = payload.data.force ?? false;
    const requestLogger = logger.child({
      adminId: admin.id,
      limit,
      force,
    });

    const payouts = await prisma.payout.findMany({
      where: {
        status: "SENT",
        paypalBatchId: {
          not: null,
        },
        ...(force
          ? {}
          : {
              paypalFeeSyncedAt: null,
            }),
      },
      orderBy: [{ reviewedAt: "desc" }, { createdAt: "desc" }],
      take: limit,
      select: {
        id: true,
        currency: true,
        paypalBatchId: true,
        paypalItemId: true,
      },
    });

    requestLogger.info("Starting PayPal payout fee sync", {
      payoutCount: payouts.length,
    });

    let syncedCount = 0;
    let pendingCount = 0;
    let failedCount = 0;

    for (const payout of payouts) {
      if (!payout.paypalBatchId) {
        continue;
      }

      const payoutLogger = requestLogger.child({
        payoutId: payout.id,
        paypalBatchId: payout.paypalBatchId,
        paypalItemId: payout.paypalItemId,
      });

      try {
        const details = await getPaypalPayoutFinancials({
          payoutId: payout.id,
          payoutBatchId: payout.paypalBatchId,
          payoutItemId: payout.paypalItemId,
          logger: payoutLogger,
        });

        const hasFee = Boolean(details.payoutFee);

        await prisma.payout.update({
          where: {
            id: payout.id,
          },
          data: {
            paypalBatchId: details.payoutBatchId,
            paypalItemId: details.payoutItemId,
            paypalBatchStatus: details.batchStatus,
            paypalItemStatus: details.itemStatus,
            ...(hasFee
              ? {
                  paypalFee: details.payoutFee?.amount ?? "0.00",
                  paypalFeeCurrency:
                    details.payoutFee?.currency ?? payout.currency,
                  paypalFeeSyncedAt: new Date(),
                }
              : {}),
          },
        });

        if (hasFee) {
          syncedCount += 1;
          payoutLogger.info("Synced PayPal payout fee details", {
            payoutFeeAmount: details.payoutFee?.amount ?? null,
            payoutFeeCurrency: details.payoutFee?.currency ?? null,
            itemStatus: details.itemStatus,
          });
        } else {
          pendingCount += 1;
          payoutLogger.info("PayPal payout fee is not available yet", {
            itemStatus: details.itemStatus,
          });
        }
      } catch (error) {
        failedCount += 1;
        payoutLogger.error("Failed to sync PayPal payout fee details", {
          error,
        });
      }
    }

    broadcastAdminRealtimeTopics(["finance"], "direct");

    requestLogger.info("Completed PayPal payout fee sync", {
      syncedCount,
      pendingCount,
      failedCount,
    });

    return NextResponse.json(
      {
        message:
          syncedCount > 0
            ? `Synced PayPal payout fees for ${syncedCount} payout(s)`
            : pendingCount > 0
              ? `${pendingCount} payout(s) are still waiting for PayPal fee details`
              : "No PayPal payout fee updates were applied",
        data: {
          scanned: payouts.length,
          synced: syncedCount,
          pending: pendingCount,
          failed: failedCount,
        },
      },
      { headers: RESPONSE_HEADERS },
    );
  } catch (error) {
    if (error instanceof PaypalPayoutError) {
      const debugId = getPaypalDebugId(error);

      logger.warn("PayPal payout fee sync failed with provider error", {
        error,
        status: error.status,
        debugId,
      });

      return NextResponse.json(
        {
          message: error.message,
          ...(debugId ? { debugId } : {}),
        },
        { status: error.status, headers: RESPONSE_HEADERS },
      );
    }

    logger.error("Unhandled PayPal payout fee sync error", { error });
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500, headers: RESPONSE_HEADERS },
    );
  }
}
