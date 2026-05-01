"use client";

import { useMemo } from "react";
import axios from "axios";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowDownToLine,
  ArrowRightLeft,
  Banknote,
  BarChart3,
  CheckCircle2,
  Coins,
  CreditCard,
  Layers3,
  Landmark,
  RefreshCcw,
  Receipt,
  TrendingUp,
  Users,
  WalletCards,
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

type SyncPaypalPayoutFeesResponse = {
  message: string;
  data: {
    scanned: number;
    synced: number;
    pending: number;
    failed: number;
  };
};

type MoneyField =
  | "grossVolume"
  | "platformFees"
  | "paymentPaypalFees"
  | "payoutPaypalFees"
  | "adminNetProfit"
  | "artistPayouts";

type RankedOrderItem = {
  key: string;
  title: string;
  subtitle: string;
  badge?: string;
  orderCount: number;
  volumes: OrderAnalyticsVolume[];
};

function parseMoneyValue(amount: string) {
  const numeric = Number(amount);
  return Number.isFinite(numeric) ? numeric : 0;
}

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

function formatPercent(value: number, total: number) {
  if (!Number.isFinite(value) || !Number.isFinite(total) || total <= 0) {
    return "0%";
  }

  return `${Math.round((value / total) * 100)}%`;
}

function getPrimaryRevenue(
  revenue: PlatformRevenueCurrencyBreakdown[] | undefined,
) {
  if (!revenue?.length) return null;

  return [...revenue].sort(
    (a, b) =>
      parseMoneyValue(b.adminNetProfit) - parseMoneyValue(a.adminNetProfit),
  )[0];
}

function getVolumeAmount(volumes: OrderAnalyticsVolume[]) {
  return volumes.reduce((total, volume) => total + parseMoneyValue(volume.amount), 0);
}

function SyncBadge({
  pending,
  synced,
  label,
}: {
  pending: number;
  synced: number;
  label: string;
}) {
  if (pending > 0) {
    return (
      <Badge className="rounded-md border border-amber-200 bg-amber-50 px-2 py-1 text-[11px] font-semibold text-amber-800">
        {formatNumber(pending)} {label} fee pending
      </Badge>
    );
  }

  return (
    <Badge className="rounded-md border border-emerald-200 bg-emerald-50 px-2 py-1 text-[11px] font-semibold text-emerald-700">
      <CheckCircle2 className="mr-1 size-3" />
      {formatNumber(synced)} {label} fee synced
    </Badge>
  );
}

function CurrencyValueList({
  revenue,
  field,
  valueClassName,
}: {
  revenue: PlatformRevenueCurrencyBreakdown[];
  field: MoneyField;
  valueClassName?: string;
}) {
  if (revenue.length === 0) {
    return <span className="text-zinc-400">-</span>;
  }

  return (
    <div className="flex flex-wrap gap-2">
      {revenue.map((item) => (
        <span
          key={`${item.currency}-${field}`}
          className={cn(
            "rounded-md border border-zinc-200 bg-white px-2.5 py-1 font-semibold text-zinc-900",
            valueClassName,
          )}
        >
          {formatMoney(item[field], item.currency)}
        </span>
      ))}
    </div>
  );
}

function SummaryTile({
  label,
  detail,
  icon: Icon,
  children,
}: {
  label: string;
  detail: string;
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}) {
  return (
    <Card className="border border-border bg-card shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 space-y-1">
            <CardDescription className="text-xs font-semibold text-muted-foreground">
              {label}
            </CardDescription>
            <CardTitle className="text-xl font-bold tracking-tight text-foreground">
              {children}
            </CardTitle>
          </div>
          <div className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-border bg-secondary/55 text-muted-foreground">
            <Icon className="size-5" />
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <p className="text-xs leading-relaxed text-muted-foreground">{detail}</p>
      </CardContent>
    </Card>
  );
}

function AdminEarningsHero({
  finance,
  isLoading,
}: {
  finance: PlatformFinanceStats | undefined;
  isLoading: boolean;
}) {
  const revenue = finance?.revenue ?? [];
  const primary = getPrimaryRevenue(revenue);
  const totalPending =
    (finance?.pendingPaymentFeeSyncPayments ?? 0) +
    (finance?.pendingPayoutFeeSyncPayouts ?? 0);

  return (
    <section className="grid gap-4 xl:grid-cols-[minmax(0,1.25fr)_minmax(360px,0.75fr)]">
      <Card className="border border-border bg-card shadow-sm">
        <CardHeader className="border-b border-border/70 pb-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-2">
              <Badge className="w-fit rounded-md border border-primary/20 bg-primary/10 px-2.5 py-1 text-[11px] font-bold text-primary">
                Revenue & Analytics
              </Badge>
              <div>
                <CardTitle className="text-2xl font-bold tracking-tight text-foreground md:text-3xl">
                  Penghasilan Admin Bersih
                </CardTitle>
                <CardDescription className="mt-2 max-w-2xl text-sm leading-relaxed">
                  Angka utama yang admin bawa pulang setelah website fee dikurangi
                  biaya PayPal masuk dan biaya payout artist.
                </CardDescription>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <SyncBadge
                label="payment"
                pending={finance?.pendingPaymentFeeSyncPayments ?? 0}
                synced={finance?.syncedPaymentFeePayments ?? 0}
              />
              <SyncBadge
                label="payout"
                pending={finance?.pendingPayoutFeeSyncPayouts ?? 0}
                synced={finance?.syncedPayoutFeePayouts ?? 0}
              />
            </div>
          </div>
        </CardHeader>

        <CardContent className="grid gap-5 pt-5 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-5">
            <p className="text-xs font-bold uppercase tracking-wider text-emerald-700">
              Admin Net Profit
            </p>
            {isLoading ? (
              <Skeleton className="mt-3 h-11 w-56 rounded-lg" />
            ) : primary ? (
              <>
                <p className="mt-2 text-4xl font-black tracking-tight text-emerald-950">
                  {formatMoney(primary.adminNetProfit, primary.currency)}
                </p>
                {revenue.length > 1 && (
                  <div className="mt-3">
                    <CurrencyValueList
                      revenue={revenue.filter(
                        (item) => item.currency !== primary.currency,
                      )}
                      field="adminNetProfit"
                      valueClassName="border-emerald-200 bg-white text-emerald-900"
                    />
                  </div>
                )}
              </>
            ) : (
              <p className="mt-2 text-3xl font-black tracking-tight text-emerald-950">
                -
              </p>
            )}
            <p className="mt-3 text-sm leading-relaxed text-emerald-900/80">
              Formula: platform fee - payment PayPal fee - payout PayPal fee.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-zinc-200 bg-white p-4">
              <p className="text-xs font-semibold text-zinc-500">
                Gross volume
              </p>
              <div className="mt-2 text-sm">
                {isLoading ? (
                  <Skeleton className="h-8 w-44 rounded-lg" />
                ) : (
                  <CurrencyValueList revenue={revenue} field="grossVolume" />
                )}
              </div>
            </div>
            <div className="rounded-xl border border-zinc-200 bg-white p-4">
              <p className="text-xs font-semibold text-zinc-500">
                Website fee terkumpul
              </p>
              <div className="mt-2 text-sm">
                {isLoading ? (
                  <Skeleton className="h-8 w-44 rounded-lg" />
                ) : (
                  <CurrencyValueList revenue={revenue} field="platformFees" />
                )}
              </div>
            </div>
            <div className="rounded-xl border border-zinc-200 bg-white p-4">
              <p className="text-xs font-semibold text-zinc-500">
                Biaya PayPal total
              </p>
              <div className="mt-2 text-sm">
                {isLoading ? (
                  <Skeleton className="h-8 w-44 rounded-lg" />
                ) : revenue.length ? (
                  <div className="flex flex-wrap gap-2">
                    {revenue.map((item) => {
                      const totalFee =
                        parseMoneyValue(item.paymentPaypalFees) +
                        parseMoneyValue(item.payoutPaypalFees);

                      return (
                        <span
                          key={`${item.currency}-paypal-total`}
                          className="rounded-md border border-rose-200 bg-rose-50 px-2.5 py-1 font-semibold text-rose-900"
                        >
                          {formatMoney(String(totalFee), item.currency)}
                        </span>
                      );
                    })}
                  </div>
                ) : (
                  <span className="text-zinc-400">-</span>
                )}
              </div>
            </div>
            <div className="rounded-xl border border-zinc-200 bg-white p-4">
              <p className="text-xs font-semibold text-zinc-500">
                Status akurasi fee
              </p>
              <p
                className={cn(
                  "mt-2 text-sm font-semibold",
                  totalPending > 0 ? "text-amber-700" : "text-emerald-700",
                )}
              >
                {totalPending > 0
                  ? `${formatNumber(totalPending)} fee masih perlu sync`
                  : "Semua fee sudah tersinkron"}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
        <SummaryTile
          label="Completed Payments"
          detail="Pembayaran client yang masuk ke kalkulasi revenue."
          icon={Receipt}
        >
          {isLoading ? (
            <Skeleton className="h-7 w-24 rounded-lg" />
          ) : (
            formatNumber(finance?.completedPayments ?? 0)
          )}
        </SummaryTile>
        <SummaryTile
          label="Processed Payouts"
          detail="Withdrawal artist yang sudah diproses admin."
          icon={Landmark}
        >
          {isLoading ? (
            <Skeleton className="h-7 w-24 rounded-lg" />
          ) : (
            formatNumber(finance?.processedPayouts ?? 0)
          )}
        </SummaryTile>
      </div>
    </section>
  );
}

function FormulaStep({
  label,
  value,
  tone,
  sign,
}: {
  label: string;
  value: string;
  tone: "green" | "red" | "blue" | "zinc";
  sign: "+" | "-" | "=";
}) {
  const toneClass = {
    green: "border-emerald-200 bg-emerald-50 text-emerald-950",
    red: "border-rose-200 bg-rose-50 text-rose-950",
    blue: "border-sky-200 bg-sky-50 text-sky-950",
    zinc: "border-zinc-200 bg-zinc-50 text-zinc-950",
  }[tone];

  return (
    <div className={cn("rounded-xl border p-4", toneClass)}>
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-bold uppercase tracking-wider opacity-70">
          {label}
        </p>
        <span className="rounded-md bg-white/70 px-2 py-0.5 text-xs font-black">
          {sign}
        </span>
      </div>
      <p className="mt-2 text-lg font-black tracking-tight">{value}</p>
    </div>
  );
}

function RevenueShareBar({ item }: { item: PlatformRevenueCurrencyBreakdown }) {
  const gross = parseMoneyValue(item.grossVolume);
  const artist = Math.max(parseMoneyValue(item.artistPayouts), 0);
  const paymentFee = Math.max(parseMoneyValue(item.paymentPaypalFees), 0);
  const payoutFee = Math.max(parseMoneyValue(item.payoutPaypalFees), 0);
  const adminNet = Math.max(parseMoneyValue(item.adminNetProfit), 0);
  const totalVisible = Math.max(gross, artist + paymentFee + payoutFee + adminNet, 1);
  const segments = [
    {
      label: "Artist",
      value: artist,
      className: "bg-sky-400",
    },
    {
      label: "PayPal fees",
      value: paymentFee + payoutFee,
      className: "bg-rose-400",
    },
    {
      label: "Admin net",
      value: adminNet,
      className: "bg-emerald-500",
    },
  ];

  return (
    <div className="space-y-3">
      <div className="flex h-3 overflow-hidden rounded-full bg-zinc-100">
        {segments.map((segment) => (
          <div
            key={segment.label}
            className={segment.className}
            style={{
              width: `${Math.max((segment.value / totalVisible) * 100, segment.value > 0 ? 3 : 0)}%`,
            }}
          />
        ))}
      </div>
      <div className="grid gap-2 text-xs sm:grid-cols-3">
        {segments.map((segment) => (
          <div key={segment.label} className="flex items-center gap-2">
            <span className={cn("size-2 rounded-full", segment.className)} />
            <span className="text-zinc-500">{segment.label}</span>
            <span className="font-semibold text-zinc-900">
              {formatPercent(segment.value, totalVisible)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function RevenueCard({
  item,
}: {
  item: PlatformRevenueCurrencyBreakdown;
}) {
  const gross = parseMoneyValue(item.grossVolume);
  const platformFee = parseMoneyValue(item.platformFees);
  const paymentFee = parseMoneyValue(item.paymentPaypalFees);
  const payoutFee = parseMoneyValue(item.payoutPaypalFees);
  const net = parseMoneyValue(item.adminNetProfit);
  const paypalFeeTotal = paymentFee + payoutFee;

  return (
    <Card className="border border-border bg-card shadow-sm">
      <CardHeader className="border-b border-border/70 pb-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="flex size-10 items-center justify-center rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-700">
                <Coins className="size-5" />
              </div>
              <div>
                <CardDescription className="text-xs font-semibold">
                  Currency
                </CardDescription>
                <CardTitle className="text-2xl font-black tracking-tight">
                  {item.currency}
                </CardTitle>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-right">
            <p className="text-xs font-bold uppercase tracking-wider text-emerald-700">
              Admin dapat
            </p>
            <p className="mt-1 text-2xl font-black tracking-tight text-emerald-950">
              {formatMoney(item.adminNetProfit, item.currency)}
            </p>
            <p className="mt-1 text-xs text-emerald-800">
              {formatPercent(net, gross)} dari gross volume
            </p>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-5 pt-5">
        <div className="grid gap-3 md:grid-cols-4">
          <FormulaStep
            label="Website fee"
            sign="+"
            tone="green"
            value={formatMoney(item.platformFees, item.currency)}
          />
          <FormulaStep
            label="Payment fee"
            sign="-"
            tone="red"
            value={formatMoney(item.paymentPaypalFees, item.currency)}
          />
          <FormulaStep
            label="Payout fee"
            sign="-"
            tone="red"
            value={formatMoney(item.payoutPaypalFees, item.currency)}
          />
          <FormulaStep
            label="Admin net"
            sign="="
            tone="blue"
            value={formatMoney(item.adminNetProfit, item.currency)}
          />
        </div>

        <div className="rounded-xl border border-zinc-200 bg-white p-4">
          <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-sm font-bold text-zinc-950">
                Distribusi dari Gross Volume
              </p>
              <p className="text-xs text-zinc-500">
                Gross {formatMoney(item.grossVolume, item.currency)} dibagi ke artist,
                biaya PayPal, dan admin net.
              </p>
            </div>
            <Badge className="w-fit rounded-md border border-zinc-200 bg-zinc-50 text-zinc-700">
              PayPal fees {formatMoney(String(paypalFeeTotal), item.currency)}
            </Badge>
          </div>
          <RevenueShareBar item={item} />
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          <div className="rounded-xl border border-zinc-200 bg-white p-4">
            <p className="text-xs font-semibold text-zinc-500">
              Gross Volume
            </p>
            <p className="mt-1 text-lg font-black text-zinc-950">
              {formatMoney(item.grossVolume, item.currency)}
            </p>
          </div>
          <div className="rounded-xl border border-zinc-200 bg-white p-4">
            <p className="text-xs font-semibold text-zinc-500">
              Artist Payouts
            </p>
            <p className="mt-1 text-lg font-black text-zinc-950">
              {formatMoney(item.artistPayouts, item.currency)}
            </p>
          </div>
          <div className="rounded-xl border border-zinc-200 bg-white p-4">
            <p className="text-xs font-semibold text-zinc-500">
              Margin dari platform fee
            </p>
            <p className="mt-1 text-lg font-black text-zinc-950">
              {formatPercent(net, platformFee)}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <SyncBadge
            label="payment"
            pending={item.pendingPaymentFeeSyncPayments}
            synced={item.syncedPaymentFeePayments}
          />
          <Badge className="rounded-md border border-zinc-200 bg-white px-2 py-1 text-[11px] font-semibold text-zinc-700">
            Currency bucket {item.currency}
          </Badge>
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
      {volumes.slice(0, 3).map((volume) => (
        <div
          key={volume.currency}
          className="grid gap-2 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs sm:grid-cols-3"
        >
          <div>
            <p className="font-bold text-zinc-950">
              {formatMoney(volume.amount, volume.currency)}
            </p>
            <p className="text-zinc-500">Gross</p>
          </div>
          <div>
            <p className="font-bold text-amber-700">
              {formatMoney(volume.platformFees, volume.currency)}
            </p>
            <p className="text-zinc-500">Website fee</p>
          </div>
          <div>
            <p className="font-bold text-sky-700">
              {formatMoney(volume.netVolume, volume.currency)}
            </p>
            <p className="text-zinc-500">Artist net</p>
          </div>
        </div>
      ))}
    </div>
  );
}

function RankingRow({
  item,
  index,
  maxAmount,
}: {
  item: RankedOrderItem;
  index: number;
  maxAmount: number;
}) {
  const amount = getVolumeAmount(item.volumes);
  const width = maxAmount > 0 ? Math.max((amount / maxAmount) * 100, 6) : 0;

  return (
    <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4">
      <div className="flex items-start gap-3">
        <div className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-zinc-200 bg-white text-xs font-black text-zinc-700">
          {index + 1}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <p className="truncate text-sm font-bold text-zinc-950">
                {item.title}
              </p>
              <p className="mt-0.5 text-xs text-zinc-500">{item.subtitle}</p>
            </div>
            <div className="flex shrink-0 flex-wrap gap-2">
              {item.badge && (
                <Badge className="rounded-md border border-zinc-200 bg-white text-zinc-700">
                  {item.badge}
                </Badge>
              )}
              <Badge className="rounded-md border border-primary/20 bg-primary/10 text-primary">
                {formatNumber(item.orderCount)} orders
              </Badge>
            </div>
          </div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-zinc-200">
            <div
              className="h-full rounded-full bg-primary"
              style={{ width: `${width}%` }}
            />
          </div>
          <div className="mt-3">
            <VolumeBreakdown volumes={item.volumes} />
          </div>
        </div>
      </div>
    </div>
  );
}

function RankingCard({
  title,
  description,
  emptyLabel,
  icon: Icon,
  items,
}: {
  title: string;
  description: string;
  emptyLabel: string;
  icon: React.ComponentType<{ className?: string }>;
  items: RankedOrderItem[];
}) {
  const maxAmount = Math.max(...items.map((item) => getVolumeAmount(item.volumes)), 0);

  return (
    <Card className="border border-border bg-card shadow-sm">
      <CardHeader className="border-b border-border/70 pb-4">
        <div className="flex items-start gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-border bg-secondary/55 text-muted-foreground">
            <Icon className="size-5" />
          </div>
          <div>
            <CardTitle className="text-lg font-bold text-foreground">
              {title}
            </CardTitle>
            <CardDescription>{description}</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 pt-4">
        {items.length > 0 ? (
          items.map((item, index) => (
            <RankingRow
              key={item.key}
              item={item}
              index={index}
              maxAmount={maxAmount}
            />
          ))
        ) : (
          <p className="rounded-xl border border-dashed border-zinc-200 bg-zinc-50 p-5 text-sm text-zinc-500">
            {emptyLabel}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function RevenueSkeleton() {
  return (
    <div className="grid gap-4">
      {Array.from({ length: 2 }).map((_, index) => (
        <Card
          key={index}
          className="border border-zinc-200/80 bg-white shadow-sm"
        >
          <CardHeader className="border-b border-zinc-100 pb-4">
            <Skeleton className="h-5 w-24 rounded-full" />
            <Skeleton className="mt-2 h-9 w-48 rounded-lg" />
          </CardHeader>
          <CardContent className="space-y-4 pt-5">
            <div className="grid gap-3 md:grid-cols-4">
              {Array.from({ length: 4 }).map((_, tileIndex) => (
                <Skeleton key={tileIndex} className="h-24 w-full rounded-xl" />
              ))}
            </div>
            <Skeleton className="h-28 w-full rounded-xl" />
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

  const syncPaypalPayoutFeesMutation = useMutation({
    mutationFn: async () => {
      const response = await apiClient.post<SyncPaypalPayoutFeesResponse>(
        "/finance/paypal-payout-fees/sync",
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
        toast.error(
          error.response?.data?.message ?? "Failed to sync PayPal payout fees",
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
  const sortedRevenue = useMemo(
    () =>
      [...(finance?.revenue ?? [])].sort(
        (a, b) =>
          parseMoneyValue(b.adminNetProfit) - parseMoneyValue(a.adminNetProfit),
      ),
    [finance?.revenue],
  );

  const rankingSections = useMemo(() => {
    if (!analytics) return null;

    return {
      pairs: analytics.topPairs.map((item) => ({
        key: `${item.artist.id}-${item.client.id}`,
        title: `@${item.client.username} -> @${item.artist.username}`,
        subtitle: "Client dan artist dengan repeat order tertinggi",
        orderCount: item.orderCount,
        volumes: item.grossVolume,
      })),
      artists: analytics.topArtists.map((item) => ({
        key: String(item.id),
        title: `@${item.username}`,
        subtitle: item.name ?? "Artist",
        badge: `ID ${item.id}`,
        orderCount: item.orderCount,
        volumes: item.grossVolume,
      })),
      clients: analytics.topClients.map((item) => ({
        key: String(item.id),
        title: `@${item.username}`,
        subtitle: item.name ?? "Client",
        badge: `ID ${item.id}`,
        orderCount: item.orderCount,
        volumes: item.grossVolume,
      })),
      services: analytics.topServices.map((item) => ({
        key: item.id,
        title: item.title,
        subtitle: `by @${item.artist.username}`,
        badge: item.categories.join(", ") || "Uncategorized",
        orderCount: item.orderCount,
        volumes: item.grossVolume,
      })),
      categories: analytics.topCategories.map((item) => ({
        key: item.name,
        title: item.name,
        subtitle: `${formatNumber(item.serviceCount)} services aktif di kategori ini`,
        orderCount: item.orderCount,
        volumes: item.grossVolume,
      })),
      sources: analytics.sources.map((item) => ({
        key: item.source,
        title: item.source === "SERVICE" ? "Service orders" : "Custom requests",
        subtitle:
          item.source === "SERVICE"
            ? "Order yang datang dari service listing"
            : "Order yang datang dari request custom",
        orderCount: item.orderCount,
        volumes: item.grossVolume,
      })),
    };
  }, [analytics]);

  return (
    <div className="space-y-6">
      <AdminEarningsHero
        finance={finance}
        isLoading={financeQuery.isLoading}
      />

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryTile
          label="Currencies"
          detail="Jumlah currency bucket yang punya revenue."
          icon={Layers3}
        >
          {financeQuery.isLoading ? (
            <Skeleton className="h-7 w-16 rounded-lg" />
          ) : (
            formatNumber(finance?.revenue.length ?? 0)
          )}
        </SummaryTile>
        <SummaryTile
          label="Website Fees"
          detail="Fee platform kotor sebelum dipotong biaya PayPal."
          icon={Banknote}
        >
          {financeQuery.isLoading ? (
            <Skeleton className="h-7 w-32 rounded-lg" />
          ) : (
            <CurrencyValueList revenue={sortedRevenue} field="platformFees" />
          )}
        </SummaryTile>
        <SummaryTile
          label="PayPal Costs"
          detail="Total biaya incoming payment dan outgoing payout."
          icon={CreditCard}
        >
          {financeQuery.isLoading ? (
            <Skeleton className="h-7 w-32 rounded-lg" />
          ) : sortedRevenue.length ? (
            <div className="flex flex-wrap gap-2">
              {sortedRevenue.map((item) => {
                const totalFee =
                  parseMoneyValue(item.paymentPaypalFees) +
                  parseMoneyValue(item.payoutPaypalFees);

                return (
                  <span
                    key={`${item.currency}-cost-summary`}
                    className="rounded-md border border-rose-200 bg-rose-50 px-2.5 py-1 font-semibold text-rose-900"
                  >
                    {formatMoney(String(totalFee), item.currency)}
                  </span>
                );
              })}
            </div>
          ) : (
            <span className="text-zinc-400">-</span>
          )}
        </SummaryTile>
        <SummaryTile
          label="Order Segments"
          detail="Ranking analytics yang sudah tersedia dari order platform."
          icon={TrendingUp}
        >
          {analyticsQuery.isLoading ? (
            <Skeleton className="h-7 w-16 rounded-lg" />
          ) : (
            formatNumber(
              (analytics?.topPairs.length ?? 0) +
                (analytics?.topArtists.length ?? 0) +
                (analytics?.topClients.length ?? 0) +
                (analytics?.topServices.length ?? 0) +
                (analytics?.topCategories.length ?? 0) +
                (analytics?.sources.length ?? 0),
            )
          )}
        </SummaryTile>
      </section>

      <section className="space-y-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="text-lg font-bold tracking-tight text-foreground">
              Revenue Breakdown
            </h2>
            <p className="text-sm text-muted-foreground">
              Baca dari kiri ke kanan: website fee masuk, PayPal cost keluar,
              lalu sisa bersih untuk admin.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              className="rounded-lg border-border bg-card"
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
                ? "Syncing Payment Fees"
                : "Sync Payment Fees"}
            </Button>
            <Button
              type="button"
              variant="outline"
              className="rounded-lg border-border bg-card"
              onClick={() => syncPaypalPayoutFeesMutation.mutate()}
              disabled={syncPaypalPayoutFeesMutation.isPending}
            >
              <RefreshCcw
                className={cn(
                  "mr-1.5 size-4",
                  syncPaypalPayoutFeesMutation.isPending && "animate-spin",
                )}
              />
              {syncPaypalPayoutFeesMutation.isPending
                ? "Syncing Payout Fees"
                : "Sync Payout Fees"}
            </Button>
          </div>
        </div>

        {financeQuery.isLoading ? (
          <RevenueSkeleton />
        ) : sortedRevenue.length ? (
          <div className="grid gap-4">
            {sortedRevenue.map((item) => (
              <RevenueCard key={item.currency} item={item} />
            ))}
          </div>
        ) : (
          <Card className="border border-dashed border-zinc-200 bg-white/70 shadow-sm">
            <CardContent className="flex min-h-44 flex-col items-center justify-center px-6 text-center">
              <div className="flex size-12 items-center justify-center rounded-lg bg-zinc-100 text-zinc-500">
                <Coins className="size-5" />
              </div>
              <p className="mt-4 text-base font-semibold text-zinc-900">
                Belum ada revenue
              </p>
              <p className="mt-1 max-w-md text-sm text-zinc-500">
                Data akan muncul setelah ada completed payment dan data fee PayPal.
              </p>
            </CardContent>
          </Card>
        )}
      </section>

      <section className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground">
            <BarChart3 className="size-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold tracking-tight text-foreground">
              Order Analytics
            </h2>
            <p className="text-sm text-muted-foreground">
              Ranking dibuat lebih compact supaya top contributor gampang dibandingkan.
            </p>
          </div>
        </div>

        {analyticsQuery.isLoading ? (
          <div className="grid gap-4 xl:grid-cols-2">
            {Array.from({ length: 4 }).map((_, index) => (
              <Card
                key={index}
                className="border border-zinc-200/80 bg-white shadow-sm"
              >
                <CardHeader>
                  <Skeleton className="h-6 w-40 rounded-lg" />
                  <Skeleton className="h-4 w-48 rounded-full" />
                </CardHeader>
                <CardContent className="space-y-3">
                  <Skeleton className="h-32 w-full rounded-xl" />
                  <Skeleton className="h-32 w-full rounded-xl" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : rankingSections ? (
          <div className="grid gap-4 xl:grid-cols-2">
            <RankingCard
              title="Top Artist-Client Pairs"
              description="Pair yang paling sering menghasilkan order."
              emptyLabel="Belum ada pair data."
              icon={ArrowRightLeft}
              items={rankingSections.pairs}
            />
            <RankingCard
              title="Top Artists"
              description="Artist dengan kontribusi volume tertinggi."
              emptyLabel="Belum ada artist data."
              icon={WalletCards}
              items={rankingSections.artists}
            />
            <RankingCard
              title="Top Clients"
              description="Client dengan order dan volume tertinggi."
              emptyLabel="Belum ada client data."
              icon={Users}
              items={rankingSections.clients}
            />
            <RankingCard
              title="Top Services"
              description="Service yang paling kuat performanya."
              emptyLabel="Belum ada service data."
              icon={Receipt}
              items={rankingSections.services}
            />
            <RankingCard
              title="Popular Categories"
              description="Kategori yang paling sering menghasilkan order."
              emptyLabel="Belum ada category data."
              icon={Layers3}
              items={rankingSections.categories}
            />
            <RankingCard
              title="Order Types"
              description="Perbandingan service order dan custom request."
              emptyLabel="Belum ada source data."
              icon={ArrowDownToLine}
              items={rankingSections.sources}
            />
          </div>
        ) : (
          <Card className="border border-dashed border-zinc-200 bg-white/70 shadow-sm">
            <CardContent className="flex min-h-44 flex-col items-center justify-center px-6 text-center">
              <div className="flex size-12 items-center justify-center rounded-lg bg-zinc-100 text-zinc-500">
                <BarChart3 className="size-5" />
              </div>
              <p className="mt-4 text-base font-semibold text-zinc-900">
                Analytics order belum tersedia
              </p>
              <p className="mt-1 max-w-md text-sm text-zinc-500">
                Ranking akan muncul setelah endpoint analytics mengembalikan data.
              </p>
            </CardContent>
          </Card>
        )}
      </section>
    </div>
  );
}
