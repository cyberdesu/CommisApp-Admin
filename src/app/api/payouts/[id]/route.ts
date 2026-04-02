import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { isAllowedOrigin } from "@/lib/auth/origin";
import { createRequestLogger } from "@/lib/logger";
import {
  PaypalPayoutError,
  createPaypalPayout,
  getPaypalDebugId,
} from "@/lib/paypal";
import { getSessionAdmin } from "@/lib/auth/session";
import prisma from "@/lib/prisma";
import { Prisma } from "@/prisma/generated/client";

const updatePayoutSchema = z.object({
  action: z.enum(["approve", "flag_fraud"]),
  note: z.string().max(500).optional(),
});

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const PAYOUT_TRANSACTION_TIMEOUT_MS = 20_000;

class PayoutRouteError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "PayoutRouteError";
    this.status = status;
  }
}

export async function PATCH(req: NextRequest, context: RouteContext) {
  const logger = createRequestLogger(req, {
    route: "api.payouts.update",
  });

  try {
    if (!isAllowedOrigin(req)) {
      logger.warn("Rejected payout update due to invalid origin");
      return NextResponse.json(
        { message: "Forbidden origin" },
        { status: 403 },
      );
    }

    const admin = await getSessionAdmin(req);
    if (!admin) {
      logger.warn("Rejected payout update due to missing admin session");
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { id } = await context.params;
    if (!id || !UUID_REGEX.test(id)) {
      logger.warn("Rejected payout update due to invalid payout id", { id });
      return NextResponse.json(
        { message: "Invalid payout id" },
        { status: 400 },
      );
    }

    const payload = updatePayoutSchema.safeParse(await req.json());
    if (!payload.success) {
      logger.warn("Rejected payout update due to validation failure", {
        errors: payload.error.flatten().fieldErrors,
      });
      return NextResponse.json(
        {
          message: "Validation failed",
          errors: payload.error.flatten().fieldErrors,
        },
        { status: 400 },
      );
    }

    const note = payload.data.note?.trim() || null;
    const newStatus =
      payload.data.action === "approve" ? "SENT" : "FRAUD";
    const requestLogger = logger.child({
      payoutId: id,
      adminId: admin.id,
      action: payload.data.action,
    });

    requestLogger.info("Processing payout update request");

    const result = await prisma.$transaction(
      async (tx) => {
        await tx.$executeRaw`
          SELECT pg_advisory_xact_lock(hashtext(${id}))
        `;
        requestLogger.debug("Acquired advisory lock for payout");

        const lockedPayout = await tx.payout.findUnique({
          where: { id },
          select: {
            id: true,
            status: true,
            amount: true,
            currency: true,
            paypalEmail: true,
          },
        });

        if (!lockedPayout) {
          throw new PayoutRouteError("Payout not found", 404);
        }

        if (lockedPayout.status !== "PENDING") {
          throw new PayoutRouteError(
            "Payout has already been processed",
            409,
          );
        }

        let paypalResult:
          | {
              payoutBatchId: string | null;
              batchStatus: string | null;
              payoutItemId: string | null;
              wasRecoveredFromDuplicate: boolean;
            }
          | null = null;

        if (payload.data.action === "approve") {
          requestLogger.info("Approving payout and sending to PayPal", {
            amount: lockedPayout.amount.toFixed(2),
            currency: lockedPayout.currency,
          });
          paypalResult = await createPaypalPayout({
            payoutId: lockedPayout.id,
            receiverEmail: lockedPayout.paypalEmail,
            amount: lockedPayout.amount.toFixed(2),
            currency: lockedPayout.currency,
            note,
            logger: requestLogger,
          });
        }

        const updateResult = await tx.payout.updateMany({
          where: {
            id,
            status: "PENDING",
          },
          data: {
            status: newStatus,
            reviewedAt: new Date(),
            reviewedByAdminId: admin.id,
            reviewNote: note,
          },
        });

        if (updateResult.count !== 1) {
          throw new PayoutRouteError(
            "Payout state changed while it was being processed. Please refresh and try again.",
            409,
          );
        }

        const actionLabel =
          payload.data.action === "approve"
            ? `${paypalResult?.wasRecoveredFromDuplicate ? "reconciled with existing PayPal batch" : "submitted to PayPal"}${paypalResult?.batchStatus ? ` (${paypalResult.batchStatus})` : ""} and marked as SENT`
            : "flagged as FRAUD";

        return {
          message: `Payout ${actionLabel}`,
          paypal: paypalResult,
        };
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        maxWait: 5_000,
        timeout: PAYOUT_TRANSACTION_TIMEOUT_MS,
      },
    );

    requestLogger.info("Payout update completed successfully", {
      paypal: result.paypal,
    });
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof PayoutRouteError) {
      logger.warn("Payout update failed with route error", {
        error,
      });
      return NextResponse.json(
        { message: error.message },
        { status: error.status },
      );
    }

    if (error instanceof PaypalPayoutError) {
      const debugId = getPaypalDebugId(error);

      logger.error("PayPal payout request failed", {
        error,
        status: error.status,
        debugId,
      });

      return NextResponse.json(
        {
          message:
            error.status >= 500
              ? "PayPal payout request failed. Please retry in a moment."
              : error.message,
          ...(debugId ? { debugId } : {}),
        },
        {
          status:
            error.status >= 500 ? 502 : error.status >= 400 ? 400 : 500,
        },
      );
    }

    logger.error("Unhandled payout update error", {
      error,
    });
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 },
    );
  }
}
