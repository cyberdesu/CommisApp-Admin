"use client";

import { cn } from "@/lib/utils";
import { sparklineFromValues } from "../_lib/helpers";
import type { KpiCellData } from "../_lib/types";

export function KpiStrip({ cells }: { cells: KpiCellData[] }) {
  return (
    <section className="grid grid-cols-2 overflow-hidden rounded-2xl border border-border bg-card sm:grid-cols-3 xl:grid-cols-6">
      {cells.map((c, i) => (
        <KpiCell key={c.key} cell={c} isLast={i === cells.length - 1} />
      ))}
    </section>
  );
}

function KpiCell({ cell, isLast }: { cell: KpiCellData; isLast: boolean }) {
  const accentClass =
    cell.accent === "primary"
      ? "text-primary"
      : cell.accent === "rose"
        ? "text-rose-700"
        : "text-muted-foreground";
  const sparkColor =
    cell.accent === "primary"
      ? "var(--primary)"
      : cell.accent === "rose"
        ? "var(--rose, oklch(0.62 0.18 22))"
        : "currentColor";

  const points = cell.spark ? sparklineFromValues(cell.spark) : null;

  return (
    <div
      className={cn(
        "flex min-w-0 flex-col gap-1 border-b border-border/60 px-4 py-4 last:border-b-0 sm:border-b-0 sm:border-r sm:[&:nth-child(3n)]:border-r-0 xl:[&:nth-child(3n)]:border-r",
        isLast && "sm:border-r-0 xl:border-r-0",
      )}
    >
      <div
        className={cn(
          "flex items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-[0.14em]",
          accentClass,
        )}
      >
        {cell.accent && (
          <span
            className={cn(
              "size-1.5 rounded-full",
              cell.accent === "primary" ? "bg-primary" : "bg-rose-600",
            )}
          />
        )}
        {cell.label}
      </div>
      <div className="font-mono text-[22px] font-semibold tracking-tight tabular-nums text-foreground">
        {cell.value}
      </div>
      <div className="flex items-center gap-1.5 text-[11.5px] text-muted-foreground">
        {cell.delta && (
          <span
            className={cn(
              "font-semibold tabular-nums",
              deltaGood(cell.delta) ? "text-emerald-700" : "text-rose-700",
            )}
          >
            {cell.delta.direction === "up" ? "+" : "−"}
            {Math.abs(cell.delta.value).toFixed(
              cell.delta.unit === "abs" ? 0 : 1,
            )}
            {cell.delta.unit === "pp"
              ? "pp"
              : cell.delta.unit === "abs"
                ? ""
                : "%"}
          </span>
        )}
        <span className="truncate">{cell.sub}</span>
      </div>
      {points && (
        <svg
          viewBox="0 0 100 24"
          preserveAspectRatio="none"
          className="mt-1 h-6 w-full"
        >
          <polyline
            fill="none"
            stroke={sparkColor}
            strokeWidth="1.5"
            points={points}
          />
        </svg>
      )}
    </div>
  );
}

function deltaGood(d: NonNullable<KpiCellData["delta"]>): boolean {
  const isUp = d.direction === "up";
  const goodIsUp = d.goodIsUp ?? true;
  if (d.direction === "neutral") return true;
  return isUp === goodIsUp;
}
