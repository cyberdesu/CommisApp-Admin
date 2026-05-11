import type { AdminOrderAnalytics } from "@/lib/user-orders.types";
import { fmtNum, sumArtistNet, sumGross, sumPlatformFee } from "./helpers";
import type { RankItem, RankTab, SortKey } from "./types";

export function buildRankSections(
  analytics: AdminOrderAnalytics | undefined,
): Record<RankTab, RankItem[]> | null {
  if (!analytics) return null;

  return {
    pairs: analytics.topPairs.map((it) => ({
      key: `${it.artist.id}-${it.client.id}`,
      title: `@${it.client.username} → @${it.artist.username}`,
      subtitle: "Client → artist · repeat orders",
      orders: it.orderCount,
      gross: sumGross(it.grossVolume),
      websiteFee: sumPlatformFee(it.grossVolume),
      artistNet: sumArtistNet(it.grossVolume),
    })),
    artists: analytics.topArtists.map((it) => ({
      key: `a-${it.id}`,
      title: `@${it.username}`,
      subtitle: it.name ?? "Artist",
      pill: `ID ${it.id}`,
      orders: it.orderCount,
      gross: sumGross(it.grossVolume),
      websiteFee: sumPlatformFee(it.grossVolume),
      artistNet: sumArtistNet(it.grossVolume),
    })),
    clients: analytics.topClients.map((it) => ({
      key: `c-${it.id}`,
      title: `@${it.username}`,
      subtitle: it.name ?? "Client",
      pill: `ID ${it.id}`,
      orders: it.orderCount,
      gross: sumGross(it.grossVolume),
      websiteFee: sumPlatformFee(it.grossVolume),
      artistNet: sumArtistNet(it.grossVolume),
    })),
    services: analytics.topServices.map((it) => ({
      key: `s-${it.id}`,
      title: it.title,
      subtitle: `by @${it.artist.username}`,
      pill: it.categories[0] ?? "Uncategorized",
      orders: it.orderCount,
      gross: sumGross(it.grossVolume),
      websiteFee: sumPlatformFee(it.grossVolume),
      artistNet: sumArtistNet(it.grossVolume),
    })),
    categories: analytics.topCategories.map((it) => ({
      key: `cat-${it.name}`,
      title: it.name,
      subtitle: `${fmtNum(it.serviceCount)} services aktif`,
      pill: `${fmtNum(it.serviceCount)} svc`,
      orders: it.orderCount,
      gross: sumGross(it.grossVolume),
      websiteFee: sumPlatformFee(it.grossVolume),
      artistNet: sumArtistNet(it.grossVolume),
    })),
    sources: analytics.sources.map((it) => ({
      key: `src-${it.source}`,
      title: it.source === "SERVICE" ? "Service orders" : "Custom requests",
      subtitle:
        it.source === "SERVICE"
          ? "Order dari service listing"
          : "Order dari custom request",
      pill: it.source === "SERVICE" ? "Listing" : "Custom",
      orders: it.orderCount,
      gross: sumGross(it.grossVolume),
      websiteFee: sumPlatformFee(it.grossVolume),
      artistNet: sumArtistNet(it.grossVolume),
    })),
  };
}

export function sortRanks(list: RankItem[], sortKey: SortKey): RankItem[] {
  const cmp =
    sortKey === "orders"
      ? (a: RankItem, b: RankItem) => b.orders - a.orders
      : sortKey === "net"
        ? (a: RankItem, b: RankItem) => b.artistNet - a.artistNet
        : (a: RankItem, b: RankItem) => b.gross - a.gross;
  return [...list].sort(cmp);
}

export function rankMaxByKey(list: RankItem[], sortKey: SortKey) {
  const key =
    sortKey === "orders" ? "orders" : sortKey === "net" ? "artistNet" : "gross";
  return Math.max(...list.map((r) => r[key]), 1);
}
