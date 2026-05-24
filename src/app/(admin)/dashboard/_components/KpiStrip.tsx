"use client";

import {
  KpiStrip as SharedKpiStrip,
  type KpiCell,
} from "@/components/admin/kpi-strip";
import type { KpiCellData } from "../_lib/types";

export function KpiStrip({ cells }: { cells: KpiCellData[] }) {
  const mapped: KpiCell[] = cells.map((cell) => ({
    key: cell.key,
    label: cell.label,
    value: cell.value,
    sub: cell.sub,
    accent: cell.accent,
    delta: cell.delta,
    spark: cell.spark,
  }));

  return <SharedKpiStrip cells={mapped} columns={6} ariaLabel="Dashboard KPIs" />;
}
