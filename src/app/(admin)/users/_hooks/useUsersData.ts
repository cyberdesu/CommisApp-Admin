"use client";

import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import {
  PAGE_SIZE,
  type ArtistRequestsMetaResponse,
  type UserDetailResponse,
  type UsersResponse,
} from "../_lib/types";

type UsersFilterKey = {
  search: string;
  roleFilter: string;
  verifiedFilter: string;
};

function filtersEqual(left: UsersFilterKey, right: UsersFilterKey) {
  return (
    left.search === right.search &&
    left.roleFilter === right.roleFilter &&
    left.verifiedFilter === right.verifiedFilter
  );
}

export function useUsersList(params: {
  page: number;
  search: string;
  roleFilter: string;
  verifiedFilter: string;
}) {
  const filters: UsersFilterKey = {
    search: params.search,
    roleFilter: params.roleFilter,
    verifiedFilter: params.verifiedFilter,
  };
  return useQuery({
    queryKey: ["users", { page: params.page, ...filters }],
    queryFn: async () => {
      const response = await apiClient.get<UsersResponse>("/users", {
        params: {
          limit: PAGE_SIZE,
          page: params.page,
          search: params.search,
          ...(params.roleFilter !== "all" ? { role: params.roleFilter } : {}),
          ...(params.verifiedFilter !== "all"
            ? { verified: params.verifiedFilter }
            : {}),
        },
      });
      return response.data;
    },
    placeholderData: (previous, previousQuery) => {
      if (!previous || !previousQuery) return undefined;
      const prevPayload = previousQuery.queryKey[1] as
        | (UsersFilterKey & { page: number })
        | undefined;
      if (!prevPayload) return undefined;
      const prevFilters: UsersFilterKey = {
        search: prevPayload.search,
        roleFilter: prevPayload.roleFilter,
        verifiedFilter: prevPayload.verifiedFilter,
      };
      return filtersEqual(prevFilters, filters) ? previous : undefined;
    },
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
