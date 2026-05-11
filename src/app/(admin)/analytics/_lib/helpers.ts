import type { PlatformRevenueCurrencyBreakdown } from "@/lib/user-finance.types";
import type { OrderAnalyticsVolume } from "@/lib/user-orders.types";

export const parseMoney = (v: string) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

export const sumGross = (volumes: OrderAnalyticsVolume[]) =>
  volumes.reduce((s, v) => s + parseMoney(v.amount), 0);

export const sumPlatformFee = (volumes: OrderAnalyticsVolume[]) =>
  volumes.reduce((s, v) => s + parseMoney(v.platformFees), 0);

export const sumArtistNet = (volumes: OrderAnalyticsVolume[]) =>
  volumes.reduce((s, v) => s + parseMoney(v.netVolume), 0);

export function fmtMoney(amount: number | string, currency: string) {
  const n = typeof amount === "string" ? parseMoney(amount) : amount;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
}

export function fmtNum(value: number) {
  return new Intl.NumberFormat("en-US").format(value);
}

export function pct(value: number, total: number) {
  if (!Number.isFinite(value) || !Number.isFinite(total) || total <= 0) return 0;
  return (value / total) * 100;
}

export function pickPrimary(revenue: PlatformRevenueCurrencyBreakdown[]) {
  if (!revenue.length) return null;
  return [...revenue].sort(
    (a, b) => parseMoney(b.adminNetProfit) - parseMoney(a.adminNetProfit),
  )[0];
}
