import "server-only";

import prisma from "@/lib/prisma";
import { createLogger } from "@/lib/logger";
import type {
  AdminRealtimeEvent,
  AdminRealtimeTopic,
} from "@/lib/admin-realtime.types";

type AdminRealtimeSnapshot = Record<AdminRealtimeTopic, string>;
type AdminRealtimeSubscriber = (event: AdminRealtimeEvent) => void;

type AdminRealtimeState = {
  currentSnapshot: AdminRealtimeSnapshot | null;
  isPolling: boolean;
  poller: ReturnType<typeof setInterval> | null;
  subscribers: Map<string, AdminRealtimeSubscriber>;
};

const ADMIN_REALTIME_POLL_INTERVAL_MS = 5_000;
const logger = createLogger({ component: "admin-realtime" });

declare global {
  var __adminRealtimeState: AdminRealtimeState | undefined;
}

function getState(): AdminRealtimeState {
  if (!globalThis.__adminRealtimeState) {
    globalThis.__adminRealtimeState = {
      currentSnapshot: null,
      isPolling: false,
      poller: null,
      subscribers: new Map(),
    };
  }

  return globalThis.__adminRealtimeState;
}

function buildFingerprint(parts: Array<string | number | null | undefined>) {
  return parts.map((part) => part ?? "null").join(":");
}

async function fetchSnapshot(): Promise<AdminRealtimeSnapshot> {
  const [
    ordersCount,
    latestOrder,
    paymentsCount,
    latestPayment,
    payoutsCount,
    latestPayout,
    conversationsCount,
    latestConversation,
    messagesCount,
    latestMessage,
  ] = await Promise.all([
    prisma.order.count(),
    prisma.order.aggregate({
      _max: {
        updatedAt: true,
      },
    }),
    prisma.payment.count(),
    prisma.payment.aggregate({
      _max: {
        updatedAt: true,
      },
    }),
    prisma.payout.count(),
    prisma.payout.aggregate({
      _max: {
        updatedAt: true,
      },
    }),
    prisma.conversation.count(),
    prisma.conversation.aggregate({
      _max: {
        updatedAt: true,
      },
    }),
    prisma.message.count(),
    prisma.message.aggregate({
      _max: {
        updatedAt: true,
      },
    }),
  ]);

  return {
    orders: buildFingerprint([
      ordersCount,
      latestOrder._max.updatedAt?.toISOString(),
    ]),
    chats: buildFingerprint([
      conversationsCount,
      latestConversation._max.updatedAt?.toISOString(),
      messagesCount,
      latestMessage._max.updatedAt?.toISOString(),
    ]),
    finance: buildFingerprint([
      paymentsCount,
      latestPayment._max.updatedAt?.toISOString(),
      payoutsCount,
      latestPayout._max.updatedAt?.toISOString(),
    ]),
  };
}

function dispatchEvent(event: AdminRealtimeEvent) {
  const state = getState();

  for (const subscriber of state.subscribers.values()) {
    try {
      subscriber(event);
    } catch (error) {
      logger.warn("Admin realtime subscriber callback failed", { error });
    }
  }
}

async function pollSnapshot() {
  const state = getState();

  if (state.isPolling) return;

  state.isPolling = true;

  try {
    const nextSnapshot = await fetchSnapshot();

    if (!state.currentSnapshot) {
      state.currentSnapshot = nextSnapshot;
      logger.debug("Initialized admin realtime snapshot", nextSnapshot);
      return;
    }

    const previousSnapshot = state.currentSnapshot;
    state.currentSnapshot = nextSnapshot;

    (Object.keys(nextSnapshot) as AdminRealtimeTopic[]).forEach((topic) => {
      if (previousSnapshot[topic] === nextSnapshot[topic]) return;

      dispatchEvent({
        topic,
        fingerprint: nextSnapshot[topic],
        emittedAt: new Date().toISOString(),
        trigger: "poll",
      });
    });
  } catch (error) {
    logger.error("Admin realtime snapshot poll failed", { error });
  } finally {
    state.isPolling = false;
  }
}

function ensurePoller() {
  const state = getState();

  if (state.poller || state.subscribers.size === 0) {
    return;
  }

  state.poller = setInterval(() => {
    void pollSnapshot();
  }, ADMIN_REALTIME_POLL_INTERVAL_MS);

  void pollSnapshot();
  logger.info("Started admin realtime poller", {
    intervalMs: ADMIN_REALTIME_POLL_INTERVAL_MS,
  });
}

function stopPollerIfIdle() {
  const state = getState();

  if (state.subscribers.size > 0 || !state.poller) {
    return;
  }

  clearInterval(state.poller);
  state.poller = null;
  logger.info("Stopped admin realtime poller");
}

export function subscribeToAdminRealtime(
  subscriber: AdminRealtimeSubscriber,
) {
  const state = getState();
  const subscriptionId = crypto.randomUUID();

  state.subscribers.set(subscriptionId, subscriber);
  ensurePoller();

  return () => {
    const activeState = getState();
    activeState.subscribers.delete(subscriptionId);
    stopPollerIfIdle();
  };
}

export async function getAdminRealtimeSnapshot() {
  const state = getState();

  if (!state.currentSnapshot) {
    state.currentSnapshot = await fetchSnapshot();
  }

  return state.currentSnapshot;
}

export function broadcastAdminRealtimeTopics(
  topics: AdminRealtimeTopic[],
  trigger: AdminRealtimeEvent["trigger"] = "direct",
) {
  const state = getState();
  const dedupedTopics = [...new Set(topics)];

  dedupedTopics.forEach((topic) => {
    const fingerprint = state.currentSnapshot?.[topic] ?? "unknown";
    dispatchEvent({
      topic,
      fingerprint,
      emittedAt: new Date().toISOString(),
      trigger,
    });
  });

  void pollSnapshot();
}
