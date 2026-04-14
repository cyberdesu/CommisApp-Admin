import { NextRequest, NextResponse } from "next/server";

import { getSessionAdmin } from "@/lib/auth/session";
import { createRequestLogger } from "@/lib/logger";
import { deleteAllIndices } from "@/lib/elasticsearch/reindex";

const RESPONSE_HEADERS = {
  "Cache-Control": "private, no-store",
  Pragma: "no-cache",
  Expires: "0",
  "X-Content-Type-Options": "nosniff",
} as const;

export const maxDuration = 120;

export async function POST(req: NextRequest) {
  const logger = createRequestLogger(req, { route: "api.admin.search.delete" });

  try {
    const admin = await getSessionAdmin(req);
    if (!admin) {
      logger.warn("Rejected search index deletion due to missing admin session");
      return NextResponse.json(
        { message: "Unauthorized" },
        { status: 401, headers: RESPONSE_HEADERS },
      );
    }

    const started = Date.now();
    logger.warn("Starting search index deletion", { adminId: admin.id });
    const result = await deleteAllIndices();
    const durationMs = Date.now() - started;

    logger.warn("Search index deletion completed", {
      adminId: admin.id,
      durationMs,
      ...result,
    });

    return NextResponse.json(
      { data: { ...result, durationMs } },
      { headers: RESPONSE_HEADERS },
    );
  } catch (error) {
    logger.error("Search index deletion failed", { error });
    const message =
      error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json(
      { message },
      { status: 500, headers: RESPONSE_HEADERS },
    );
  }
}
