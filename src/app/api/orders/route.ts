import { NextRequest, NextResponse } from "next/server";

import {
  ADMIN_PRIVATE_RESPONSE_HEADERS,
  normalizeAdminSearch,
  parsePositiveInt,
} from "@/lib/admin-api";
import { getSessionAdmin } from "@/lib/auth/session";
import { createRequestLogger } from "@/lib/logger";
import { getAdminOrdersList } from "@/lib/user-orders";

const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 50;

const VALID_STATUSES = [
  "ALL",
  "PENDING",
  "ACCEPTED",
  "IN_PROGRESS",
  "WAITING_FOR_CLIENT",
  "DELIVERED",
  "COMPLETED",
  "CANCELLED",
  "REJECTED",
] as const;
const VALID_SOURCES = ["ALL", "SERVICE", "CUSTOM_REQUEST"] as const;
const VALID_ATTENTION = ["ALL", "FLAGGED", "CLEAN"] as const;

type StatusFilter = (typeof VALID_STATUSES)[number];
type SourceFilter = (typeof VALID_SOURCES)[number];
type AttentionFilter = (typeof VALID_ATTENTION)[number];

function parseOptionalUserId(value: string | null) {
  if (!value) return null;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function isOneOf<T extends readonly string[]>(
  value: string,
  allowed: T,
): value is T[number] {
  return (allowed as readonly string[]).includes(value);
}

export async function GET(req: NextRequest) {
  const logger = createRequestLogger(req, {
    route: "api.orders.list",
  });

  try {
    const admin = await getSessionAdmin(req);
    if (!admin) {
      logger.warn("Rejected orders list request due to missing admin session");
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
    const cursor = searchParams.get("cursor") || null;
    const search = normalizeAdminSearch(searchParams.get("search"));
    const userId = parseOptionalUserId(searchParams.get("userId"));

    const statusRaw = (searchParams.get("status") || "ALL")
      .trim()
      .toUpperCase();
    const status: StatusFilter = isOneOf(statusRaw, VALID_STATUSES)
      ? statusRaw
      : "ALL";

    const sourceRaw = (searchParams.get("source") || "ALL")
      .trim()
      .toUpperCase();
    const source: SourceFilter = isOneOf(sourceRaw, VALID_SOURCES)
      ? sourceRaw
      : "ALL";

    const attentionRaw = (searchParams.get("attention") || "ALL")
      .trim()
      .toUpperCase();
    const attention: AttentionFilter = isOneOf(
      attentionRaw,
      VALID_ATTENTION,
    )
      ? attentionRaw
      : "ALL";

    const requestLogger = logger.child({
      adminId: admin.id,
      limit,
      cursor,
      status,
      source,
      attention,
      userId,
      hasSearch: Boolean(search),
      searchLength: search.length,
    });

    const result = await getAdminOrdersList({
      limit,
      cursor,
      status,
      source,
      attention,
      search,
      userId,
    });

    requestLogger.info("Fetched admin order list", {
      resultCount: result.orders.length,
      hasNextPage: result.hasNextPage,
      nextCursor: result.nextCursor,
    });

    return NextResponse.json({
      data: result.orders,
      meta: {
        limit,
        hasNextPage: result.hasNextPage,
        nextCursor: result.nextCursor,
        cursor,
      },
      filters: {
        search,
        status,
        source,
        attention,
        userId,
      },
    }, { headers: ADMIN_PRIVATE_RESPONSE_HEADERS });
  } catch (error) {
    logger.error("Failed to fetch admin orders", { error });
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500, headers: ADMIN_PRIVATE_RESPONSE_HEADERS },
    );
  }
}
