"use client";

import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import type {
  AdminOrderAnalytics,
  OrderAnalyticsVolume,
} from "@/lib/user-orders.types";
import { compactCurrency } from "../_lib/helpers";

const GRADIENTS = [
  "from-orange-500 to-violet-500",
  "from-sky-500 to-emerald-500",
  "from-amber-500 to-rose-500",
  "from-violet-500 to-orange-500",
  "from-emerald-500 to-sky-500",
];

function sumVolume(volumes: OrderAnalyticsVolume[]): {
  total: number;
  currency: string;
} {
  if (volumes.length === 0) return { total: 0, currency: "USD" };
  const currency = volumes[0].currency;
  const total = volumes.reduce(
    (sum, v) => sum + (Number.parseFloat(v.amount) || 0),
    0,
  );
  return { total, currency };
}

export function TopArtists({
  analytics,
}: {
  analytics: AdminOrderAnalytics | undefined;
}) {
  const rows = (analytics?.topArtists ?? []).slice(0, 5);

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card">
      <div className="flex items-start justify-between gap-3 border-b border-border/60 px-5 py-4">
        <div>
          <h3 className="text-[14.5px] font-semibold">Top artists</h3>
          <p className="mt-0.5 text-[12px] text-muted-foreground">
            Kontribusi tertinggi berdasarkan analytics rolling window.
          </p>
        </div>
        <Link
          href="/users"
          className="inline-flex items-center rounded-lg border border-border bg-card px-2.5 py-1.5 text-[11.5px] font-medium text-foreground transition hover:border-primary/40 hover:text-primary"
        >
          Open Users
        </Link>
      </div>
      <div className="px-5 py-2">
        {rows.length === 0 && (
          <div className="py-6 text-center text-[12.5px] text-muted-foreground">
            No artist data yet.
          </div>
        )}
        {rows.map((it, i) => {
          const { total, currency } = sumVolume(it.grossVolume);
          const initials = it.username.slice(0, 2).toUpperCase();
          return (
            <div
              key={it.id}
              className="flex items-center gap-2.5 border-b border-border/60 py-2.5 last:border-b-0"
            >
              <span className="w-6 font-mono text-[10.5px] font-bold tabular-nums text-muted-foreground/70">
                {String(i + 1).padStart(2, "0")}
              </span>
              <span
                className={cn(
                  "inline-flex size-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br font-semibold text-white",
                  GRADIENTS[i % GRADIENTS.length],
                )}
              >
                <span className="text-[11px]">{initials}</span>
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1 text-[12.5px] font-semibold">
                  <span className="truncate">@{it.username}</span>
                  <ShieldCheck className="size-3 shrink-0 text-emerald-600" />
                </div>
                <div className="truncate text-[11px] text-muted-foreground">
                  {it.orderCount} orders ·{" "}
                  {it.name ?? "—"}
                </div>
              </div>
              <div className="text-right font-mono text-[12.5px] font-semibold tabular-nums">
                {compactCurrency(total, currency)}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
