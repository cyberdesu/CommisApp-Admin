"use client";

import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertCircle,
  CheckCircle2,
  Info,
  RefreshCcw,
  TrendingUp,
} from "lucide-react";
import { toast } from "sonner";

import { useAdminRealtime } from "@/hooks/use-admin-realtime";
import { apiClient } from "@/lib/api/client";
import type {
  PlatformFinanceStats,
  PlatformRevenueCurrencyBreakdown,
} from "@/lib/user-finance.types";
import type {
  AdminOrderAnalytics,
  OrderAnalyticsVolume,
} from "@/lib/user-orders.types";
import { cn } from "@/lib/utils";

type FinanceStatsResponse = {
  data: { finance: PlatformFinanceStats };
};

type SyncPaypalFeesResponse = {
  message: string;
  data: { scanned: number; synced: number; failed: number };
};

type SyncPaypalPayoutFeesResponse = {
  message: string;
  data: { scanned: number; synced: number; pending: number; failed: number };
};

type RankTab = "pairs" | "artists" | "clients" | "services" | "categories" | "sources";
type SortKey = "gross" | "orders" | "net";

type RankItem = {
  key: string;
  title: string;
  subtitle: string;
  pill?: string;
  orders: number;
  gross: number;
  websiteFee: number;
  artistNet: number;
};

const parseMoney = (v: string) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

const sumGross = (volumes: OrderAnalyticsVolume[]) =>
  volumes.reduce((s, v) => s + parseMoney(v.amount), 0);
const sumPlatformFee = (volumes: OrderAnalyticsVolume[]) =>
  volumes.reduce((s, v) => s + parseMoney(v.platformFees), 0);
const sumArtistNet = (volumes: OrderAnalyticsVolume[]) =>
  volumes.reduce((s, v) => s + parseMoney(v.netVolume), 0);

function fmtMoney(amount: number | string, currency: string) {
  const n = typeof amount === "string" ? parseMoney(amount) : amount;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
}

function fmtNum(value: number) {
  return new Intl.NumberFormat("en-US").format(value);
}

function pct(value: number, total: number) {
  if (!Number.isFinite(value) || !Number.isFinite(total) || total <= 0) return 0;
  return (value / total) * 100;
}

function pickPrimary(revenue: PlatformRevenueCurrencyBreakdown[]) {
  if (!revenue.length) return null;
  return [...revenue].sort(
    (a, b) => parseMoney(b.adminNetProfit) - parseMoney(a.adminNetProfit),
  )[0];
}

function Spinner({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn("size-3.5 animate-spin", className)}
    >
      <path d="M21 12a9 9 0 11-3-6.7L21 8" />
      <path d="M21 3v5h-5" />
    </svg>
  );
}

export default function AnalyticsPage() {
  const queryClient = useQueryClient();

  const financeQuery = useQuery({
    queryKey: ["platform-finance-stats"],
    queryFn: async () => {
      const response = await apiClient.get<FinanceStatsResponse>("/users/stats");
      return response.data.data.finance;
    },
    staleTime: 30_000,
    refetchInterval: 60_000,
  });

  const analyticsQuery = useQuery({
    queryKey: ["platform-order-analytics"],
    queryFn: async () => {
      const response = await apiClient.get<AdminOrderAnalytics>(
        "/orders/analytics",
      );
      return response.data;
    },
    staleTime: 30_000,
    refetchInterval: 60_000,
  });

  const syncPaymentMutation = useMutation({
    mutationFn: async () => {
      const response = await apiClient.post<SyncPaypalFeesResponse>(
        "/finance/paypal-fees/sync",
        { limit: 50 },
      );
      return response.data;
    },
    onSuccess: (r) => {
      toast.success(r.message);
      void queryClient.invalidateQueries({ queryKey: ["platform-finance-stats"] });
      void queryClient.invalidateQueries({ queryKey: ["platform-order-analytics"] });
    },
    onError: (e) => {
      if (axios.isAxiosError<{ message?: string }>(e)) {
        toast.error(e.response?.data?.message ?? "Failed to sync PayPal fees");
        return;
      }
      toast.error("Failed to sync PayPal fees");
    },
  });

  const syncPayoutMutation = useMutation({
    mutationFn: async () => {
      const response = await apiClient.post<SyncPaypalPayoutFeesResponse>(
        "/finance/paypal-payout-fees/sync",
        { limit: 50 },
      );
      return response.data;
    },
    onSuccess: (r) => {
      toast.success(r.message);
      void queryClient.invalidateQueries({ queryKey: ["platform-finance-stats"] });
      void queryClient.invalidateQueries({ queryKey: ["platform-order-analytics"] });
    },
    onError: (e) => {
      if (axios.isAxiosError<{ message?: string }>(e)) {
        toast.error(
          e.response?.data?.message ?? "Failed to sync PayPal payout fees",
        );
        return;
      }
      toast.error("Failed to sync PayPal payout fees");
    },
  });

  useAdminRealtime({
    topics: ["orders", "finance"],
    onEvent: () => {
      void queryClient.invalidateQueries({ queryKey: ["platform-order-analytics"] });
      void queryClient.invalidateQueries({ queryKey: ["platform-finance-stats"] });
    },
  });

  const finance = financeQuery.data;
  const analytics = analyticsQuery.data;
  const isFinanceLoading = financeQuery.isLoading;
  const isAnalyticsLoading = analyticsQuery.isLoading;

  const sortedRevenue = useMemo(
    () =>
      [...(finance?.revenue ?? [])].sort(
        (a, b) => parseMoney(b.adminNetProfit) - parseMoney(a.adminNetProfit),
      ),
    [finance?.revenue],
  );

  const [currency, setCurrency] = useState<string>("");

  useEffect(() => {
    if (currency) return;
    const primary = pickPrimary(sortedRevenue);
    if (primary) setCurrency(primary.currency);
  }, [currency, sortedRevenue]);

  const focusCurrency = useMemo(() => {
    if (!sortedRevenue.length) return null;
    return (
      sortedRevenue.find((r) => r.currency === currency) ?? sortedRevenue[0]
    );
  }, [currency, sortedRevenue]);

  const aggregate = useMemo(() => {
    if (!focusCurrency) {
      return {
        currency: "USD",
        gross: 0,
        platformFees: 0,
        paymentFee: 0,
        payoutFee: 0,
        adminNet: 0,
        artistPayouts: 0,
      };
    }
    return {
      currency: focusCurrency.currency,
      gross: parseMoney(focusCurrency.grossVolume),
      platformFees: parseMoney(focusCurrency.platformFees),
      paymentFee: parseMoney(focusCurrency.paymentPaypalFees),
      payoutFee: parseMoney(focusCurrency.payoutPaypalFees),
      adminNet: parseMoney(focusCurrency.adminNetProfit),
      artistPayouts: parseMoney(focusCurrency.artistPayouts),
    };
  }, [focusCurrency]);

  const paypalTotal = aggregate.paymentFee + aggregate.payoutFee;
  const distributionTotal = Math.max(
    aggregate.gross,
    aggregate.artistPayouts + paypalTotal + aggregate.adminNet,
    1,
  );

  const totalPendingFees =
    (finance?.pendingPaymentFeeSyncPayments ?? 0) +
    (finance?.pendingPayoutFeeSyncPayouts ?? 0);
  const totalSyncedFees =
    (finance?.syncedPaymentFeePayments ?? 0) +
    (finance?.syncedPayoutFeePayouts ?? 0);

  const completedPayments = finance?.completedPayments ?? 0;
  const processedPayouts = finance?.processedPayouts ?? 0;
  const avgOrder = completedPayments > 0 ? aggregate.gross / completedPayments : 0;
  const marginPct =
    aggregate.platformFees > 0
      ? (aggregate.adminNet / aggregate.platformFees) * 100
      : 0;

  // Rank sections
  const [activeTab, setActiveTab] = useState<RankTab>("pairs");
  const [sortKey, setSortKey] = useState<SortKey>("gross");

  const rankSections = useMemo(() => {
    if (!analytics) return null;
    const build = (items: RankItem[]) => items;

    return {
      pairs: build(
        analytics.topPairs.map((it) => ({
          key: `${it.artist.id}-${it.client.id}`,
          title: `@${it.client.username} → @${it.artist.username}`,
          subtitle: "Client → artist · repeat orders",
          orders: it.orderCount,
          gross: sumGross(it.grossVolume),
          websiteFee: sumPlatformFee(it.grossVolume),
          artistNet: sumArtistNet(it.grossVolume),
        })),
      ),
      artists: build(
        analytics.topArtists.map((it) => ({
          key: `a-${it.id}`,
          title: `@${it.username}`,
          subtitle: it.name ?? "Artist",
          pill: `ID ${it.id}`,
          orders: it.orderCount,
          gross: sumGross(it.grossVolume),
          websiteFee: sumPlatformFee(it.grossVolume),
          artistNet: sumArtistNet(it.grossVolume),
        })),
      ),
      clients: build(
        analytics.topClients.map((it) => ({
          key: `c-${it.id}`,
          title: `@${it.username}`,
          subtitle: it.name ?? "Client",
          pill: `ID ${it.id}`,
          orders: it.orderCount,
          gross: sumGross(it.grossVolume),
          websiteFee: sumPlatformFee(it.grossVolume),
          artistNet: sumArtistNet(it.grossVolume),
        })),
      ),
      services: build(
        analytics.topServices.map((it) => ({
          key: `s-${it.id}`,
          title: it.title,
          subtitle: `by @${it.artist.username}`,
          pill: it.categories[0] ?? "Uncategorized",
          orders: it.orderCount,
          gross: sumGross(it.grossVolume),
          websiteFee: sumPlatformFee(it.grossVolume),
          artistNet: sumArtistNet(it.grossVolume),
        })),
      ),
      categories: build(
        analytics.topCategories.map((it) => ({
          key: `cat-${it.name}`,
          title: it.name,
          subtitle: `${fmtNum(it.serviceCount)} services aktif`,
          pill: `${fmtNum(it.serviceCount)} svc`,
          orders: it.orderCount,
          gross: sumGross(it.grossVolume),
          websiteFee: sumPlatformFee(it.grossVolume),
          artistNet: sumArtistNet(it.grossVolume),
        })),
      ),
      sources: build(
        analytics.sources.map((it) => ({
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
      ),
    };
  }, [analytics]);

  const rankSorted = useMemo(() => {
    const list = [...(rankSections?.[activeTab] ?? [])];
    const cmp =
      sortKey === "orders"
        ? (a: RankItem, b: RankItem) => b.orders - a.orders
        : sortKey === "net"
          ? (a: RankItem, b: RankItem) => b.artistNet - a.artistNet
          : (a: RankItem, b: RankItem) => b.gross - a.gross;
    return list.sort(cmp);
  }, [rankSections, activeTab, sortKey]);

  const rankGrossTotal = rankSorted.reduce((s, r) => s + r.gross, 0);
  const rankMaxByKey = (() => {
    const key: keyof RankItem =
      sortKey === "orders" ? "orders" : sortKey === "net" ? "artistNet" : "gross";
    return Math.max(...rankSorted.map((r) => r[key] as number), 1);
  })();

  const isSyncing = syncPaymentMutation.isPending || syncPayoutMutation.isPending;

  function handleSyncAll() {
    if (isSyncing) return;
    syncPaymentMutation.mutate();
    syncPayoutMutation.mutate();
  }

  // keyboard: R for sync
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      if (e.key === "r" || e.key === "R") {
        e.preventDefault();
        handleSyncAll();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSyncing]);

  return (
    <div className="space-y-6">
      {/* Page head */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-foreground">
            Revenue performance
          </h2>
          <p className="mt-1 max-w-xl text-sm text-muted-foreground">
            Overview penghasilan admin bersih setelah website fee, biaya PayPal,
            dan payout artist. Data per currency bucket.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {sortedRevenue.length > 1 && (
            <div className="inline-flex gap-0.5 rounded-xl border border-border bg-card p-[3px]">
              {sortedRevenue.map((r) => (
                <button
                  key={r.currency}
                  type="button"
                  onClick={() => setCurrency(r.currency)}
                  className={cn(
                    "rounded-lg px-3 py-1.5 text-xs font-medium text-muted-foreground transition",
                    aggregate.currency === r.currency &&
                      "bg-background font-semibold text-foreground shadow-sm",
                  )}
                >
                  {r.currency}
                </button>
              ))}
            </div>
          )}
          <button
            type="button"
            onClick={handleSyncAll}
            disabled={isSyncing}
            className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-card px-3 py-2 text-xs font-medium text-foreground transition hover:border-primary/40 hover:text-primary disabled:cursor-wait disabled:opacity-60"
          >
            {isSyncing ? (
              <Spinner />
            ) : (
              <RefreshCcw className="size-3.5" />
            )}
            {isSyncing ? "Syncing…" : "Sync fees"}
          </button>
        </div>
      </div>

      {/* Sync banner */}
      {totalPendingFees > 0 && (
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-amber-300/60 bg-amber-50 px-4 py-2.5 text-sm">
          <AlertCircle className="size-4 text-amber-600" />
          <span className="text-amber-950">
            <strong className="font-semibold">
              {fmtNum(totalPendingFees)} fee entries
            </strong>{" "}
            need to be synced from PayPal.{" "}
            <span className="text-amber-800/80">
              {fmtNum(finance?.pendingPaymentFeeSyncPayments ?? 0)} payment fees ·{" "}
              {fmtNum(finance?.pendingPayoutFeeSyncPayouts ?? 0)} payout fees.
            </span>
          </span>
          <div className="flex-1" />
          <button
            type="button"
            onClick={handleSyncAll}
            disabled={isSyncing}
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground transition hover:brightness-105 disabled:cursor-wait disabled:opacity-60"
          >
            {isSyncing ? <Spinner /> : null}
            {isSyncing ? "Syncing" : "Sync now"}
          </button>
        </div>
      )}

      {/* KPI strip */}
      <section
        aria-label="Key metrics"
        className="grid grid-cols-2 overflow-hidden rounded-2xl border border-border bg-card md:grid-cols-3 xl:grid-cols-5"
      >
        <KpiCell
          featured
          label="Admin net profit"
          icon={<TrendingUp className="size-3.5" />}
          value={
            isFinanceLoading
              ? "—"
              : fmtMoney(aggregate.adminNet, aggregate.currency)
          }
          sub={
            <span className="text-muted-foreground">
              {aggregate.gross > 0
                ? `${pct(aggregate.adminNet, aggregate.gross).toFixed(1)}% of gross`
                : "no payments yet"}
            </span>
          }
        />
        <KpiCell
          label="Gross volume"
          value={
            isFinanceLoading
              ? "—"
              : fmtMoney(aggregate.gross, aggregate.currency)
          }
          sub={
            <span className="text-muted-foreground">
              {fmtNum(completedPayments)} payments
            </span>
          }
        />
        <KpiCell
          label="Website fees"
          value={
            isFinanceLoading
              ? "—"
              : fmtMoney(aggregate.platformFees, aggregate.currency)
          }
          sub={
            <span className="text-muted-foreground">
              {pct(aggregate.platformFees, aggregate.gross).toFixed(1)}% of gross
            </span>
          }
        />
        <KpiCell
          label="PayPal costs"
          value={isFinanceLoading ? "—" : fmtMoney(paypalTotal, aggregate.currency)}
          sub={
            <span className="text-muted-foreground">payment + payout</span>
          }
        />
        <KpiCell
          label="Net margin"
          value={isFinanceLoading ? "—" : `${marginPct.toFixed(0)}%`}
          sub={<span className="text-muted-foreground">of website fee</span>}
        />
      </section>

      {/* Flow + aside */}
      <section className="grid gap-5 lg:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)]">
        {/* Revenue distribution */}
        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <h2 className="text-[15px] font-semibold tracking-tight">
                Revenue distribution
              </h2>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Bagaimana gross volume {aggregate.currency} terpecah jadi artist
                payout, biaya PayPal, dan admin net.
              </p>
            </div>
            <span className="rounded-md border border-border bg-muted/50 px-2 py-0.5 font-mono text-[11px] font-medium text-muted-foreground">
              {aggregate.currency}
            </span>
          </div>

          {/* Flow bar */}
          <div className="mb-4 flex h-3.5 overflow-hidden rounded-full bg-zinc-200/70">
            <div
              className="h-full bg-sky-500"
              style={{
                width: `${Math.max(pct(aggregate.artistPayouts, distributionTotal), aggregate.artistPayouts > 0 ? 2 : 0)}%`,
              }}
            />
            <div
              className="h-full bg-rose-500"
              style={{
                width: `${Math.max(pct(paypalTotal, distributionTotal), paypalTotal > 0 ? 2 : 0)}%`,
              }}
            />
            <div
              className="h-full bg-emerald-500"
              style={{
                width: `${Math.max(pct(aggregate.adminNet, distributionTotal), aggregate.adminNet > 0 ? 2 : 0)}%`,
              }}
            />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <FlowLegend
              tone="sky"
              label="Artist payout"
              percent={pct(aggregate.artistPayouts, distributionTotal)}
              amount={fmtMoney(aggregate.artistPayouts, aggregate.currency)}
            />
            <FlowLegend
              tone="rose"
              label="PayPal fees"
              percent={pct(paypalTotal, distributionTotal)}
              amount={fmtMoney(paypalTotal, aggregate.currency)}
            />
            <FlowLegend
              tone="emerald"
              label="Admin net"
              percent={pct(aggregate.adminNet, distributionTotal)}
              amount={fmtMoney(aggregate.adminNet, aggregate.currency)}
            />
          </div>

          {/* Currency table */}
          <div className="mt-6 overflow-x-auto">
            <table className="w-full border-collapse text-[13px]">
              <thead>
                <tr className="border-b border-border/70 text-[10.5px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
                  <th className="py-2.5 pr-3 text-left font-semibold">Currency</th>
                  <th className="py-2.5 px-3 text-right font-semibold">Gross</th>
                  <th className="py-2.5 px-3 text-right font-semibold">Website fee</th>
                  <th className="py-2.5 px-3 text-right font-semibold">PayPal</th>
                  <th className="py-2.5 px-3 text-right font-semibold">Admin net</th>
                  <th className="py-2.5 pl-3 text-right font-semibold">Margin</th>
                </tr>
              </thead>
              <tbody className="font-mono tabular-nums">
                {isFinanceLoading && sortedRevenue.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-xs text-muted-foreground">
                      Loading…
                    </td>
                  </tr>
                ) : sortedRevenue.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-xs text-muted-foreground">
                      Belum ada revenue data.
                    </td>
                  </tr>
                ) : (
                  sortedRevenue.map((r, i) => {
                    const g = parseMoney(r.grossVolume);
                    const wf = parseMoney(r.platformFees);
                    const ppFee =
                      parseMoney(r.paymentPaypalFees) + parseMoney(r.payoutPaypalFees);
                    const net = parseMoney(r.adminNetProfit);
                    const m = wf > 0 ? (net / wf) * 100 : 0;
                    const isEmpty = g === 0;
                    return (
                      <tr
                        key={r.currency}
                        className="border-b border-border/40 last:border-b-0 hover:bg-muted/40"
                      >
                        <td className="py-2.5 pr-3">
                          <span className="font-sans font-semibold text-foreground">
                            {r.currency}
                          </span>
                          {i === 0 && !isEmpty && (
                            <span className="ml-2 rounded-md bg-muted px-1.5 py-0.5 font-sans text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                              primary
                            </span>
                          )}
                        </td>
                        <td className={cn("px-3 py-2.5 text-right", isEmpty && "text-muted-foreground/60")}>
                          {fmtMoney(g, r.currency)}
                        </td>
                        <td className={cn("px-3 py-2.5 text-right", isEmpty && "text-muted-foreground/60")}>
                          {fmtMoney(wf, r.currency)}
                        </td>
                        <td className={cn("px-3 py-2.5 text-right", isEmpty && "text-muted-foreground/60")}>
                          {isEmpty ? (
                            fmtMoney(0, r.currency)
                          ) : (
                            <span className="inline-flex rounded-md bg-rose-50 px-1.5 py-0.5 text-rose-800">
                              {fmtMoney(ppFee, r.currency)}
                            </span>
                          )}
                        </td>
                        <td className={cn("px-3 py-2.5 text-right", isEmpty && "text-muted-foreground/60")}>
                          {isEmpty ? (
                            fmtMoney(0, r.currency)
                          ) : (
                            <span className="inline-flex rounded-md bg-emerald-50 px-1.5 py-0.5 font-semibold text-emerald-800">
                              {fmtMoney(net, r.currency)}
                            </span>
                          )}
                        </td>
                        <td className={cn("pl-3 py-2.5 text-right", isEmpty && "text-muted-foreground/60")}>
                          {isEmpty ? "—" : `${m.toFixed(1)}%`}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Aside */}
        <div className="flex flex-col gap-5 rounded-2xl border border-border bg-card p-5">
          <div>
            <div className="flex items-end justify-between">
              <span className="text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
                Fee sync status
              </span>
              {totalPendingFees === 0 ? (
                <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-800">
                  <CheckCircle2 className="size-3" /> All synced
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-800">
                  {fmtNum(totalPendingFees)} pending
                </span>
              )}
            </div>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <SyncTile
                label="Payment fees"
                synced={finance?.syncedPaymentFeePayments ?? 0}
                pending={finance?.pendingPaymentFeeSyncPayments ?? 0}
              />
              <SyncTile
                label="Payout fees"
                synced={finance?.syncedPayoutFeePayouts ?? 0}
                pending={finance?.pendingPayoutFeeSyncPayouts ?? 0}
              />
            </div>
            <div className="mt-3 text-[11px] text-muted-foreground">
              {fmtNum(totalSyncedFees)} fee entries tersinkron · auto-refresh tiap
              60 detik.
            </div>
          </div>

          <div className="border-t border-border/60 pt-4">
            <span className="text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
              Volume snapshot
            </span>
            <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-4">
              <SnapStat
                label="Completed payments"
                value={fmtNum(completedPayments)}
              />
              <SnapStat
                label="Processed payouts"
                value={fmtNum(processedPayouts)}
              />
              <SnapStat
                label="Avg order value"
                value={fmtMoney(avgOrder, aggregate.currency)}
              />
              <SnapStat
                label="Active currencies"
                value={fmtNum(sortedRevenue.length)}
              />
            </div>
          </div>
        </div>
      </section>

      {/* Rankings panel */}
      <section className="overflow-hidden rounded-2xl border border-border bg-card">
        <div className="flex flex-wrap items-end justify-between gap-4 px-5 pt-5">
          <div>
            <h2 className="text-[15px] font-semibold tracking-tight">
              Order analytics
            </h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Top contributors per dimensi. Klik tab untuk berpindah konteks.
            </p>
          </div>
          <div className="inline-flex gap-0.5 rounded-xl border border-border bg-card p-[3px]">
            {([
              ["gross", "Sort by gross"],
              ["orders", "Sort by orders"],
              ["net", "Sort by artist net"],
            ] as const).map(([k, label]) => (
              <button
                key={k}
                type="button"
                onClick={() => setSortKey(k)}
                className={cn(
                  "rounded-lg px-3 py-1.5 text-xs font-medium text-muted-foreground transition",
                  sortKey === k &&
                    "bg-background font-semibold text-foreground shadow-sm",
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Tab bar */}
        <div className="mt-4 flex gap-0 overflow-x-auto border-b border-border px-5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {([
            ["pairs", "Artist · Client pairs", rankSections?.pairs.length ?? 0],
            ["artists", "Top artists", rankSections?.artists.length ?? 0],
            ["clients", "Top clients", rankSections?.clients.length ?? 0],
            ["services", "Top services", rankSections?.services.length ?? 0],
            ["categories", "Categories", rankSections?.categories.length ?? 0],
            ["sources", "Order types", rankSections?.sources.length ?? 0],
          ] as const).map(([t, label, count]) => (
            <button
              key={t}
              type="button"
              onClick={() => setActiveTab(t)}
              className={cn(
                "flex items-center gap-1.5 whitespace-nowrap border-b-2 px-3 py-2.5 text-[13px] font-medium transition",
                activeTab === t
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground",
              )}
            >
              {label}
              <span
                className={cn(
                  "rounded-md px-1.5 py-0.5 text-[10.5px] font-semibold",
                  activeTab === t
                    ? "bg-primary/10 text-primary"
                    : "bg-muted text-muted-foreground",
                )}
              >
                {count}
              </span>
            </button>
          ))}
        </div>

        {/* Rank header */}
        <div className="hidden grid-cols-[36px_minmax(0,1fr)_minmax(0,1.6fr)_88px_120px_120px_110px] items-center gap-3 border-b border-border px-5 py-2.5 text-[10.5px] font-semibold uppercase tracking-[0.1em] text-muted-foreground lg:grid">
          <span className="text-center">#</span>
          <span>Identity</span>
          <span>Detail / volume share</span>
          <span className="text-right">Orders</span>
          <span className="text-right">Gross</span>
          <span className="text-right">Website fee</span>
          <span className="text-right">Artist net</span>
        </div>

        {/* Body */}
        <div>
          {isAnalyticsLoading ? (
            <div className="px-5 py-10 text-center text-sm text-muted-foreground">
              Loading…
            </div>
          ) : rankSorted.length === 0 || rankSorted.every((r) => r.orders === 0) ? (
            <div className="px-5 py-10 text-center text-sm text-muted-foreground">
              Belum ada data untuk tab ini.
            </div>
          ) : (
            rankSorted.map((it, i) => {
              const num =
                sortKey === "orders"
                  ? it.orders
                  : sortKey === "net"
                    ? it.artistNet
                    : it.gross;
              const barPct =
                rankMaxByKey > 0
                  ? Math.max((num / rankMaxByKey) * 100, it.orders > 0 ? 3 : 0)
                  : 0;
              const sharePct =
                rankGrossTotal > 0 ? (it.gross / rankGrossTotal) * 100 : 0;
              return (
                <div
                  key={it.key}
                  className="grid grid-cols-1 gap-3 border-b border-border/60 px-5 py-3 last:border-b-0 hover:bg-muted/40 lg:grid-cols-[36px_minmax(0,1fr)_minmax(0,1.6fr)_88px_120px_120px_110px] lg:items-center"
                >
                  <div
                    className={cn(
                      "hidden text-center font-mono text-[12.5px] font-semibold text-muted-foreground lg:block",
                      i < 3 && "text-primary",
                    )}
                  >
                    {String(i + 1).padStart(2, "0")}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 lg:block">
                      <span
                        className={cn(
                          "font-mono text-[12px] font-semibold text-muted-foreground lg:hidden",
                          i < 3 && "text-primary",
                        )}
                      >
                        #{String(i + 1).padStart(2, "0")}
                      </span>
                      <div className="truncate text-[13.5px] font-semibold text-foreground">
                        {it.title}
                      </div>
                    </div>
                    <div className="truncate text-[12px] text-muted-foreground">
                      {it.subtitle}
                    </div>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <div className="relative h-1.5 overflow-hidden rounded-full bg-zinc-200/70">
                      <div
                        className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-primary to-primary/60"
                        style={{ width: `${barPct}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                      <span>
                        {it.pill && (
                          <span className="rounded-md bg-muted px-1.5 py-0.5 text-[10.5px] font-semibold text-muted-foreground">
                            {it.pill}
                          </span>
                        )}
                      </span>
                      <span className="font-mono tabular-nums">
                        {sharePct.toFixed(1)}% share
                      </span>
                    </div>
                  </div>
                  <div className="text-right font-mono text-[13px] tabular-nums">
                    {fmtNum(it.orders)}
                  </div>
                  <div className="text-right font-mono text-[13px] tabular-nums">
                    {fmtMoney(it.gross, aggregate.currency)}
                  </div>
                  <div className="text-right font-mono text-[13px] tabular-nums text-rose-700">
                    {fmtMoney(it.websiteFee, aggregate.currency)}
                  </div>
                  <div className="text-right font-mono text-[13px] font-semibold tabular-nums text-emerald-700">
                    {fmtMoney(it.artistNet, aggregate.currency)}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </section>

      {/* Footnote */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Info className="size-3.5" />
        Data auto-refresh tiap 60 detik ·{" "}
        <span className="rounded-md border border-border bg-card px-1.5 py-0.5 font-mono text-[11px]">
          R
        </span>{" "}
        untuk refresh manual.
      </div>
    </div>
  );
}

function KpiCell({
  label,
  value,
  sub,
  icon,
  featured,
}: {
  label: string;
  value: string;
  sub: React.ReactNode;
  icon?: React.ReactNode;
  featured?: boolean;
}) {
  return (
    <div
      className={cn(
        "relative flex min-w-0 flex-col gap-1.5 border-r border-border/60 px-5 py-5 last:border-r-0",
        featured && "bg-gradient-to-br from-emerald-50/70 to-transparent",
      )}
    >
      {featured && (
        <span className="absolute left-0 top-3 bottom-3 w-[3px] rounded-full bg-emerald-500" />
      )}
      <div
        className={cn(
          "flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.14em]",
          featured ? "text-emerald-700" : "text-muted-foreground",
        )}
      >
        {icon}
        {label}
      </div>
      <div
        className={cn(
          "truncate font-mono text-[22px] font-semibold tracking-tight tabular-nums",
          featured ? "text-emerald-900" : "text-foreground",
        )}
      >
        {value}
      </div>
      <div className="text-[11.5px]">{sub}</div>
    </div>
  );
}

function FlowLegend({
  label,
  percent,
  amount,
  tone,
}: {
  label: string;
  percent: number;
  amount: string;
  tone: "sky" | "rose" | "emerald";
}) {
  const dot =
    tone === "sky"
      ? "bg-sky-500"
      : tone === "rose"
        ? "bg-rose-500"
        : "bg-emerald-500";
  return (
    <div className="flex flex-col gap-1 rounded-xl border border-border/60 bg-background/60 px-3.5 py-3">
      <div className="flex items-center gap-2">
        <span className={cn("size-2 rounded-full", dot)} />
        <span className="text-[11px] font-semibold uppercase tracking-[0.09em] text-muted-foreground">
          {label}
        </span>
        <span className="ml-auto font-mono text-xs font-semibold tabular-nums text-foreground">
          {percent.toFixed(1)}%
        </span>
      </div>
      <div className="font-mono text-[15px] font-semibold tracking-tight tabular-nums">
        {amount}
      </div>
    </div>
  );
}

function SyncTile({
  label,
  synced,
  pending,
}: {
  label: string;
  synced: number;
  pending: number;
}) {
  const total = synced + pending;
  const ratio = total > 0 ? (synced / total) * 100 : 0;
  return (
    <div className="rounded-xl border border-border/60 bg-background/60 px-3 py-3">
      <div className="flex items-center justify-between text-[11px] font-semibold text-muted-foreground">
        <span>{label}</span>
        <span className="font-mono tabular-nums">{ratio.toFixed(0)}%</span>
      </div>
      <div className="mt-2 h-1 overflow-hidden rounded-full bg-muted">
        <div
          className={cn(
            "h-full rounded-full",
            pending > 0 ? "bg-amber-500" : "bg-emerald-500",
          )}
          style={{ width: `${ratio}%` }}
        />
      </div>
      <div className="mt-2 flex justify-between text-[11px] text-muted-foreground">
        <span className="font-mono tabular-nums">{fmtNum(synced)} synced</span>
        <span
          className={cn(
            "font-mono tabular-nums",
            pending > 0 ? "text-amber-700" : "",
          )}
        >
          {fmtNum(pending)} pending
        </span>
      </div>
    </div>
  );
}

function SnapStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <div className="text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
        {label}
      </div>
      <div className="mt-1 truncate font-mono text-[18px] font-semibold tabular-nums">
        {value}
      </div>
    </div>
  );
}

