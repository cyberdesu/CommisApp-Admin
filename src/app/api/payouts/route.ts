import { NextRequest, NextResponse } from "next/server";

import {
  ADMIN_PRIVATE_RESPONSE_HEADERS,
  normalizeAdminSearch,
  parsePositiveInt,
  tokenizeSearch,
} from "@/lib/admin-api";
import { getSessionAdmin } from "@/lib/auth/session";
import { createRequestLogger } from "@/lib/logger";
import prisma from "@/lib/prisma";
import { Prisma } from "@/prisma/generated/client";

const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 50;

const VALID_STATUSES = ["PENDING", "SENT", "FRAUD", "ALL"] as const;
type StatusFilter = (typeof VALID_STATUSES)[number];

function isValidStatus(value: string): value is StatusFilter {
  return (VALID_STATUSES as readonly string[]).includes(value);
}

export async function GET(req: NextRequest) {
  const logger = createRequestLogger(req, {
    route: "api.payouts.list",
  });

  try {
    const admin = await getSessionAdmin(req);
    if (!admin) {
      logger.warn("Rejected payouts list request due to missing admin session");
      return NextResponse.json(
        { message: "Unauthorized" },
        { status: 401, headers: ADMIN_PRIVATE_RESPONSE_HEADERS },
      );
    }

    const { searchParams } = new URL(req.url);
    const requestedLimit = parsePositiveInt(
      searchParams.get("limit"),
      DEFAULT_LIMIT,
    );
    const limit = Math.min(requestedLimit, MAX_LIMIT);
    const requestedPage = parsePositiveInt(searchParams.get("page"), 1);

    const statusRaw = (searchParams.get("status") || "PENDING")
      .trim()
      .toUpperCase();
    const status: StatusFilter = isValidStatus(statusRaw)
      ? statusRaw
      : "PENDING";

    const search = normalizeAdminSearch(searchParams.get("search"));
    const tokens = tokenizeSearch(search);
    const requestLogger = logger.child({
      adminId: admin.id,
      status,
      search: search || null,
      tokenCount: tokens.length,
      page: requestedPage,
      limit,
    });

    const statusFilter =
      status === "ALL" ? undefined : (status as "PENDING" | "SENT" | "FRAUD");

    const buildPayoutTokenClause = (
      token: string,
    ): Prisma.PayoutWhereInput => ({
      OR: [
        { paypalEmail: { contains: token, mode: "insensitive" } },
        {
          artist: {
            is: {
              OR: [
                { username: { contains: token, mode: "insensitive" } },
                { email: { contains: token, mode: "insensitive" } },
                { name: { contains: token, mode: "insensitive" } },
              ],
            },
          },
        },
      ],
    });

    const where: Prisma.PayoutWhereInput = {
      ...(statusFilter ? { status: statusFilter } : {}),
      ...(tokens.length > 0
        ? { AND: tokens.map(buildPayoutTokenClause) }
        : {}),
    };

    const total = await prisma.payout.count({ where });
    const totalPages = Math.max(1, Math.ceil(total / limit));
    const page = Math.min(requestedPage, totalPages);
    const skip = (page - 1) * limit;

    const payouts = await prisma.payout.findMany({
      where,
      take: limit,
      skip,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      include: {
        artist: {
          select: {
            id: true,
            username: true,
            email: true,
            name: true,
            avatar: true,
          },
        },
      },
    });

    requestLogger.info("Fetched payout list", {
      resultCount: payouts.length,
      page,
      totalPages,
      total,
    });

    const data = payouts.map((payout) => ({
      id: payout.id,
      artistId: payout.artistId,
      amount: payout.amount.toFixed(2),
      currency: payout.currency,
      status: payout.status,
      paypalEmail: payout.paypalEmail,
      reviewNote: payout.reviewNote,
      reviewedAt: payout.reviewedAt?.toISOString() ?? null,
      reviewedByAdminId: payout.reviewedByAdminId,
      createdAt: payout.createdAt.toISOString(),
      artist: {
        id: payout.artist.id,
        username: payout.artist.username,
        email: payout.artist.email,
        name: payout.artist.name,
        avatar: payout.artist.avatar,
      },
    }));

    return NextResponse.json({
      data,
      meta: {
        limit,
        page,
        total,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
      filters: { status, search },
    }, { headers: ADMIN_PRIVATE_RESPONSE_HEADERS });
  } catch (error) {
    logger.error("Failed to fetch payouts", {
      error,
    });
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500, headers: ADMIN_PRIVATE_RESPONSE_HEADERS },
    );
  }
}
