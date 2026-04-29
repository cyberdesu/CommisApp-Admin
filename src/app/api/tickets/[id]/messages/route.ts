import { NextRequest, NextResponse } from "next/server";
import { filterXSS } from "xss";
import prisma from "@/lib/prisma";
import { getSessionAdmin } from "@/lib/auth/session";

const REPLY_BODY_MAX = 5000;
const RESOLUTION_NOTE_MAX = 2000;
const ALLOWED_SET_STATUS = [
  "OPEN",
  "IN_PROGRESS",
  "AWAITING_USER",
  "RESOLVED",
  "CLOSED",
] as const;

function isValidCuid(id: string): boolean {
  return /^[a-z0-9]{20,40}$/i.test(id);
}

function sanitizeBody(input: string): string {
  return filterXSS(input).trim().slice(0, REPLY_BODY_MAX);
}

function sanitizeResolutionNote(input: string): string {
  return filterXSS(input).trim().slice(0, RESOLUTION_NOTE_MAX);
}

interface PostBody {
  body?: string;
  internalNote?: boolean;
  setStatus?: "OPEN" | "IN_PROGRESS" | "AWAITING_USER" | "RESOLVED" | "CLOSED";
  resolutionNote?: string;
}

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    const admin = await getSessionAdmin(req);
    if (!admin) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { id } = await ctx.params;
    if (!isValidCuid(id)) {
      return NextResponse.json({ message: "Ticket not found" }, { status: 404 });
    }

    const json = (await req.json().catch(() => null)) as PostBody | null;
    if (!json || typeof json.body !== "string") {
      return NextResponse.json(
        { message: "Body must be a non-empty string" },
        { status: 400 },
      );
    }

    const safeBody = sanitizeBody(json.body);
    if (!safeBody) {
      return NextResponse.json(
        { message: "Reply body cannot be empty" },
        { status: 400 },
      );
    }

    const internalNote = json.internalNote === true;

    if (
      json.setStatus !== undefined &&
      !ALLOWED_SET_STATUS.includes(json.setStatus)
    ) {
      return NextResponse.json(
        { message: "Invalid setStatus" },
        { status: 400 },
      );
    }

    let safeResolutionNote: string | undefined;
    if (typeof json.resolutionNote === "string") {
      safeResolutionNote = sanitizeResolutionNote(json.resolutionNote);
      if (!safeResolutionNote) safeResolutionNote = undefined;
    }

    const ticket = await prisma.ticket.findUnique({
      where: { id },
      select: {
        id: true,
        subject: true,
        status: true,
        reporterId: true,
      },
    });
    if (!ticket) {
      return NextResponse.json({ message: "Ticket not found" }, { status: 404 });
    }

    if (ticket.status === "CLOSED") {
      return NextResponse.json(
        { message: "Cannot reply to a closed ticket" },
        { status: 400 },
      );
    }

    const newStatus =
      json.setStatus ||
      (internalNote ? ticket.status : "AWAITING_USER");

    const statusChanged = newStatus !== ticket.status;

    const result = await prisma.$transaction(async (tx) => {
      const message = await tx.ticketMessage.create({
        data: {
          ticketId: id,
          senderRole: "ADMIN",
          senderAdminId: admin.id,
          body: safeBody,
          internalNote,
        },
        select: { id: true, createdAt: true, internalNote: true },
      });

      const updated = await tx.ticket.update({
        where: { id },
        data: {
          lastReplyAt: message.createdAt,
          ...(statusChanged ? { status: newStatus } : {}),
          ...(newStatus === "RESOLVED" ? { resolvedAt: new Date() } : {}),
          ...(newStatus === "CLOSED" ? { closedAt: new Date() } : {}),
          ...(safeResolutionNote ? { resolutionNote: safeResolutionNote } : {}),
        },
        select: { id: true, status: true },
      });

      return { message, ticket: updated };
    });

    const becameTerminal =
      statusChanged &&
      (newStatus === "RESOLVED" || newStatus === "CLOSED");

    if (!internalNote || becameTerminal) {
      void triggerHook(id, ticket.reporterId, ticket.subject, {
        bodyExcerpt: internalNote
          ? safeResolutionNote
          : safeBody.slice(0, 500),
        newStatus: result.ticket.status as PostBody["setStatus"],
        isResolved: result.ticket.status === "RESOLVED",
        statusChanged,
      });
    }

    return NextResponse.json({
      data: {
        messageId: result.message.id,
        ticketId: result.ticket.id,
        ticketStatus: result.ticket.status,
        createdAt: result.message.createdAt,
        internalNote: result.message.internalNote,
      },
    });
  } catch (error) {
    console.error("Post ticket message error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 },
    );
  }
}

async function triggerHook(
  ticketId: string,
  recipientUserId: number,
  ticketSubject: string,
  payload: {
    bodyExcerpt?: string;
    newStatus?: PostBody["setStatus"];
    isResolved?: boolean;
    statusChanged?: boolean;
  },
) {
  const url = process.env.BACKEND_INTERNAL_URL;
  const secret = process.env.ADMIN_HOOK_SECRET;
  if (!url || !secret) {
    console.warn(
      "BACKEND_INTERNAL_URL or ADMIN_HOOK_SECRET missing; skipping ticket webhook.",
    );
    return;
  }

  try {
    await fetch(`${url}/internal/tickets/${ticketId}/admin-reply-hook`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-internal-secret": secret,
      },
      body: JSON.stringify({
        recipientUserId,
        ticketSubject,
        ...payload,
      }),
    });
  } catch (err) {
    console.error("Ticket webhook failed:", err);
  }
}
