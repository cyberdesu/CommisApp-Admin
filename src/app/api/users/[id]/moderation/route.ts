import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { isAllowedOrigin } from "@/lib/auth/origin";
import { getSessionAdmin } from "@/lib/auth/session";
import prisma from "@/lib/prisma";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

const MAX_SUSPEND_DURATION_HOURS = 24 * 365;

const moderationSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("BAN"),
    reason: z.string().max(300).optional(),
  }),
  z.object({
    action: z.literal("UNBAN"),
    reason: z.string().max(300).optional(),
  }),
  z.object({
    action: z.literal("SUSPEND"),
    reason: z.string().max(300).optional(),
    durationHours: z.number().int().min(1).max(MAX_SUSPEND_DURATION_HOURS),
  }),
  z.object({
    action: z.literal("UNSUSPEND"),
    reason: z.string().max(300).optional(),
  }),
]);

function parseUserId(rawId: string) {
  const id = Number(rawId);
  if (!Number.isInteger(id) || id <= 0) return null;
  return id;
}

function normalizeReason(value?: string) {
  if (!value) return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function isSuspended(suspendedUntil: Date | null) {
  return Boolean(suspendedUntil && suspendedUntil > new Date());
}

export async function POST(req: NextRequest, context: RouteContext) {
  try {
    if (!isAllowedOrigin(req)) {
      return NextResponse.json({ message: "Forbidden origin" }, { status: 403 });
    }

    const admin = await getSessionAdmin(req);
    if (!admin) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { id: rawId } = await context.params;
    const userId = parseUserId(rawId);
    if (!userId) {
      return NextResponse.json({ message: "Invalid user id" }, { status: 400 });
    }

    const payload = moderationSchema.safeParse(await req.json());
    if (!payload.success) {
      return NextResponse.json(
        {
          message: "Validation failed",
          errors: payload.error.flatten().fieldErrors,
        },
        { status: 400 },
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        isBanned: true,
        suspendedUntil: true,
      },
    });

    if (!user) {
      return NextResponse.json({ message: "User not found" }, { status: 404 });
    }

    const reason = normalizeReason(payload.data.reason);

    if (payload.data.action === "BAN" && user.isBanned) {
      return NextResponse.json({ message: "User is already banned" }, { status: 409 });
    }

    if (payload.data.action === "SUSPEND" && user.isBanned) {
      return NextResponse.json(
        { message: "Banned user cannot be suspended" },
        { status: 409 },
      );
    }

    if (payload.data.action === "UNBAN" && !user.isBanned) {
      return NextResponse.json(
        { message: "User is not banned" },
        { status: 409 },
      );
    }

    if (payload.data.action === "UNSUSPEND" && user.isBanned) {
      return NextResponse.json(
        { message: "Banned user cannot be unsuspended" },
        { status: 409 },
      );
    }

    if (payload.data.action === "UNSUSPEND" && !isSuspended(user.suspendedUntil)) {
      return NextResponse.json(
        { message: "User is not currently suspended" },
        { status: 409 },
      );
    }

    const result = await prisma.$transaction(async (tx) => {
      switch (payload.data.action) {
        case "BAN": {
          await tx.authToken.deleteMany({ where: { userId } });
          await tx.refreshToken.deleteMany({ where: { userId } });

          const updatedUser = await tx.user.update({
            where: { id: userId },
            data: {
              isBanned: true,
              suspendedUntil: null,
              banReason: reason,
            },
            select: {
              id: true,
              isBanned: true,
              suspendedUntil: true,
              banReason: true,
            },
          });

          await tx.userModeration.create({
            data: {
              userId,
              action: "BAN",
              reason,
              adminId: admin.id,
            },
          });

          return {
            message: "User banned successfully",
            data: updatedUser,
          };
        }
        case "UNBAN": {
          const updatedUser = await tx.user.update({
            where: { id: userId },
            data: {
              isBanned: false,
              banReason: null,
            },
            select: {
              id: true,
              isBanned: true,
              suspendedUntil: true,
              banReason: true,
            },
          });

          await tx.userModeration.create({
            data: {
              userId,
              action: "UNBAN",
              reason,
              adminId: admin.id,
            },
          });

          return {
            message: "User unbanned successfully",
            data: updatedUser,
          };
        }
        case "SUSPEND": {
          const expiresAt = new Date(
            Date.now() + payload.data.durationHours * 60 * 60 * 1000,
          );

          await tx.authToken.deleteMany({ where: { userId } });
          await tx.refreshToken.deleteMany({ where: { userId } });

          const updatedUser = await tx.user.update({
            where: { id: userId },
            data: {
              suspendedUntil: expiresAt,
              banReason: reason,
            },
            select: {
              id: true,
              isBanned: true,
              suspendedUntil: true,
              banReason: true,
            },
          });

          await tx.userModeration.create({
            data: {
              userId,
              action: "SUSPEND",
              reason,
              duration: payload.data.durationHours,
              expiresAt,
              adminId: admin.id,
            },
          });

          return {
            message: `User suspended for ${payload.data.durationHours} hours`,
            data: updatedUser,
          };
        }
        case "UNSUSPEND": {
          const updatedUser = await tx.user.update({
            where: { id: userId },
            data: {
              suspendedUntil: null,
              banReason: null,
            },
            select: {
              id: true,
              isBanned: true,
              suspendedUntil: true,
              banReason: true,
            },
          });

          await tx.userModeration.create({
            data: {
              userId,
              action: "UNSUSPEND",
              reason,
              adminId: admin.id,
            },
          });

          return {
            message: "User unsuspended successfully",
            data: updatedUser,
          };
        }
      }
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("User moderation error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 },
    );
  }
}

