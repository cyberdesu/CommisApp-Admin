"use client";

import axios from "axios";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowRightLeft,
  BarChart3,
  Coins,
  Landmark,
  Layers3,
  RefreshCcw,
  Receipt,
  Sparkles,
  Users,
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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

type FinanceStatsResponse = {
  data: {
    finance: PlatformFinanceStats;
  };
};

type SyncPaypalFeesResponse = {
  message: string;
  data: {
    scanned: number;
    synced: number;
    failed: number;
  };
};

function formatMoney(amount: string, currency: string) {
  const numeric = Number(amount);

  if (!Number.isFinite(numeric)) {
    return `${currency} ${amount}`;
  }

  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(numeric);
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("id-ID").format(value);
}

function RevenueCard({
  item,
}: {
  item: PlatformRevenueCurrencyBreakdown;
}) {
  return (
    <Card className="rounded-3xl border border-zinc-200/80 bg-white shadow-sm">
      <CardHeader className="border-b border-zinc-100 pb-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <CardDescription className="text-[10px] font-bold uppercase tracking-[0.22em] text-zinc-400">
              Currency
            </CardDescription>
            <CardTitle className="mt-1 text-2xl font-bold text-zinc-950">
              {item.currency}
            </CardTitle>
          </div>
          <div className="flex size-11 items-center justify-center rounded-2xl border border-emerald-200 bg-emerald-50 text-emerald-700">
            <Coins className="size-5" />
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4 pt-5">
        <div className="rounded-2xl border border-emerald-100 bg-emerald-50/80 p-4">
          <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-emerald-700">
            Gross Volume
          </p>
          <p className="mt-1 text-2xl font-bold tracking-tight text-emerald-950">
            {formatMoney(item.grossVolume, item.currency)}
          </p>
          <p className="mt-1 text-xs text-emerald-800/80">
            Total paid by clients before fee split
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl border border-amber-100 bg-amber-50/80 p-4">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-amber-700">
            Platform Fees
          </p>
          <p className="mt-1 text-sm font-semibold text-amber-950">
            {formatMoney(item.platformFees, item.currency)}
          </p>
          <p className="mt-1 text-[11px] text-amber-900/70">
            Gross website fee before PayPal charges
          </p>
        </div>
        <div className="rounded-2xl border border-sky-100 bg-sky-50/80 p-4">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-sky-700">
            Artist Payouts
          </p>
            <p className="mt-1 text-sm font-semibold text-sky-950">
              {formatMoney(item.artistPayouts, item.currency)}
            </p>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl border border-rose-100 bg-rose-50/80 p-4">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-rose-700">
              PayPal Fees
            </p>
            <p className="mt-1 text-sm font-semibold text-rose-950">
              {formatMoney(item.paypalFees, item.currency)}
            </p>
          </div>
          <div className="rounded-2xl border border-emerald-100 bg-emerald-50/90 p-4">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-700">
              Admin Net Balance
            </p>
            <p className="mt-1 text-sm font-semibold text-emerald-950">
              {formatMoney(item.adminNetRevenue, item.currency)}
            </p>
            <p className="mt-1 text-[11px] text-emerald-900/70">
              Platform fee minus actual PayPal processing fee
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Badge className="rounded-full border border-zinc-200 bg-white text-zinc-700">
            Synced {item.syncedPayments}
          </Badge>
          {item.pendingFeeSyncPayments > 0 ? (
            <Badge className="rounded-full border border-amber-200 bg-amber-50 text-amber-700">
              Pending sync {item.pendingFeeSyncPayments}
            </Badge>
          ) : (
            <Badge className="rounded-full border border-emerald-200 bg-emerald-50 text-emerald-700">
              All fee records synced
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function VolumeBreakdown({
  volumes,
}: {
  volumes: OrderAnalyticsVolume[];
}) {
  if (volumes.length === 0) {
    return <p className="text-xs text-zinc-400">No volume tracked</p>;
  }

  return (
    <div className="space-y-2">
      {volumes.slice(0, 2).map((volume) => (
        <div
          key={volume.currency}
          className="rounded-2xl border border-zinc-100 bg-white/80 p-3"
        >
          <div className="flex items-center justify-between gap-3">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400">
              {volume.currency}
            </p>
            <p className="text-xs font-semibold text-zinc-500">
              {formatMoney(volume.amount, volume.currency)}
            </p>
          </div>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            <div className="rounded-xl border border-amber-100 bg-amber-50/70 px-3 py-2">
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-amber-700">
                Fees
              </p>
              <p className="mt-1 text-xs font-semibold text-amber-950">
                {formatMoney(volume.platformFees, volume.currency)}
              </p>
            </div>
            <div className="rounded-xl border border-sky-100 bg-sky-50/70 px-3 py-2">
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-sky-700">
                Net
              </p>
              <p className="mt-1 text-xs font-semibold text-sky-950">
                {formatMoney(volume.netVolume, volume.currency)}
              </p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function AnalyticsCard({
  title,
  description,
  emptyLabel,
  children,
}: {
  title: string;
  description: string;
  emptyLabel: string;
  children: React.ReactNode;
}) {
  const items = Array.isArray(children) ? children : [children];

  return (
    <Card className="rounded-3xl border border-zinc-200/80 bg-white shadow-sm">
      <CardHeader>
        <CardTitle className="text-lg font-bold text-zinc-900">
          {title}
        </CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {items.length > 0 && items.some(Boolean) ? (
          children
        ) : (
          <p className="text-sm text-zinc-400">{emptyLabel}</p>
        )}
      </CardContent>
    </Card>
  );
}

function RevenueSkeleton() {
  return (
    <div className="grid gap-4 xl:grid-cols-3">
      {Array.from({ length: 3 }).map((_, index) => (
        <Card
          key={index}
          className="rounded-3xl border border-zinc-200/80 bg-white shadow-sm"
        >
          <CardHeader className="border-b border-zinc-100 pb-4">
            <Skeleton className="h-4 w-16 rounded-full" />
            <Skeleton className="mt-2 h-8 w-20 rounded-xl" />
          </CardHeader>
          <CardContent className="space-y-4 pt-5">
            <Skeleton className="h-24 w-full rounded-2xl" />
            <div className="grid gap-3 sm:grid-cols-2">
              <Skeleton className="h-20 w-full rounded-2xl" />
              <Skeleton className="h-20 w-full rounded-2xl" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
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

  const syncPaypalFeesMutation = useMutation({
    mutationFn: async () => {
      const response = await apiClient.post<SyncPaypalFeesResponse>(
        "/finance/paypal-fees/sync",
        {
          limit: 50,
        },
      );
      return response.data;
    },
    onSuccess: (response) => {
      toast.success(response.message);
      void queryClient.invalidateQueries({ queryKey: ["platform-finance-stats"] });
      void queryClient.invalidateQueries({ queryKey: ["platform-order-analytics"] });
    },
    onError: (error) => {
      if (axios.isAxiosError<{ message?: string }>(error)) {
        toast.error(error.response?.data?.message ?? "Failed to sync PayPal fees");
        return;
      }

      toast.error("Failed to sync PayPal fees");
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

  const highlightCards = [
    {
      label: "Currencies",
      value: formatNumber(finance?.revenue.length ?? 0),
      detail: "revenue buckets tracked",
      icon: Layers3,
      tone: "text-violet-700 bg-violet-50 border-violet-200",
    },
    {
      label: "Completed Payments",
      value: formatNumber(finance?.completedPayments ?? 0),
      detail: "payment records included",
      icon: Receipt,
      tone: "text-emerald-700 bg-emerald-50 border-emerald-200",
    },
    {
      label: "Processed Payouts",
      value: formatNumber(finance?.processedPayouts ?? 0),
      detail: "artist withdrawals already processed",
      icon: Landmark,
      tone: "text-sky-700 bg-sky-50 border-sky-200",
    },
    {
      label: "Net Admin Revenue",
      value: finance?.revenue[0]
        ? formatMoney(
            finance.revenue[0].adminNetRevenue,
            finance.revenue[0].currency,
          )
        : "—",
      detail:
        finance?.pendingPaypalFeeSyncPayments
          ? `${formatNumber(finance.pendingPaypalFeeSyncPayments)} payment(s) still need fee sync`
          : "clean admin revenue after actual PayPal fees",
      icon: Coins,
      tone: "text-emerald-700 bg-emerald-50 border-emerald-200",
    },
    {
      label: "Top Artist Pairs",
      value: formatNumber(analytics?.topPairs.length ?? 0),
      detail: "repeat order relationships visible",
      icon: ArrowRightLeft,
      tone: "text-amber-700 bg-amber-50 border-amber-200",
    },
  ];

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-950 p-8 text-white shadow-lg">
        <div className="pointer-events-none absolute -right-14 top-0 size-56 rounded-full bg-emerald-500/20 blur-3xl" />
        <div className="pointer-events-none absolute bottom-0 left-1/4 size-48 rounded-full bg-sky-500/10 blur-2xl" />

        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-500/10 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.2em] text-emerald-300">
              <Sparkles className="size-3.5" />
              Revenue Intelligence
            </div>
            <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
              Admin Balance & Order Analytics
            </h1>
            <p className="max-w-2xl text-sm leading-relaxed text-slate-300 md:text-base">
              Review gross volume, website fees, actual PayPal costs, clean admin revenue, and the order segments that generate the most value across the platform.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:min-w-[420px]">
            {highlightCards.map(({ label, value, detail, icon: Icon, tone }) => (
              <div
                key={label}
                className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 backdrop-blur-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-slate-400">
                      {label}
                    </p>
                    <p className="mt-1 text-lg font-semibold text-white">
                      {value}
                    </p>
                    <p className="mt-1 text-xs text-slate-300">{detail}</p>
                  </div>
                  <div className={cn("flex size-10 items-center justify-center rounded-2xl border", tone)}>
                    <Icon className="size-4" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <h2 className="text-lg font-semibold tracking-tight text-zinc-950">
            Admin Balance
          </h2>
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm text-zinc-500">
              Net admin revenue is calculated from platform fees minus actual PayPal capture fees.
            </p>
            <Button
              type="button"
              variant="outline"
              className="rounded-xl border-zinc-200 bg-white"
              onClick={() => syncPaypalFeesMutation.mutate()}
              disabled={syncPaypalFeesMutation.isPending}
            >
              <RefreshCcw
                className={cn(
                  "mr-1.5 size-4",
                  syncPaypalFeesMutation.isPending && "animate-spin",
                )}
              />
              {syncPaypalFeesMutation.isPending
                ? "Syncing PayPal Fees"
                : "Sync PayPal Fees"}
            </Button>
          </div>
        </div>

        {financeQuery.isLoading ? (
          <RevenueSkeleton />
        ) : finance?.revenue.length ? (
          <div className="grid gap-4 xl:grid-cols-3">
            {finance.revenue.map((item) => (
              <RevenueCard key={item.currency} item={item} />
            ))}
          </div>
        ) : (
          <Card className="rounded-3xl border border-dashed border-zinc-200 bg-white/70 shadow-sm">
            <CardContent className="flex min-h-44 flex-col items-center justify-center px-6 text-center">
              <div className="flex size-12 items-center justify-center rounded-2xl bg-zinc-100 text-zinc-500">
                <Coins className="size-5" />
              </div>
              <p className="mt-4 text-base font-semibold text-zinc-900">
                No admin balance data yet
              </p>
              <p className="mt-1 max-w-md text-sm text-zinc-500">
                Revenue cards will populate once completed payments and PayPal fee sync data are available.
              </p>
            </CardContent>
          </Card>
        )}
      </section>

      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <BarChart3 className="size-5 text-zinc-600" />
          <div>
            <h2 className="text-lg font-semibold tracking-tight text-zinc-950">
              Order Analytics
            </h2>
            <p className="text-sm text-zinc-500">
              Top segments now include gross, fees, and net volume.
            </p>
          </div>
        </div>

        {analyticsQuery.isLoading ? (
          <div className="grid gap-4 xl:grid-cols-2 2xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <Card
                key={index}
                className="rounded-3xl border border-zinc-200/80 bg-white shadow-sm"
              >
                <CardHeader>
                  <Skeleton className="h-6 w-40 rounded-xl" />
                  <Skeleton className="h-4 w-48 rounded-full" />
                </CardHeader>
                <CardContent className="space-y-3">
                  <Skeleton className="h-24 w-full rounded-2xl" />
                  <Skeleton className="h-24 w-full rounded-2xl" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : analytics ? (
          <div className="grid gap-4 xl:grid-cols-2 2xl:grid-cols-3">
            <AnalyticsCard
              title="Top Artist-Client Pairs"
              description="Pairing yang paling sering repeat order."
              emptyLabel="No pair data yet."
            >
              {analytics.topPairs.map((item) => (
                <div
                  key={`${item.artist.id}-${item.client.id}`}
                  className="rounded-2xl border border-zinc-100 bg-zinc-50 p-4"
                >
                  <p className="text-sm font-semibold text-zinc-900">
                    @{item.client.username} → @{item.artist.username}
                  </p>
                  <p className="mt-1 text-xs text-zinc-500">
                    {item.orderCount} orders
                  </p>
                  <div className="mt-3">
                    <VolumeBreakdown volumes={item.grossVolume} />
                  </div>
                </div>
              ))}
            </AnalyticsCard>

            <AnalyticsCard
              title="Top Artists"
              description="Artist dengan order volume paling tinggi."
              emptyLabel="No artist data yet."
            >
              {analytics.topArtists.map((item) => (
                <div
                  key={item.id}
                  className="rounded-2xl border border-zinc-100 bg-zinc-50 p-4"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-zinc-900">
                        @{item.username}
                      </p>
                      <p className="mt-1 text-xs text-zinc-500">
                        {item.orderCount} orders
                      </p>
                    </div>
                    <Badge className="rounded-full border border-zinc-200 bg-white text-zinc-700">
                      {item.id}
                    </Badge>
                  </div>
                  <div className="mt-3">
                    <VolumeBreakdown volumes={item.grossVolume} />
                  </div>
                </div>
              ))}
            </AnalyticsCard>

            <AnalyticsCard
              title="Top Clients"
              description="Client dengan jumlah order paling banyak."
              emptyLabel="No client data yet."
            >
              {analytics.topClients.map((item) => (
                <div
                  key={item.id}
                  className="rounded-2xl border border-zinc-100 bg-zinc-50 p-4"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-zinc-900">
                        @{item.username}
                      </p>
                      <p className="mt-1 text-xs text-zinc-500">
                        {item.orderCount} orders
                      </p>
                    </div>
                    <div className="flex size-9 items-center justify-center rounded-2xl border border-zinc-200 bg-white text-zinc-600">
                      <Users className="size-4" />
                    </div>
                  </div>
                  <div className="mt-3">
                    <VolumeBreakdown volumes={item.grossVolume} />
                  </div>
                </div>
              ))}
            </AnalyticsCard>

            <AnalyticsCard
              title="Top Services"
              description="Jasa yang paling sering dipakai."
              emptyLabel="No service data yet."
            >
              {analytics.topServices.map((item) => (
                <div
                  key={item.id}
                  className="rounded-2xl border border-zinc-100 bg-zinc-50 p-4"
                >
                  <p className="text-sm font-semibold text-zinc-900">
                    {item.title}
                  </p>
                  <p className="mt-1 text-xs text-zinc-500">
                    by @{item.artist.username} · {item.orderCount} orders
                  </p>
                  <p className="mt-1 text-xs text-zinc-400">
                    {item.categories.join(", ") || "Uncategorized"}
                  </p>
                  <div className="mt-3">
                    <VolumeBreakdown volumes={item.grossVolume} />
                  </div>
                </div>
              ))}
            </AnalyticsCard>

            <AnalyticsCard
              title="Popular Categories"
              description="Kategori layanan yang paling banyak dipakai."
              emptyLabel="No category data yet."
            >
              {analytics.topCategories.map((item) => (
                <div
                  key={item.name}
                  className="rounded-2xl border border-zinc-100 bg-zinc-50 p-4"
                >
                  <p className="text-sm font-semibold text-zinc-900">
                    {item.name}
                  </p>
                  <p className="mt-1 text-xs text-zinc-500">
                    {item.orderCount} orders · {item.serviceCount} services
                  </p>
                  <div className="mt-3">
                    <VolumeBreakdown volumes={item.grossVolume} />
                  </div>
                </div>
              ))}
            </AnalyticsCard>

            <AnalyticsCard
              title="Order Types"
              description="Distribusi source order saat ini."
              emptyLabel="No source data yet."
            >
              {analytics.sources.map((item) => (
                <div
                  key={item.source}
                  className="rounded-2xl border border-zinc-100 bg-zinc-50 p-4"
                >
                  <p className="text-sm font-semibold text-zinc-900">
                    {item.source}
                  </p>
                  <p className="mt-1 text-xs text-zinc-500">
                    {item.orderCount} orders
                  </p>
                  <div className="mt-3">
                    <VolumeBreakdown volumes={item.grossVolume} />
                  </div>
                </div>
              ))}
            </AnalyticsCard>
          </div>
        ) : (
          <Card className="rounded-3xl border border-dashed border-zinc-200 bg-white/70 shadow-sm">
            <CardContent className="flex min-h-44 flex-col items-center justify-center px-6 text-center">
              <div className="flex size-12 items-center justify-center rounded-2xl bg-zinc-100 text-zinc-500">
                <BarChart3 className="size-5" />
              </div>
              <p className="mt-4 text-base font-semibold text-zinc-900">
                Order analytics unavailable
              </p>
              <p className="mt-1 max-w-md text-sm text-zinc-500">
                The analytics cards will appear here once the admin analytics endpoint returns ranking data.
              </p>
            </CardContent>
          </Card>
        )}
      </section>
    </div>
  );
}
