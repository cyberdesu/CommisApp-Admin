"use client";

import { useMemo } from "react";
import { cn } from "@/lib/utils";
import type {
  AdminOrderAnalytics,
  OrderAnalyticsVolume,
} from "@/lib/user-orders.types";
import { compactCurrency } from "../_lib/helpers";

const SEGMENT_COLORS = [
  { stroke: "var(--primary)", led: "bg-primary" },
  { stroke: "var(--violet, oklch(0.58 0.18 290))", led: "bg-violet-500" },
  { stroke: "var(--sky, oklch(0.64 0.11 230))", led: "bg-sky-500" },
  { stroke: "var(--emerald, oklch(0.62 0.13 158))", led: "bg-emerald-500" },
  { stroke: "var(--fg-muted, oklch(0.52 0.02 240))", led: "bg-muted-foreground" },
];

const CIRC = 2 * Math.PI * 48; // r=48

function sumVolume(volumes: OrderAnalyticsVolume[]) {
  return volumes.reduce(
    (sum, v) => sum + (Number.parseFloat(v.amount) || 0),
    0,
  );
}

export function CategoryMix({
  analytics,
}: {
  analytics: AdminOrderAnalytics | undefined;
}) {
  const { segments, totalLabel, currency } = useMemo(() => {
    const cats = analytics?.topCategories ?? [];
    if (cats.length === 0) {
      return { segments: [], totalLabel: "—", currency: "USD" };
    }
    const items = cats.slice(0, 4).map((c) => ({
      name: c.name,
      value: sumVolume(c.grossVolume),
      currency: c.grossVolume[0]?.currency ?? "USD",
    }));
    const top4Total = items.reduce((s, x) => s + x.value, 0);
    // Others = remaining categories (5th+)
    const others = cats.slice(4).reduce((s, c) => s + sumVolume(c.grossVolume), 0);
    if (others > 0) {
      items.push({
        name: "Other",
        value: others,
        currency: items[0].currency,
      });
    }
    const total = top4Total + others;
    return {
      segments: items.map((it) => ({
        name: it.name,
        value: it.value,
        pct: total > 0 ? (it.value / total) * 100 : 0,
      })),
      totalLabel: compactCurrency(total, items[0]?.currency ?? "USD"),
      currency: items[0]?.currency ?? "USD",
    };
  }, [analytics]);

  const arcs = useMemo(
    () =>
      segments.reduce<
        Array<{ name: string; stroke: string; dash: number; offset: number }>
      >((acc, s, i) => {
        const dash = (s.pct / 100) * CIRC;
        const prev = acc[acc.length - 1];
        const offset = prev ? prev.offset + prev.dash : 0;
        return [
          ...acc,
          {
            name: s.name,
            stroke: SEGMENT_COLORS[i % SEGMENT_COLORS.length].stroke,
            dash,
            offset,
          },
        ];
      }, []),
    [segments],
  );

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card">
      <div className="border-b border-border/60 px-5 py-4">
        <h3 className="text-[14.5px] font-semibold">Category mix</h3>
        <p className="mt-0.5 text-[12px] text-muted-foreground">
          Distribusi pendapatan per kategori order.
        </p>
      </div>
      <div className="flex items-center gap-5 px-5 py-4">
        <div className="shrink-0">
          <svg viewBox="0 0 120 120" width="130" height="130">
            <circle
              cx="60"
              cy="60"
              r="48"
              fill="none"
              stroke="var(--bg, oklch(0.95 0.018 220))"
              strokeWidth="20"
            />
            {arcs.map((a) => (
              <circle
                key={a.name}
                cx="60"
                cy="60"
                r="48"
                fill="none"
                stroke={a.stroke}
                strokeWidth="20"
                strokeDasharray={`${a.dash} ${CIRC}`}
                strokeDashoffset={-a.offset}
                transform="rotate(-90 60 60)"
              />
            ))}
            <text
              x="60"
              y="58"
              textAnchor="middle"
              fontSize="13"
              fontWeight={600}
              fill="var(--fg, oklch(0.30 0.03 240))"
            >
              {totalLabel}
            </text>
            <text
              x="60"
              y="73"
              textAnchor="middle"
              fontSize="9"
              fill="var(--fg-muted, oklch(0.52 0.02 240))"
            >
              {currency} · all-time
            </text>
          </svg>
        </div>
        <div className="min-w-0 flex-1">
          {segments.length === 0 ? (
            <div className="py-6 text-center text-[12.5px] text-muted-foreground">
              No category data yet.
            </div>
          ) : (
            segments.map((s, i) => (
              <div
                key={s.name}
                className="flex items-center justify-between gap-2 border-b border-border/60 py-2 text-[12.5px] last:border-b-0"
              >
                <div className="flex min-w-0 items-center gap-1.5">
                  <span
                    className={cn(
                      "size-2 shrink-0 rounded-sm",
                      SEGMENT_COLORS[i % SEGMENT_COLORS.length].led,
                    )}
                  />
                  <span className="truncate">{s.name}</span>
                </div>
                <span className="font-mono font-semibold tabular-nums">
                  {s.pct.toFixed(1)}%
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
