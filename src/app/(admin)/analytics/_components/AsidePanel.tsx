"use client";

import { CheckCircle2 } from "lucide-react";
import type { PlatformFinanceStats } from "@/lib/user-finance.types";
import { fmtMoney, fmtNum } from "../_lib/helpers";
import type { Aggregate } from "../_lib/types";
import { SnapStat, SyncTile } from "./primitives";

export function AsidePanel({
  finance,
  aggregate,
  avgOrder,
  totalPendingFees,
  totalSyncedFees,
  activeCurrencies,
}: {
  finance: PlatformFinanceStats | undefined;
  aggregate: Aggregate;
  avgOrder: number;
  totalPendingFees: number;
  totalSyncedFees: number;
  activeCurrencies: number;
}) {
  const completedPayments = finance?.completedPayments ?? 0;
  const processedPayouts = finance?.processedPayouts ?? 0;

  return (
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
            value={fmtNum(activeCurrencies)}
          />
        </div>
      </div>
    </div>
  );
}
