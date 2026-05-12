export type DashboardRange = "24h" | "7d" | "30d" | "90d";

export type KpiDelta = {
  value: number;
  unit?: "pct" | "pp" | "abs";
  direction: "up" | "down" | "neutral";
  // Positive delta direction may be good (revenue) or bad (refund rate)
  goodIsUp?: boolean;
};

export type KpiCellData = {
  key: string;
  label: string;
  value: string;
  sub: string;
  delta?: KpiDelta;
  spark?: number[];
  accent?: "primary" | "rose";
};
