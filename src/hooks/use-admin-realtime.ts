"use client";

import { useEffect, useEffectEvent } from "react";

import type {
  AdminRealtimeEvent,
  AdminRealtimeTopic,
} from "@/lib/admin-realtime.types";

type UseAdminRealtimeOptions = {
  enabled?: boolean;
  topics: AdminRealtimeTopic[];
  onEvent: (event: AdminRealtimeEvent) => void;
};

export function useAdminRealtime({
  enabled = true,
  topics,
  onEvent,
}: UseAdminRealtimeOptions) {
  const handleEvent = useEffectEvent(onEvent);
  const topicKey = topics.join(",");

  useEffect(() => {
    if (!enabled || typeof window === "undefined") {
      return;
    }

    const activeTopics = topicKey
      ? (topicKey.split(",") as AdminRealtimeTopic[])
      : [];

    const eventSource = new EventSource("/api/realtime/stream", {
      withCredentials: true,
    });

    const listeners = activeTopics.map((topic) => {
      const eventName = `admin.${topic}.updated`;
      const listener = (event: MessageEvent<string>) => {
        try {
          handleEvent(JSON.parse(event.data) as AdminRealtimeEvent);
        } catch {
          // Ignore malformed payloads and keep the stream alive.
        }
      };

      eventSource.addEventListener(eventName, listener as EventListener);
      return { eventName, listener };
    });

    return () => {
      listeners.forEach(({ eventName, listener }) => {
        eventSource.removeEventListener(eventName, listener as EventListener);
      });
      eventSource.close();
    };
  }, [enabled, topicKey]);
}
