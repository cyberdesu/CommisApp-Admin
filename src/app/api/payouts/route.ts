import { NextRequest, NextResponse } from "next/server";

import { getSessionAdmin } from "@/lib/auth/session";
import prisma from "@/lib/prisma";
import { Prisma } from "@/prisma/generated/client";

const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 50;

const VALID_STATUSES = ["PENDING", "SENT", "FRAUD", "ALL"] as const;
type StatusFilter = (typeof VALID_STATUSES)[number];

function parsePositiveInt(value: string | null, fallback: number) {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function isValidStatus(value: string): value is StatusFilter {
  return (VALID_STATUSES as readonly string[]).includes(value);
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
    const cursor = searchParams.get("cursor") || null;

    const statusRaw = (searchParams.get("status") || "PENDING")
      .trim()
      .toUpperCase();
    const status: StatusFilter = isValidStatus(statusRaw)
      ? statusRaw
      : "PENDING";

    const search = (searchParams.get("search") || "").trim();
    const summaryOnly = searchParams.get("summary") === "1";

    const statusFilter =
      status === "ALL" ? undefined : (status as "PENDING" | "SENT" | "FRAUD");

    const userSearchFilters: Prisma.UserWhereInput[] = search
      ? [
          { username: { contains: search, mode: "insensitive" } },
          { email: { contains: search, mode: "insensitive" } },
          { name: { contains: search, mode: "insensitive" } },
        ]
      : [];

    const where: Prisma.PayoutWhereInput = {
      ...(statusFilter ? { status: statusFilter } : {}),
      ...(search
        ? {
            artist: {
              is: {
                OR: userSearchFilters,
              },
            },
          }
        : {}),
    };

    if (summaryOnly) {
      const total = await prisma.payout.count({ where });

      return NextResponse.json({
        data: [],
        meta: { total },
        filters: { status, search },
      });
    }

    const payouts = await prisma.payout.findMany({
      where,
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      orderBy: { createdAt: "desc" },
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

    const hasNextPage = payouts.length > limit;
    const slice = hasNextPage ? payouts.slice(0, limit) : payouts;
    const nextCursor = hasNextPage
      ? slice[slice.length - 1]?.id ?? null
      : null;

    const data = slice.map((payout) => ({
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
        hasNextPage,
        nextCursor,
        cursor,
      },
      filters: { status, search },
    });
  } catch (error) {
    console.error("Fetch payouts error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 },
    );
  }
}
