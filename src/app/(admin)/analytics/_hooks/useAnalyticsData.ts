"use client";

import axios from "axios";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { useAdminRealtime } from "@/hooks/use-admin-realtime";
import { apiClient } from "@/lib/api/client";
import type { AdminOrderAnalytics } from "@/lib/user-orders.types";
import type {
  FinanceStatsResponse,
  SyncPaypalFeesResponse,
  SyncPaypalPayoutFeesResponse,
} from "../_lib/types";

export function useAnalyticsData() {
  const queryClient = useQueryClient();

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ["platform-finance-stats"] });
    void queryClient.invalidateQueries({ queryKey: ["platform-order-analytics"] });
  };

  const financeQuery = useQuery({
    queryKey: ["platform-finance-stats"],
    queryFn: async () => {
      const response = await apiClient.get<FinanceStatsResponse>("/users/stats");
      return response.data.data.finance;
    },
    staleTime: 30_000,
    refetchInterval: 60_000,
  });

  const analyticsQuery = useQuery({
    queryKey: ["platform-order-analytics"],
    queryFn: async () => {
      const response = await apiClient.get<AdminOrderAnalytics>(
        "/orders/analytics",
      );
      return response.data;
    },
    staleTime: 30_000,
    refetchInterval: 60_000,
  });

  const syncPaymentMutation = useMutation({
    mutationFn: async () => {
      const response = await apiClient.post<SyncPaypalFeesResponse>(
        "/finance/paypal-fees/sync",
        { limit: 50 },
      );
      return response.data;
    },
    onSuccess: (r) => {
      toast.success(r.message);
      invalidate();
    },
    onError: (e) => {
      if (axios.isAxiosError<{ message?: string }>(e)) {
        toast.error(e.response?.data?.message ?? "Failed to sync PayPal fees");
        return;
      }
      toast.error("Failed to sync PayPal fees");
    },
  });

  const syncPayoutMutation = useMutation({
    mutationFn: async () => {
      const response = await apiClient.post<SyncPaypalPayoutFeesResponse>(
        "/finance/paypal-payout-fees/sync",
        { limit: 50 },
      );
      return response.data;
    },
    onSuccess: (r) => {
      toast.success(r.message);
      invalidate();
    },
    onError: (e) => {
      if (axios.isAxiosError<{ message?: string }>(e)) {
        toast.error(
          e.response?.data?.message ?? "Failed to sync PayPal payout fees",
        );
        return;
      }
      toast.error("Failed to sync PayPal payout fees");
    },
  });

  useAdminRealtime({
    topics: ["orders", "finance"],
    onEvent: invalidate,
  });

  const isSyncing =
    syncPaymentMutation.isPending || syncPayoutMutation.isPending;

  function syncAll() {
    if (isSyncing) return;
    syncPaymentMutation.mutate();
    syncPayoutMutation.mutate();
  }

  return {
    financeQuery,
    analyticsQuery,
    isSyncing,
    syncAll,
  };
}
