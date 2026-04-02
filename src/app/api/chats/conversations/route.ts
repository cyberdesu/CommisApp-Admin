import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@/prisma/generated/client";

import { getSessionAdmin } from "@/lib/auth/session";
import { createRequestLogger } from "@/lib/logger";
import { minio, MINIO_BUCKET_NAME } from "@/lib/minio";
import prisma from "@/lib/prisma";

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;
const MAX_SEARCH_LENGTH = 100;

type ConversationsCursor = {
  updatedAt: Date;
  id: string;
};

type ConversationTypeFilter = "ALL" | "DIRECT" | "GROUP" | "ORDER";

function parsePositiveInt(value: string | null, fallback: number) {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function encodeCursor(cursor: ConversationsCursor) {
  return Buffer.from(
    JSON.stringify({
      updatedAt: cursor.updatedAt.toISOString(),
      id: cursor.id,
    }),
  ).toString("base64url");
}

function parseCursor(value: string | null): ConversationsCursor | null {
  if (!value) return null;

  try {
    const decoded = Buffer.from(value, "base64url").toString("utf8");
    const parsed = JSON.parse(decoded) as { updatedAt?: string; id?: string };

    if (!parsed?.updatedAt || !parsed?.id) return null;

    const updatedAt = new Date(parsed.updatedAt);
    if (Number.isNaN(updatedAt.getTime())) return null;

    return {
      updatedAt,
      id: parsed.id,
    };
  } catch {
    return null;
  }
}

function parseConversationType(value: string | null): ConversationTypeFilter {
  if (!value) return "ALL";
  const normalized = value.trim().toUpperCase();
  if (
    normalized === "DIRECT" ||
    normalized === "GROUP" ||
    normalized === "ORDER"
  ) {
    return normalized;
  }
  return "ALL";
}

function normalizeSearch(value: string | null) {
  return (value ?? "").trim().slice(0, MAX_SEARCH_LENGTH);
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

export async function GET(req: NextRequest) {
  const logger = createRequestLogger(req, {
    route: "api.chats.conversations.list",
  });

  try {
    const admin = await getSessionAdmin(req);
    if (!admin) {
      logger.warn("Rejected conversations list due to missing admin session");
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const requestedLimit = parsePositiveInt(searchParams.get("limit"), DEFAULT_LIMIT);
    const limit = Math.min(requestedLimit, MAX_LIMIT);
    const cursorRaw = searchParams.get("cursor");
    const cursor = parseCursor(cursorRaw);
    const search = normalizeSearch(searchParams.get("search"));
    const type = parseConversationType(searchParams.get("type"));
    const requestLogger = logger.child({
      adminId: admin.id,
      type,
      limit,
      hasCursor: Boolean(cursor),
      hasSearch: Boolean(search),
      searchLength: search.length,
    });

    const filters: Prisma.ConversationWhereInput[] = [];

    if (type !== "ALL") {
      filters.push({ type });
    }

    if (search) {
      filters.push({
        participants: {
          some: {
            user: {
              OR: [
                { username: { contains: search, mode: "insensitive" } },
                { email: { contains: search, mode: "insensitive" } },
                { name: { contains: search, mode: "insensitive" } },
              ],
            },
          },
        },
      });
    }

    if (cursor) {
      filters.push({
        OR: [
          { updatedAt: { lt: cursor.updatedAt } },
          {
            AND: [{ updatedAt: cursor.updatedAt }, { id: { lt: cursor.id } }],
          },
        ],
      });
    }

    const where: Prisma.ConversationWhereInput =
      filters.length > 0 ? { AND: filters } : {};

    const rows = await prisma.conversation.findMany({
      where,
      take: limit + 1,
      orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
      select: {
        id: true,
        type: true,
        name: true,
        createdAt: true,
        updatedAt: true,
        participants: {
          where: { leftAt: null },
          take: 4,
          orderBy: { joinedAt: "asc" },
          select: {
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
        messages: {
          take: 1,
          orderBy: [{ createdAt: "desc" }, { id: "desc" }],
          select: {
            id: true,
            type: true,
            content: true,
            fileUrl: true,
            isDeleted: true,
            createdAt: true,
            senderId: true,
            sender: {
              select: {
                id: true,
                username: true,
                name: true,
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
    });

    const hasNextPage = rows.length > limit;
    const slice = hasNextPage ? rows.slice(0, limit) : rows;

    const mediaMap = await resolveMediaMap([
      ...slice.flatMap((row) => row.participants.map((participant) => participant.user.avatar)),
      ...slice.flatMap((row) => row.messages.map((message) => message.fileUrl)),
    ]);

    const data = slice.map((row) => {
      const latestMessage = row.messages[0] ?? null;

      return {
        id: row.id,
        type: row.type,
        name: row.name,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
        participantCount: row._count.participants,
        messageCount: row._count.messages,
        participantsPreview: row.participants.map((participant) => ({
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
        })),
        latestMessage: latestMessage
          ? {
              id: latestMessage.id,
              type: latestMessage.type,
              content: latestMessage.content,
              fileUrl:
                latestMessage.fileUrl && mediaMap.has(latestMessage.fileUrl)
                  ? mediaMap.get(latestMessage.fileUrl)
                  : latestMessage.fileUrl,
              isDeleted: latestMessage.isDeleted,
              createdAt: latestMessage.createdAt,
              senderId: latestMessage.senderId,
              sender: latestMessage.sender
                ? {
                    id: latestMessage.sender.id,
                    username: latestMessage.sender.username,
                    name: latestMessage.sender.name,
                  }
                : null,
            }
          : null,
      };
    });

    const last = slice[slice.length - 1];
    const nextCursor =
      hasNextPage && last
        ? encodeCursor({
            updatedAt: last.updatedAt,
            id: last.id,
          })
        : null;

    requestLogger.info("Fetched conversations list", {
      resultCount: data.length,
      hasNextPage,
      nextCursor,
    });

    return NextResponse.json({
      data,
      meta: {
        limit,
        hasNextPage,
        nextCursor,
        cursor: cursorRaw,
      },
      filters: {
        search,
        type,
      },
    });
  } catch (error) {
    logger.error("Failed to fetch conversations", { error });
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
