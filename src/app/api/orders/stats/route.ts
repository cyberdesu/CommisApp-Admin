import { NextRequest, NextResponse } from "next/server";

import { ADMIN_PRIVATE_RESPONSE_HEADERS } from "@/lib/admin-api";
import { getSessionAdmin } from "@/lib/auth/session";
import { createRequestLogger } from "@/lib/logger";
import { getAdminOrderStats } from "@/lib/user-orders";

export async function GET(req: NextRequest) {
  const logger = createRequestLogger(req, {
    route: "api.orders.stats",
  });

  try {
    const admin = await getSessionAdmin(req);
    if (!admin) {
      logger.warn("Rejected order stats request due to missing admin session");
      return NextResponse.json(
        { message: "Unauthorized" },
        { status: 401, headers: ADMIN_PRIVATE_RESPONSE_HEADERS },
      );
    }

    const stats = await getAdminOrderStats();

    logger.info("Fetched admin order stats", {
      adminId: admin.id,
      ...stats,
    });

    return NextResponse.json(stats, { headers: ADMIN_PRIVATE_RESPONSE_HEADERS });
  } catch (error) {
    logger.error("Failed to fetch admin order stats", { error });
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500, headers: ADMIN_PRIVATE_RESPONSE_HEADERS },
    );
  }
}
