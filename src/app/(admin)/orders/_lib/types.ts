import type {
  AdminOrderStatus,
  UserOrderOverview,
} from "@/lib/user-orders.types";

export type OrdersResponse = {
  data: UserOrderOverview[];
  meta: {
    limit: number;
    hasNextPage: boolean;
    nextCursor: string | null;
    cursor: string | null;
  };
  filters: {
    search: string;
    status: string;
    source: string;
    attention: string;
    userId: number | null;
  };
};

export type OrderInterventionResponse = {
  message: string;
  data: {
    id: string;
    status: AdminOrderStatus;
    revisionsUsed: number;
    revisionsIncluded: number;
    updatedAt: string;
  };
};

export type StatusFilter = "ALL" | AdminOrderStatus;
export type SourceFilter = "ALL" | "SERVICE" | "CUSTOM_REQUEST";
export type AttentionFilter = "ALL" | "FLAGGED" | "CLEAN";

export const PAGE_SIZE = 10;

export const ADMIN_ORDER_STATUS_OPTIONS: AdminOrderStatus[] = [
  "PENDING",
  "ACCEPTED",
  "IN_PROGRESS",
  "WAITING_FOR_CLIENT",
  "DELIVERED",
  "COMPLETED",
  "CANCELLED",
  "REJECTED",
];
