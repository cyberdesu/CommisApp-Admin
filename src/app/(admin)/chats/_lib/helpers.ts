import type { ConversationItem, LatestMessage } from "./types";

export function formatRelativeTime(dateStr: string) {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60_000);
  const diffHours = Math.floor(diffMs / 3_600_000);
  const diffDays = Math.floor(diffMs / 86_400_000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function formatFullDate(dateStr: string) {
  return new Date(dateStr).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function getMessagePreview(msg: LatestMessage | null): string {
  if (!msg) return "No messages yet";
  if (msg.isDeleted) return "Message deleted";
  if (msg.type === "IMAGE") return "Sent an image";
  if (msg.type === "SYSTEM") return msg.content ?? "System message";
  return msg.content ?? "";
}

export function getConversationDisplayName(conv: ConversationItem): string {
  if (conv.name) return conv.name;
  if (conv.participantsPreview.length === 0) return "Empty conversation";
  return conv.participantsPreview
    .slice(0, 3)
    .map((p) => p.username)
    .join(", ");
}

export function getConversationTypeLabel(type: ConversationItem["type"]) {
  switch (type) {
    case "DIRECT":
      return "DM";
    case "GROUP":
      return "Group";
    case "ORDER":
      return "Order";
  }
}
