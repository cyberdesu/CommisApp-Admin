import { NextRequest, NextResponse } from "next/server";

import { ADMIN_PRIVATE_RESPONSE_HEADERS } from "@/lib/admin-api";
import { getSessionAdmin } from "@/lib/auth/session";
import { createRequestLogger } from "@/lib/logger";
import prisma from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const logger = createRequestLogger(req, {
    route: "api.payouts.stats",
  });

  try {
    const admin = await getSessionAdmin(req);
    if (!admin) {
      logger.warn("Rejected payout stats request due to missing admin session");
      return NextResponse.json(
        { message: "Unauthorized" },
        { status: 401, headers: ADMIN_PRIVATE_RESPONSE_HEADERS },
      );
    }

    const [pending, sent, fraud] = await Promise.all([
      prisma.payout.count({ where: { status: "PENDING" } }),
      prisma.payout.count({ where: { status: "SENT" } }),
      prisma.payout.count({ where: { status: "FRAUD" } }),
    ]);

    logger.info("Fetched payout stats", {
      adminId: admin.id,
      pending,
      sent,
      fraud,
    });

    return NextResponse.json(
      {
        pending,
        sent,
        fraud,
        total: pending + sent + fraud,
      },
      { headers: ADMIN_PRIVATE_RESPONSE_HEADERS },
    );
  } catch (error) {
    logger.error("Failed to fetch payout stats", {
      error,
    });
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500, headers: ADMIN_PRIVATE_RESPONSE_HEADERS },
    );
  }
}
