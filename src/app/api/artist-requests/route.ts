import { NextRequest, NextResponse } from "next/server";

import { getSessionAdmin } from "@/lib/auth/session";
import {
  ArtistRequestStatus,
  isArtistRequestStatus,
} from "@/lib/artist-verification";
import { createRequestLogger } from "@/lib/logger";
import prisma from "@/lib/prisma";
import { Prisma } from "@/prisma/generated/client";
import { sanitizeImageSource } from "@/lib/security/url-safety";

type ArtistRequestItem = {
  id: number;
  userId: number;
  status: ArtistRequestStatus;
  requestedAt: Date;
  reviewedAt: Date | null;
  reviewReason: string | null;
  reviewedByAdminId: number | null;
  username: string;
  email: string;
  name: string | null;
  role: string;
  verified: boolean;
  verifiedArtists: boolean;
  avatar: string | null;
  banner: string | null;
  country: string | null;
  createdAt: Date;
};

const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 50;

function parsePositiveInt(value: string | null, fallback: number) {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function parseCursor(value: string | null) {
  if (!value) return null;

  try {
    const parsed = BigInt(value);
    return parsed > BigInt(0) ? parsed : null;
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest) {
  const logger = createRequestLogger(req, {
    route: "api.artist-requests.list",
  });

  try {
    const admin = await getSessionAdmin(req);
    if (!admin) {
      logger.warn("Rejected artist requests list due to missing admin session");
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const requestedLimit = parsePositiveInt(
      searchParams.get("limit"),
      DEFAULT_LIMIT,
    );
    const limit = Math.min(requestedLimit, MAX_LIMIT);
    const cursor = parseCursor(searchParams.get("cursor"));

    const statusRaw = (searchParams.get("status") || "PENDING")
      .trim()
      .toUpperCase();
    const status = statusRaw === "ALL" || isArtistRequestStatus(statusRaw)
      ? statusRaw
      : "PENDING";

    const search = (searchParams.get("search") || "").trim();
    const summaryOnly = searchParams.get("summary") === "1";
    const requestLogger = logger.child({
      adminId: admin.id,
      status,
      limit,
      hasCursor: Boolean(cursor),
      hasSearch: Boolean(search),
      searchLength: search.length,
      summaryOnly,
    });

    const statusFilter: ArtistRequestStatus | undefined = status === "ALL"
      ? undefined
      : status;
    const userSearchFilters: Prisma.UserWhereInput[] = search
      ? [
          { username: { contains: search, mode: "insensitive" } },
          { email: { contains: search, mode: "insensitive" } },
          { name: { contains: search, mode: "insensitive" } },
        ]
      : [];

    const where: Prisma.ArtistVerificationRequestWhereInput = {
      ...(statusFilter
        ? { status: statusFilter }
        : {}),
      ...(search
        ? {
            user: {
              is: {
                OR: userSearchFilters,
              },
            },
          }
        : {}),
    };

    if (summaryOnly) {
      const total = await prisma.artistVerificationRequest.count({ where });
      requestLogger.info("Fetched artist request summary", { total });

      return NextResponse.json({
        data: [],
        meta: {
          total,
          page: 1,
          limit: 0,
          totalPages: 1,
        },
        filters: {
          status,
          search,
        },
      });
    }

    const requests = await prisma.artistVerificationRequest.findMany({
      where,
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      orderBy: { id: "desc" },
      include: {
        user: {
          select: {
            username: true,
            email: true,
            name: true,
            role: true,
            verified: true,
            verifiedArtists: true,
            avatar: true,
            banner: true,
            country: true,
            createdAt: true,
          },
        },
      },
    });

    const hasNextPage = requests.length > limit;
    const slice = hasNextPage ? requests.slice(0, limit) : requests;
    const nextCursor = hasNextPage
      ? String(slice[slice.length - 1]?.id ?? "")
      : null;

    const data: ArtistRequestItem[] = slice.map((request) => ({
      id: Number(request.id),
      userId: request.userId,
      status: request.status,
      requestedAt: request.requestedAt,
      reviewedAt: request.reviewedAt,
      reviewReason: request.reviewReason,
      reviewedByAdminId: request.reviewedByAdminId,
      username: request.user.username,
      email: request.user.email,
      name: request.user.name,
      role: request.user.role,
      verified: request.user.verified,
      verifiedArtists: request.user.verifiedArtists,
      avatar: sanitizeImageSource(request.user.avatar),
      banner: sanitizeImageSource(request.user.banner),
      country: request.user.country,
      createdAt: request.user.createdAt,
    }));

    requestLogger.info("Fetched artist requests list", {
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
        cursor: cursor ? String(cursor) : null,
      },
      filters: {
        status,
        search,
      },
    });
  } catch (error) {
    logger.error("Failed to fetch artist requests", { error });
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 },
    );
  }
}
