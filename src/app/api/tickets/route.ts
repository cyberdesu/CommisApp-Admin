import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@/prisma/generated/client";
import prisma from "@/lib/prisma";
import { getSessionAdmin } from "@/lib/auth/session";

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

const TICKET_TYPES = ["SUPPORT", "USER_REPORT", "CONTENT_REPORT", "ORDER_DISPUTE"] as const;
const TICKET_STATUSES = ["OPEN", "IN_PROGRESS", "AWAITING_USER", "RESOLVED", "CLOSED"] as const;
const TICKET_PRIORITIES = ["LOW", "NORMAL", "HIGH", "URGENT"] as const;

type TicketTypeFilter = (typeof TICKET_TYPES)[number];
type TicketStatusFilter = (typeof TICKET_STATUSES)[number];
type TicketPriorityFilter = (typeof TICKET_PRIORITIES)[number];

type SortField = "createdAt" | "updatedAt" | "lastReplyAt";
type SortOrder = "asc" | "desc";

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

function parseSortField(value: string | null): SortField {
  const allowed: SortField[] = ["createdAt", "updatedAt", "lastReplyAt"];
  return allowed.includes(value as SortField) ? (value as SortField) : "createdAt";
}

function parseSortOrder(value: string | null): SortOrder {
  return value === "asc" ? "asc" : "desc";
}

export async function GET(req: NextRequest) {
  try {
    const admin = await getSessionAdmin(req);
    if (!admin) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const page = parsePositiveInt(searchParams.get("page"), DEFAULT_PAGE);
    const requestedLimit = parsePositiveInt(searchParams.get("limit"), DEFAULT_LIMIT);
    const limit = Math.min(requestedLimit, MAX_LIMIT);
    const skip = (page - 1) * limit;

    const search = (searchParams.get("search") || "").trim();
    const type = parseEnum<TicketTypeFilter>(searchParams.get("type"), TICKET_TYPES);
    const status = parseEnum<TicketStatusFilter>(searchParams.get("status"), TICKET_STATUSES);
    const priority = parseEnum<TicketPriorityFilter>(
      searchParams.get("priority"),
      TICKET_PRIORITIES,
    );
    const assignedToMeRaw = searchParams.get("assignedToMe");
    const assignedToMe = assignedToMeRaw === "true";

    const sortBy = parseSortField(searchParams.get("sortBy"));
    const sortOrder = parseSortOrder(searchParams.get("sortOrder"));

    const where: Prisma.TicketWhereInput = {
      ...(type ? { type } : {}),
      ...(status ? { status } : {}),
      ...(priority ? { priority } : {}),
      ...(assignedToMe ? { assignedAdminId: admin.id } : {}),
      ...(search
        ? {
            OR: [
              { subject: { contains: search, mode: "insensitive" } },
              {
                reporter: {
                  OR: [
                    { username: { contains: search, mode: "insensitive" } },
                    { email: { contains: search, mode: "insensitive" } },
                    { name: { contains: search, mode: "insensitive" } },
                  ],
                },
              },
            ],
          }
        : {}),
    };

    const [rows, total, statusCounts] = await Promise.all([
      prisma.ticket.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        select: {
          id: true,
          type: true,
          subject: true,
          status: true,
          priority: true,
          category: true,
          createdAt: true,
          updatedAt: true,
          lastReplyAt: true,
          resolvedAt: true,
          closedAt: true,
          assignedAdminId: true,
          reporter: {
            select: { id: true, username: true, name: true, email: true },
          },
          assignedAdmin: {
            select: { id: true, name: true, email: true },
          },
          _count: { select: { messages: true } },
        },
      }),
      prisma.ticket.count({ where }),
      prisma.ticket.groupBy({
        by: ["status"],
        where,
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
        search,
        type: type ?? "all",
        status: status ?? "all",
        priority: priority ?? "all",
        assignedToMe,
        sortBy,
        sortOrder,
      },
      stats: {
        total,
        statuses: statusCounts.map((row) => ({
          status: row.status,
          count: row._count.status,
        })),
      },
    });
  } catch (error) {
    console.error("Fetch tickets error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 },
    );
  }
}
