import { NextRequest, NextResponse } from "next/server";

import { getSessionAdmin } from "@/lib/auth/session";
import {
  getReindexJobSnapshot,
  startReindexJob,
} from "@/lib/elasticsearch/reindex-job";
import { createRequestLogger } from "@/lib/logger";

const RESPONSE_HEADERS = {
  "Cache-Control": "private, no-store",
  Pragma: "no-cache",
  Expires: "0",
  "X-Content-Type-Options": "nosniff",
} as const;

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

    const outcome = startReindexJob(admin.id);

    if (!outcome.started) {
      logger.info("Reindex job already running", {
        adminId: admin.id,
        runningJobId: outcome.snapshot.jobId,
      });
      return NextResponse.json(
        { message: "Reindex already in progress", data: outcome.snapshot },
        { status: 409, headers: RESPONSE_HEADERS },
      );
    }

    logger.info("Started reindex job", {
      adminId: admin.id,
      jobId: outcome.snapshot.jobId,
    });

    return NextResponse.json(
      { data: outcome.snapshot },
      { status: 202, headers: RESPONSE_HEADERS },
    );
  } catch (error) {
    logger.error("Failed to start reindex job", { error });
    const message =
      error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json(
      { message },
      { status: 500, headers: RESPONSE_HEADERS },
    );
  }
}

export async function GET(req: NextRequest) {
  const logger = createRequestLogger(req, {
    route: "api.admin.search.reindex.status",
  });

  try {
    const admin = await getSessionAdmin(req);
    if (!admin) {
      logger.warn("Rejected reindex status request due to missing admin session");
      return NextResponse.json(
        { message: "Unauthorized" },
        { status: 401, headers: RESPONSE_HEADERS },
      );
    }

    return NextResponse.json(
      { data: getReindexJobSnapshot() },
      { headers: RESPONSE_HEADERS },
    );
  } catch (error) {
    logger.error("Failed to read reindex job snapshot", { error });
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500, headers: RESPONSE_HEADERS },
    );
  }
}
