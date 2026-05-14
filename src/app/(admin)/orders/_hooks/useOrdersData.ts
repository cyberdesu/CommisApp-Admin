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

type OrdersFilterKey = {
  search: string;
  status: StatusFilter;
  source: SourceFilter;
  attention: AttentionFilter;
  scopedUserId: number | null;
};

function buildFilterKey(params: OrdersFilterKey): OrdersFilterKey {
  return {
    search: params.search,
    status: params.status,
    source: params.source,
    attention: params.attention,
    scopedUserId: params.scopedUserId,
  };
}

function filtersEqual(left: OrdersFilterKey, right: OrdersFilterKey) {
  return (
    left.search === right.search &&
    left.status === right.status &&
    left.source === right.source &&
    left.attention === right.attention &&
    left.scopedUserId === right.scopedUserId
  );
}

export function useOrdersList(params: {
  page: number;
  search: string;
  status: StatusFilter;
  source: SourceFilter;
  attention: AttentionFilter;
  scopedUserId: number | null;
}) {
  const filters = buildFilterKey(params);
  return useQuery({
    queryKey: ["orders", { page: params.page, ...filters }],
    queryFn: async () => {
      const response = await apiClient.get<OrdersResponse>("/orders", {
        params: {
          limit: PAGE_SIZE,
          page: params.page,
          ...(params.search ? { search: params.search } : {}),
          status: params.status,
          source: params.source,
          attention: params.attention,
          ...(params.scopedUserId ? { userId: params.scopedUserId } : {}),
        },
      });
      return response.data;
    },
    placeholderData: (previous, previousQuery) => {
      if (!previous || !previousQuery) return undefined;
      const prevPayload = previousQuery.queryKey[1] as
        | (OrdersFilterKey & { page: number })
        | undefined;
      if (!prevPayload) return undefined;
      const prevFilters: OrdersFilterKey = {
        search: prevPayload.search,
        status: prevPayload.status,
        source: prevPayload.source,
        attention: prevPayload.attention,
        scopedUserId: prevPayload.scopedUserId,
      };
      return filtersEqual(prevFilters, filters) ? previous : undefined;
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
