import { NextRequest, NextResponse } from "next/server";

import { getSessionAdmin } from "@/lib/auth/session";
import { createRequestLogger } from "@/lib/logger";
import prisma from "@/lib/prisma";
import { Prisma } from "@/prisma/generated/client";
import { getPlatformFinanceStats } from "@/lib/user-finance";

type UserAccountCountsRow = {
  total: number;
  verified: number;
  verified_artists: number;
  admin: number;
  banned: number;
};

async function getUserAccountCounts(): Promise<UserAccountCountsRow> {
  const rows = await prisma.$queryRaw<UserAccountCountsRow[]>(
    Prisma.sql`
      SELECT
        COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE verified = true)::int AS verified,
        COUNT(*) FILTER (WHERE "verifiedArtists" = true)::int AS verified_artists,
        COUNT(*) FILTER (WHERE role = 'admin')::int AS admin,
        COUNT(*) FILTER (WHERE "isBanned" = true)::int AS banned
      FROM "User"
    `,
  );
  return rows[0] ?? { total: 0, verified: 0, verified_artists: 0, admin: 0, banned: 0 };
}

const RESPONSE_HEADERS = {
  "Cache-Control": "private, no-store",
  Pragma: "no-cache",
  Expires: "0",
  "X-Content-Type-Options": "nosniff",
} as const;

export async function GET(req: NextRequest) {
  const logger = createRequestLogger(req, {
    route: "api.users.stats",
  });

  try {
    const admin = await getSessionAdmin(req);
    if (!admin) {
      logger.warn("Rejected user stats request due to missing admin session");
      return NextResponse.json(
        { message: "Unauthorized" },
        { status: 401, headers: RESPONSE_HEADERS },
      );
    }

    const [userCounts, finance] = await Promise.all([
      getUserAccountCounts(),
      getPlatformFinanceStats(),
    ]);

    const {
      total: totalUsers,
      verified: verifiedCount,
      verified_artists: verifiedArtistCount,
      admin: adminCount,
      banned: bannedCount,
    } = userCounts;

    logger.info("Fetched user stats", {
      adminId: admin.id,
      totalUsers,
      verifiedCount,
      verifiedArtistCount,
      adminCount,
      bannedCount,
      artistsWithEarnings: finance.artistsWithEarnings,
      syncedPaymentFeePayments: finance.syncedPaymentFeePayments,
      pendingPaymentFeeSyncPayments: finance.pendingPaymentFeeSyncPayments,
      syncedPayoutFeePayouts: finance.syncedPayoutFeePayouts,
      pendingPayoutFeeSyncPayouts: finance.pendingPayoutFeeSyncPayouts,
      currencies: finance.currencies.length,
    });

    return NextResponse.json(
      {
        data: {
          totalUsers,
          verifiedCount,
          verifiedArtistCount,
          adminCount,
          bannedCount,
          finance,
        },
      },
      { headers: RESPONSE_HEADERS },
    );
  } catch (error) {
    logger.error("Failed to fetch user stats", { error });
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500, headers: RESPONSE_HEADERS },
    );
  }
}
