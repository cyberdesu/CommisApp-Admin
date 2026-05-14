import type {
  FinanceCurrencyBreakdown,
  RecentPaymentActivity,
  RecentPayoutActivity,
  UserFinanceSummary,
} from "@/lib/user-finance.types";
import type { UserOrdersDetail } from "@/lib/user-orders.types";

export type ModerationAction = "BAN" | "UNBAN" | "SUSPEND" | "UNSUSPEND";

export type UserModerationItem = {
  id: string;
  action: ModerationAction;
  reason: string | null;
  duration: number | null;
  expiresAt: string | null;
  createdAt: string;
  admin: {
    id: number;
    name: string;
    email: string;
  };
};

export type UserItem = {
  id: number;
  email: string;
  name: string | null;
  username: string;
  role: string;
  verified: boolean;
  verifiedArtists: boolean;
  isBanned: boolean;
  suspendedUntil: string | null;
  banReason: string | null;
  createdAt: string;
  avatar?: string | null;
  banner?: string | null;
  bio?: string | null;
  country?: string | null;
  moderations?: UserModerationItem[];
  finance?: UserFinanceSummary;
  recentPayments?: RecentPaymentActivity[];
  recentPayouts?: RecentPayoutActivity[];
  orders?: UserOrdersDetail;
};

export type UsersResponse = {
  data: UserItem[];
  meta: {
    limit: number;
    page: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
};

export type UserDetailResponse = {
  data: UserItem;
};

export type ArtistRequestsMetaResponse = {
  meta?: {
    total?: number;
  };
};

export type UpdateUserPayload = {
  name: string;
  username: string;
  email: string;
  role: string;
  verified: boolean;
  verifiedArtists: boolean;
  country: string;
  bio: string;
};

export type ModerateUserPayload = {
  id: number;
  action: ModerationAction;
  reason?: string;
  durationHours?: number;
};

export type ModerateUserResponse = {
  message: string;
  data: {
    id: number;
    isBanned: boolean;
    suspendedUntil: string | null;
    banReason: string | null;
  };
};

export type UserStatsData = {
  totalUsers: number;
  verifiedCount: number;
  verifiedArtistCount: number;
  adminCount: number;
  bannedCount: number;
  finance: {
    artistsWithEarnings: number;
    artistsWithWithdrawals: number;
    completedPayments: number;
    processedPayouts: number;
    currencies: FinanceCurrencyBreakdown[];
  };
};

export type UserStatsResponse = {
  data: UserStatsData;
};

export const PAGE_SIZE = 10;
