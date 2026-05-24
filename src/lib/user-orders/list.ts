import "server-only";

import { tokenizeSearch } from "@/lib/admin-api";
import prisma from "@/lib/prisma";
import { Prisma } from "@/prisma/generated/client";
import type {
  AdminOrdersListResult,
  AdminOrderStatus,
} from "@/lib/user-orders.types";
import {
  ADMIN_ORDER_PAGE_LIMIT_MAX,
  orderOverviewSelect,
} from "./_shared";
import { buildOrderOverviews } from "./_overview";

export async function getAdminOrdersList(params: {
  limit: number;
  page?: number;
  status?: AdminOrderStatus | "ALL";
  source?: "SERVICE" | "CUSTOM_REQUEST" | "ALL";
  attention?: "ALL" | "FLAGGED" | "CLEAN";
  search?: string;
  userId?: number | null;
}): Promise<AdminOrdersListResult> {
  const limit = Math.min(
    Math.max(1, params.limit),
    ADMIN_ORDER_PAGE_LIMIT_MAX,
  );
  const requestedPage = Math.max(1, params.page ?? 1);
  const searchRaw = params.search?.trim() || "";
  const tokens = tokenizeSearch(searchRaw);

  const ID_PREFIX_MIN_LENGTH = 6;
  const buildTokenClause = (token: string): Prisma.OrderWhereInput => ({
    OR: [
      ...(token.length >= ID_PREFIX_MIN_LENGTH
        ? [
            {
              id: { startsWith: token, mode: "insensitive" as const },
            } satisfies Prisma.OrderWhereInput,
          ]
        : []),
      { titleSnapshot: { contains: token, mode: "insensitive" } },
      {
        service: {
          is: { title: { contains: token, mode: "insensitive" } },
        },
      },
      {
        artist: {
          is: {
            OR: [
              { username: { contains: token, mode: "insensitive" } },
              { email: { contains: token, mode: "insensitive" } },
              { name: { contains: token, mode: "insensitive" } },
            ],
          },
        },
      },
      {
        client: {
          is: {
            OR: [
              { username: { contains: token, mode: "insensitive" } },
              { email: { contains: token, mode: "insensitive" } },
              { name: { contains: token, mode: "insensitive" } },
            ],
          },
        },
      },
    ],
  });

  const attentionWhere: Prisma.OrderWhereInput | null =
    params.attention === "FLAGGED"
      ? {
          revisionsIncluded: { gt: 0 },
          revisionsUsed: { gte: 1 },
        }
      : params.attention === "CLEAN"
        ? {
            OR: [
              { revisionsIncluded: { equals: 0 } },
              { revisionsUsed: { equals: 0 } },
            ],
          }
        : null;

  const where: Prisma.OrderWhereInput = {
    ...(params.status && params.status !== "ALL"
      ? { status: params.status }
      : {}),
    ...(params.source && params.source !== "ALL"
      ? { source: params.source }
      : {}),
    ...(params.userId
      ? {
          OR: [{ artistId: params.userId }, { clientId: params.userId }],
        }
      : {}),
    ...(attentionWhere ?? {}),
    ...(tokens.length > 0
      ? { AND: tokens.map(buildTokenClause) }
      : {}),
  };

  const total = await prisma.order.count({ where });
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const page = Math.min(requestedPage, totalPages);
  const skip = (page - 1) * limit;

  const rows = await prisma.order.findMany({
    where,
    take: limit,
    skip,
    orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
    select: orderOverviewSelect,
  });

  const orderIds = rows.map((order) => order.id);

  const [events, completedPayments] = await Promise.all([
    orderIds.length === 0
      ? Promise.resolve([])
      : prisma.orderEvent.findMany({
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
    orderIds.length === 0
      ? Promise.resolve([])
      : prisma.payment.findMany({
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
    orders: rows,
    events,
    completedPayments,
  });

  return {
    orders: overviews,
    total,
    page,
    totalPages,
    hasNextPage: page < totalPages,
    hasPreviousPage: page > 1,
  };
}
