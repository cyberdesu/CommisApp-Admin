export type AdminRealtimeTopic = "orders" | "chats" | "finance";

export type AdminRealtimeEvent = {
  topic: AdminRealtimeTopic;
  fingerprint: string;
  emittedAt: string;
  trigger: "poll" | "direct";
};
