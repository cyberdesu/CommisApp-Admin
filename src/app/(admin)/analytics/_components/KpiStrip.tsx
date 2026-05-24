"use client";

import { TrendingUp } from "lucide-react";

import {
  KpiStrip as SharedKpiStrip,
  type KpiCell,
} from "@/components/admin/kpi-strip";
import { fmtMoney, fmtNum, pct } from "../_lib/helpers";
import type { Aggregate } from "../_lib/types";

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
  const cells: KpiCell[] = [
    {
      key: "admin-net",
      featured: true,
      label: "Admin net profit",
      icon: <TrendingUp className="size-3.5" />,
      value: isLoading
        ? "—"
        : fmtMoney(aggregate.adminNet, aggregate.currency),
      sub:
        aggregate.gross > 0
          ? `${pct(aggregate.adminNet, aggregate.gross).toFixed(1)}% of gross`
          : "no payments yet",
    },
    {
      key: "gross-volume",
      label: "Gross volume",
      value: isLoading
        ? "—"
        : fmtMoney(aggregate.gross, aggregate.currency),
      sub: `${fmtNum(completedPayments)} payments`,
    },
    {
      key: "website-fees",
      label: "Website fees",
      value: isLoading
        ? "—"
        : fmtMoney(aggregate.platformFees, aggregate.currency),
      sub: `${pct(aggregate.platformFees, aggregate.gross).toFixed(1)}% of gross`,
    },
    {
      key: "paypal-costs",
      label: "PayPal costs",
      value: isLoading
        ? "—"
        : fmtMoney(paypalTotal, aggregate.currency),
      sub: "payment + payout",
    },
    {
      key: "net-margin",
      label: "Net margin",
      value: isLoading ? "—" : `${marginPct.toFixed(0)}%`,
      sub: "of website fee",
    },
  ];

  return (
    <SharedKpiStrip cells={cells} columns={5} ariaLabel="Key metrics" />
  );
}
