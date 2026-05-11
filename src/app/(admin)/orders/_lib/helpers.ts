import type {
  AdminOrderStatus,
  UserOrderOverview,
  UserOrderTimelineItem,
} from "@/lib/user-orders.types";

export function formatVolumeSummary(
  volumes: Array<{ currency: string; amount: string }>,
) {
  if (volumes.length === 0) return "No volume";
  return volumes
    .slice(0, 2)
    .map((item) => `${item.currency} ${item.amount}`)
    .join(" · ");
}

export function formatDate(value: string, withTime = true) {
  return new Date(value).toLocaleString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    ...(withTime ? { hour: "2-digit", minute: "2-digit" } : {}),
  });
}

export function formatMoney(amount: string, currency: string) {
  const numeric = Number(amount);
  if (!Number.isFinite(numeric)) return `${currency} ${amount}`;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(numeric);
}

export function getStatusLabel(status: AdminOrderStatus | string): string {
  switch (status) {
    case "PENDING":
      return "Pending";
    case "ACCEPTED":
      return "Accepted";
    case "IN_PROGRESS":
      return "In progress";
    case "WAITING_FOR_CLIENT":
      return "Waiting for client";
    case "DELIVERED":
      return "Delivered";
    case "COMPLETED":
      return "Completed";
    case "CANCELLED":
      return "Cancelled";
    case "REJECTED":
      return "Rejected";
    case "REFUNDED":
      return "Refunded";
    default:
      return String(status);
  }
}

export function getStatusPillClass(status: AdminOrderStatus | string) {
  switch (status) {
    case "PENDING":
      return "bg-muted text-muted-foreground";
    case "ACCEPTED":
      return "bg-blue-50 text-blue-800";
    case "IN_PROGRESS":
      return "bg-primary/15 text-primary";
    case "WAITING_FOR_CLIENT":
      return "bg-amber-50 text-amber-800";
    case "DELIVERED":
      return "bg-violet-50 text-violet-800";
    case "COMPLETED":
      return "bg-emerald-50 text-emerald-800";
    case "CANCELLED":
    case "REJECTED":
    case "REFUNDED":
      return "bg-rose-50 text-rose-800";
    default:
      return "bg-muted text-muted-foreground";
  }
}

export function getStatusDotClass(status: AdminOrderStatus | string) {
  switch (status) {
    case "PENDING":
      return "bg-muted-foreground";
    case "ACCEPTED":
      return "bg-blue-500";
    case "IN_PROGRESS":
      return "bg-primary";
    case "WAITING_FOR_CLIENT":
      return "bg-amber-500";
    case "DELIVERED":
      return "bg-violet-500";
    case "COMPLETED":
      return "bg-emerald-500";
    case "CANCELLED":
    case "REJECTED":
    case "REFUNDED":
      return "bg-rose-500";
    default:
      return "bg-muted-foreground";
  }
}

export function getFlagPillClass(level: "info" | "warning" | "critical") {
  switch (level) {
    case "info":
      return "bg-sky-50 text-sky-800";
    case "warning":
      return "bg-amber-50 text-amber-900";
    case "critical":
      return "bg-rose-50 text-rose-800";
  }
}

export function getTimelineTone(item: UserOrderTimelineItem) {
  if (item.isAdminIntervention) return "admin";
  if (item.type === "REVISION_REQUESTED" || item.toStatus === "DELIVERED") {
    return "warn";
  }
  if (item.toStatus === "COMPLETED") return "complete";
  return "default";
}

export function getRevisionState(order: UserOrderOverview) {
  const used = order.revisionsUsed;
  const total = order.revisionsIncluded;
  const danger = total > 0 && used > total;
  const warn = total > 0 && used === total;
  const pct = total > 0 ? Math.min(100, (used / total) * 100) : 0;
  return { used, total, danger, warn, pct };
}

export function formatDeliveryWindow(min?: number | null, max?: number | null) {
  if (min && max) return `${min}-${max} days`;
  if (min) return `${min}+ days`;
  if (max) return `up to ${max} days`;
  return "Flexible";
}

export function daysBetween(fromIso: string, toDate: Date = new Date()) {
  const diff = toDate.getTime() - new Date(fromIso).getTime();
  return Math.max(0, Math.floor(diff / 86_400_000));
}
