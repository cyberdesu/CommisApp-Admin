"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import {
  PAGE_SIZE,
  type ArtistRequestsMetaResponse,
  type UserDetailResponse,
  type UsersResponse,
} from "../_lib/types";

export function useUsersList(params: {
  cursor: string | null;
  search: string;
  roleFilter: string;
  verifiedFilter: string;
}) {
  return useQuery({
    queryKey: ["users", params],
    queryFn: async () => {
      const response = await apiClient.get<UsersResponse>("/users", {
        params: {
          limit: PAGE_SIZE,
          ...(params.cursor ? { cursor: params.cursor } : {}),
          search: params.search,
          ...(params.roleFilter !== "all" ? { role: params.roleFilter } : {}),
          ...(params.verifiedFilter !== "all"
            ? { verified: params.verifiedFilter }
            : {}),
        },
      });
      return response.data;
    },
    placeholderData: keepPreviousData,
  });
}

export function useUserDetail(userId: number | null, enabled: boolean) {
  return useQuery({
    queryKey: ["user-detail", userId],
    queryFn: async () => {
      const response = await apiClient.get<UserDetailResponse>(
        `/users/${userId}`,
      );
      return response.data.data;
    },
    enabled: userId !== null && enabled,
  });
}

export function useArtistRequestsMeta() {
  return useQuery({
    queryKey: ["artist-requests-pending-meta"],
    queryFn: async () => {
      const response = await apiClient.get<ArtistRequestsMetaResponse>(
        "/artist-requests",
        { params: { status: "PENDING", summary: 1 } },
      );
      return response.data;
    },
  });
}
