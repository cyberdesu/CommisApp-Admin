"use client";

import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import { cn } from "@/lib/utils";
import { compactNumber, formatMoney } from "../_lib/helpers";
import type { UserStatsResponse } from "../_lib/types";

type Cell = {
  label: string;
  value: string;
  sub: string;
  accent?: boolean;
};

export function KpiStrip({
  pendingArtistRequests,
}: {
  pendingArtistRequests: number;
}) {
  const { data, isLoading } = useQuery({
    queryKey: ["users-stats"],
    queryFn: async () => {
      const res = await apiClient.get<UserStatsResponse>("/users/stats");
      return res.data.data;
    },
    staleTime: 15_000,
    refetchInterval: 30_000,
  });

  const primary = data?.finance.currencies[0] ?? null;
  const verifiedPct =
    data && data.totalUsers > 0
      ? ((data.verifiedCount / data.totalUsers) * 100).toFixed(1) + "%"
      : "—";

  const cells: Cell[] = [
    {
      label: "Total users",
      value: isLoading ? "—" : compactNumber(data?.totalUsers ?? 0),
      sub: "All registered accounts",
      accent: true,
    },
    {
      label: "Verified email",
      value: isLoading ? "—" : compactNumber(data?.verifiedCount ?? 0),
      sub: data ? `${verifiedPct} of total` : "—",
    },
    {
      label: "Verified artists",
      value: isLoading ? "—" : compactNumber(data?.verifiedArtistCount ?? 0),
      sub:
        pendingArtistRequests > 0
          ? `${pendingArtistRequests} requests pending`
          : "0 requests pending",
    },
    {
      label: "Admins",
      value: isLoading ? "—" : compactNumber(data?.adminCount ?? 0),
      sub: "Platform administrators",
    },
    {
      label: "Gross earnings",
      value:
        isLoading || !primary
          ? "—"
          : formatMoney(primary.grossEarnings, primary.currency),
      sub: `${data?.finance.artistsWithEarnings ?? 0} artists with earnings`,
    },
    {
      label: "Withdrawn",
      value:
        isLoading || !primary
          ? "—"
          : formatMoney(primary.withdrawnTotal, primary.currency),
      sub: `${data?.finance.artistsWithWithdrawals ?? 0} artists withdrew`,
    },
    {
      label: "Available balance",
      value:
        isLoading || !primary
          ? "—"
          : formatMoney(primary.availableBalance, primary.currency),
      sub: primary
        ? `Pending withdraw ${formatMoney(primary.pendingWithdrawals, primary.currency)}`
        : "Pending withdraw —",
    },
  ];

  return (
    <section className="grid grid-cols-2 overflow-hidden rounded-2xl border border-border bg-card sm:grid-cols-4 xl:grid-cols-7">
      {cells.map((c, i) => (
        <div
          key={c.label}
          className={cn(
            "flex min-w-0 flex-col gap-1 border-b border-border/60 px-4 py-4 last:border-b-0 sm:border-b-0 sm:border-r sm:last:border-r-0 sm:[&:nth-child(4n)]:border-r-0 xl:[&:nth-child(4)]:border-r",
            i === 0 && "bg-primary/[0.04]",
          )}
        >
          <div
            className={cn(
              "text-[10.5px] font-semibold uppercase tracking-[0.14em] text-muted-foreground",
              c.accent && "text-primary",
            )}
          >
            {c.label}
          </div>
          <div
            className={cn(
              "truncate font-mono text-[22px] font-semibold tracking-tight tabular-nums text-foreground",
              c.accent && "text-primary",
            )}
          >
            {c.value}
          </div>
          <div className="text-[11.5px] text-muted-foreground">{c.sub}</div>
        </div>
      ))}
    </section>
  );
}
