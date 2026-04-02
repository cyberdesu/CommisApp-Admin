import { NextRequest, NextResponse } from "next/server";

import { getSessionAdmin } from "@/lib/auth/session";
import { createRequestLogger } from "@/lib/logger";
import prisma from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const logger = createRequestLogger(req, {
    route: "api.chats.stats",
  });

  try {
    const admin = await getSessionAdmin(req);
    if (!admin) {
      logger.warn("Rejected chat stats request due to missing admin session");
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

    logger.info("Fetched chat stats", {
      adminId: admin.id,
      totalConversations,
      totalMessages,
      activeToday,
      totalDirect,
      totalGroup,
    });

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
    logger.error("Failed to fetch chat stats", { error });
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 },
    );
  }
}
