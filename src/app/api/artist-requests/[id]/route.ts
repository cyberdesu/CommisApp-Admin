import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { getSessionAdmin } from "@/lib/auth/session";
import { ensureArtistVerificationTable } from "@/lib/artist-verification";
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
  const id = Number.parseInt(rawId, 10);
  return Number.isFinite(id) && id > 0 ? id : null;
}

type RequestRow = {
  id: number;
  userId: number;
  status: "PENDING" | "APPROVED" | "REJECTED";
};

export async function PATCH(req: NextRequest, context: RouteContext) {
  try {
    const admin = await getSessionAdmin(req);
    if (!admin) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    await ensureArtistVerificationTable();

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

    const requestRows = await prisma.$queryRaw<RequestRow[]>`
      SELECT id, "userId" AS "userId", "status" AS "status"
      FROM "artist_verification_requests"
      WHERE id = ${requestId}
      LIMIT 1
    `;

    const requestItem = requestRows[0];
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
      await prisma.$executeRaw`
        UPDATE "artist_verification_requests"
        SET
          "status" = 'REJECTED'::"VerificationStatus",
          "reviewedAt" = NOW(),
          "reviewReason" = ${reason},
          "reviewedByAdminId" = ${admin.id},
          "updatedAt" = NOW()
        WHERE id = ${requestId}
      `;

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

      await tx.$executeRaw`
        UPDATE "artist_verification_requests"
        SET
          "status" = 'APPROVED'::"VerificationStatus",
          "reviewedAt" = NOW(),
          "reviewReason" = ${reason},
          "reviewedByAdminId" = ${admin.id},
          "updatedAt" = NOW()
        WHERE id = ${requestId}
      `;
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
