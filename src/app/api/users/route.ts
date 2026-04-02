import { NextRequest, NextResponse } from "next/server";

import { getSessionAdmin } from "@/lib/auth/session";
import { createRequestLogger } from "@/lib/logger";
import { minio, MINIO_BUCKET_NAME } from "@/lib/minio";
import prisma from "@/lib/prisma";
import { getUserFinanceSummaries } from "@/lib/user-finance";

const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 100;

function parsePositiveInt(value: string | null, fallback: number) {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function parseBooleanFilter(value: string | null) {
  if (!value || value === "all") return undefined;
  if (value === "true") return true;
  if (value === "false") return false;
  return undefined;
}

function parseCursor(value: string | null) {
  if (!value) return null;

  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return null;

  return parsed;
}

export async function GET(req: NextRequest) {
  const logger = createRequestLogger(req, {
    route: "api.users.list",
  });

  try {
    const admin = await getSessionAdmin(req);
    if (!admin) {
      logger.warn("Rejected users list due to missing admin session");
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const requestedLimit = parsePositiveInt(
      searchParams.get("limit"),
      DEFAULT_LIMIT,
    );
    const limit = Math.min(requestedLimit, MAX_LIMIT);
    const cursor = parseCursor(searchParams.get("cursor"));

    const search = (searchParams.get("search") || "").trim();
    const role = (searchParams.get("role") || "").trim();
    const verified = parseBooleanFilter(searchParams.get("verified"));
    const verifiedArtists = parseBooleanFilter(
      searchParams.get("verifiedArtists"),
    );
    const hasAvatar = parseBooleanFilter(searchParams.get("hasAvatar"));
    const requestLogger = logger.child({
      adminId: admin.id,
      limit,
      hasCursor: Boolean(cursor),
      hasSearch: Boolean(search),
      searchLength: search.length,
      role: role || "all",
      verified: verified ?? "all",
      verifiedArtists: verifiedArtists ?? "all",
      hasAvatar: hasAvatar ?? "all",
    });

    const whereClause = {
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: "insensitive" as const } },
              { email: { contains: search, mode: "insensitive" as const } },
              { username: { contains: search, mode: "insensitive" as const } },
            ],
          }
        : {}),
      ...(role && role !== "all" ? { role } : {}),
      ...(verified !== undefined ? { verified } : {}),
      ...(verifiedArtists !== undefined ? { verifiedArtists } : {}),
      ...(hasAvatar !== undefined
        ? hasAvatar
          ? { avatar: { not: null } }
          : { OR: [{ avatar: null }, { avatar: "" }] }
        : {}),
    };

    const rows = await prisma.user.findMany({
      where: whereClause,
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      orderBy: { id: "desc" },
      select: {
        id: true,
        email: true,
        name: true,
        username: true,
        role: true,
        verified: true,
        verifiedArtists: true,
        isBanned: true,
        suspendedUntil: true,
        banReason: true,
        avatar: true,
        bio: true,
        country: true,
        createdAt: true,
      },
    });

    const hasNextPage = rows.length > limit;
    const slice = hasNextPage ? rows.slice(0, limit) : rows;

    const [data, financeByUserId] = await Promise.all([
      minio.enrichUsersMedia(slice, MINIO_BUCKET_NAME),
      getUserFinanceSummaries(slice.map((user) => user.id)),
    ]);

    const nextCursor = hasNextPage
      ? String(slice[slice.length - 1]?.id ?? "")
      : null;

    requestLogger.info("Fetched users list", {
      resultCount: data.length,
      hasNextPage,
      nextCursor,
    });

    return NextResponse.json({
      data: data.map((user) => ({
        ...user,
        finance: financeByUserId.get(user.id),
      })),
      meta: {
        limit,
        hasNextPage,
        nextCursor,
        cursor: cursor ? String(cursor) : null,
      },
      filters: {
        search,
        role: role || "all",
        verified: verified ?? "all",
        verifiedArtists: verifiedArtists ?? "all",
        hasAvatar: hasAvatar ?? "all",
      },
    });
  } catch (error) {
    logger.error("Failed to fetch users", { error });
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 },
    );
  }
}
