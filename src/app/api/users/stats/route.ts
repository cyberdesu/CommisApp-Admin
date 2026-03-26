import { NextRequest, NextResponse } from "next/server";

import { getSessionAdmin } from "@/lib/auth/session";
import prisma from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const admin = await getSessionAdmin(req);
    if (!admin) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const [totalUsers, verifiedCount, verifiedArtistCount, adminCount, bannedCount] =
      await Promise.all([
        prisma.user.count(),
        prisma.user.count({ where: { verified: true } }),
        prisma.user.count({ where: { verifiedArtists: true } }),
        prisma.user.count({ where: { role: "admin" } }),
        prisma.user.count({ where: { isBanned: true } }),
      ]);

    return NextResponse.json({
      data: {
        totalUsers,
        verifiedCount,
        verifiedArtistCount,
        adminCount,
        bannedCount,
      },
    });
  } catch (error) {
    console.error("Fetch user stats error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 },
    );
  }
}
