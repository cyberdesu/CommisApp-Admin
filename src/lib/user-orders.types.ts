export type AdminOrderStatus =
  | "PENDING"
  | "ACCEPTED"
  | "IN_PROGRESS"
  | "WAITING_FOR_CLIENT"
  | "DELIVERED"
  | "COMPLETED"
  | "CANCELLED"
  | "REJECTED";

export type UserOrderParticipantRole = "ARTIST" | "CLIENT";

export type UserOrderAttentionLevel = "info" | "warning" | "critical";

export type UserOrderAttentionFlag = {
  code:
    | "REPEATED_DELIVERY"
    | "REVISION_LIMIT_REACHED"
    | "REVISION_LIMIT_EXCEEDED"
    | "DELIVERED_WITH_NO_REVISION_LEFT"
    | "ADMIN_INTERVENED";
  label: string;
  level: UserOrderAttentionLevel;
};

export type UserOrderTimelineItem = {
  id: string;
  type: string;
  description: string;
  createdAt: string;
  actorLabel: string;
  isAdminIntervention: boolean;
  fromStatus: AdminOrderStatus | null;
  toStatus: AdminOrderStatus | null;
};

export type UserOrderOverview = {
  id: string;
  conversationId: string | null;
  participantRole: UserOrderParticipantRole;
  status: AdminOrderStatus;
  source: "SERVICE" | "CUSTOM_REQUEST";
  title: string;
  serviceTitle: string | null;
  amount: string;
  currency: string;
  createdAt: string;
  updatedAt: string;
  latestActivityAt: string;
  deliveryDaysMin: number | null;
  deliveryDaysMax: number | null;
  revisionsIncluded: number;
  revisionsUsed: number;
  paymentCaptured: boolean;
  artist: {
    id: number;
    name: string | null;
    username: string;
  };
  client: {
    id: number;
    name: string | null;
    username: string;
  } | null;
  counterpart: {
    id: number;
    name: string | null;
    username: string;
  } | null;
  metrics: {
    deliveredTransitions: number;
    revisionRequests: number;
    statusChanges: number;
    adminInterventions: number;
  };
  attentionFlags: UserOrderAttentionFlag[];
  timeline: UserOrderTimelineItem[];
};

export type UserOrderSummary = {
  totalOrders: number;
  activeOrders: number;
  deliveredOrders: number;
  completedOrders: number;
  atRiskOrders: number;
};

export type UserOrdersDetail = {
  summary: UserOrderSummary;
  artistOrders: UserOrderOverview[];
  clientOrders: UserOrderOverview[];
};

export type AdminOrdersListResult = {
  orders: UserOrderOverview[];
  hasNextPage: boolean;
  nextCursor: string | null;
};

export type AdminOrderStats = {
  total: number;
  active: number;
  delivered: number;
  completed: number;
  attention: number;
};

export type OrderAnalyticsParty = {
  id: number;
  name: string | null;
  username: string;
  orderCount: number;
  grossVolume: OrderAnalyticsVolume[];
};

export type OrderAnalyticsPair = {
  artist: {
    id: number;
    name: string | null;
    username: string;
  };
  client: {
    id: number;
    name: string | null;
    username: string;
  };
  orderCount: number;
  grossVolume: OrderAnalyticsVolume[];
};

export type OrderAnalyticsService = {
  id: string;
  title: string;
  orderCount: number;
  grossVolume: OrderAnalyticsVolume[];
  artist: {
    id: number;
    name: string | null;
    username: string;
  };
  categories: string[];
};

export type OrderAnalyticsCategory = {
  name: string;
  orderCount: number;
  grossVolume: OrderAnalyticsVolume[];
  serviceCount: number;
};

export type OrderAnalyticsSource = {
  source: "SERVICE" | "CUSTOM_REQUEST";
  orderCount: number;
  grossVolume: OrderAnalyticsVolume[];
};

export type OrderAnalyticsVolume = {
  currency: string;
  amount: string;
  platformFees: string;
  netVolume: string;
};

export type AdminOrderAnalytics = {
  topPairs: OrderAnalyticsPair[];
  topArtists: OrderAnalyticsParty[];
  topClients: OrderAnalyticsParty[];
  topServices: OrderAnalyticsService[];
  topCategories: OrderAnalyticsCategory[];
  sources: OrderAnalyticsSource[];
};
