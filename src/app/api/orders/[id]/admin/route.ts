import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { getSessionAdmin } from "@/lib/auth/session";
import { isAllowedOrigin } from "@/lib/auth/origin";
import { broadcastAdminRealtimeTopics } from "@/lib/admin-realtime";
import { createRequestLogger } from "@/lib/logger";
import prisma from "@/lib/prisma";
import { Prisma } from "@/prisma/generated/client";

const adminOrderInterventionSchema = z
  .object({
    status: z
      .enum([
        "PENDING",
        "ACCEPTED",
        "IN_PROGRESS",
        "WAITING_FOR_CLIENT",
        "DELIVERED",
        "COMPLETED",
        "CANCELLED",
        "REJECTED",
      ])
      .optional(),
    revisionsUsed: z.number().int().min(0).max(999).optional(),
    note: z.string().trim().min(3).max(500),
  })
  .refine(
    (value) => value.status !== undefined || value.revisionsUsed !== undefined,
    {
      message: "Provide at least one order change",
      path: ["status"],
    },
  );

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const ORDER_ADMIN_TRANSACTION_TIMEOUT_MS = 15_000;

class OrderAdminRouteError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "OrderAdminRouteError";
    this.status = status;
  }
}

function getOrderEventType(nextStatus: string | undefined) {
  if (nextStatus === "COMPLETED") return "ORDER_COMPLETED";
  if (nextStatus === "CANCELLED") return "ORDER_CANCELLED";
  if (nextStatus === "REJECTED") return "ORDER_REJECTED";
  return "STATUS_CHANGED";
}

function buildOrderEventDescription(params: {
  statusChanged: boolean;
  revisionsChanged: boolean;
  nextStatus?: string;
}) {
  if (params.statusChanged && params.revisionsChanged) {
    return `Admin intervened and changed order status to ${params.nextStatus} while adjusting revision usage.`;
  }

  if (params.statusChanged) {
    return `Admin intervened and changed order status to ${params.nextStatus}.`;
  }

  return "Admin intervened and adjusted revision usage.";
}

export async function PATCH(req: NextRequest, context: RouteContext) {
  const logger = createRequestLogger(req, {
    route: "api.orders.admin.update",
  });

  try {
    if (!isAllowedOrigin(req)) {
      logger.warn("Rejected admin order intervention due to invalid origin");
      return NextResponse.json(
        { message: "Forbidden origin" },
        { status: 403 },
      );
    }

    const admin = await getSessionAdmin(req);
    if (!admin) {
      logger.warn("Rejected admin order intervention due to missing admin session");
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { id } = await context.params;
    if (!id || !UUID_REGEX.test(id)) {
      logger.warn("Rejected admin order intervention due to invalid order id", {
        id,
      });
      return NextResponse.json(
        { message: "Invalid order id" },
        { status: 400 },
      );
    }

    const payload = adminOrderInterventionSchema.safeParse(await req.json());
    if (!payload.success) {
      logger.warn("Rejected admin order intervention due to validation failure", {
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

    const requestLogger = logger.child({
      orderId: id,
      adminId: admin.id,
      nextStatus: payload.data.status ?? null,
      nextRevisionsUsed: payload.data.revisionsUsed ?? null,
    });

    requestLogger.info("Processing admin order intervention");

    const result = await prisma.$transaction(
      async (tx) => {
        await tx.$executeRaw`
          SELECT pg_advisory_xact_lock(hashtext(${`admin-order:${id}`}))
        `;
        requestLogger.debug("Acquired advisory lock for admin order intervention");

        const order = await tx.order.findUnique({
          where: { id },
          select: {
            id: true,
            status: true,
            revisionsUsed: true,
            revisionsIncluded: true,
          },
        });

        if (!order) {
          throw new OrderAdminRouteError("Order not found", 404);
        }

        const nextStatus = payload.data.status ?? order.status;
        const nextRevisionsUsed =
          payload.data.revisionsUsed ?? order.revisionsUsed;
        const statusChanged = nextStatus !== order.status;
        const revisionsChanged = nextRevisionsUsed !== order.revisionsUsed;

        if (!statusChanged && !revisionsChanged) {
          throw new OrderAdminRouteError(
            "No order changes detected",
            409,
          );
        }

        const updatedOrder = await tx.order.update({
          where: { id },
          data: {
            ...(statusChanged ? { status: nextStatus } : {}),
            ...(revisionsChanged
              ? { revisionsUsed: nextRevisionsUsed }
              : {}),
          },
          select: {
            id: true,
            status: true,
            revisionsUsed: true,
            revisionsIncluded: true,
            updatedAt: true,
          },
        });

        await tx.orderEvent.create({
          data: {
            orderId: id,
            type: getOrderEventType(statusChanged ? nextStatus : undefined),
            description: buildOrderEventDescription({
              statusChanged,
              revisionsChanged,
              nextStatus,
            }),
            metadata: {
              source: "ADMIN_PANEL",
              adminAction: true,
              adminId: admin.id,
              note: payload.data.note,
              fromStatus: order.status,
              toStatus: nextStatus,
              previousRevisionsUsed: order.revisionsUsed,
              nextRevisionsUsed,
              revisionsIncluded: order.revisionsIncluded,
            },
          },
        });

        return {
          message: statusChanged
            ? `Order updated to ${nextStatus}`
            : "Order revision usage updated",
          data: updatedOrder,
        };
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        maxWait: 5_000,
        timeout: ORDER_ADMIN_TRANSACTION_TIMEOUT_MS,
      },
    );

    requestLogger.info("Admin order intervention completed successfully", {
      status: result.data.status,
      revisionsUsed: result.data.revisionsUsed,
      revisionsIncluded: result.data.revisionsIncluded,
    });

    broadcastAdminRealtimeTopics(["orders"]);

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof OrderAdminRouteError) {
      logger.warn("Admin order intervention failed with route error", {
        error,
      });
      return NextResponse.json(
        { message: error.message },
        { status: error.status },
      );
    }

    logger.error("Unhandled admin order intervention error", {
      error,
    });
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 },
    );
  }
}
