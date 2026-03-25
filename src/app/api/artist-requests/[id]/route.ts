import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { getSessionAdmin } from "@/lib/auth/session";
import prisma from "@/lib/prisma";

const updateArtistRequestSchema = z.object({
  action: z.enum(["approve", "reject"]),
  reason: z.string().max(300).optional(),
});

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

function parseRequestId(rawId: string) {
  try {
    const id = BigInt(rawId);
    return id > BigInt(0) ? id : null;
  } catch {
    return null;
  }
}

export async function PATCH(req: NextRequest, context: RouteContext) {
  try {
    const admin = await getSessionAdmin(req);
    if (!admin) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { id: rawId } = await context.params;
    const requestId = parseRequestId(rawId);
    if (!requestId) {
      return NextResponse.json(
        { message: "Invalid request id" },
        { status: 400 },
      );
    }

    const payload = updateArtistRequestSchema.safeParse(await req.json());
    if (!payload.success) {
      return NextResponse.json(
        {
          message: "Validation failed",
          errors: payload.error.flatten().fieldErrors,
        },
        { status: 400 },
      );
    }

    const requestItem = await prisma.artistVerificationRequest.findUnique({
      where: { id: requestId },
      select: {
        id: true,
        userId: true,
        status: true,
      },
    });

    if (!requestItem) {
      return NextResponse.json(
        { message: "Request not found" },
        { status: 404 },
      );
    }

    if (requestItem.status !== "PENDING") {
      return NextResponse.json(
        { message: "Request has already been processed" },
        { status: 409 },
      );
    }

    const reason = payload.data.reason?.trim() || null;

    if (payload.data.action === "reject") {
      await prisma.artistVerificationRequest.update({
        where: { id: requestId },
        data: {
          status: "REJECTED",
          reviewedAt: new Date(),
          reviewReason: reason,
          reviewedByAdminId: admin.id,
        },
      });

      return NextResponse.json({
        message: "Artist request rejected",
      });
    }

    await prisma.$transaction(async (tx) => {
      await tx.authToken.deleteMany({
        where: { userId: requestItem.userId },
      });

      await tx.refreshToken.deleteMany({
        where: { userId: requestItem.userId },
      });

      const showcase = await tx.showcase.findUnique({
        where: { userId: requestItem.userId },
        select: { id: true },
      });

      await tx.user.update({
        where: { id: requestItem.userId },
        data: {
          verifiedArtists: true,
          role: "artist",
          ...(showcase ? {} : { showcases: { create: {} } }),
        },
      });

      await tx.artistVerificationRequest.update({
        where: { id: requestId },
        data: {
          status: "APPROVED",
          reviewedAt: new Date(),
          reviewReason: reason,
          reviewedByAdminId: admin.id,
        },
      });
    });

    return NextResponse.json({
      message: "Artist approved successfully",
    });
  } catch (error) {
    console.error("Update artist request error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 },
    );
  }
}
