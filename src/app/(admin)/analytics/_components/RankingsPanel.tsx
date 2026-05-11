"use client";

import { cn } from "@/lib/utils";
import { fmtMoney, fmtNum } from "../_lib/helpers";
import type { RankItem, RankTab, SortKey } from "../_lib/types";

const SORT_OPTIONS: ReadonlyArray<[SortKey, string]> = [
  ["gross", "Sort by gross"],
  ["orders", "Sort by orders"],
  ["net", "Sort by artist net"],
];

const TABS: ReadonlyArray<[RankTab, string]> = [
  ["pairs", "Artist · Client pairs"],
  ["artists", "Top artists"],
  ["clients", "Top clients"],
  ["services", "Top services"],
  ["categories", "Categories"],
  ["sources", "Order types"],
];

export function RankingsPanel({
  activeTab,
  setActiveTab,
  sortKey,
  setSortKey,
  rankSections,
  rankSorted,
  rankGrossTotal,
  rankMaxByKey,
  isLoading,
  aggregateCurrency,
}: {
  activeTab: RankTab;
  setActiveTab: (t: RankTab) => void;
  sortKey: SortKey;
  setSortKey: (k: SortKey) => void;
  rankSections: Record<RankTab, RankItem[]> | null;
  rankSorted: RankItem[];
  rankGrossTotal: number;
  rankMaxByKey: number;
  isLoading: boolean;
  aggregateCurrency: string;
}) {
  return (
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
          {SORT_OPTIONS.map(([k, label]) => (
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

      <div className="mt-4 flex gap-0 overflow-x-auto border-b border-border px-5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {TABS.map(([t, label]) => (
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
              {rankSections?.[t].length ?? 0}
            </span>
          </button>
        ))}
      </div>

      <div className="hidden grid-cols-[36px_minmax(0,1fr)_minmax(0,1.6fr)_88px_120px_120px_110px] items-center gap-3 border-b border-border px-5 py-2.5 text-[10.5px] font-semibold uppercase tracking-[0.1em] text-muted-foreground lg:grid">
        <span className="text-center">#</span>
        <span>Identity</span>
        <span>Detail / volume share</span>
        <span className="text-right">Orders</span>
        <span className="text-right">Gross</span>
        <span className="text-right">Website fee</span>
        <span className="text-right">Artist net</span>
      </div>

      <div>
        {isLoading ? (
          <div className="px-5 py-10 text-center text-sm text-muted-foreground">
            Loading…
          </div>
        ) : rankSorted.length === 0 ||
          rankSorted.every((r) => r.orders === 0) ? (
          <div className="px-5 py-10 text-center text-sm text-muted-foreground">
            Belum ada data untuk tab ini.
          </div>
        ) : (
          rankSorted.map((it, i) => (
            <RankingRow
              key={it.key}
              item={it}
              index={i}
              sortKey={sortKey}
              rankMaxByKey={rankMaxByKey}
              rankGrossTotal={rankGrossTotal}
              currency={aggregateCurrency}
            />
          ))
        )}
      </div>
    </section>
  );
}

function RankingRow({
  item,
  index,
  sortKey,
  rankMaxByKey,
  rankGrossTotal,
  currency,
}: {
  item: RankItem;
  index: number;
  sortKey: SortKey;
  rankMaxByKey: number;
  rankGrossTotal: number;
  currency: string;
}) {
  const num =
    sortKey === "orders"
      ? item.orders
      : sortKey === "net"
        ? item.artistNet
        : item.gross;
  const barPct =
    rankMaxByKey > 0
      ? Math.max((num / rankMaxByKey) * 100, item.orders > 0 ? 3 : 0)
      : 0;
  const sharePct =
    rankGrossTotal > 0 ? (item.gross / rankGrossTotal) * 100 : 0;
  const isTop = index < 3;
  const orderLabel = `#${String(index + 1).padStart(2, "0")}`;

  return (
    <div className="grid grid-cols-1 gap-3 border-b border-border/60 px-5 py-3 last:border-b-0 hover:bg-muted/40 lg:grid-cols-[36px_minmax(0,1fr)_minmax(0,1.6fr)_88px_120px_120px_110px] lg:items-center">
      <div
        className={cn(
          "hidden text-center font-mono text-[12.5px] font-semibold text-muted-foreground lg:block",
          isTop && "text-primary",
        )}
      >
        {String(index + 1).padStart(2, "0")}
      </div>
      <div className="min-w-0">
        <div className="flex items-center gap-2 lg:block">
          <span
            className={cn(
              "font-mono text-[12px] font-semibold text-muted-foreground lg:hidden",
              isTop && "text-primary",
            )}
          >
            {orderLabel}
          </span>
          <div className="truncate text-[13.5px] font-semibold text-foreground">
            {item.title}
          </div>
        </div>
        <div className="truncate text-[12px] text-muted-foreground">
          {item.subtitle}
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
            {item.pill && (
              <span className="rounded-md bg-muted px-1.5 py-0.5 text-[10.5px] font-semibold text-muted-foreground">
                {item.pill}
              </span>
            )}
          </span>
          <span className="font-mono tabular-nums">
            {sharePct.toFixed(1)}% share
          </span>
        </div>
      </div>
      <div className="text-right font-mono text-[13px] tabular-nums">
        {fmtNum(item.orders)}
      </div>
      <div className="text-right font-mono text-[13px] tabular-nums">
        {fmtMoney(item.gross, currency)}
      </div>
      <div className="text-right font-mono text-[13px] tabular-nums text-rose-700">
        {fmtMoney(item.websiteFee, currency)}
      </div>
      <div className="text-right font-mono text-[13px] font-semibold tabular-nums text-emerald-700">
        {fmtMoney(item.artistNet, currency)}
      </div>
    </div>
  );
}
