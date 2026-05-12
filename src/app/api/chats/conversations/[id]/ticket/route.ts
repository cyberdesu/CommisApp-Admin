import { NextRequest, NextResponse } from "next/server";

import { getSessionAdmin } from "@/lib/auth/session";
import { createRequestLogger } from "@/lib/logger";
import prisma from "@/lib/prisma";

const ALLOWED_PRIORITIES = ["LOW", "NORMAL", "HIGH", "URGENT"] as const;
type Priority = (typeof ALLOWED_PRIORITIES)[number];

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(req: NextRequest, context: RouteContext) {
  const logger = createRequestLogger(req, {
    route: "api.chats.conversations.ticket",
  });

  try {
    const admin = await getSessionAdmin(req);
    if (!admin) {
      logger.warn("Rejected ticket creation — no admin session");
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
      subject?: string;
      description?: string;
      priority?: string;
      reportedUserId?: number;
    } | null;

    if (!body) {
      return NextResponse.json(
        { message: "Invalid request body" },
        { status: 400 },
      );
    }

    const subject = body.subject?.trim() ?? "";
    const description = body.description?.trim() ?? "";
    const priority = (body.priority ?? "NORMAL") as Priority;

    if (subject.length < 3 || subject.length > 200) {
      return NextResponse.json(
        { message: "Subject must be 3-200 characters" },
        { status: 400 },
      );
    }
    if (description.length < 10 || description.length > 4000) {
      return NextResponse.json(
        { message: "Description must be 10-4000 characters" },
        { status: 400 },
      );
    }
    if (!ALLOWED_PRIORITIES.includes(priority)) {
      return NextResponse.json(
        { message: "Invalid priority" },
        { status: 400 },
      );
    }

    const conversation = await prisma.conversation.findUnique({
      where: { id },
      select: {
        id: true,
        orderId: true,
        participants: {
          select: { userId: true, user: { select: { id: true } } },
          take: 2,
          orderBy: { joinedAt: "asc" },
        },
      },
    });
    if (!conversation) {
      return NextResponse.json(
        { message: "Conversation not found" },
        { status: 404 },
      );
    }
    if (conversation.participants.length === 0) {
      return NextResponse.json(
        { message: "Conversation has no participants — cannot open ticket" },
        { status: 422 },
      );
    }

    const reporterId = conversation.participants[0].userId;
    const reportedUserId =
      body.reportedUserId && Number.isFinite(body.reportedUserId)
        ? body.reportedUserId
        : (conversation.participants[1]?.userId ?? null);

    const requestLogger = logger.child({
      adminId: admin.id,
      conversationId: id,
      reporterId,
      reportedUserId,
    });

    const ticket = await prisma.ticket.create({
      data: {
        type: "USER_REPORT",
        subject,
        description: `${description}\n\n---\nSource: chat conversation ${id}`,
        priority,
        category: "chat-moderation",
        reporterId,
        assignedAdminId: admin.id,
        ...(reportedUserId ? { reportedUserId } : {}),
        ...(conversation.orderId ? { orderId: conversation.orderId } : {}),
      },
      select: {
        id: true,
        subject: true,
        type: true,
        status: true,
        priority: true,
        createdAt: true,
      },
    });

    requestLogger.info("Ticket created from conversation", {
      ticketId: ticket.id,
    });

    return NextResponse.json({
      message: "Ticket created",
      data: ticket,
    });
  } catch (error) {
    logger.error("Failed to open ticket from conversation", { error });
    return NextResponse.json(
      { message: "Failed to open ticket" },
      { status: 500 },
    );
  }
}
