"use client";

import { useQuery } from "@tanstack/react-query";

import {
  KpiStrip as SharedKpiStrip,
  type KpiCell,
} from "@/components/admin/kpi-strip";
import { apiClient } from "@/lib/api/client";
import { compactNumber, formatMoney } from "../_lib/helpers";
import type { UserStatsResponse } from "../_lib/types";

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

  const cells: KpiCell[] = [
    {
      key: "total-users",
      label: "Total users",
      value: isLoading ? "—" : compactNumber(data?.totalUsers ?? 0),
      sub: "All registered accounts",
      accent: "primary",
    },
    {
      key: "verified-email",
      label: "Verified email",
      value: isLoading ? "—" : compactNumber(data?.verifiedCount ?? 0),
      sub: data ? `${verifiedPct} of total` : "—",
    },
    {
      key: "verified-artists",
      label: "Verified artists",
      value: isLoading ? "—" : compactNumber(data?.verifiedArtistCount ?? 0),
      sub:
        pendingArtistRequests > 0
          ? `${pendingArtistRequests} requests pending`
          : "0 requests pending",
    },
    {
      key: "admins",
      label: "Admins",
      value: isLoading ? "—" : compactNumber(data?.adminCount ?? 0),
      sub: "Platform administrators",
    },
    {
      key: "gross-earnings",
      label: "Gross earnings",
      value:
        isLoading || !primary
          ? "—"
          : formatMoney(primary.grossEarnings, primary.currency),
      sub: `${data?.finance.artistsWithEarnings ?? 0} artists with earnings`,
    },
    {
      key: "withdrawn",
      label: "Withdrawn",
      value:
        isLoading || !primary
          ? "—"
          : formatMoney(primary.withdrawnTotal, primary.currency),
      sub: `${data?.finance.artistsWithWithdrawals ?? 0} artists withdrew`,
    },
    {
      key: "available-balance",
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
    <SharedKpiStrip cells={cells} columns={7} ariaLabel="Users KPIs" />
  );
}
