import "server-only";

import type {
  UserOrderOverview,
  UserOrderParticipantRole,
} from "@/lib/user-orders.types";
import {
  MAX_TIMELINE_ITEMS,
  buildAttentionFlags,
  buildTimelineItem,
  getStatusFromMetadata,
  hasAdminIntervention,
  normalizeCurrency,
  type SelectedOrderEventRecord,
  type SelectedOrderRecord,
  type SelectedPaymentRecord,
} from "./_shared";

export function buildOrderOverviews(params: {
  orders: SelectedOrderRecord[];
  events: SelectedOrderEventRecord[];
  completedPayments: SelectedPaymentRecord[];
  perspectiveUserId?: number;
}): UserOrderOverview[] {
  const eventsByOrderId = new Map<string, SelectedOrderEventRecord[]>();
  for (const event of params.events) {
    const current = eventsByOrderId.get(event.orderId) ?? [];
    current.push(event);
    eventsByOrderId.set(event.orderId, current);
  }

  const completedPaymentAtByOrderId = new Map<string, Date>();
  for (const payment of params.completedPayments) {
    if (!payment.paidAt) continue;
    if (!completedPaymentAtByOrderId.has(payment.orderId)) {
      completedPaymentAtByOrderId.set(payment.orderId, payment.paidAt);
    }
  }

  return params.orders.map((order) => {
    const orderEvents = eventsByOrderId.get(order.id) ?? [];

    let deliveredTransitions = 0;
    let revisionRequests = 0;
    let statusChanges = 0;
    let adminInterventions = 0;
    let latestActivityAt = order.updatedAt;

    const timeline = orderEvents
      .slice(0, MAX_TIMELINE_ITEMS)
      .map((event) =>
        buildTimelineItem({
          event,
          artistId: order.artistId,
          clientId: order.clientId,
        }),
      );

    for (const event of orderEvents) {
      if (event.createdAt > latestActivityAt) {
        latestActivityAt = event.createdAt;
      }

      if (event.type === "REVISION_REQUESTED") {
        revisionRequests += 1;
      }

      if (event.type === "STATUS_CHANGED") {
        statusChanges += 1;
        const toStatus = getStatusFromMetadata(event.metadata, [
          "toStatus",
          "nextStatus",
          "newStatus",
        ]);
        if (toStatus === "DELIVERED") {
          deliveredTransitions += 1;
        }
      }

      if (hasAdminIntervention(event.metadata)) {
        adminInterventions += 1;
      }
    }

    const paidAt = completedPaymentAtByOrderId.get(order.id);
    if (paidAt && paidAt > latestActivityAt) {
      latestActivityAt = paidAt;
    }

    const participantRole: UserOrderParticipantRole =
      params.perspectiveUserId && order.artistId === params.perspectiveUserId
        ? "ARTIST"
        : params.perspectiveUserId && order.clientId === params.perspectiveUserId
          ? "CLIENT"
          : "ARTIST";
    const counterpart =
      participantRole === "ARTIST" ? order.client : order.artist;

    return {
      id: order.id,
      conversationId: order.conversation?.id ?? null,
      participantRole,
      status: order.status,
      source: order.source,
      title:
        order.titleSnapshot?.trim() ||
        order.service?.title ||
        "Untitled commission order",
      serviceTitle: order.service?.title ?? null,
      amount: order.priceSnapshot.toFixed(2),
      currency: normalizeCurrency(order.currency),
      createdAt: order.createdAt.toISOString(),
      updatedAt: order.updatedAt.toISOString(),
      latestActivityAt: latestActivityAt.toISOString(),
      deliveryDaysMin: order.deliveryDaysMin,
      deliveryDaysMax: order.deliveryDaysMax,
      revisionsIncluded: order.revisionsIncluded,
      revisionsUsed: order.revisionsUsed,
      paymentCaptured: completedPaymentAtByOrderId.has(order.id),
      artist: {
        id: order.artist.id,
        name: order.artist.name,
        username: order.artist.username,
      },
      client: order.client
        ? {
            id: order.client.id,
            name: order.client.name,
            username: order.client.username,
          }
        : null,
      counterpart: counterpart
        ? {
            id: counterpart.id,
            name: counterpart.name,
            username: counterpart.username,
          }
        : null,
      metrics: {
        deliveredTransitions,
        revisionRequests,
        statusChanges,
        adminInterventions,
      },
      attentionFlags: buildAttentionFlags({
        deliveredTransitions,
        revisionsIncluded: order.revisionsIncluded,
        revisionsUsed: order.revisionsUsed,
        status: order.status,
        adminInterventions,
      }),
      timeline,
    };
  });
}
