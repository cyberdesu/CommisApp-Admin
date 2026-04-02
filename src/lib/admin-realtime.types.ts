export type AdminRealtimeTopic = "orders" | "chats";

export type AdminRealtimeEvent = {
  topic: AdminRealtimeTopic;
  fingerprint: string;
  emittedAt: string;
  trigger: "poll" | "direct";
};
