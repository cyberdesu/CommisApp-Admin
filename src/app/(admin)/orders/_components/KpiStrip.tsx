"use client";

import { AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { AdminOrderStats } from "@/lib/user-orders.types";

type Cell = {
  label: string;
  value: number;
  sub: string;
  accent?: "primary" | "rose";
  icon?: React.ReactNode;
};

export function KpiStrip({
  stats,
  isLoading,
}: {
  stats: AdminOrderStats | undefined;
  isLoading: boolean;
}) {
  const cells: Cell[] = [
    {
      label: "Total orders",
      value: stats?.total ?? 0,
      sub: "All-time commission orders",
      accent: "primary",
    },
    {
      label: "Active",
      value: stats?.active ?? 0,
      sub: "In progress, accepted, waiting",
    },
    {
      label: "Delivered",
      value: stats?.delivered ?? 0,
      sub: "Awaiting client approval",
    },
    {
      label: "Completed",
      value: stats?.completed ?? 0,
      sub: "Finalized & paid out",
    },
    {
      label: "Attention",
      value: stats?.attention ?? 0,
      sub: "Stuck or flagged orders",
      accent: "rose",
      icon: <AlertTriangle className="size-3" />,
    },
  ];

  return (
    <section className="grid grid-cols-2 overflow-hidden rounded-2xl border border-border bg-card sm:grid-cols-3 xl:grid-cols-5">
      {cells.map((c) => (
        <div
          key={c.label}
          className="flex min-w-0 flex-col gap-1 border-b border-border/60 px-4 py-4 last:border-b-0 sm:border-b-0 sm:border-r sm:last:border-r-0 sm:[&:nth-child(3n)]:border-r-0 xl:[&:nth-child(3n)]:border-r"
        >
          <div
            className={cn(
              "flex items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-[0.14em] text-muted-foreground",
              c.accent === "rose" && "text-rose-600",
            )}
          >
            {c.icon}
            {c.label}
          </div>
          <div
            className={cn(
              "truncate font-mono text-[22px] font-semibold tracking-tight tabular-nums text-foreground",
              c.accent === "primary" && "text-primary",
              c.accent === "rose" && "text-rose-700",
            )}
          >
            {isLoading ? "—" : c.value.toLocaleString("en-US")}
          </div>
          <div className="text-[11.5px] text-muted-foreground">{c.sub}</div>
        </div>
      ))}
    </section>
  );
}
