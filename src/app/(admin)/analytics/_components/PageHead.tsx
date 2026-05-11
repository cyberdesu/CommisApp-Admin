"use client";

import { RefreshCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import type { PlatformRevenueCurrencyBreakdown } from "@/lib/user-finance.types";
import { Spinner } from "./Spinner";

export function PageHead({
  sortedRevenue,
  currentCurrency,
  onCurrencyChange,
  isSyncing,
  onSync,
}: {
  sortedRevenue: PlatformRevenueCurrencyBreakdown[];
  currentCurrency: string;
  onCurrencyChange: (c: string) => void;
  isSyncing: boolean;
  onSync: () => void;
}) {
  return (
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
                onClick={() => onCurrencyChange(r.currency)}
                className={cn(
                  "rounded-lg px-3 py-1.5 text-xs font-medium text-muted-foreground transition",
                  currentCurrency === r.currency &&
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
          onClick={onSync}
          disabled={isSyncing}
          className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-card px-3 py-2 text-xs font-medium text-foreground transition hover:border-primary/40 hover:text-primary disabled:cursor-wait disabled:opacity-60"
        >
          {isSyncing ? <Spinner /> : <RefreshCcw className="size-3.5" />}
          {isSyncing ? "Syncing…" : "Sync fees"}
        </button>
      </div>
    </div>
  );
}
