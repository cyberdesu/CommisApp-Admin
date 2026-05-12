"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import { useAdminRealtime } from "@/hooks/use-admin-realtime";
import type {
  AdminOrderAnalytics,
  AdminOrderStats,
} from "@/lib/user-orders.types";
import type { PlatformFinanceStats } from "@/lib/user-finance.types";

type UsersStatsResponse = {
  data: {
    totalUsers: number;
    verifiedCount: number;
    verifiedArtistCount: number;
    adminCount: number;
    finance: PlatformFinanceStats;
  };
};
type PayoutStatsResponse = {
  data?: { pending: number; sent: number; fraud: number };
  pending?: number;
  sent?: number;
  fraud?: number;
};
type ArtistRequestsMetaResponse = {
  meta?: { total?: number };
};

export function useDashboardData() {
  const queryClient = useQueryClient();

  const financeQuery = useQuery({
    queryKey: ["dashboard-finance"],
    queryFn: async () => {
      const res = await apiClient.get<UsersStatsResponse>("/users/stats");
      return res.data.data;
    },
    staleTime: 60_000,
  });

  const ordersStatsQuery = useQuery({
    queryKey: ["dashboard-orders-stats"],
    queryFn: async () => {
      const res = await apiClient.get<AdminOrderStats>("/orders/stats");
      return res.data;
    },
    staleTime: 60_000,
  });

  const ordersAnalyticsQuery = useQuery({
    queryKey: ["dashboard-orders-analytics"],
    queryFn: async () => {
      const res = await apiClient.get<AdminOrderAnalytics>("/orders/analytics");
      return res.data;
    },
    staleTime: 60_000,
  });

  const payoutStatsQuery = useQuery({
    queryKey: ["dashboard-payouts-stats"],
    queryFn: async () => {
      const res = await apiClient.get<PayoutStatsResponse>("/payouts/stats");
      const body = res.data;
      // Normalize: backend may return inline or under data
      return {
        pending: body.data?.pending ?? body.pending ?? 0,
        sent: body.data?.sent ?? body.sent ?? 0,
        fraud: body.data?.fraud ?? body.fraud ?? 0,
      };
    },
    staleTime: 60_000,
  });

  const artistRequestsQuery = useQuery({
    queryKey: ["dashboard-artist-requests"],
    queryFn: async () => {
      const res = await apiClient.get<ArtistRequestsMetaResponse>(
        "/artist-requests",
        { params: { status: "PENDING", summary: 1 } },
      );
      return res.data?.meta?.total ?? 0;
    },
    staleTime: 60_000,
  });

  useAdminRealtime({
    topics: ["orders", "finance"],
    onEvent: () => {
      void queryClient.invalidateQueries({ queryKey: ["dashboard-finance"] });
      void queryClient.invalidateQueries({
        queryKey: ["dashboard-orders-stats"],
      });
      void queryClient.invalidateQueries({
        queryKey: ["dashboard-orders-analytics"],
      });
    },
  });

  function refetchAll() {
    void queryClient.invalidateQueries({ queryKey: ["dashboard-finance"] });
    void queryClient.invalidateQueries({
      queryKey: ["dashboard-orders-stats"],
    });
    void queryClient.invalidateQueries({
      queryKey: ["dashboard-orders-analytics"],
    });
    void queryClient.invalidateQueries({
      queryKey: ["dashboard-payouts-stats"],
    });
    void queryClient.invalidateQueries({
      queryKey: ["dashboard-artist-requests"],
    });
  }

  return {
    financeQuery,
    ordersStatsQuery,
    ordersAnalyticsQuery,
    payoutStatsQuery,
    artistRequestsQuery,
    refetchAll,
    isLoading:
      financeQuery.isLoading ||
      ordersStatsQuery.isLoading ||
      payoutStatsQuery.isLoading,
  };
}
