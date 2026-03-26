import { NextRequest, NextResponse } from "next/server";

import { getSessionAdmin } from "@/lib/auth/session";
import prisma from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const admin = await getSessionAdmin(req);
    if (!admin) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const [totalConversations, totalMessages, activeToday, typeCounts] =
      await Promise.all([
        prisma.conversation.count(),
        prisma.message.count(),
        prisma.conversation.count({
          where: { updatedAt: { gte: todayStart } },
        }),
        prisma.conversation.groupBy({
          by: ["type"],
          _count: { id: true },
        }),
      ]);

    const totalDirect =
      typeCounts.find((t) => t.type === "DIRECT")?._count.id ?? 0;
    const totalGroup =
      typeCounts.find((t) => t.type === "GROUP")?._count.id ?? 0;

    return NextResponse.json({
      data: {
        totalConversations,
        totalMessages,
        activeToday,
        totalDirect,
        totalGroup,
      },
    });
  } catch (error) {
    console.error("Fetch chat stats error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 },
    );
  }
}
