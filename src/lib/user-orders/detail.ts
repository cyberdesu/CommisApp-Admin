import "server-only";

import prisma from "@/lib/prisma";
import type { UserOrdersDetail } from "@/lib/user-orders.types";
import {
  ACTIVE_ORDER_STATUSES,
  MAX_ORDERS_PER_ROLE,
  orderOverviewSelect,
} from "./_shared";
import { buildOrderOverviews } from "./_overview";

export async function getUserOrdersDetail(
  userId: number,
): Promise<UserOrdersDetail> {
  const orders = await prisma.order.findMany({
    where: {
      OR: [{ artistId: userId }, { clientId: userId }],
    },
    orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
    take: MAX_ORDERS_PER_ROLE * 2,
    select: orderOverviewSelect,
  });

  if (orders.length === 0) {
    return {
      summary: {
        totalOrders: 0,
        activeOrders: 0,
        deliveredOrders: 0,
        completedOrders: 0,
        atRiskOrders: 0,
      },
      artistOrders: [],
      clientOrders: [],
    };
  }

  const orderIds = orders.map((order) => order.id);

  const [events, completedPayments] = await Promise.all([
    prisma.orderEvent.findMany({
      where: {
        orderId: { in: orderIds },
      },
      orderBy: [{ createdAt: "desc" }],
      select: {
        id: true,
        orderId: true,
        type: true,
        description: true,
        actorId: true,
        metadata: true,
        createdAt: true,
      },
    }),
    prisma.payment.findMany({
      where: {
        orderId: { in: orderIds },
        status: "COMPLETED",
      },
      orderBy: [{ paidAt: "desc" }, { createdAt: "desc" }],
      select: {
        orderId: true,
        paidAt: true,
      },
    }),
  ]);

  const overviews = buildOrderOverviews({
    orders,
    events,
    completedPayments,
    perspectiveUserId: userId,
  });

  const artistOrders = overviews
    .filter((order) => order.participantRole === "ARTIST")
    .slice(0, MAX_ORDERS_PER_ROLE);
  const clientOrders = overviews
    .filter((order) => order.participantRole === "CLIENT")
    .slice(0, MAX_ORDERS_PER_ROLE);
  const allVisibleOrders = [...artistOrders, ...clientOrders];

  return {
    summary: {
      totalOrders: allVisibleOrders.length,
      activeOrders: allVisibleOrders.filter((order) =>
        ACTIVE_ORDER_STATUSES.has(order.status),
      ).length,
      deliveredOrders: allVisibleOrders.filter(
        (order) => order.status === "DELIVERED",
      ).length,
      completedOrders: allVisibleOrders.filter(
        (order) => order.status === "COMPLETED",
      ).length,
      atRiskOrders: allVisibleOrders.filter(
        (order) => order.attentionFlags.length > 0,
      ).length,
    },
    artistOrders,
    clientOrders,
  };
}
