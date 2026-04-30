import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSessionAdmin } from "@/lib/auth/session";
import { createRequestLogger } from "@/lib/logger";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const logger = createRequestLogger(req, { route: "api.refunds.detail" });
  try {
    const admin = await getSessionAdmin(req);
    if (!admin) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { id } = await ctx.params;
    if (!UUID_PATTERN.test(id)) {
      return NextResponse.json(
        { message: "Refund not found" },
        { status: 404 },
      );
    }

    const refund = await prisma.refundRequest.findUnique({
      where: { id },
      select: {
        id: true,
        orderId: true,
        status: true,
        amount: true,
        currency: true,
        reason: true,
        artistResponse: true,
        adminNote: true,
        ticketId: true,
        resolvedAt: true,
        resolvedById: true,
        resolvedByRole: true,
        paypalRefundId: true,
        refundedAt: true,
        failureReason: true,
        createdAt: true,
        updatedAt: true,
        client: {
          select: {
            id: true,
            username: true,
            name: true,
            email: true,
            avatar: true,
          },
        },
        artist: {
          select: {
            id: true,
            username: true,
            name: true,
            email: true,
            avatar: true,
          },
        },
        payment: {
          select: {
            id: true,
            paypalCaptureId: true,
            amount: true,
            currency: true,
            paidAt: true,
          },
        },
        order: {
          select: {
            id: true,
            titleSnapshot: true,
            status: true,
            priceSnapshot: true,
            currency: true,
            briefSnapshot: true,
            createdAt: true,
            updatedAt: true,
            artist: {
              select: { id: true, username: true, name: true },
            },
            client: {
              select: { id: true, username: true, name: true },
            },
            events: {
              orderBy: { createdAt: "desc" },
              take: 30,
              select: {
                id: true,
                type: true,
                description: true,
                metadata: true,
                createdAt: true,
              },
            },
          },
        },
      },
    });

    if (!refund) {
      return NextResponse.json(
        { message: "Refund not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({ data: refund });
  } catch (error) {
    logger.error("Fetch refund detail failed", { error });
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 },
    );
  }
}
