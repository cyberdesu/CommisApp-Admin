"use client";

import { TrendingUp } from "lucide-react";
import { fmtMoney, fmtNum, pct } from "../_lib/helpers";
import type { Aggregate } from "../_lib/types";
import { KpiCell } from "./primitives";

export function KpiStrip({
  aggregate,
  paypalTotal,
  marginPct,
  completedPayments,
  isLoading,
}: {
  aggregate: Aggregate;
  paypalTotal: number;
  marginPct: number;
  completedPayments: number;
  isLoading: boolean;
}) {
  return (
    <section
      aria-label="Key metrics"
      className="grid grid-cols-2 overflow-hidden rounded-2xl border border-border bg-card md:grid-cols-3 xl:grid-cols-5"
    >
      <KpiCell
        featured
        label="Admin net profit"
        icon={<TrendingUp className="size-3.5" />}
        value={
          isLoading ? "—" : fmtMoney(aggregate.adminNet, aggregate.currency)
        }
        sub={
          <span className="text-muted-foreground">
            {aggregate.gross > 0
              ? `${pct(aggregate.adminNet, aggregate.gross).toFixed(1)}% of gross`
              : "no payments yet"}
          </span>
        }
      />
      <KpiCell
        label="Gross volume"
        value={isLoading ? "—" : fmtMoney(aggregate.gross, aggregate.currency)}
        sub={
          <span className="text-muted-foreground">
            {fmtNum(completedPayments)} payments
          </span>
        }
      />
      <KpiCell
        label="Website fees"
        value={
          isLoading
            ? "—"
            : fmtMoney(aggregate.platformFees, aggregate.currency)
        }
        sub={
          <span className="text-muted-foreground">
            {pct(aggregate.platformFees, aggregate.gross).toFixed(1)}% of gross
          </span>
        }
      />
      <KpiCell
        label="PayPal costs"
        value={isLoading ? "—" : fmtMoney(paypalTotal, aggregate.currency)}
        sub={<span className="text-muted-foreground">payment + payout</span>}
      />
      <KpiCell
        label="Net margin"
        value={isLoading ? "—" : `${marginPct.toFixed(0)}%`}
        sub={<span className="text-muted-foreground">of website fee</span>}
      />
    </section>
  );
}
