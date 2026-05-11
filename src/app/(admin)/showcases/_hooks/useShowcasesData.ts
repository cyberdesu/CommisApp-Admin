"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import {
  PAGE_SIZE,
  type ShowcaseDetailResponse,
  type ShowcasesResponse,
} from "../_lib/types";

export function useShowcasesList(params: {
  cursor: string | null;
  search: string;
}) {
  return useQuery({
    queryKey: ["showcases", params],
    queryFn: async () => {
      const response = await apiClient.get<ShowcasesResponse>("/showcases", {
        params: {
          limit: PAGE_SIZE,
          ...(params.cursor ? { cursor: params.cursor } : {}),
          search: params.search,
        },
      });
      return response.data;
    },
    placeholderData: keepPreviousData,
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
