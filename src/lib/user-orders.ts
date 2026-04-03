import "server-only";

import prisma from "@/lib/prisma";
import { Prisma } from "@/prisma/generated/client";
import type {
  AdminOrderAnalytics,
  AdminOrderStats,
  AdminOrdersListResult,
  AdminOrderStatus,
  UserOrdersDetail,
  UserOrderOverview,
  UserOrderParticipantRole,
  UserOrderTimelineItem,
} from "@/lib/user-orders.types";

const ZERO = new Prisma.Decimal(0);
const ACTIVE_ORDER_STATUSES = new Set<AdminOrderStatus>([
  "PENDING",
  "ACCEPTED",
  "IN_PROGRESS",
  "WAITING_FOR_CLIENT",
  "DELIVERED",
]);
const ANALYTICS_EXCLUDED_STATUSES: AdminOrderStatus[] = [
  "REJECTED",
  "CANCELLED",
];

const MAX_ORDERS_PER_ROLE = 8;
const MAX_TIMELINE_ITEMS = 6;
const ADMIN_ORDER_PAGE_LIMIT_MAX = 50;
const ANALYTICS_LIST_LIMIT = 5;

const orderOverviewSelect = {
  id: true,
  artistId: true,
  clientId: true,
  conversation: {
    select: {
      id: true,
    },
  },
  source: true,
  status: true,
  titleSnapshot: true,
  priceSnapshot: true,
  currency: true,
  deliveryDaysMin: true,
  deliveryDaysMax: true,
  revisionsIncluded: true,
  revisionsUsed: true,
  createdAt: true,
  updatedAt: true,
  service: {
    select: {
      title: true,
    },
  },
  artist: {
    select: {
      id: true,
      name: true,
      username: true,
    },
  },
  client: {
    select: {
      id: true,
      name: true,
      username: true,
    },
  },
} satisfies Prisma.OrderSelect;

type SelectedOrderRecord = Prisma.OrderGetPayload<{
  select: typeof orderOverviewSelect;
}>;
type SelectedOrderEventRecord = Prisma.OrderEventGetPayload<{
  select: {
    id: true;
    orderId: true;
    type: true;
    description: true;
    actorId: true;
    metadata: true;
    createdAt: true;
  };
}>;
type SelectedPaymentRecord = Prisma.PaymentGetPayload<{
  select: {
    orderId: true;
    paidAt: true;
  };
}>;

function normalizeCurrency(value?: string | null) {
  return value?.trim().toUpperCase() || "USD";
}

function decimalOrZero(value: Prisma.Decimal | null | undefined) {
  return value ?? ZERO;
}

/** Must stay in sync with PLATFORM_FEE_RATE in orders.service.ts */
const PLATFORM_FEE_RATE = new Prisma.Decimal("0.10");

function serializeVolumeMap(volumeMap: Map<string, Prisma.Decimal>) {
  return [...volumeMap.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([currency, amount]) => {
      const fees = amount.mul(PLATFORM_FEE_RATE).toDecimalPlaces(2);
      return {
        currency,
        amount: amount.toFixed(2),
        platformFees: fees.toFixed(2),
        netVolume: amount.sub(fees).toFixed(2),
      };
    });
}

function isObjectRecord(
  value: unknown,
): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function getStatusFromMetadata(
  metadata: unknown,
  keys: string[],
): AdminOrderStatus | null {
  if (!isObjectRecord(metadata)) return null;

  for (const key of keys) {
    const value = metadata[key];
    if (typeof value === "string") {
      return value as AdminOrderStatus;
    }
  }

  return null;
}

function hasAdminIntervention(metadata: unknown) {
  if (!isObjectRecord(metadata)) return false;
  return (
    typeof metadata.adminId === "number" ||
    metadata.source === "ADMIN_PANEL" ||
    metadata.adminAction === true
  );
}

function buildActorLabel(params: {
  actorId: number | null;
  artistId: number;
  clientId: number | null;
  metadata: unknown;
}) {
  if (hasAdminIntervention(params.metadata)) return "Admin";
  if (params.actorId === params.artistId) return "Artist";
  if (params.clientId && params.actorId === params.clientId) return "Client";
  if (params.actorId) return "User";
  return "System";
}

function buildTimelineItem(params: {
  event: SelectedOrderEventRecord;
  artistId: number;
  clientId: number | null;
}): UserOrderTimelineItem {
  return {
    id: params.event.id,
    type: params.event.type,
    description: params.event.description,
    createdAt: params.event.createdAt.toISOString(),
    actorLabel: buildActorLabel({
      actorId: params.event.actorId,
      artistId: params.artistId,
      clientId: params.clientId,
      metadata: params.event.metadata,
    }),
    isAdminIntervention: hasAdminIntervention(params.event.metadata),
    fromStatus: getStatusFromMetadata(params.event.metadata, [
      "fromStatus",
      "previousStatus",
      "oldStatus",
    ]),
    toStatus: getStatusFromMetadata(params.event.metadata, [
      "toStatus",
      "nextStatus",
      "newStatus",
    ]),
  };
}

function buildAttentionFlags(params: {
  deliveredTransitions: number;
  revisionsIncluded: number;
  revisionsUsed: number;
  status: AdminOrderStatus;
  adminInterventions: number;
}): UserOrderOverview["attentionFlags"] {
  const attentionFlags: UserOrderOverview["attentionFlags"] = [];

  if (params.deliveredTransitions > 1) {
    attentionFlags.push({
      code: "REPEATED_DELIVERY",
      label: "Delivered multiple times",
      level: "warning",
    });
  }
  if (
    params.revisionsIncluded > 0 &&
    params.revisionsUsed === params.revisionsIncluded
  ) {
    attentionFlags.push({
      code: "REVISION_LIMIT_REACHED",
      label: "Revision limit reached",
      level: "warning",
    });
  }
  if (params.revisionsUsed > params.revisionsIncluded) {
    attentionFlags.push({
      code: "REVISION_LIMIT_EXCEEDED",
      label: "Revision count exceeds slot limit",
      level: "critical",
    });
  }
  if (
    params.status === "DELIVERED" &&
    params.revisionsIncluded > 0 &&
    params.revisionsUsed >= params.revisionsIncluded
  ) {
    attentionFlags.push({
      code: "DELIVERED_WITH_NO_REVISION_LEFT",
      label: "Delivered while no revision slot remains",
      level: "critical",
    });
  }
  if (params.adminInterventions > 0) {
    attentionFlags.push({
      code: "ADMIN_INTERVENED",
      label: "Admin has intervened before",
      level: "info",
    });
  }

  return attentionFlags;
}

function buildOrderOverviews(params: {
  orders: SelectedOrderRecord[];
  events: SelectedOrderEventRecord[];
  completedPayments: SelectedPaymentRecord[];
  perspectiveUserId?: number;
}): UserOrderOverview[] {
  const eventsByOrderId = new Map<string, SelectedOrderEventRecord[]>();
  for (const event of params.events) {
    const current = eventsByOrderId.get(event.orderId) ?? [];
    current.push(event);
    eventsByOrderId.set(event.orderId, current);
  }

  const completedPaymentAtByOrderId = new Map<string, Date>();
  for (const payment of params.completedPayments) {
    if (!payment.paidAt) continue;
    if (!completedPaymentAtByOrderId.has(payment.orderId)) {
      completedPaymentAtByOrderId.set(payment.orderId, payment.paidAt);
    }
  }

  return params.orders.map((order) => {
    const orderEvents = eventsByOrderId.get(order.id) ?? [];

    let deliveredTransitions = 0;
    let revisionRequests = 0;
    let statusChanges = 0;
    let adminInterventions = 0;
    let latestActivityAt = order.updatedAt;

    const timeline = orderEvents
      .slice(0, MAX_TIMELINE_ITEMS)
      .map((event) =>
        buildTimelineItem({
          event,
          artistId: order.artistId,
          clientId: order.clientId,
        }),
      );

    for (const event of orderEvents) {
      if (event.createdAt > latestActivityAt) {
        latestActivityAt = event.createdAt;
      }

      if (event.type === "REVISION_REQUESTED") {
        revisionRequests += 1;
      }

      if (event.type === "STATUS_CHANGED") {
        statusChanges += 1;
        const toStatus = getStatusFromMetadata(event.metadata, [
          "toStatus",
          "nextStatus",
          "newStatus",
        ]);
        if (toStatus === "DELIVERED") {
          deliveredTransitions += 1;
        }
      }

      if (hasAdminIntervention(event.metadata)) {
        adminInterventions += 1;
      }
    }

    const paidAt = completedPaymentAtByOrderId.get(order.id);
    if (paidAt && paidAt > latestActivityAt) {
      latestActivityAt = paidAt;
    }

    const participantRole: UserOrderParticipantRole =
      params.perspectiveUserId && order.artistId === params.perspectiveUserId
        ? "ARTIST"
        : params.perspectiveUserId && order.clientId === params.perspectiveUserId
          ? "CLIENT"
          : "ARTIST";
    const counterpart =
      participantRole === "ARTIST" ? order.client : order.artist;

    return {
      id: order.id,
      conversationId: order.conversation?.id ?? null,
      participantRole,
      status: order.status,
      source: order.source,
      title:
        order.titleSnapshot?.trim() ||
        order.service?.title ||
        "Untitled commission order",
      serviceTitle: order.service?.title ?? null,
      amount: order.priceSnapshot.toFixed(2),
      currency: normalizeCurrency(order.currency),
      createdAt: order.createdAt.toISOString(),
      updatedAt: order.updatedAt.toISOString(),
      latestActivityAt: latestActivityAt.toISOString(),
      deliveryDaysMin: order.deliveryDaysMin,
      deliveryDaysMax: order.deliveryDaysMax,
      revisionsIncluded: order.revisionsIncluded,
      revisionsUsed: order.revisionsUsed,
      paymentCaptured: completedPaymentAtByOrderId.has(order.id),
      artist: {
        id: order.artist.id,
        name: order.artist.name,
        username: order.artist.username,
      },
      client: order.client
        ? {
            id: order.client.id,
            name: order.client.name,
            username: order.client.username,
          }
        : null,
      counterpart: counterpart
        ? {
            id: counterpart.id,
            name: counterpart.name,
            username: counterpart.username,
          }
        : null,
      metrics: {
        deliveredTransitions,
        revisionRequests,
        statusChanges,
        adminInterventions,
      },
      attentionFlags: buildAttentionFlags({
        deliveredTransitions,
        revisionsIncluded: order.revisionsIncluded,
        revisionsUsed: order.revisionsUsed,
        status: order.status,
        adminInterventions,
      }),
      timeline,
    };
  });
}

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

export async function getAdminOrdersList(params: {
  limit: number;
  cursor?: string | null;
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
  const search = params.search?.trim() || "";

  const userSearchFilters: Prisma.UserWhereInput[] = search
    ? [
        { username: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
        { name: { contains: search, mode: "insensitive" } },
      ]
    : [];

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
    ...(search
      ? {
          AND: [
            {
              OR: [
                { id: { equals: search } },
                {
                  titleSnapshot: {
                    contains: search,
                    mode: "insensitive",
                  },
                },
                {
                  service: {
                    is: {
                      title: {
                        contains: search,
                        mode: "insensitive",
                      },
                    },
                  },
                },
                {
                  artist: {
                    is: {
                      OR: userSearchFilters,
                    },
                  },
                },
                {
                  client: {
                    is: {
                      OR: userSearchFilters,
                    },
                  },
                },
              ],
            },
          ],
        }
      : {}),
  };

  const rows = await prisma.order.findMany({
    where,
    take: limit + 1,
    ...(params.cursor ? { cursor: { id: params.cursor }, skip: 1 } : {}),
    orderBy: { id: "desc" },
    select: orderOverviewSelect,
  });

  const hasNextPage = rows.length > limit;
  const slice = hasNextPage ? rows.slice(0, limit) : rows;
  const orderIds = slice.map((order) => order.id);

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
    orders: slice,
    events,
    completedPayments,
  });

  const filteredOrders =
    params.attention === "FLAGGED"
      ? overviews.filter((order) => order.attentionFlags.length > 0)
      : params.attention === "CLEAN"
        ? overviews.filter((order) => order.attentionFlags.length === 0)
        : overviews;

  return {
    orders: filteredOrders,
    hasNextPage,
    nextCursor: hasNextPage ? slice[slice.length - 1]?.id ?? null : null,
  };
}

export async function getAdminOrderStats(): Promise<AdminOrderStats> {
  const [total, active, delivered, completed, attention] = await Promise.all([
    prisma.order.count(),
    prisma.order.count({
      where: {
        status: {
          in: [...ACTIVE_ORDER_STATUSES],
        },
      },
    }),
    prisma.order.count({
      where: {
        status: "DELIVERED",
      },
    }),
    prisma.order.count({
      where: {
        status: "COMPLETED",
      },
    }),
    prisma.order.count({
      where: {
        OR: [
          {
            revisionsIncluded: {
              gt: 0,
            },
            revisionsUsed: {
              gte: 1,
            },
          },
          {
            status: "DELIVERED",
            revisionsIncluded: {
              gt: 0,
            },
            revisionsUsed: {
              gte: 1,
            },
          },
        ],
      },
    }),
  ]);

  return {
    total,
    active,
    delivered,
    completed,
    attention,
  };
}

export async function getAdminOrderAnalytics(params?: {
  userId?: number | null;
}): Promise<AdminOrderAnalytics> {
  const scopedUserId = params?.userId ?? null;
  const baseWhere: Prisma.OrderWhereInput = {
    status: {
      notIn: ANALYTICS_EXCLUDED_STATUSES,
    },
    ...(scopedUserId
      ? {
          OR: [{ artistId: scopedUserId }, { clientId: scopedUserId }],
        }
      : {}),
  };

  const [
    pairCurrencyGroups,
    artistCurrencyGroups,
    clientCurrencyGroups,
    serviceCurrencyGroups,
    sourceCurrencyGroups,
  ] = await Promise.all([
    prisma.order.groupBy({
      by: ["artistId", "clientId", "currency"],
      where: {
        ...baseWhere,
        clientId: { not: null },
      },
      _count: {
        _all: true,
      },
      _sum: {
        priceSnapshot: true,
      },
    }),
    prisma.order.groupBy({
      by: ["artistId", "currency"],
      where: baseWhere,
      _count: {
        _all: true,
      },
      _sum: {
        priceSnapshot: true,
      },
    }),
    prisma.order.groupBy({
      by: ["clientId", "currency"],
      where: {
        ...baseWhere,
        clientId: { not: null },
      },
      _count: {
        _all: true,
      },
      _sum: {
        priceSnapshot: true,
      },
    }),
    prisma.order.groupBy({
      by: ["serviceId", "currency"],
      where: {
        ...baseWhere,
        serviceId: { not: null },
      },
      _count: {
        _all: true,
      },
      _sum: {
        priceSnapshot: true,
      },
    }),
    prisma.order.groupBy({
      by: ["source", "currency"],
      where: baseWhere,
      _count: {
        _all: true,
      },
      _sum: {
        priceSnapshot: true,
      },
    }),
  ]);

  const pairMap = new Map<
    string,
    {
      artistId: number;
      clientId: number;
      orderCount: number;
      grossVolume: Map<string, Prisma.Decimal>;
    }
  >();
  for (const group of pairCurrencyGroups) {
    if (group.clientId === null) continue;
    const key = `${group.artistId}:${group.clientId}`;
    const current =
      pairMap.get(key) ??
      {
        artistId: group.artistId,
        clientId: group.clientId,
        orderCount: 0,
        grossVolume: new Map<string, Prisma.Decimal>(),
      };

    current.orderCount += group._count._all;
    current.grossVolume.set(
      normalizeCurrency(group.currency),
      decimalOrZero(current.grossVolume.get(normalizeCurrency(group.currency))).add(
        decimalOrZero(group._sum.priceSnapshot),
      ),
    );
    pairMap.set(key, current);
  }

  const artistMap = new Map<
    number,
    {
      artistId: number;
      orderCount: number;
      grossVolume: Map<string, Prisma.Decimal>;
    }
  >();
  for (const group of artistCurrencyGroups) {
    const current =
      artistMap.get(group.artistId) ??
      {
        artistId: group.artistId,
        orderCount: 0,
        grossVolume: new Map<string, Prisma.Decimal>(),
      };

    current.orderCount += group._count._all;
    current.grossVolume.set(
      normalizeCurrency(group.currency),
      decimalOrZero(current.grossVolume.get(normalizeCurrency(group.currency))).add(
        decimalOrZero(group._sum.priceSnapshot),
      ),
    );
    artistMap.set(group.artistId, current);
  }

  const clientMap = new Map<
    number,
    {
      clientId: number;
      orderCount: number;
      grossVolume: Map<string, Prisma.Decimal>;
    }
  >();
  for (const group of clientCurrencyGroups) {
    if (group.clientId === null) continue;
    const current =
      clientMap.get(group.clientId) ??
      {
        clientId: group.clientId,
        orderCount: 0,
        grossVolume: new Map<string, Prisma.Decimal>(),
      };

    current.orderCount += group._count._all;
    current.grossVolume.set(
      normalizeCurrency(group.currency),
      decimalOrZero(current.grossVolume.get(normalizeCurrency(group.currency))).add(
        decimalOrZero(group._sum.priceSnapshot),
      ),
    );
    clientMap.set(group.clientId, current);
  }

  const serviceMap = new Map<
    string,
    {
      serviceId: string;
      orderCount: number;
      grossVolume: Map<string, Prisma.Decimal>;
    }
  >();
  for (const group of serviceCurrencyGroups) {
    if (!group.serviceId) continue;
    const current =
      serviceMap.get(group.serviceId) ??
      {
        serviceId: group.serviceId,
        orderCount: 0,
        grossVolume: new Map<string, Prisma.Decimal>(),
      };

    current.orderCount += group._count._all;
    current.grossVolume.set(
      normalizeCurrency(group.currency),
      decimalOrZero(current.grossVolume.get(normalizeCurrency(group.currency))).add(
        decimalOrZero(group._sum.priceSnapshot),
      ),
    );
    serviceMap.set(group.serviceId, current);
  }

  const sourceMap = new Map<
    "SERVICE" | "CUSTOM_REQUEST",
    {
      source: "SERVICE" | "CUSTOM_REQUEST";
      orderCount: number;
      grossVolume: Map<string, Prisma.Decimal>;
    }
  >();
  for (const group of sourceCurrencyGroups) {
    const current =
      sourceMap.get(group.source) ??
      {
        source: group.source,
        orderCount: 0,
        grossVolume: new Map<string, Prisma.Decimal>(),
      };

    current.orderCount += group._count._all;
    current.grossVolume.set(
      normalizeCurrency(group.currency),
      decimalOrZero(current.grossVolume.get(normalizeCurrency(group.currency))).add(
        decimalOrZero(group._sum.priceSnapshot),
      ),
    );
    sourceMap.set(group.source, current);
  }

  const sortedPairGroups = [...pairMap.values()]
    .sort((left, right) => right.orderCount - left.orderCount)
    .slice(0, ANALYTICS_LIST_LIMIT);
  const sortedArtistGroups = [...artistMap.values()]
    .sort((left, right) => right.orderCount - left.orderCount)
    .slice(0, ANALYTICS_LIST_LIMIT);
  const sortedClientGroups = [...clientMap.values()]
    .sort((left, right) => right.orderCount - left.orderCount)
    .slice(0, ANALYTICS_LIST_LIMIT);
  const sortedServiceGroups = [...serviceMap.values()].sort(
    (left, right) => right.orderCount - left.orderCount,
  );

  const userIds = new Set<number>();
  for (const group of sortedPairGroups) {
    userIds.add(group.artistId);
    userIds.add(group.clientId);
  }
  for (const group of sortedArtistGroups) {
    userIds.add(group.artistId);
  }
  for (const group of sortedClientGroups) {
    userIds.add(group.clientId);
  }

  const serviceIds = sortedServiceGroups.map((group) => group.serviceId);

  const [users, services] = await Promise.all([
    userIds.size === 0
      ? Promise.resolve([])
      : prisma.user.findMany({
          where: {
            id: { in: [...userIds] },
          },
          select: {
            id: true,
            name: true,
            username: true,
          },
        }),
    serviceIds.length === 0
      ? Promise.resolve([])
      : prisma.service.findMany({
          where: {
            id: { in: serviceIds },
          },
          select: {
            id: true,
            title: true,
            user: {
              select: {
                id: true,
                name: true,
                username: true,
              },
            },
            categories: {
              select: {
                nameTag: true,
              },
            },
          },
        }),
  ]);

  const userById = new Map(users.map((user) => [user.id, user]));
  const serviceById = new Map(services.map((service) => [service.id, service]));

  const topPairs = sortedPairGroups
    .map((group) => {
      const artist = userById.get(group.artistId);
      const client =
        group.clientId !== null ? userById.get(group.clientId) : null;

      if (!artist || !client) return null;

      return {
        artist: {
          id: artist.id,
          name: artist.name,
          username: artist.username,
        },
        client: {
          id: client.id,
          name: client.name,
          username: client.username,
        },
        orderCount: group.orderCount,
        grossVolume: serializeVolumeMap(group.grossVolume),
      };
    })
    .filter((item): item is NonNullable<typeof item> => item !== null);

  const topArtists = sortedArtistGroups
    .map((group) => {
      const artist = userById.get(group.artistId);
      if (!artist) return null;

      return {
        id: artist.id,
        name: artist.name,
        username: artist.username,
        orderCount: group.orderCount,
        grossVolume: serializeVolumeMap(group.grossVolume),
      };
    })
    .filter((item): item is NonNullable<typeof item> => item !== null);

  const topClients = sortedClientGroups
    .map((group) => {
      const client =
        group.clientId !== null ? userById.get(group.clientId) : null;
      if (!client) return null;

      return {
        id: client.id,
        name: client.name,
        username: client.username,
        orderCount: group.orderCount,
        grossVolume: serializeVolumeMap(group.grossVolume),
      };
    })
    .filter((item): item is NonNullable<typeof item> => item !== null);

  const topServices = sortedServiceGroups
    .slice(0, ANALYTICS_LIST_LIMIT)
    .map((group) => {
      const serviceId = group.serviceId;
      if (!serviceId) return null;
      const service = serviceById.get(serviceId);
      if (!service) return null;

      return {
        id: service.id,
        title: service.title,
        orderCount: group.orderCount,
        grossVolume: serializeVolumeMap(group.grossVolume),
        artist: {
          id: service.user.id,
          name: service.user.name,
          username: service.user.username,
        },
        categories:
          service.categories.length > 0
            ? service.categories.map((item) => item.nameTag)
            : ["Uncategorized"],
      };
    })
    .filter((item): item is NonNullable<typeof item> => item !== null);

  const categoryMap = new Map<
    string,
    {
      orderCount: number;
      grossVolume: Map<string, Prisma.Decimal>;
      serviceIds: Set<string>;
    }
  >();

  for (const group of sortedServiceGroups) {
    const serviceId = group.serviceId;
    if (!serviceId) continue;
    const service = serviceById.get(serviceId);
    if (!service) continue;

    const categories =
      service.categories.length > 0
        ? service.categories.map((item) => item.nameTag)
        : ["Uncategorized"];

    for (const category of categories) {
      const current =
        categoryMap.get(category) ??
        {
          orderCount: 0,
          grossVolume: new Map<string, Prisma.Decimal>(),
          serviceIds: new Set<string>(),
        };

      current.orderCount += group.orderCount;
      for (const [currency, amount] of group.grossVolume.entries()) {
        current.grossVolume.set(
          currency,
          decimalOrZero(current.grossVolume.get(currency)).add(amount),
        );
      }
      current.serviceIds.add(serviceId);
      categoryMap.set(category, current);
    }
  }

  const topCategories = [...categoryMap.entries()]
    .sort(([, left], [, right]) => right.orderCount - left.orderCount)
    .slice(0, ANALYTICS_LIST_LIMIT)
    .map(([name, value]) => ({
      name,
      orderCount: value.orderCount,
      grossVolume: serializeVolumeMap(value.grossVolume),
      serviceCount: value.serviceIds.size,
    }));

  const sources = [...sourceMap.values()]
    .sort((left, right) => right.orderCount - left.orderCount)
    .map((group) => ({
      source: group.source,
      orderCount: group.orderCount,
      grossVolume: serializeVolumeMap(group.grossVolume),
    }));

  return {
    topPairs,
    topArtists,
    topClients,
    topServices,
    topCategories,
    sources,
  };
}
