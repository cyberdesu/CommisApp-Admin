import { NextRequest, NextResponse } from "next/server";

import { getSessionAdmin } from "@/lib/auth/session";
import prisma from "@/lib/prisma";

const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 100;

type ShowcaseCursor = {
  createdAt: Date;
  id: string;
};

function parsePositiveInt(value: string | null, fallback: number) {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function encodeCursor(cursor: ShowcaseCursor) {
  return Buffer.from(
    JSON.stringify({
      createdAt: cursor.createdAt.toISOString(),
      id: cursor.id,
    }),
  ).toString("base64url");
}

function parseCursor(value: string | null): ShowcaseCursor | null {
  if (!value) return null;

  try {
    const raw = Buffer.from(value, "base64url").toString("utf8");
    const parsed = JSON.parse(raw) as { createdAt?: string; id?: string };
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

export async function GET(req: NextRequest) {
  try {
    const admin = await getSessionAdmin(req);
    if (!admin) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const requestedLimit = parsePositiveInt(
      searchParams.get("limit"),
      DEFAULT_LIMIT,
    );
    const limit = Math.min(requestedLimit, MAX_LIMIT);
    const search = (searchParams.get("search") || "").trim();
    const summaryOnly = searchParams.get("summary") === "1";
    const cursorRaw = searchParams.get("cursor");
    const cursor = parseCursor(cursorRaw);

    const baseWhere = search
      ? { title: { contains: search, mode: "insensitive" as const } }
      : {};

    if (summaryOnly) {
      const total = await prisma.showcaseItem.count({ where: baseWhere });
      return NextResponse.json({
        data: [],
        meta: {
          total,
          page: 1,
          limit: 0,
          totalPages: 1,
        },
      });
    }

    const where = cursor
      ? {
          AND: [
            baseWhere,
            {
              OR: [
                { createdAt: { lt: cursor.createdAt } },
                {
                  AND: [
                    { createdAt: cursor.createdAt },
                    { id: { lt: cursor.id } },
                  ],
                },
              ],
            },
          ],
        }
      : baseWhere;

    const rows = await prisma.showcaseItem.findMany({
      where,
      take: limit + 1,
      orderBy: [
        { createdAt: "desc" },
        { id: "desc" },
      ],
      select: {
        id: true,
        title: true,
        isDraft: true,
        isFromVerifiedCommission: true,
        likeCount: true,
        viewCount: true,
        createdAt: true,
        showcase: {
          select: {
            isVerified: true,
            user: {
              select: {
                id: true,
                username: true,
                email: true,
              },
            },
          },
        },
        tags: {
          select: {
            nameTag: true,
          },
        },
      },
    });

    const hasNextPage = rows.length > limit;
    const slice = hasNextPage ? rows.slice(0, limit) : rows;
    const lastItem = slice[slice.length - 1];
    const nextCursor = hasNextPage && lastItem
      ? encodeCursor({
          createdAt: lastItem.createdAt,
          id: lastItem.id,
        })
      : null;

    return NextResponse.json({
      data: slice,
      meta: {
        limit,
        hasNextPage,
        nextCursor,
        cursor: cursorRaw,
      },
    });
  } catch (error) {
    console.error("Fetch showcases error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 },
    );
  }
}
