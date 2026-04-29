import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@/prisma/generated/client";
import prisma from "@/lib/prisma";
import { getSessionAdmin } from "@/lib/auth/session";

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

const REFUND_STATUSES = [
  "REQUESTED",
  "APPROVED_BY_ARTIST",
  "DENIED_BY_ARTIST",
  "ESCALATED",
  "APPROVED_BY_ADMIN",
  "DENIED_BY_ADMIN",
  "REFUNDED",
  "WITHDRAWN",
  "FAILED",
] as const;

type RefundStatusFilter = (typeof REFUND_STATUSES)[number];

function parsePositiveInt(value: string | null, fallback: number) {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function parseEnum<T extends string>(
  value: string | null,
  allowed: readonly T[],
): T | undefined {
  if (!value || value === "all") return undefined;
  return allowed.includes(value as T) ? (value as T) : undefined;
}

export async function GET(req: NextRequest) {
  try {
    const admin = await getSessionAdmin(req);
    if (!admin) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const page = parsePositiveInt(searchParams.get("page"), DEFAULT_PAGE);
    const requestedLimit = parsePositiveInt(
      searchParams.get("limit"),
      DEFAULT_LIMIT,
    );
    const limit = Math.min(requestedLimit, MAX_LIMIT);
    const skip = (page - 1) * limit;

    const status = parseEnum<RefundStatusFilter>(
      searchParams.get("status"),
      REFUND_STATUSES,
    );
    const search = (searchParams.get("search") || "").trim();
    const onlyEscalated = searchParams.get("onlyEscalated") === "true";

    const where: Prisma.RefundRequestWhereInput = {
      ...(status ? { status } : {}),
      ...(onlyEscalated
        ? { status: { in: ["ESCALATED", "FAILED"] } }
        : {}),
      ...(search
        ? {
            OR: [
              { id: { contains: search, mode: "insensitive" } },
              { orderId: { contains: search, mode: "insensitive" } },
              { reason: { contains: search, mode: "insensitive" } },
              {
                client: {
                  OR: [
                    { username: { contains: search, mode: "insensitive" } },
                    { email: { contains: search, mode: "insensitive" } },
                  ],
                },
              },
              {
                artist: {
                  OR: [
                    { username: { contains: search, mode: "insensitive" } },
                    { email: { contains: search, mode: "insensitive" } },
                  ],
                },
              },
            ],
          }
        : {}),
    };

    const [rows, total, statusCounts] = await Promise.all([
      prisma.refundRequest.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          orderId: true,
          status: true,
          amount: true,
          currency: true,
          reason: true,
          artistResponse: true,
          adminNote: true,
          ticketId: true,
          resolvedAt: true,
          resolvedByRole: true,
          paypalRefundId: true,
          refundedAt: true,
          failureReason: true,
          createdAt: true,
          updatedAt: true,
          client: {
            select: { id: true, username: true, name: true, email: true },
          },
          artist: {
            select: { id: true, username: true, name: true, email: true },
          },
          order: {
            select: {
              id: true,
              titleSnapshot: true,
              status: true,
              priceSnapshot: true,
              currency: true,
            },
          },
        },
      }),
      prisma.refundRequest.count({ where }),
      prisma.refundRequest.groupBy({
        by: ["status"],
        _count: { status: true },
      }),
    ]);

    const totalPages = Math.ceil(total / limit) || 1;

    return NextResponse.json({
      data: rows,
      meta: {
        total,
        page,
        limit,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
      filters: {
        status: status ?? "all",
        search,
        onlyEscalated,
      },
      stats: {
        statuses: statusCounts.map((row) => ({
          status: row.status,
          count: row._count.status,
        })),
      },
    });
  } catch (error) {
    console.error("Fetch refunds error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 },
    );
  }
}
