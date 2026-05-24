import "server-only";

import prisma from "@/lib/prisma";
import type {
  AdminOrderStats,
  AdminOrderStatus,
} from "@/lib/user-orders.types";
import { ACTIVE_ORDER_STATUSES } from "./_shared";

export async function getAdminOrderStats(): Promise<AdminOrderStats> {
  const [statusGroups, attention] = await Promise.all([
    prisma.order.groupBy({
      by: ["status"],
      _count: { _all: true },
    }),
    prisma.order.count({
      where: {
        revisionsIncluded: { gt: 0 },
        revisionsUsed: { gte: 1 },
      },
    }),
  ]);

  const byStatus: Record<AdminOrderStatus, number> = {
    PENDING: 0,
    ACCEPTED: 0,
    IN_PROGRESS: 0,
    WAITING_FOR_CLIENT: 0,
    DELIVERED: 0,
    COMPLETED: 0,
    CANCELLED: 0,
    REJECTED: 0,
    REFUNDED: 0,
  };

  let total = 0;
  for (const group of statusGroups) {
    const count = group._count._all;
    byStatus[group.status as AdminOrderStatus] = count;
    total += count;
  }

  const active = [...ACTIVE_ORDER_STATUSES].reduce(
    (sum, status) => sum + byStatus[status],
    0,
  );

  return {
    total,
    active,
    delivered: byStatus.DELIVERED,
    completed: byStatus.COMPLETED,
    attention,
    byStatus,
  };
}
