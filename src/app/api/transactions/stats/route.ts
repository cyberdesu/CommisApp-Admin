import { NextRequest, NextResponse } from "next/server";

import {
  ADMIN_PRIVATE_RESPONSE_HEADERS,
  normalizeAdminSearch,
} from "@/lib/admin-api";
import { getSessionAdmin } from "@/lib/auth/session";
import { createRequestLogger } from "@/lib/logger";
import { getAdminTransactionStats } from "@/lib/transaction-log";

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
    route: "api.transactions.stats",
  });

  try {
    const admin = await getSessionAdmin(req);
    if (!admin) {
      logger.warn("Rejected transaction stats request due to missing admin session");
      return NextResponse.json(
        { message: "Unauthorized" },
        { status: 401, headers: ADMIN_PRIVATE_RESPONSE_HEADERS },
      );
    }

    const { searchParams } = new URL(req.url);
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

    const stats = await getAdminTransactionStats({
      search,
      type,
      status,
      feeSync,
    });

    logger.info("Fetched admin transaction stats", {
      adminId: admin.id,
      type,
      status,
      feeSync,
      hasSearch: Boolean(search),
      totalTransactions: stats.totalTransactions,
      pendingFeeSyncRows: stats.pendingFeeSyncRows,
    });

    return NextResponse.json(stats, { headers: ADMIN_PRIVATE_RESPONSE_HEADERS });
  } catch (error) {
    logger.error("Failed to fetch admin transaction stats", { error });
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500, headers: ADMIN_PRIVATE_RESPONSE_HEADERS },
    );
  }
}
