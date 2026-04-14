import { NextRequest, NextResponse } from "next/server";

import { getSessionAdmin } from "@/lib/auth/session";
import { reindexAll } from "@/lib/elasticsearch/reindex";
import { createRequestLogger } from "@/lib/logger";

const RESPONSE_HEADERS = {
  "Cache-Control": "private, no-store",
  Pragma: "no-cache",
  Expires: "0",
  "X-Content-Type-Options": "nosniff",
} as const;

export const maxDuration = 300;

export async function POST(req: NextRequest) {
  const logger = createRequestLogger(req, { route: "api.admin.search.reindex" });

  try {
    const admin = await getSessionAdmin(req);
    if (!admin) {
      logger.warn("Rejected reindex due to missing admin session");
      return NextResponse.json(
        { message: "Unauthorized" },
        { status: 401, headers: RESPONSE_HEADERS },
      );
    }

    const started = Date.now();
    logger.info("Starting full search reindex", { adminId: admin.id });
    const result = await reindexAll();
    const durationMs = Date.now() - started;
    logger.info("Full search reindex completed", {
      adminId: admin.id,
      durationMs,
      ...result,
    });

    return NextResponse.json(
      { data: { ...result, durationMs } },
      { headers: RESPONSE_HEADERS },
    );
  } catch (error) {
    logger.error("Search reindex failed", { error });
    const message =
      error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json(
      { message },
      { status: 500, headers: RESPONSE_HEADERS },
    );
  }
}
