import { NextRequest, NextResponse } from "next/server";

import { getSessionAdmin } from "@/lib/auth/session";
import { createRequestLogger } from "@/lib/logger";
import prisma from "@/lib/prisma";

const ALLOWED_REASONS = [
  "HARASSMENT",
  "NSFW",
  "OFF_PLATFORM_PAYMENT",
  "SCAM",
  "OTHER",
] as const;
type FlagReason = (typeof ALLOWED_REASONS)[number];

const ALLOWED_SEVERITIES = ["LOW", "MEDIUM", "HIGH"] as const;
type FlagSeverity = (typeof ALLOWED_SEVERITIES)[number];

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(req: NextRequest, context: RouteContext) {
  const logger = createRequestLogger(req, {
    route: "api.chats.conversations.flag",
  });

  try {
    const admin = await getSessionAdmin(req);
    if (!admin) {
      logger.warn("Rejected conversation flag — no admin session");
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { id } = await context.params;
    if (!id?.trim()) {
      return NextResponse.json(
        { message: "Invalid conversation id" },
        { status: 400 },
      );
    }

    const body = (await req.json().catch(() => null)) as {
      reason?: string;
      severity?: string;
      note?: string;
    } | null;

    if (!body) {
      return NextResponse.json(
        { message: "Invalid request body" },
        { status: 400 },
      );
    }

    const reason = body.reason as FlagReason;
    const severity = body.severity as FlagSeverity;
    const note = body.note?.trim() ?? "";

    if (!ALLOWED_REASONS.includes(reason)) {
      return NextResponse.json({ message: "Invalid reason" }, { status: 400 });
    }
    if (!ALLOWED_SEVERITIES.includes(severity)) {
      return NextResponse.json(
        { message: "Invalid severity" },
        { status: 400 },
      );
    }
    if (note.length < 3) {
      return NextResponse.json(
        { message: "Note must be at least 3 characters" },
        { status: 400 },
      );
    }
    if (note.length > 1000) {
      return NextResponse.json(
        { message: "Note too long (max 1000 chars)" },
        { status: 400 },
      );
    }

    const conversation = await prisma.conversation.findUnique({
      where: { id },
      select: { id: true, lockedAt: true },
    });
    if (!conversation) {
      return NextResponse.json(
        { message: "Conversation not found" },
        { status: 404 },
      );
    }

    const requestLogger = logger.child({
      adminId: admin.id,
      conversationId: id,
      reason,
      severity,
    });

    const lockOnFlag = severity === "HIGH";

    const result = await prisma.$transaction(async (tx) => {
      const flag = await tx.conversationFlag.create({
        data: {
          conversationId: id,
          flaggedByAdmin: admin.id,
          reason,
          severity,
          note,
        },
      });

      if (lockOnFlag && !conversation.lockedAt) {
        await tx.conversation.update({
          where: { id },
          data: { lockedAt: new Date(), lockedBy: admin.id },
        });
      }

      return flag;
    });

    requestLogger.info("Conversation flagged", { flagId: result.id, lockOnFlag });

    return NextResponse.json({
      message: "Conversation flagged",
      data: {
        id: result.id,
        reason: result.reason,
        severity: result.severity,
        status: result.status,
        createdAt: result.createdAt,
        locked: lockOnFlag,
      },
    });
  } catch (error) {
    logger.error("Failed to flag conversation", { error });
    return NextResponse.json(
      { message: "Failed to flag conversation" },
      { status: 500 },
    );
  }
}
