"use client";

import { AlertTriangle } from "lucide-react";

import {
  KpiStrip as SharedKpiStrip,
  type KpiCell,
} from "@/components/admin/kpi-strip";
import type { AdminOrderStats } from "@/lib/user-orders.types";

export function KpiStrip({
  stats,
  isLoading,
}: {
  stats: AdminOrderStats | undefined;
  isLoading: boolean;
}) {
  const fmt = (value: number) =>
    isLoading ? "—" : value.toLocaleString("en-US");

  const cells: KpiCell[] = [
    {
      key: "total",
      label: "Total orders",
      value: fmt(stats?.total ?? 0),
      sub: "All-time commission orders",
      accent: "primary",
    },
    {
      key: "active",
      label: "Active",
      value: fmt(stats?.active ?? 0),
      sub: "In progress, accepted, waiting",
    },
    {
      key: "delivered",
      label: "Delivered",
      value: fmt(stats?.delivered ?? 0),
      sub: "Awaiting client approval",
    },
    {
      key: "completed",
      label: "Completed",
      value: fmt(stats?.completed ?? 0),
      sub: "Finalized & paid out",
    },
    {
      key: "attention",
      label: "Attention",
      value: fmt(stats?.attention ?? 0),
      sub: "Stuck or flagged orders",
      accent: "rose",
      icon: <AlertTriangle className="size-3" />,
    },
  ];

  return <SharedKpiStrip cells={cells} columns={5} ariaLabel="Orders KPIs" />;
}
