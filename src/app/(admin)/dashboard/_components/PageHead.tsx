"use client";

import Link from "next/link";
import { BarChart3, RefreshCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import type { DashboardRange } from "../_lib/types";

const RANGES: DashboardRange[] = ["24h", "7d", "30d", "90d"];

export function PageHead({
  range,
  onRangeChange,
  onRefresh,
  isRefreshing,
  lastRefreshAt,
}: {
  range: DashboardRange;
  onRangeChange: (r: DashboardRange) => void;
  onRefresh: () => void;
  isRefreshing: boolean;
  lastRefreshAt: Date | null;
}) {
  const refreshLabel = lastRefreshAt
    ? lastRefreshAt.toLocaleString("en-US", {
        day: "2-digit",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "—";

  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
      <div>
        <h2 className="text-xl font-semibold tracking-tight text-foreground">
          Operations overview
        </h2>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          Snapshot kesehatan marketplace dan antrian yang butuh tindakan admin.
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-2 text-[11.5px] text-muted-foreground">
          <span>
            Last refresh{" "}
            <strong className="font-mono font-semibold text-foreground">
              {refreshLabel}
            </strong>
          </span>
          <span className="size-1 rounded-full bg-muted-foreground/50" />
          <span>
            Data lag{" "}
            <strong className="font-semibold text-foreground">~2 min</strong>
          </span>
          <span className="size-1 rounded-full bg-muted-foreground/50" />
          <span>Source: Prisma + Redis streams</span>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <div className="inline-flex gap-0.5 rounded-xl border border-border bg-card p-[3px]">
          {RANGES.map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => onRangeChange(r)}
              className={cn(
                "rounded-lg px-3 py-1.5 text-xs font-medium text-muted-foreground transition",
                range === r &&
                  "bg-background font-semibold text-foreground shadow-sm",
              )}
            >
              {r}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={onRefresh}
          disabled={isRefreshing}
          className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-card px-3 py-2 text-xs font-medium text-foreground transition hover:border-primary/40 hover:text-primary disabled:opacity-60"
        >
          <RefreshCcw
            className={cn("size-3.5", isRefreshing && "animate-spin")}
          />
          {isRefreshing ? "Refreshing…" : "Refresh"}
        </button>
        <Link
          href="/analytics"
          className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground transition hover:brightness-105"
        >
          <BarChart3 className="size-3.5" />
          Open Analytics
        </Link>
      </div>
    </div>
  );
}
