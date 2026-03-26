import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@/prisma/generated/client";

import { getSessionAdmin } from "@/lib/auth/session";
import { minio, MINIO_BUCKET_NAME } from "@/lib/minio";
import prisma from "@/lib/prisma";

const DEFAULT_LIMIT = 30;
const MAX_LIMIT = 100;

type RouteContext = {
  params: Promise<{ id: string }>;
};

type MessagesCursor = {
  createdAt: Date;
  id: string;
};

function parsePositiveInt(value: string | null, fallback: number) {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function encodeCursor(cursor: MessagesCursor) {
  return Buffer.from(
    JSON.stringify({
      createdAt: cursor.createdAt.toISOString(),
      id: cursor.id,
    }),
  ).toString("base64url");
}

function parseCursor(value: string | null): MessagesCursor | null {
  if (!value) return null;

  try {
    const decoded = Buffer.from(value, "base64url").toString("utf8");
    const parsed = JSON.parse(decoded) as { createdAt?: string; id?: string };

    if (!parsed?.createdAt || !parsed?.id) return null;

    const createdAt = new Date(parsed.createdAt);
    if (Number.isNaN(createdAt.getTime())) return null;

    return {
      createdAt,
      id: parsed.id,
    };
  } catch {
    return null;
  }
}

function parseConversationId(raw: string) {
  const id = raw.trim();
  if (!id) return null;
  return id;
}

function parseIncludeDeleted(value: string | null) {
  if (!value) return false;
  const normalized = value.trim().toLowerCase();
  return normalized === "1" || normalized === "true";
}

async function resolveMediaMap(paths: Array<string | null | undefined>) {
  const unique = [...new Set(paths.filter((value): value is string => Boolean(value?.trim())))];

  if (unique.length === 0) {
    return new Map<string, string | null>();
  }

  const entries = await Promise.all(
    unique.map(async (path) => [path, await minio.getFile(path, MINIO_BUCKET_NAME)] as const),
  );

  return new Map(entries);
}

export async function GET(req: NextRequest, context: RouteContext) {
  try {
    const admin = await getSessionAdmin(req);
    if (!admin) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { id: rawConversationId } = await context.params;
    const conversationId = parseConversationId(rawConversationId);

    if (!conversationId) {
      return NextResponse.json({ message: "Invalid conversation id" }, { status: 400 });
    }

    const { searchParams } = new URL(req.url);
    const requestedLimit = parsePositiveInt(searchParams.get("limit"), DEFAULT_LIMIT);
    const limit = Math.min(requestedLimit, MAX_LIMIT);
    const cursorRaw = searchParams.get("cursor");
    const cursor = parseCursor(cursorRaw);
    const includeDeleted = parseIncludeDeleted(searchParams.get("includeDeleted"));

    const conversationWhere = { id: conversationId };

    const messagesFilters: Prisma.MessageWhereInput[] = [
      { conversationId },
      ...(includeDeleted ? [] : [{ isDeleted: false }]),
    ];

    if (cursor) {
      messagesFilters.push({
        OR: [
          { createdAt: { lt: cursor.createdAt } },
          {
            AND: [{ createdAt: cursor.createdAt }, { id: { lt: cursor.id } }],
          },
        ],
      });
    }

    const [conversation, rows] = await Promise.all([
      prisma.conversation.findUnique({
        where: conversationWhere,
        select: {
          id: true,
          type: true,
          name: true,
          createdAt: true,
          updatedAt: true,
          participants: {
            where: { leftAt: null },
            orderBy: { joinedAt: "asc" },
            select: {
              id: true,
              joinedAt: true,
              user: {
                select: {
                  id: true,
                  username: true,
                  name: true,
                  email: true,
                  avatar: true,
                  isBanned: true,
                  suspendedUntil: true,
                },
              },
            },
          },
          _count: {
            select: {
              messages: true,
              participants: true,
            },
          },
        },
      }),
      prisma.message.findMany({
        where: { AND: messagesFilters },
        take: limit + 1,
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        select: {
          id: true,
          conversationId: true,
          senderId: true,
          type: true,
          content: true,
          fileUrl: true,
          fileName: true,
          isDeleted: true,
          createdAt: true,
          updatedAt: true,
          sender: {
            select: {
              id: true,
              username: true,
              name: true,
              avatar: true,
            },
          },
        },
      }),
    ]);

    if (!conversation) {
      return NextResponse.json({ message: "Conversation not found" }, { status: 404 });
    }

    const hasNextPage = rows.length > limit;
    const slice = hasNextPage ? rows.slice(0, limit) : rows;

    const mediaMap = await resolveMediaMap([
      ...conversation.participants.map((participant) => participant.user.avatar),
      ...slice.map((message) => message.fileUrl),
      ...slice.map((message) => message.sender?.avatar),
    ]);

    const data = {
      conversation: {
        id: conversation.id,
        type: conversation.type,
        name: conversation.name,
        createdAt: conversation.createdAt,
        updatedAt: conversation.updatedAt,
        participantCount: conversation._count.participants,
        messageCount: conversation._count.messages,
        participants: conversation.participants.map((participant) => ({
          id: participant.id,
          joinedAt: participant.joinedAt,
          user: {
            id: participant.user.id,
            username: participant.user.username,
            name: participant.user.name,
            email: participant.user.email,
            avatar:
              participant.user.avatar && mediaMap.has(participant.user.avatar)
                ? mediaMap.get(participant.user.avatar)
                : participant.user.avatar,
            isBanned: participant.user.isBanned,
            suspendedUntil: participant.user.suspendedUntil,
          },
        })),
      },
      items: slice.map((message) => ({
        id: message.id,
        conversationId: message.conversationId,
        senderId: message.senderId,
        type: message.type,
        content: message.content,
        fileUrl:
          message.fileUrl && mediaMap.has(message.fileUrl)
            ? mediaMap.get(message.fileUrl)
            : message.fileUrl,
        fileName: message.fileName,
        isDeleted: message.isDeleted,
        createdAt: message.createdAt,
        updatedAt: message.updatedAt,
        sender: message.sender
          ? {
              id: message.sender.id,
              username: message.sender.username,
              name: message.sender.name,
              avatar:
                message.sender.avatar && mediaMap.has(message.sender.avatar)
                  ? mediaMap.get(message.sender.avatar)
                  : message.sender.avatar,
            }
          : null,
      })),
    };

    const last = slice[slice.length - 1];
    const nextCursor =
      hasNextPage && last
        ? encodeCursor({
            createdAt: last.createdAt,
            id: last.id,
          })
        : null;

    return NextResponse.json({
      data,
      meta: {
        limit,
        hasNextPage,
        nextCursor,
        cursor: cursorRaw,
        includeDeleted,
      },
    });
  } catch (error) {
    console.error("Fetch messages error:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
