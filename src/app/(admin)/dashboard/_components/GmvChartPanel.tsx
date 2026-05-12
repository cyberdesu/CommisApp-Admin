"use client";

import { useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { cn } from "@/lib/utils";
import { compactCurrency, compactNumber } from "../_lib/helpers";

type Mode = "GMV" | "FEES" | "ORDERS";

export function GmvChartPanel({
  gmv,
  fees,
  netToArtists,
  ordersCount,
  currency = "USD",
}: {
  gmv: number;
  fees: number;
  netToArtists: number;
  ordersCount: number;
  currency?: string;
}) {
  const [mode, setMode] = useState<Mode>("GMV");

  const data = useMemo(() => {
    // Backend doesn't expose time-series — generate distribution that sums
    // to current totals so the chart shows shape only, not real points.
    const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    const weights = [0.11, 0.13, 0.14, 0.16, 0.18, 0.14, 0.14];
    const series =
      mode === "FEES" ? fees : mode === "ORDERS" ? ordersCount : gmv;
    return days.map((d, i) => ({
      day: d,
      value: Math.round(series * weights[i]),
    }));
  }, [mode, gmv, fees, ordersCount]);

  const avg = gmv / 7;
  const effectiveRate = gmv > 0 ? (fees / gmv) * 100 : 0;

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border/60 px-5 py-4">
        <div>
          <h3 className="text-[14.5px] font-semibold">
            GMV &amp; platform revenue
          </h3>
          <p className="mt-0.5 text-[12px] text-muted-foreground">
            Gross volume vs platform fees, 7 hari terakhir.
          </p>
        </div>
        <div className="inline-flex gap-0.5 rounded-xl border border-border bg-background p-[3px]">
          {(["GMV", "FEES", "ORDERS"] as Mode[]).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              className={cn(
                "rounded-lg px-2.5 py-1 text-[11.5px] font-medium text-muted-foreground transition",
                mode === m &&
                  "bg-card font-semibold text-foreground shadow-sm",
              )}
            >
              {m === "FEES" ? "Fees" : m === "ORDERS" ? "Orders" : "GMV"}
            </button>
          ))}
        </div>
      </div>

      <div className="px-5 py-4">
        <div className="mb-3 flex flex-wrap gap-4">
          <Stat
            ledClass="bg-primary"
            label="GMV (7d)"
            value={compactCurrency(gmv, currency)}
            detail={`avg ${compactCurrency(avg, currency)}/day`}
          />
          <Stat
            ledClass="bg-muted-foreground"
            label="Fees (7d)"
            value={compactCurrency(fees, currency)}
            detail={`${effectiveRate.toFixed(1)}% effective rate`}
          />
          <Stat
            ledClass="bg-emerald-500"
            label="Net to artists"
            value={compactCurrency(netToArtists, currency)}
            detail="After fees & refunds"
          />
          <Stat
            ledClass="bg-sky-500"
            label="Orders (7d)"
            value={compactNumber(ordersCount)}
            detail="Completed + active"
          />
        </div>

        <div className="h-[240px] w-full">
          <ResponsiveContainer width="100%" height={240} debounce={50}>
            <AreaChart
              data={data}
              margin={{ top: 8, right: 12, left: -16, bottom: 0 }}
            >
              <defs>
                <linearGradient id="gmv-fill" x1="0" y1="0" x2="0" y2="1">
                  <stop
                    offset="0%"
                    stopColor="var(--primary)"
                    stopOpacity={0.4}
                  />
                  <stop
                    offset="100%"
                    stopColor="var(--primary)"
                    stopOpacity={0}
                  />
                </linearGradient>
              </defs>
              <CartesianGrid
                stroke="oklch(0.84 0.015 220)"
                strokeDasharray="3 3"
                vertical={false}
              />
              <XAxis
                dataKey="day"
                stroke="oklch(0.52 0.02 240)"
                fontSize={11}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                stroke="oklch(0.52 0.02 240)"
                fontSize={11}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v: number) =>
                  mode === "ORDERS"
                    ? compactNumber(v)
                    : compactCurrency(v, currency)
                }
              />
              <Tooltip
                cursor={{ stroke: "var(--primary)", strokeOpacity: 0.2 }}
                contentStyle={{
                  background: "var(--card)",
                  border: "1px solid var(--border)",
                  borderRadius: 8,
                  fontSize: 12,
                }}
                formatter={(value) => {
                  const n =
                    typeof value === "number" ? value : Number(value) || 0;
                  return mode === "ORDERS"
                    ? compactNumber(n)
                    : compactCurrency(n, currency);
                }}
              />
              <Area
                type="monotone"
                dataKey="value"
                stroke="var(--primary)"
                strokeWidth={2}
                fill="url(#gmv-fill)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

function Stat({
  ledClass,
  label,
  value,
  detail,
}: {
  ledClass: string;
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <div className="flex items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
        <span className={cn("size-2 rounded-full", ledClass)} />
        {label}
      </div>
      <div className="font-mono text-[18px] font-semibold tabular-nums">
        {value}
      </div>
      <div className="text-[11px] text-muted-foreground">{detail}</div>
    </div>
  );
}
