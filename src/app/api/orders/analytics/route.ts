import { NextRequest, NextResponse } from "next/server";

import { getSessionAdmin } from "@/lib/auth/session";
import { createRequestLogger } from "@/lib/logger";
import { getAdminOrderAnalytics } from "@/lib/user-orders";

function parseOptionalUserId(value: string | null) {
  if (!value) return null;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

export async function GET(req: NextRequest) {
  const logger = createRequestLogger(req, {
    route: "api.orders.analytics",
  });

  try {
    const admin = await getSessionAdmin(req);
    if (!admin) {
      logger.warn(
        "Rejected order analytics request due to missing admin session",
      );
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const userId = parseOptionalUserId(searchParams.get("userId"));

    const analytics = await getAdminOrderAnalytics({ userId });

    logger.info("Fetched admin order analytics", {
      adminId: admin.id,
      userId,
      topPairs: analytics.topPairs.length,
      topArtists: analytics.topArtists.length,
      topClients: analytics.topClients.length,
      topServices: analytics.topServices.length,
      topCategories: analytics.topCategories.length,
      sources: analytics.sources.length,
    });

    return NextResponse.json(analytics);
  } catch (error) {
    logger.error("Failed to fetch admin order analytics", { error });
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 },
    );
  }
}
