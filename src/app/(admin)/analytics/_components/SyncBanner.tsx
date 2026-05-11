"use client";

import { AlertCircle } from "lucide-react";
import { fmtNum } from "../_lib/helpers";
import { Spinner } from "./Spinner";

export function SyncBanner({
  totalPendingFees,
  pendingPayment,
  pendingPayout,
  isSyncing,
  onSync,
}: {
  totalPendingFees: number;
  pendingPayment: number;
  pendingPayout: number;
  isSyncing: boolean;
  onSync: () => void;
}) {
  if (totalPendingFees <= 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-xl border border-amber-300/60 bg-amber-50 px-4 py-2.5 text-sm">
      <AlertCircle className="size-4 text-amber-600" />
      <span className="text-amber-950">
        <strong className="font-semibold">
          {fmtNum(totalPendingFees)} fee entries
        </strong>{" "}
        need to be synced from PayPal.{" "}
        <span className="text-amber-800/80">
          {fmtNum(pendingPayment)} payment fees · {fmtNum(pendingPayout)} payout
          fees.
        </span>
      </span>
      <div className="flex-1" />
      <button
        type="button"
        onClick={onSync}
        disabled={isSyncing}
        className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground transition hover:brightness-105 disabled:cursor-wait disabled:opacity-60"
      >
        {isSyncing ? <Spinner /> : null}
        {isSyncing ? "Syncing" : "Sync now"}
      </button>
    </div>
  );
}
