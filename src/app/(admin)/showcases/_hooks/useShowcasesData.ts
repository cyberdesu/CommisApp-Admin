"use client";

import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import {
  PAGE_SIZE,
  type ShowcaseDetailResponse,
  type ShowcaseTab,
  type ShowcasesResponse,
} from "../_lib/types";

type ShowcasesFilterKey = {
  search: string;
  tab: ShowcaseTab;
};

function filtersEqual(left: ShowcasesFilterKey, right: ShowcasesFilterKey) {
  return left.search === right.search && left.tab === right.tab;
}

export function useShowcasesList(params: {
  page: number;
  search: string;
  tab: ShowcaseTab;
}) {
  const filters: ShowcasesFilterKey = {
    search: params.search,
    tab: params.tab,
  };
  return useQuery({
    queryKey: ["showcases", { page: params.page, ...filters }],
    queryFn: async () => {
      const response = await apiClient.get<ShowcasesResponse>("/showcases", {
        params: {
          limit: PAGE_SIZE,
          page: params.page,
          tab: params.tab,
          ...(params.search ? { search: params.search } : {}),
        },
      });
      return response.data;
    },
    placeholderData: (previous, previousQuery) => {
      if (!previous || !previousQuery) return undefined;
      const prevPayload = previousQuery.queryKey[1] as
        | (ShowcasesFilterKey & { page: number })
        | undefined;
      if (!prevPayload) return undefined;
      const prevFilters: ShowcasesFilterKey = {
        search: prevPayload.search,
        tab: prevPayload.tab,
      };
      return filtersEqual(prevFilters, filters) ? previous : undefined;
    },
  });
}

export function useShowcaseDetail(id: string | null) {
  return useQuery({
    queryKey: ["showcase-detail", id],
    queryFn: async () => {
      const res = await apiClient.get<ShowcaseDetailResponse>(
        `/showcases/${id}`,
      );
      return res.data.data;
    },
    enabled: id !== null,
  });
}
