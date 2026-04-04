import { NextRequest, NextResponse } from "next/server";

import {
  ADMIN_PRIVATE_RESPONSE_HEADERS,
  normalizeAdminSearch,
  parsePositiveInt,
} from "@/lib/admin-api";
import { getSessionAdmin } from "@/lib/auth/session";
import { createRequestLogger } from "@/lib/logger";
import { getAdminTransactionsList } from "@/lib/transaction-log";

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;

const VALID_TYPES = ["ALL", "PAYMENT", "PAYOUT"] as const;
const VALID_STATUSES = [
  "ALL",
  "PENDING",
  "COMPLETED",
  "FAILED",
  "REFUNDED",
  "SENT",
  "FRAUD",
] as const;
const VALID_SYNC = ["ALL", "SYNCED", "PENDING_SYNC", "NOT_REQUIRED"] as const;

type TransactionTypeFilter = (typeof VALID_TYPES)[number];
type TransactionStatusFilter = (typeof VALID_STATUSES)[number];
type TransactionSyncFilter = (typeof VALID_SYNC)[number];

function isOneOf<T extends readonly string[]>(
  value: string,
  allowed: T,
): value is T[number] {
  return (allowed as readonly string[]).includes(value);
}

export async function GET(req: NextRequest) {
  const logger = createRequestLogger(req, {
    route: "api.transactions.list",
  });

  try {
    const admin = await getSessionAdmin(req);
    if (!admin) {
      logger.warn("Rejected transactions list request due to missing admin session");
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
    const page = parsePositiveInt(searchParams.get("page"), 1);
    const search = normalizeAdminSearch(searchParams.get("search"));

    const typeRaw = (searchParams.get("type") || "ALL").trim().toUpperCase();
    const type: TransactionTypeFilter = isOneOf(typeRaw, VALID_TYPES)
      ? typeRaw
      : "ALL";

    const statusRaw = (searchParams.get("status") || "ALL").trim().toUpperCase();
    const status: TransactionStatusFilter = isOneOf(statusRaw, VALID_STATUSES)
      ? statusRaw
      : "ALL";

    const feeSyncRaw = (searchParams.get("feeSync") || "ALL").trim().toUpperCase();
    const feeSync: TransactionSyncFilter = isOneOf(feeSyncRaw, VALID_SYNC)
      ? feeSyncRaw
      : "ALL";

    const requestLogger = logger.child({
      adminId: admin.id,
      page,
      limit,
      type,
      status,
      feeSync,
      hasSearch: Boolean(search),
      searchLength: search.length,
    });

    const result = await getAdminTransactionsList({
      page,
      limit,
      search,
      type,
      status,
      feeSync,
    });

    requestLogger.info("Fetched admin transaction log", {
      resultCount: result.data.length,
      total: result.meta.total,
      totalPages: result.meta.totalPages,
      hasNextPage: result.meta.hasNextPage,
    });

    return NextResponse.json(
      {
        data: result.data,
        meta: result.meta,
        stats: result.stats,
        filters: {
          page,
          limit,
          search,
          type,
          status,
          feeSync,
        },
      },
      { headers: ADMIN_PRIVATE_RESPONSE_HEADERS },
    );
  } catch (error) {
    logger.error("Failed to fetch admin transactions", { error });
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500, headers: ADMIN_PRIVATE_RESPONSE_HEADERS },
    );
  }
}
