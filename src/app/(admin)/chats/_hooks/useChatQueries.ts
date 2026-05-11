"use client";

import {
  keepPreviousData,
  useInfiniteQuery,
  useQuery,
} from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import type {
  ConversationsResponse,
  MessagesResponse,
  StatsResponse,
  TypeFilter,
} from "../_lib/types";

export function useChatStats() {
  return useQuery({
    queryKey: ["chat-stats"],
    queryFn: async () => {
      const res = await apiClient.get<StatsResponse>("/chats/stats");
      return res.data.data;
    },
    staleTime: 15_000,
  });
}

export function useConversations({
  search,
  typeFilter,
}: {
  search: string;
  typeFilter: TypeFilter;
}) {
  return useInfiniteQuery({
    queryKey: ["conversations", search, typeFilter],
    queryFn: async ({ pageParam }) => {
      const params: Record<string, string> = { limit: "20" };
      if (pageParam) params.cursor = pageParam;
      if (search) params.search = search;
      if (typeFilter !== "ALL") params.type = typeFilter;

      const res = await apiClient.get<ConversationsResponse>(
        "/chats/conversations",
        { params },
      );
      return res.data;
    },
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.meta.nextCursor,
    placeholderData: keepPreviousData,
    staleTime: 10_000,
  });
}

export function useMessages({
  conversationId,
  includeDeleted,
}: {
  conversationId: string;
  includeDeleted: boolean;
}) {
  return useInfiniteQuery({
    queryKey: ["messages", conversationId, includeDeleted],
    queryFn: async ({ pageParam }) => {
      const params: Record<string, string> = { limit: "40" };
      if (pageParam) params.cursor = pageParam;
      if (includeDeleted) params.includeDeleted = "true";

      const res = await apiClient.get<MessagesResponse>(
        `/chats/conversations/${conversationId}/messages`,
        { params },
      );
      return res.data;
    },
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.meta.nextCursor,
    staleTime: 10_000,
  });
}
