import { NextRequest, NextResponse } from "next/server";

import { getSessionAdmin } from "@/lib/auth/session";
import prisma from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const admin = await getSessionAdmin(req);
    if (!admin) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const [pending, sent, fraud] = await Promise.all([
      prisma.payout.count({ where: { status: "PENDING" } }),
      prisma.payout.count({ where: { status: "SENT" } }),
      prisma.payout.count({ where: { status: "FRAUD" } }),
    ]);

    return NextResponse.json({
      pending,
      sent,
      fraud,
      total: pending + sent + fraud,
    });
  } catch (error) {
    console.error("Fetch payout stats error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 },
    );
  }
}
