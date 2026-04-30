import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { getSessionAdmin } from "@/lib/auth/session";
import { isAllowedOrigin } from "@/lib/auth/origin";
import { broadcastAdminRealtimeTopics } from "@/lib/admin-realtime";
import { createRequestLogger } from "@/lib/logger";
import prisma from "@/lib/prisma";
import { getPaypalCaptureFinancials, PaypalPayoutError } from "@/lib/paypal";

const RESPONSE_HEADERS = {
  "Cache-Control": "private, no-store",
  Pragma: "no-cache",
  Expires: "0",
  "X-Content-Type-Options": "nosniff",
} as const;

const syncPaypalFeesSchema = z.object({
  limit: z.number().int().min(1).max(100).optional(),
  force: z.boolean().optional(),
});

const DEFAULT_SYNC_LIMIT = 25;

export async function POST(req: NextRequest) {
  const logger = createRequestLogger(req, {
    route: "api.finance.paypal-fees.sync",
  });

  try {
    if (!isAllowedOrigin(req)) {
      logger.warn("Rejected PayPal fee sync due to invalid origin");
      return NextResponse.json(
        { message: "Forbidden origin" },
        { status: 403, headers: RESPONSE_HEADERS },
      );
    }

    const admin = await getSessionAdmin(req);
    if (!admin) {
      logger.warn("Rejected PayPal fee sync due to missing admin session");
      return NextResponse.json(
        { message: "Unauthorized" },
        { status: 401, headers: RESPONSE_HEADERS },
      );
    }

    const rawBody = await req.json().catch(() => ({}));
    const payload = syncPaypalFeesSchema.safeParse(rawBody);

    if (!payload.success) {
      logger.warn("Rejected PayPal fee sync due to validation failure", {
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

    const payments = await prisma.payment.findMany({
      where: {
        provider: "PAYPAL",
        status: "COMPLETED",
        paypalCaptureId: {
          not: null,
        },
        ...(force
          ? {}
          : {
              paypalFeeSyncedAt: null,
            }),
      },
      orderBy: [{ paidAt: "desc" }, { createdAt: "desc" }],
      take: limit,
      select: {
        id: true,
        paypalCaptureId: true,
        currency: true,
        platformFee: true,
      },
    });

    requestLogger.info("Starting PayPal fee sync", {
      paymentCount: payments.length,
    });

    let syncedCount = 0;
    let failedCount = 0;

    const CONCURRENCY = 5;
    const work = payments.filter((p) => p.paypalCaptureId);

    const syncOne = async (payment: (typeof work)[number]) => {
      const paymentLogger = requestLogger.child({
        paymentId: payment.id,
        paypalCaptureId: payment.paypalCaptureId,
      });

      try {
        const details = await getPaypalCaptureFinancials({
          captureId: payment.paypalCaptureId!,
          logger: paymentLogger,
        });

        const paypalFeeAmount = details.paypalFee?.amount ?? "0.00";
        const paypalFeeCurrency =
          details.paypalFee?.currency ?? payment.currency;
        const paypalNetAmount = details.netAmount?.amount ?? "0.00";
        const paypalNetCurrency =
          details.netAmount?.currency ?? payment.currency;

        await prisma.payment.update({
          where: { id: payment.id },
          data: {
            paypalFee: paypalFeeAmount,
            paypalFeeCurrency,
            paypalNetAmount,
            paypalNetCurrency,
            paypalFeeSyncedAt: new Date(),
          },
        });

        syncedCount += 1;
        paymentLogger.info("Synced PayPal fee details for payment", {
          paypalFeeAmount,
          paypalFeeCurrency,
          paypalNetAmount,
          paypalNetCurrency,
          captureStatus: details.status,
        });
      } catch (error) {
        failedCount += 1;
        paymentLogger.error("Failed to sync PayPal fee details for payment", {
          error,
        });
      }
    };

    for (let i = 0; i < work.length; i += CONCURRENCY) {
      const chunk = work.slice(i, i + CONCURRENCY);
      await Promise.all(chunk.map(syncOne));
    }

    broadcastAdminRealtimeTopics(["finance"], "direct");

    requestLogger.info("Completed PayPal fee sync", {
      syncedCount,
      failedCount,
    });

    return NextResponse.json({
      message:
        syncedCount > 0
          ? `Synced PayPal fees for ${syncedCount} payment(s)`
          : "No PayPal fee updates were applied",
      data: {
        scanned: payments.length,
        synced: syncedCount,
        failed: failedCount,
      },
    }, { headers: RESPONSE_HEADERS });
  } catch (error) {
    if (error instanceof PaypalPayoutError) {
      logger.warn("PayPal fee sync failed with provider error", {
        error,
      });
      return NextResponse.json(
        {
          message: error.message,
          debugId: error.details?.debug_id ?? null,
        },
        { status: error.status, headers: RESPONSE_HEADERS },
      );
    }

    logger.error("Unhandled PayPal fee sync error", { error });
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500, headers: RESPONSE_HEADERS },
    );
  }
}
