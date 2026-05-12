import { NextRequest, NextResponse } from "next/server";

import { getSessionAdmin } from "@/lib/auth/session";
import { createRequestLogger } from "@/lib/logger";
import { minio, MINIO_BUCKET_NAME } from "@/lib/minio";
import prisma from "@/lib/prisma";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function DELETE(req: NextRequest, context: RouteContext) {
  const logger = createRequestLogger(req, {
    route: "api.chats.conversations.purge",
  });

  try {
    const admin = await getSessionAdmin(req);
    if (!admin) {
      logger.warn("Rejected conversation purge — no admin session");
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
      confirm?: string;
      reason?: string;
    } | null;

    if (!body || body.confirm !== "CONFIRM") {
      return NextResponse.json(
        { message: "Confirmation token must be CONFIRM" },
        { status: 400 },
      );
    }
    const reason = body.reason?.trim() ?? "";
    if (reason.length < 3) {
      return NextResponse.json(
        { message: "Audit reason must be at least 3 characters" },
        { status: 400 },
      );
    }
    if (reason.length > 1000) {
      return NextResponse.json(
        { message: "Audit reason too long" },
        { status: 400 },
      );
    }

    const conversation = await prisma.conversation.findUnique({
      where: { id },
      select: {
        id: true,
        messages: {
          select: { id: true, fileUrl: true, type: true },
        },
      },
    });
    if (!conversation) {
      return NextResponse.json(
        { message: "Conversation not found" },
        { status: 404 },
      );
    }

    const fileUrls = conversation.messages
      .filter((m) => m.type === "IMAGE" && m.fileUrl)
      .map((m) => m.fileUrl as string);

    const requestLogger = logger.child({
      adminId: admin.id,
      conversationId: id,
      messageCount: conversation.messages.length,
      fileCount: fileUrls.length,
      reason,
    });

    // Best-effort file removal — errors logged but do not block DB delete
    let removedFiles = 0;
    let failedFiles = 0;
    await Promise.all(
      fileUrls.map(async (url) => {
        const ok = await minio.removeObject(url, MINIO_BUCKET_NAME);
        if (ok) removedFiles++;
        else failedFiles++;
      }),
    );

    // Cascade delete via Prisma — Conversation onDelete cascades to messages,
    // participants, notifications, and flags via existing relations.
    await prisma.conversation.delete({ where: { id } });

    requestLogger.info("Conversation purged", {
      removedFiles,
      failedFiles,
    });

    return NextResponse.json({
      message: "Conversation purged",
      data: {
        purgedMessages: conversation.messages.length,
        removedFiles,
        failedFiles,
      },
    });
  } catch (error) {
    logger.error("Failed to purge conversation", { error });
    return NextResponse.json(
      { message: "Failed to purge conversation" },
      { status: 500 },
    );
  }
}
