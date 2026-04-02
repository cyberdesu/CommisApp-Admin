import { NextRequest, NextResponse } from "next/server";

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
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const stats = await getAdminOrderStats();

    logger.info("Fetched admin order stats", {
      adminId: admin.id,
      ...stats,
    });

    return NextResponse.json(stats);
  } catch (error) {
    logger.error("Failed to fetch admin order stats", { error });
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 },
    );
  }
}
