import "server-only";

import { Client } from "pg";

import prisma from "@/lib/prisma";
import { createLogger } from "@/lib/logger";
import { requireDatabaseUrl } from "@/lib/env/database-url";
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
  listenClient: Client | null;
  listenConnecting: Promise<Client | null> | null;
};

const ADMIN_REALTIME_POLL_INTERVAL_MS = 30_000;
const PG_NOTIFY_CHANNEL = "admin_realtime";
const LISTEN_RECONNECT_DELAY_MS = 5_000;
const VALID_TOPICS = new Set<AdminRealtimeTopic>(["orders", "chats", "finance"]);
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
      listenClient: null,
      listenConnecting: null,
    };
  }

  return globalThis.__adminRealtimeState;
}

function isAdminRealtimeTopic(value: string): value is AdminRealtimeTopic {
  return VALID_TOPICS.has(value as AdminRealtimeTopic);
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
    prisma.order.aggregate({ _max: { updatedAt: true } }),
    prisma.payment.count(),
    prisma.payment.aggregate({ _max: { updatedAt: true } }),
    prisma.payout.count(),
    prisma.payout.aggregate({ _max: { updatedAt: true } }),
    prisma.conversation.count(),
    prisma.conversation.aggregate({ _max: { updatedAt: true } }),
    prisma.message.count(),
    prisma.message.aggregate({ _max: { updatedAt: true } }),
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

async function pollSnapshot(triggeredTopics?: AdminRealtimeTopic[]) {
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

    const trigger: AdminRealtimeEvent["trigger"] = triggeredTopics?.length
      ? "direct"
      : "poll";
    const topicsToCheck = triggeredTopics?.length
      ? triggeredTopics
      : (Object.keys(nextSnapshot) as AdminRealtimeTopic[]);

    topicsToCheck.forEach((topic) => {
      if (previousSnapshot[topic] === nextSnapshot[topic] && trigger === "poll") {
        return;
      }

      dispatchEvent({
        topic,
        fingerprint: nextSnapshot[topic],
        emittedAt: new Date().toISOString(),
        trigger,
      });
    });
  } catch (error) {
    logger.error("Admin realtime snapshot poll failed", { error });
  } finally {
    state.isPolling = false;
  }
}

function teardownListenClient(client: Client | null) {
  if (!client) return;
  try {
    client.removeAllListeners();
    void client.end().catch(() => {});
  } catch {}
}

async function connectListenClient(): Promise<Client | null> {
  const state = getState();

  if (state.listenClient) return state.listenClient;
  if (state.listenConnecting) return state.listenConnecting;

  state.listenConnecting = (async () => {
    try {
      const client = new Client({
        connectionString: requireDatabaseUrl("admin-realtime LISTEN"),
      });

      client.on("error", (err) => {
        logger.error("Admin realtime LISTEN client error", { error: err });
        const current = getState();
        if (current.listenClient === client) {
          current.listenClient = null;
        }
        teardownListenClient(client);
        scheduleListenReconnect();
      });

      client.on("end", () => {
        const current = getState();
        if (current.listenClient === client) {
          current.listenClient = null;
          scheduleListenReconnect();
        }
      });

      client.on("notification", (msg) => {
        if (msg.channel !== PG_NOTIFY_CHANNEL) return;
        const payload = msg.payload?.trim();
        if (!payload || !isAdminRealtimeTopic(payload)) {
          logger.warn("Ignoring NOTIFY payload with unknown topic", {
            payload,
          });
          return;
        }
        void pollSnapshot([payload]);
      });

      await client.connect();
      await client.query(`LISTEN ${PG_NOTIFY_CHANNEL}`);

      state.listenClient = client;
      logger.info("Admin realtime LISTEN client connected", {
        channel: PG_NOTIFY_CHANNEL,
      });
      return client;
    } catch (err) {
      logger.error("Admin realtime LISTEN client connect failed", { error: err });
      scheduleListenReconnect();
      return null;
    } finally {
      const current = getState();
      current.listenConnecting = null;
    }
  })();

  return state.listenConnecting;
}

function scheduleListenReconnect() {
  setTimeout(() => {
    const state = getState();
    if (state.subscribers.size === 0) return;
    void connectListenClient();
  }, LISTEN_RECONNECT_DELAY_MS).unref?.();
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

  if (state.listenClient) {
    const client = state.listenClient;
    state.listenClient = null;
    teardownListenClient(client);
    logger.info("Closed admin realtime LISTEN client (no subscribers)");
  }
}

export function subscribeToAdminRealtime(
  subscriber: AdminRealtimeSubscriber,
) {
  const state = getState();
  const subscriptionId = crypto.randomUUID();

  state.subscribers.set(subscriptionId, subscriber);
  ensurePoller();
  void connectListenClient();

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

async function emitPgNotify(topic: AdminRealtimeTopic) {
  try {
    await prisma.$executeRaw`SELECT pg_notify(${PG_NOTIFY_CHANNEL}, ${topic})`;
  } catch (error) {
    logger.error("Failed to emit pg_notify for admin realtime", {
      topic,
      error,
    });
  }
}

export function broadcastAdminRealtimeTopics(
  topics: AdminRealtimeTopic[],
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _trigger: AdminRealtimeEvent["trigger"] = "direct",
) {
  const dedupedTopics = [...new Set(topics)];

  // Emit pg_notify so all Node instances LISTENing (including ours) react via
  // the unified notification → poll path. Falls back to local poll if NOTIFY
  // fails or listener is not connected.
  for (const topic of dedupedTopics) {
    void emitPgNotify(topic);
  }

  void pollSnapshot(dedupedTopics);
}
