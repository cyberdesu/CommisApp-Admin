import "server-only";

import { Prisma } from "@/prisma/generated/client";
import type {
  AdminOrderStatus,
  UserOrderOverview,
  UserOrderTimelineItem,
} from "@/lib/user-orders.types";

export const ZERO = new Prisma.Decimal(0);

export const ACTIVE_ORDER_STATUSES = new Set<AdminOrderStatus>([
  "PENDING",
  "ACCEPTED",
  "IN_PROGRESS",
  "WAITING_FOR_CLIENT",
  "DELIVERED",
]);

export const ANALYTICS_EXCLUDED_STATUSES: AdminOrderStatus[] = [
  "REJECTED",
  "CANCELLED",
];

export const MAX_ORDERS_PER_ROLE = 8;
export const MAX_TIMELINE_ITEMS = 6;
export const ADMIN_ORDER_PAGE_LIMIT_MAX = 50;
export const ANALYTICS_LIST_LIMIT = 5;

/** Must stay in sync with PLATFORM_FEE_RATE in orders.service.ts */
export const PLATFORM_FEE_RATE = new Prisma.Decimal("0.10");

export const orderOverviewSelect = {
  id: true,
  artistId: true,
  clientId: true,
  conversation: {
    select: {
      id: true,
    },
  },
  source: true,
  status: true,
  titleSnapshot: true,
  priceSnapshot: true,
  currency: true,
  deliveryDaysMin: true,
  deliveryDaysMax: true,
  revisionsIncluded: true,
  revisionsUsed: true,
  createdAt: true,
  updatedAt: true,
  service: {
    select: {
      title: true,
    },
  },
  artist: {
    select: {
      id: true,
      name: true,
      username: true,
    },
  },
  client: {
    select: {
      id: true,
      name: true,
      username: true,
    },
  },
} satisfies Prisma.OrderSelect;

export type SelectedOrderRecord = Prisma.OrderGetPayload<{
  select: typeof orderOverviewSelect;
}>;

export type SelectedOrderEventRecord = Prisma.OrderEventGetPayload<{
  select: {
    id: true;
    orderId: true;
    type: true;
    description: true;
    actorId: true;
    metadata: true;
    createdAt: true;
  };
}>;

export type SelectedPaymentRecord = Prisma.PaymentGetPayload<{
  select: {
    orderId: true;
    paidAt: true;
  };
}>;

export function normalizeCurrency(value?: string | null) {
  return value?.trim().toUpperCase() || "USD";
}

export function decimalOrZero(value: Prisma.Decimal | null | undefined) {
  return value ?? ZERO;
}

export function serializeVolumeMap(volumeMap: Map<string, Prisma.Decimal>) {
  return [...volumeMap.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([currency, amount]) => {
      const fees = amount.mul(PLATFORM_FEE_RATE).toDecimalPlaces(2);
      return {
        currency,
        amount: amount.toFixed(2),
        platformFees: fees.toFixed(2),
        netVolume: amount.sub(fees).toFixed(2),
      };
    });
}

export function isObjectRecord(
  value: unknown,
): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function getStatusFromMetadata(
  metadata: unknown,
  keys: string[],
): AdminOrderStatus | null {
  if (!isObjectRecord(metadata)) return null;

  for (const key of keys) {
    const value = metadata[key];
    if (typeof value === "string") {
      return value as AdminOrderStatus;
    }
  }

  return null;
}

export function hasAdminIntervention(metadata: unknown) {
  if (!isObjectRecord(metadata)) return false;
  return (
    typeof metadata.adminId === "number" ||
    metadata.source === "ADMIN_PANEL" ||
    metadata.adminAction === true
  );
}

export function buildActorLabel(params: {
  actorId: number | null;
  artistId: number;
  clientId: number | null;
  metadata: unknown;
}) {
  if (hasAdminIntervention(params.metadata)) return "Admin";
  if (params.actorId === params.artistId) return "Artist";
  if (params.clientId && params.actorId === params.clientId) return "Client";
  if (params.actorId) return "User";
  return "System";
}

export function buildTimelineItem(params: {
  event: SelectedOrderEventRecord;
  artistId: number;
  clientId: number | null;
}): UserOrderTimelineItem {
  return {
    id: params.event.id,
    type: params.event.type,
    description: params.event.description,
    createdAt: params.event.createdAt.toISOString(),
    actorLabel: buildActorLabel({
      actorId: params.event.actorId,
      artistId: params.artistId,
      clientId: params.clientId,
      metadata: params.event.metadata,
    }),
    isAdminIntervention: hasAdminIntervention(params.event.metadata),
    fromStatus: getStatusFromMetadata(params.event.metadata, [
      "fromStatus",
      "previousStatus",
      "oldStatus",
    ]),
    toStatus: getStatusFromMetadata(params.event.metadata, [
      "toStatus",
      "nextStatus",
      "newStatus",
    ]),
  };
}

export function buildAttentionFlags(params: {
  deliveredTransitions: number;
  revisionsIncluded: number;
  revisionsUsed: number;
  status: AdminOrderStatus;
  adminInterventions: number;
}): UserOrderOverview["attentionFlags"] {
  const attentionFlags: UserOrderOverview["attentionFlags"] = [];

  if (params.deliveredTransitions > 1) {
    attentionFlags.push({
      code: "REPEATED_DELIVERY",
      label: "Delivered multiple times",
      level: "warning",
    });
  }
  if (
    params.revisionsIncluded > 0 &&
    params.revisionsUsed === params.revisionsIncluded
  ) {
    attentionFlags.push({
      code: "REVISION_LIMIT_REACHED",
      label: "Revision limit reached",
      level: "warning",
    });
  }
  if (params.revisionsUsed > params.revisionsIncluded) {
    attentionFlags.push({
      code: "REVISION_LIMIT_EXCEEDED",
      label: "Revision count exceeds slot limit",
      level: "critical",
    });
  }
  if (
    params.status === "DELIVERED" &&
    params.revisionsIncluded > 0 &&
    params.revisionsUsed >= params.revisionsIncluded
  ) {
    attentionFlags.push({
      code: "DELIVERED_WITH_NO_REVISION_LEFT",
      label: "Delivered while no revision slot remains",
      level: "critical",
    });
  }
  if (params.adminInterventions > 0) {
    attentionFlags.push({
      code: "ADMIN_INTERVENED",
      label: "Admin has intervened before",
      level: "info",
    });
  }
  if (
    attentionFlags.length === 0 &&
    params.revisionsIncluded > 0 &&
    params.revisionsUsed >= 1
  ) {
    attentionFlags.push({
      code: "REVISIONS_IN_USE",
      label: `Revisions in use (${params.revisionsUsed}/${params.revisionsIncluded})`,
      level: "info",
    });
  }

  return attentionFlags;
}
