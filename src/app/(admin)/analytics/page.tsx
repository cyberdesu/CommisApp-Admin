"use client";

import { useMemo, useState } from "react";
import { Info } from "lucide-react";

import { AsidePanel } from "./_components/AsidePanel";
import { KpiStrip } from "./_components/KpiStrip";
import { PageHead } from "./_components/PageHead";
import { RankingsPanel } from "./_components/RankingsPanel";
import { RevenueDistribution } from "./_components/RevenueDistribution";
import { SyncBanner } from "./_components/SyncBanner";
import { useAnalyticsData } from "./_hooks/useAnalyticsData";
import { useSyncShortcut } from "./_hooks/useSyncShortcut";
import { parseMoney, pickPrimary } from "./_lib/helpers";
import {
  buildRankSections,
  rankMaxByKey as computeRankMaxByKey,
  sortRanks,
} from "./_lib/rankings";
import type { Aggregate, RankTab, SortKey } from "./_lib/types";

export default function AnalyticsPage() {
  const { financeQuery, analyticsQuery, isSyncing, syncAll } =
    useAnalyticsData();

  const finance = financeQuery.data;
  const analytics = analyticsQuery.data;

  const sortedRevenue = useMemo(
    () =>
      [...(finance?.revenue ?? [])].sort(
        (a, b) =>
          parseMoney(b.adminNetProfit) - parseMoney(a.adminNetProfit),
      ),
    [finance?.revenue],
  );

  const [pickedCurrency, setPickedCurrency] = useState<string | null>(null);

  const focusCurrency = useMemo(() => {
    if (!sortedRevenue.length) return null;
    if (pickedCurrency) {
      return (
        sortedRevenue.find((r) => r.currency === pickedCurrency) ??
        sortedRevenue[0]
      );
    }
    return pickPrimary(sortedRevenue) ?? sortedRevenue[0];
  }, [pickedCurrency, sortedRevenue]);

  const aggregate = useMemo<Aggregate>(() => {
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
  const avgOrder =
    completedPayments > 0 ? aggregate.gross / completedPayments : 0;
  const marginPct =
    aggregate.platformFees > 0
      ? (aggregate.adminNet / aggregate.platformFees) * 100
      : 0;

  const [activeTab, setActiveTab] = useState<RankTab>("pairs");
  const [sortKey, setSortKey] = useState<SortKey>("gross");

  const rankSections = useMemo(() => buildRankSections(analytics), [analytics]);

  const rankSorted = useMemo(
    () => sortRanks(rankSections?.[activeTab] ?? [], sortKey),
    [rankSections, activeTab, sortKey],
  );

  const rankGrossTotal = rankSorted.reduce((s, r) => s + r.gross, 0);
  const rankMaxByKey = computeRankMaxByKey(rankSorted, sortKey);

  useSyncShortcut(syncAll);

  return (
    <div className="space-y-6">
      <PageHead
        sortedRevenue={sortedRevenue}
        currentCurrency={aggregate.currency}
        onCurrencyChange={setPickedCurrency}
        isSyncing={isSyncing}
        onSync={syncAll}
      />

      <SyncBanner
        totalPendingFees={totalPendingFees}
        pendingPayment={finance?.pendingPaymentFeeSyncPayments ?? 0}
        pendingPayout={finance?.pendingPayoutFeeSyncPayouts ?? 0}
        isSyncing={isSyncing}
        onSync={syncAll}
      />

      <KpiStrip
        aggregate={aggregate}
        paypalTotal={paypalTotal}
        marginPct={marginPct}
        completedPayments={completedPayments}
        isLoading={financeQuery.isLoading}
      />

      <section className="grid gap-5 lg:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)]">
        <RevenueDistribution
          aggregate={aggregate}
          paypalTotal={paypalTotal}
          distributionTotal={distributionTotal}
          sortedRevenue={sortedRevenue}
          isLoading={financeQuery.isLoading}
        />
        <AsidePanel
          finance={finance}
          aggregate={aggregate}
          avgOrder={avgOrder}
          totalPendingFees={totalPendingFees}
          totalSyncedFees={totalSyncedFees}
          activeCurrencies={sortedRevenue.length}
        />
      </section>

      <RankingsPanel
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        sortKey={sortKey}
        setSortKey={setSortKey}
        rankSections={rankSections}
        rankSorted={rankSorted}
        rankGrossTotal={rankGrossTotal}
        rankMaxByKey={rankMaxByKey}
        isLoading={analyticsQuery.isLoading}
        aggregateCurrency={aggregate.currency}
      />

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
