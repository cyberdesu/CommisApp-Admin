"use client";

import axios from "axios";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { useAdminRealtime } from "@/hooks/use-admin-realtime";
import { apiClient } from "@/lib/api/client";
import type {
  AdminOrderStats,
  AdminOrderStatus,
} from "@/lib/user-orders.types";
import {
  PAGE_SIZE,
  type AttentionFilter,
  type OrderInterventionResponse,
  type OrdersResponse,
  type SourceFilter,
  type StatusFilter,
} from "../_lib/types";

export function useOrdersList(params: {
  cursor: string | null;
  search: string;
  status: StatusFilter;
  source: SourceFilter;
  attention: AttentionFilter;
  scopedUserId: number | null;
}) {
  return useQuery({
    queryKey: [
      "orders",
      {
        cursor: params.cursor,
        search: params.search,
        status: params.status,
        source: params.source,
        attention: params.attention,
        scopedUserId: params.scopedUserId,
      },
    ],
    queryFn: async () => {
      const response = await apiClient.get<OrdersResponse>("/orders", {
        params: {
          limit: PAGE_SIZE,
          ...(params.cursor ? { cursor: params.cursor } : {}),
          ...(params.search ? { search: params.search } : {}),
          status: params.status,
          source: params.source,
          attention: params.attention,
          ...(params.scopedUserId ? { userId: params.scopedUserId } : {}),
        },
      });
      return response.data;
    },
  });
}

export function useOrdersStats() {
  return useQuery({
    queryKey: ["orders-stats"],
    queryFn: async () => {
      const response = await apiClient.get<AdminOrderStats>("/orders/stats");
      return response.data;
    },
  });
}

export function useOrderIntervention(onSuccess?: () => void) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      id: string;
      status?: AdminOrderStatus;
      revisionsUsed?: number;
      note: string;
    }) => {
      const response = await apiClient.patch<OrderInterventionResponse>(
        `/orders/${payload.id}/admin`,
        payload,
      );
      return response.data;
    },
    onSuccess: (response) => {
      toast.success(response.message);
      void queryClient.invalidateQueries({ queryKey: ["orders"] });
      void queryClient.invalidateQueries({ queryKey: ["orders-stats"] });
      void queryClient.invalidateQueries({ queryKey: ["user-detail"] });
      onSuccess?.();
    },
    onError: (error) => {
      if (axios.isAxiosError<{ message?: string }>(error)) {
        toast.error(error.response?.data?.message ?? "Failed to update order");
        return;
      }
      toast.error("Failed to update order");
    },
  });
}

export function useOrdersRealtime() {
  const queryClient = useQueryClient();
  useAdminRealtime({
    topics: ["orders"],
    onEvent: () => {
      void queryClient.invalidateQueries({ queryKey: ["orders"] });
      void queryClient.invalidateQueries({ queryKey: ["orders-stats"] });
      void queryClient.invalidateQueries({ queryKey: ["user-detail"] });
    },
  });
}
