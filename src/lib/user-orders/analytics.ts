import "server-only";

import prisma from "@/lib/prisma";
import { Prisma } from "@/prisma/generated/client";
import type { AdminOrderAnalytics } from "@/lib/user-orders.types";
import {
  ANALYTICS_EXCLUDED_STATUSES,
  ANALYTICS_LIST_LIMIT,
  decimalOrZero,
  normalizeCurrency,
  serializeVolumeMap,
} from "./_shared";

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
      _count: { _all: true },
      _sum: { priceSnapshot: true },
    }),
    prisma.order.groupBy({
      by: ["artistId", "currency"],
      where: baseWhere,
      _count: { _all: true },
      _sum: { priceSnapshot: true },
    }),
    prisma.order.groupBy({
      by: ["clientId", "currency"],
      where: {
        ...baseWhere,
        clientId: { not: null },
      },
      _count: { _all: true },
      _sum: { priceSnapshot: true },
    }),
    prisma.order.groupBy({
      by: ["serviceId", "currency"],
      where: {
        ...baseWhere,
        serviceId: { not: null },
      },
      _count: { _all: true },
      _sum: { priceSnapshot: true },
    }),
    prisma.order.groupBy({
      by: ["source", "currency"],
      where: baseWhere,
      _count: { _all: true },
      _sum: { priceSnapshot: true },
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
