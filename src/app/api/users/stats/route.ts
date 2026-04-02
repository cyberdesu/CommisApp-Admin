import { NextRequest, NextResponse } from "next/server";

import { getSessionAdmin } from "@/lib/auth/session";
import { createRequestLogger } from "@/lib/logger";
import prisma from "@/lib/prisma";
import { getPlatformFinanceStats } from "@/lib/user-finance";

export async function GET(req: NextRequest) {
  const logger = createRequestLogger(req, {
    route: "api.users.stats",
  });

  try {
    const admin = await getSessionAdmin(req);
    if (!admin) {
      logger.warn("Rejected user stats request due to missing admin session");
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const [
      totalUsers,
      verifiedCount,
      verifiedArtistCount,
      adminCount,
      bannedCount,
      finance,
    ] = await Promise.all([
        prisma.user.count(),
        prisma.user.count({ where: { verified: true } }),
        prisma.user.count({ where: { verifiedArtists: true } }),
        prisma.user.count({ where: { role: "admin" } }),
        prisma.user.count({ where: { isBanned: true } }),
        getPlatformFinanceStats(),
      ]);

    logger.info("Fetched user stats", {
      adminId: admin.id,
      totalUsers,
      verifiedCount,
      verifiedArtistCount,
      adminCount,
      bannedCount,
      artistsWithEarnings: finance.artistsWithEarnings,
      currencies: finance.currencies.length,
    });

    return NextResponse.json({
      data: {
        totalUsers,
        verifiedCount,
        verifiedArtistCount,
        adminCount,
        bannedCount,
        finance,
      },
    });
  } catch (error) {
    logger.error("Failed to fetch user stats", { error });
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 },
    );
  }
}
