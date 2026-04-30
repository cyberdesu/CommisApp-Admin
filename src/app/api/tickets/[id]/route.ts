import { NextRequest, NextResponse } from "next/server";
import { filterXSS } from "xss";
import prisma from "@/lib/prisma";
import { getSessionAdmin } from "@/lib/auth/session";
import { minio } from "@/lib/minio";
import { createRequestLogger, type AppLogger } from "@/lib/logger";

const TICKET_STATUSES = [
  "OPEN",
  "IN_PROGRESS",
  "AWAITING_USER",
  "RESOLVED",
  "CLOSED",
] as const;
const TICKET_PRIORITIES = ["LOW", "NORMAL", "HIGH", "URGENT"] as const;

type TicketStatus = (typeof TICKET_STATUSES)[number];
type TicketPriority = (typeof TICKET_PRIORITIES)[number];

const RESOLUTION_NOTE_MAX = 2000;

function isValidCuid(id: string): boolean {
  return /^[a-z0-9]{20,40}$/i.test(id);
}

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const logger = createRequestLogger(req, { route: "api.tickets.detail" });
  try {
    const admin = await getSessionAdmin(req);
    if (!admin) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { id } = await ctx.params;
    if (!isValidCuid(id)) {
      return NextResponse.json({ message: "Ticket not found" }, { status: 404 });
    }

    const ticket = await prisma.ticket.findUnique({
      where: { id },
      select: {
        id: true,
        type: true,
        subject: true,
        description: true,
        status: true,
        priority: true,
        category: true,
        reporterId: true,
        assignedAdminId: true,
        reportedUserId: true,
        orderId: true,
        showcaseItemId: true,
        resolutionNote: true,
        resolvedAt: true,
        closedAt: true,
        lastReplyAt: true,
        createdAt: true,
        updatedAt: true,
        reporter: {
          select: {
            id: true,
            username: true,
            name: true,
            email: true,
            avatar: true,
          },
        },
        reportedUser: {
          select: {
            id: true,
            username: true,
            name: true,
            email: true,
            avatar: true,
          },
        },
        showcaseItem: {
          select: { id: true, title: true },
        },
        assignedAdmin: {
          select: { id: true, name: true, email: true },
        },
        messages: {
          orderBy: { createdAt: "asc" },
          select: {
            id: true,
            senderRole: true,
            senderUserId: true,
            senderAdminId: true,
            body: true,
            internalNote: true,
            createdAt: true,
            senderUser: {
              select: { id: true, username: true, name: true, avatar: true },
            },
            senderAdmin: { select: { id: true, name: true } },
            attachments: {
              select: {
                id: true,
                fileKey: true,
                fileName: true,
                mimeType: true,
                sizeBytes: true,
                createdAt: true,
              },
            },
          },
        },
      },
    });

    if (!ticket) {
      return NextResponse.json({ message: "Ticket not found" }, { status: 404 });
    }

    const [reporterAvatar, reportedUserAvatar, messagesEnriched] =
      await Promise.all([
        minio.getFile(ticket.reporter.avatar),
        ticket.reportedUser
          ? minio.getFile(ticket.reportedUser.avatar)
          : Promise.resolve(null),
        Promise.all(
          ticket.messages.map(async (msg) => {
            const [senderAvatar, attachments] = await Promise.all([
              msg.senderUser
                ? minio.getFile(msg.senderUser.avatar)
                : Promise.resolve(null),
              Promise.all(
                msg.attachments.map(async (att) => ({
                  id: att.id,
                  fileKey: att.fileKey,
                  fileName: att.fileName,
                  mimeType: att.mimeType,
                  sizeBytes: att.sizeBytes,
                  createdAt: att.createdAt,
                  fileUrl: await minio.getFile(att.fileKey),
                })),
              ),
            ]);
            return {
              ...msg,
              senderUser: msg.senderUser
                ? { ...msg.senderUser, avatar: senderAvatar }
                : null,
              attachments,
            };
          }),
        ),
      ]);

    return NextResponse.json({
      data: {
        ...ticket,
        reporter: { ...ticket.reporter, avatar: reporterAvatar },
        reportedUser: ticket.reportedUser
          ? { ...ticket.reportedUser, avatar: reportedUserAvatar }
          : null,
        showcaseItem: ticket.showcaseItem,
        messages: messagesEnriched,
      },
    });
  } catch (error) {
    logger.error("Fetch ticket detail failed", { error });
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 },
    );
  }
}

interface PatchBody {
  status?: TicketStatus;
  priority?: TicketPriority;
  assignedAdminId?: number | null;
  resolutionNote?: string | null;
}

export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const logger = createRequestLogger(req, { route: "api.tickets.patch" });
  try {
    const admin = await getSessionAdmin(req);
    if (!admin) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { id } = await ctx.params;
    if (!isValidCuid(id)) {
      return NextResponse.json({ message: "Ticket not found" }, { status: 404 });
    }

    const body = (await req.json().catch(() => null)) as PatchBody | null;
    if (!body || typeof body !== "object") {
      return NextResponse.json({ message: "Invalid body" }, { status: 400 });
    }

    if (body.status && !TICKET_STATUSES.includes(body.status)) {
      return NextResponse.json({ message: "Invalid status" }, { status: 400 });
    }
    if (body.priority && !TICKET_PRIORITIES.includes(body.priority)) {
      return NextResponse.json({ message: "Invalid priority" }, { status: 400 });
    }
    if (
      body.assignedAdminId !== undefined &&
      body.assignedAdminId !== null &&
      (!Number.isInteger(body.assignedAdminId) || body.assignedAdminId < 1)
    ) {
      return NextResponse.json(
        { message: "Invalid assignedAdminId" },
        { status: 400 },
      );
    }
    let safeResolutionNote: string | null | undefined;
    if (body.resolutionNote === null) {
      safeResolutionNote = null;
    } else if (typeof body.resolutionNote === "string") {
      const trimmed = filterXSS(body.resolutionNote).trim();
      if (trimmed.length > RESOLUTION_NOTE_MAX) {
        return NextResponse.json(
          { message: `resolutionNote must be ≤${RESOLUTION_NOTE_MAX} chars` },
          { status: 400 },
        );
      }
      safeResolutionNote = trimmed.length > 0 ? trimmed : null;
    }

    const ticket = await prisma.ticket.findUnique({
      where: { id },
      select: { id: true, status: true, subject: true, reporterId: true },
    });
    if (!ticket) {
      return NextResponse.json({ message: "Ticket not found" }, { status: 404 });
    }

    if (body.assignedAdminId) {
      const exists = await prisma.adminUser.findUnique({
        where: { id: body.assignedAdminId },
        select: { id: true },
      });
      if (!exists) {
        return NextResponse.json(
          { message: "Assigned admin not found" },
          { status: 404 },
        );
      }
    }

    const data: Record<string, unknown> = {};
    if (body.status) data.status = body.status;
    if (body.priority) data.priority = body.priority;
    if (body.assignedAdminId !== undefined)
      data.assignedAdminId = body.assignedAdminId;
    if (safeResolutionNote !== undefined)
      data.resolutionNote = safeResolutionNote;
    if (body.status === "RESOLVED") data.resolvedAt = new Date();
    if (body.status === "CLOSED") data.closedAt = new Date();

    const updated = await prisma.ticket.update({
      where: { id },
      data,
      select: {
        id: true,
        status: true,
        priority: true,
        assignedAdminId: true,
        resolutionNote: true,
        resolvedAt: true,
        closedAt: true,
      },
    });

    const userVisibleStatuses: TicketStatus[] = [
      "RESOLVED",
      "AWAITING_USER",
      "CLOSED",
    ];
    let webhookDelivered = true;
    if (
      body.status &&
      body.status !== ticket.status &&
      userVisibleStatuses.includes(body.status)
    ) {
      webhookDelivered = await triggerHook(
        logger,
        id,
        ticket.reporterId,
        ticket.subject,
        {
          newStatus: body.status,
          isResolved: body.status === "RESOLVED",
          bodyExcerpt: safeResolutionNote ?? undefined,
          statusChanged: true,
        },
      );
    }

    return NextResponse.json({ data: updated, webhookDelivered });
  } catch (error) {
    logger.error("Patch ticket failed", { error });
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 },
    );
  }
}

async function triggerHook(
  logger: AppLogger,
  ticketId: string,
  recipientUserId: number,
  ticketSubject: string,
  payload: {
    bodyExcerpt?: string;
    newStatus?: TicketStatus;
    isResolved?: boolean;
    statusChanged?: boolean;
  },
): Promise<boolean> {
  const url = process.env.BACKEND_INTERNAL_URL;
  const secret = process.env.ADMIN_HOOK_SECRET;
  if (!url || !secret) {
    logger.error(
      "Ticket webhook config missing; user notification skipped",
      { ticketId, missing: { url: !url, secret: !secret } },
    );
    return false;
  }

  try {
    const response = await fetch(
      `${url}/internal/tickets/${ticketId}/admin-reply-hook`,
      {
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
      },
    );
    if (!response.ok) {
      logger.error("Ticket webhook returned non-OK", {
        ticketId,
        status: response.status,
      });
      return false;
    }
    return true;
  } catch (err) {
    logger.error("Ticket webhook failed", { ticketId, error: err });
    return false;
  }
}
