"use client";

import { cn } from "@/lib/utils";
import type { AdminOrderStats } from "@/lib/user-orders.types";

type FunnelRow = {
  label: string;
  count: number;
  dot: string;
  fill: string;
};

export function OrderFunnel({
  stats,
}: {
  stats: AdminOrderStats | undefined;
}) {
  const total = stats?.total ?? 0;
  const active = stats?.active ?? 0;
  const delivered = stats?.delivered ?? 0;
  const completed = stats?.completed ?? 0;
  const attention = stats?.attention ?? 0;
  const cancelled = Math.max(0, total - active - delivered - completed);

  const rows: FunnelRow[] = [
    {
      label: "All orders",
      count: total,
      dot: "bg-muted-foreground",
      fill: "bg-muted-foreground",
    },
    {
      label: "Active",
      count: active,
      dot: "bg-sky-500",
      fill: "bg-sky-500",
    },
    {
      label: "Delivered",
      count: delivered,
      dot: "bg-violet-500",
      fill: "bg-violet-500",
    },
    {
      label: "Completed",
      count: completed,
      dot: "bg-emerald-500",
      fill: "bg-emerald-500",
    },
    {
      label: "Attention",
      count: attention,
      dot: "bg-amber-500",
      fill: "bg-amber-500",
    },
    {
      label: "Cancelled/Refunded",
      count: cancelled,
      dot: "bg-rose-500",
      fill: "bg-rose-500",
    },
  ];

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card">
      <div className="border-b border-border/60 px-5 py-4">
        <h3 className="text-[14.5px] font-semibold">Order funnel</h3>
        <p className="mt-0.5 text-[12px] text-muted-foreground">
          Workflow stage distribution dari {total.toLocaleString("en-US")}{" "}
          orders.
        </p>
      </div>
      <div className="flex flex-col gap-2 px-5 py-4">
        {rows.map((r) => {
          const pct = total > 0 ? Math.round((r.count / total) * 100) : 0;
          return (
            <div
              key={r.label}
              className="grid grid-cols-[140px_minmax(0,1fr)_56px] items-center gap-2.5"
            >
              <div className="flex items-center gap-1.5 text-[12.5px] font-medium">
                <span className={cn("size-2 rounded-sm", r.dot)} />
                {r.label}
              </div>
              <div className="relative h-5 overflow-hidden rounded-md bg-muted">
                <div
                  className={cn(
                    "flex h-full items-center rounded-md px-2 font-mono text-[11px] font-semibold text-white",
                    r.fill,
                  )}
                  style={{ width: `${Math.max(pct, r.count > 0 ? 4 : 0)}%` }}
                >
                  {r.count > 0 ? r.count.toLocaleString("en-US") : ""}
                </div>
              </div>
              <div className="text-right font-mono text-[12px] tabular-nums text-muted-foreground">
                {pct}%
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
