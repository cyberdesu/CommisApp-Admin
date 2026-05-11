import type { PlatformFinanceStats } from "@/lib/user-finance.types";

export type FinanceStatsResponse = {
  data: { finance: PlatformFinanceStats };
};

export type SyncPaypalFeesResponse = {
  message: string;
  data: { scanned: number; synced: number; failed: number };
};

export type SyncPaypalPayoutFeesResponse = {
  message: string;
  data: { scanned: number; synced: number; pending: number; failed: number };
};

export type RankTab =
  | "pairs"
  | "artists"
  | "clients"
  | "services"
  | "categories"
  | "sources";

export type SortKey = "gross" | "orders" | "net";

export type RankItem = {
  key: string;
  title: string;
  subtitle: string;
  pill?: string;
  orders: number;
  gross: number;
  websiteFee: number;
  artistNet: number;
};

export type Aggregate = {
  currency: string;
  gross: number;
  platformFees: number;
  paymentFee: number;
  payoutFee: number;
  adminNet: number;
  artistPayouts: number;
};
