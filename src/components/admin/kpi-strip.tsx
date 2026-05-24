"use client";

import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export type KpiAccent = "primary" | "rose" | "emerald";

export type KpiDelta = {
  value: number;
  unit?: "pct" | "pp" | "abs";
  direction: "up" | "down" | "neutral";
  goodIsUp?: boolean;
};

export type KpiCell = {
  key: string;
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  accent?: KpiAccent;
  featured?: boolean;
  icon?: ReactNode;
  delta?: KpiDelta;
  spark?: number[];
};

type GridCols = 2 | 3 | 4 | 5 | 6 | 7;

const SM_COLS: Record<GridCols, string> = {
  2: "sm:grid-cols-2",
  3: "sm:grid-cols-3",
  4: "sm:grid-cols-4",
  5: "sm:grid-cols-3",
  6: "sm:grid-cols-3",
  7: "sm:grid-cols-3",
};
const XL_COLS: Record<GridCols, string> = {
  2: "xl:grid-cols-2",
  3: "xl:grid-cols-3",
  4: "xl:grid-cols-4",
  5: "xl:grid-cols-5",
  6: "xl:grid-cols-6",
  7: "xl:grid-cols-7",
};

export function KpiStrip({
  cells,
  columns,
  ariaLabel,
}: {
  cells: KpiCell[];
  columns: GridCols;
  ariaLabel?: string;
}) {
  return (
    <section
      aria-label={ariaLabel}
      className={cn(
        "grid grid-cols-2 overflow-hidden rounded-2xl border border-border bg-card",
        SM_COLS[columns],
        XL_COLS[columns],
      )}
    >
      {cells.map((cell, index) => (
        <KpiCellView
          key={cell.key}
          cell={cell}
          isLast={index === cells.length - 1}
          columns={columns}
        />
      ))}
    </section>
  );
}

function accentLabelClass(accent: KpiAccent | undefined, featured: boolean) {
  if (featured) return "text-emerald-700";
  if (accent === "primary") return "text-primary";
  if (accent === "rose") return "text-rose-600";
  if (accent === "emerald") return "text-emerald-700";
  return "text-muted-foreground";
}

function accentValueClass(accent: KpiAccent | undefined, featured: boolean) {
  if (featured) return "text-emerald-900";
  if (accent === "primary") return "text-primary";
  if (accent === "rose") return "text-rose-700";
  if (accent === "emerald") return "text-emerald-700";
  return "text-foreground";
}

function accentDotClass(accent: KpiAccent | undefined) {
  if (accent === "primary") return "bg-primary";
  if (accent === "rose") return "bg-rose-600";
  if (accent === "emerald") return "bg-emerald-500";
  return null;
}

function sparkColor(accent: KpiAccent | undefined) {
  if (accent === "primary") return "var(--primary)";
  if (accent === "rose") return "var(--rose, oklch(0.62 0.18 22))";
  if (accent === "emerald") return "var(--emerald, oklch(0.62 0.16 150))";
  return "currentColor";
}

function deltaIsGood(delta: KpiDelta): boolean {
  const isUp = delta.direction === "up";
  const goodIsUp = delta.goodIsUp ?? true;
  if (delta.direction === "neutral") return true;
  return isUp === goodIsUp;
}

function formatDelta(delta: KpiDelta): string {
  const sign =
    delta.direction === "up" ? "+" : delta.direction === "down" ? "−" : "";
  const decimals = delta.unit === "abs" ? 0 : 1;
  const suffix =
    delta.unit === "pp" ? "pp" : delta.unit === "abs" ? "" : "%";
  return `${sign}${Math.abs(delta.value).toFixed(decimals)}${suffix}`;
}

function sparklinePoints(
  values: number[],
  width = 100,
  height = 24,
  pad = 2,
): string | null {
  if (values.length < 2) return null;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const stepX = (width - pad * 2) / (values.length - 1);
  return values
    .map((value, index) => {
      const x = pad + index * stepX;
      const y = pad + ((max - value) / range) * (height - pad * 2);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
}

function KpiCellView({
  cell,
  isLast,
  columns,
}: {
  cell: KpiCell;
  isLast: boolean;
  columns: GridCols;
}) {
  const featured = Boolean(cell.featured);
  const labelClass = accentLabelClass(cell.accent, featured);
  const valueClass = accentValueClass(cell.accent, featured);
  const dotClass = accentDotClass(cell.accent);
  const points = cell.spark ? sparklinePoints(cell.spark) : null;

  return (
    <div
      className={cn(
        "relative flex min-w-0 flex-col gap-1 border-b border-border/60 px-4 py-4 last:border-b-0 sm:border-b-0 sm:border-r sm:last:border-r-0",
        columns >= 5 && "sm:[&:nth-child(3n)]:border-r-0 xl:[&:nth-child(3n)]:border-r",
        isLast && "sm:border-r-0 xl:border-r-0",
        featured && "bg-gradient-to-br from-emerald-50/70 to-transparent",
      )}
    >
      {featured && (
        <span className="absolute left-0 top-3 bottom-3 w-[3px] rounded-full bg-emerald-500" />
      )}
      <div
        className={cn(
          "flex items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-[0.14em]",
          labelClass,
        )}
      >
        {dotClass && !cell.icon && (
          <span className={cn("size-1.5 rounded-full", dotClass)} />
        )}
        {cell.icon}
        {cell.label}
      </div>
      <div
        className={cn(
          "truncate font-mono text-[22px] font-semibold tracking-tight tabular-nums",
          valueClass,
        )}
      >
        {cell.value}
      </div>
      {(cell.sub || cell.delta) && (
        <div className="flex items-center gap-1.5 text-[11.5px] text-muted-foreground">
          {cell.delta && (
            <span
              className={cn(
                "font-semibold tabular-nums",
                deltaIsGood(cell.delta) ? "text-emerald-700" : "text-rose-700",
              )}
            >
              {formatDelta(cell.delta)}
            </span>
          )}
          {cell.sub && <span className="truncate">{cell.sub}</span>}
        </div>
      )}
      {points && (
        <svg
          viewBox="0 0 100 24"
          preserveAspectRatio="none"
          className="mt-1 h-6 w-full"
        >
          <polyline
            fill="none"
            stroke={sparkColor(cell.accent)}
            strokeWidth="1.5"
            points={points}
          />
        </svg>
      )}
    </div>
  );
}
