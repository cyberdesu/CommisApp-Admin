import { NextRequest, NextResponse } from "next/server";

import { getSessionAdmin } from "@/lib/auth/session";
import {
  getAdminRealtimeSnapshot,
  subscribeToAdminRealtime,
} from "@/lib/admin-realtime";
import type { AdminRealtimeEvent } from "@/lib/admin-realtime.types";
import { createRequestLogger } from "@/lib/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const encoder = new TextEncoder();
const HEARTBEAT_INTERVAL_MS = 15_000;
const SSE_HEADERS = {
  "Content-Type": "text/event-stream; charset=utf-8",
  "Cache-Control": "private, no-store, no-transform",
  Connection: "keep-alive",
  "Pragma": "no-cache",
  Expires: "0",
  "X-Accel-Buffering": "no",
  "X-Content-Type-Options": "nosniff",
} as const;

function encodeSseMessage(event: string, data: unknown) {
  return encoder.encode(
    `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`,
  );
}

function encodeHeartbeat() {
  return encoder.encode(`: heartbeat ${Date.now()}\n\n`);
}

export async function GET(req: NextRequest) {
  const logger = createRequestLogger(req, {
    route: "api.realtime.stream",
  });

  const admin = await getSessionAdmin(req);
  if (!admin) {
    logger.warn("Rejected admin realtime stream due to missing admin session");
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const requestLogger = logger.child({ adminId: admin.id });
  const initialSnapshot = await getAdminRealtimeSnapshot();

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      let isClosed = false;

      const close = () => {
        if (isClosed) return;
        isClosed = true;
        clearInterval(heartbeatTimer);
        unsubscribe();
        req.signal.removeEventListener("abort", close);
        try {
          controller.close();
        } catch {}
        requestLogger.info("Admin realtime stream closed");
      };

      const send = (eventName: string, payload: unknown) => {
        if (isClosed) return;
        controller.enqueue(encodeSseMessage(eventName, payload));
      };

      const unsubscribe = subscribeToAdminRealtime((event: AdminRealtimeEvent) => {
        send(`admin.${event.topic}.updated`, event);
      });

      const heartbeatTimer = setInterval(() => {
        if (isClosed) return;
        controller.enqueue(encodeHeartbeat());
      }, HEARTBEAT_INTERVAL_MS);

      req.signal.addEventListener("abort", close);

      send("admin.connected", {
        connectedAt: new Date().toISOString(),
        snapshot: initialSnapshot,
      });

      requestLogger.info("Admin realtime stream connected", {
        heartbeatIntervalMs: HEARTBEAT_INTERVAL_MS,
      });
    },
    cancel() {
      logger.info("Admin realtime stream cancelled by consumer", {
        adminId: admin.id,
      });
    },
  });

  return new NextResponse(stream, {
    headers: SSE_HEADERS,
  });
}
