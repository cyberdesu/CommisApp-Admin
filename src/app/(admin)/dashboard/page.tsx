"use client";

import { useMemo, useState } from "react";

import { AttentionQueues } from "./_components/AttentionQueues";
import { CategoryMix } from "./_components/CategoryMix";
import { CriticalActivity } from "./_components/CriticalActivity";
import { GmvChartPanel } from "./_components/GmvChartPanel";
import { KpiStrip } from "./_components/KpiStrip";
import { OrderFunnel } from "./_components/OrderFunnel";
import { PageHead } from "./_components/PageHead";
import { SystemHealth } from "./_components/SystemHealth";
import { TopArtists } from "./_components/TopArtists";
import { useDashboardData } from "./_hooks/useDashboardData";
import {
  buildSparkSamples,
  compactCurrency,
  compactNumber,
  formatPct,
} from "./_lib/helpers";
import type { DashboardRange, KpiCellData } from "./_lib/types";

export default function DashboardPage() {
  const [range, setRange] = useState<DashboardRange>("7d");
  const [lastRefreshAt, setLastRefreshAt] = useState<Date | null>(() => new Date());

  const {
    financeQuery,
    ordersStatsQuery,
    ordersAnalyticsQuery,
    payoutStatsQuery,
    artistRequestsQuery,
    refetchAll,
    isLoading,
  } = useDashboardData();

  const finance = financeQuery.data?.finance;
  const ordersStats = ordersStatsQuery.data;
  const ordersAnalytics = ordersAnalyticsQuery.data;
  const payouts = payoutStatsQuery.data;
  const artistPendingTotal = artistRequestsQuery.data ?? 0;

  const primary = finance?.revenue?.[0];
  const gmv = primary ? Number.parseFloat(primary.grossVolume) || 0 : 0;
  const fees = primary ? Number.parseFloat(primary.platformFees) || 0 : 0;
  const netToArtists = primary
    ? Number.parseFloat(primary.artistPayouts) || 0
    : 0;
  const currency = primary?.currency ?? "USD";

  const totalOrders = ordersStats?.total ?? 0;
  const activeOrders = ordersStats?.active ?? 0;
  const completedPayments = finance?.completedPayments ?? 0;
  const refundRateRaw =
    totalOrders > 0 && ordersStats
      ? ((ordersStats.total -
          ordersStats.active -
          ordersStats.delivered -
          ordersStats.completed) /
          totalOrders) *
        100
      : 0;
  const refundRate = Math.max(0, refundRateRaw);

  const userTotal = financeQuery.data?.totalUsers ?? 0;
  const artistTotal = financeQuery.data?.verifiedArtistCount ?? 0;

  const kpiCells: KpiCellData[] = useMemo(
    () => [
      {
        key: "gmv",
        label: `GMV · ${range}`,
        value: compactCurrency(gmv, currency),
        sub: "Gross volume",
        accent: undefined,
        spark: buildSparkSamples("gmv"),
      },
      {
        key: "fees",
        label: "Platform fees",
        value: compactCurrency(fees, currency),
        sub: gmv > 0 ? `${((fees / gmv) * 100).toFixed(1)}% of GMV` : "—",
        accent: "primary",
        spark: buildSparkSamples("fees"),
      },
      {
        key: "orders",
        label: `Orders · ${range}`,
        value: compactNumber(totalOrders),
        sub: `${activeOrders} active`,
        spark: buildSparkSamples("orders"),
      },
      {
        key: "users",
        label: `Total users`,
        value: compactNumber(userTotal),
        sub: `${compactNumber(artistTotal)} verified artists`,
        spark: buildSparkSamples("users"),
      },
      {
        key: "conversion",
        label: "Completed payments",
        value: compactNumber(completedPayments),
        sub: "Captured by PayPal",
        spark: buildSparkSamples("conversion"),
      },
      {
        key: "refund",
        label: "Cancelled rate",
        value: formatPct(refundRate, 1),
        sub: "Cancelled / refunded share",
        accent: "rose",
        spark: buildSparkSamples("refund"),
      },
    ],
    [
      range,
      gmv,
      currency,
      fees,
      totalOrders,
      activeOrders,
      userTotal,
      artistTotal,
      completedPayments,
      refundRate,
    ],
  );

  function handleRefresh() {
    refetchAll();
    setLastRefreshAt(new Date());
  }

  return (
    <div className="space-y-5">
      <PageHead
        range={range}
        onRangeChange={setRange}
        onRefresh={handleRefresh}
        isRefreshing={isLoading}
        lastRefreshAt={lastRefreshAt}
      />

      <KpiStrip cells={kpiCells} />

      <AttentionQueues
        pendingPayouts={payouts?.pending ?? 0}
        artistVerifications={artistPendingTotal}
        refundRequests={0}
        openTickets={0}
      />

      <section className="grid gap-4 lg:grid-cols-[minmax(0,1.65fr)_minmax(0,1fr)]">
        <GmvChartPanel
          gmv={gmv}
          fees={fees}
          netToArtists={netToArtists}
          ordersCount={totalOrders}
          currency={currency}
        />
        <CriticalActivity
          pendingPayouts={payouts?.pending ?? 0}
          refundRequests={0}
          artistVerifications={artistPendingTotal}
        />
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <OrderFunnel stats={ordersStats} />
        <TopArtists analytics={ordersAnalytics} />
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <CategoryMix analytics={ordersAnalytics} />
        <SystemHealth />
      </section>
    </div>
  );
}
