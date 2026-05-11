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
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(numeric);
}

export function getOrderStatusBadgeClass(status: AdminOrderStatus) {
  switch (status) {
    case "PENDING":
      return "border-zinc-200 bg-zinc-100 text-zinc-700";
    case "ACCEPTED":
      return "border-blue-200 bg-blue-50 text-blue-700";
    case "IN_PROGRESS":
      return "border-orange-200 bg-orange-50 text-orange-700";
    case "WAITING_FOR_CLIENT":
      return "border-amber-200 bg-amber-50 text-amber-700";
    case "DELIVERED":
      return "border-violet-200 bg-violet-50 text-violet-700";
    case "COMPLETED":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
    case "CANCELLED":
      return "border-red-200 bg-red-50 text-red-700";
    case "REJECTED":
      return "border-rose-200 bg-rose-50 text-rose-700";
    default:
      return "border-zinc-200 bg-zinc-50 text-zinc-700";
  }
}

export function getAttentionBadgeClass(level: "info" | "warning" | "critical") {
  switch (level) {
    case "info":
      return "border-sky-200 bg-sky-50 text-sky-700";
    case "warning":
      return "border-amber-200 bg-amber-50 text-amber-700";
    case "critical":
      return "border-red-200 bg-red-50 text-red-700";
  }
}

export function getTimelineTone(item: UserOrderTimelineItem) {
  if (item.isAdminIntervention) return "border-sky-200 bg-sky-50";
  if (item.type === "REVISION_REQUESTED" || item.toStatus === "DELIVERED") {
    return "border-amber-200 bg-amber-50";
  }
  if (item.toStatus === "COMPLETED") return "border-emerald-200 bg-emerald-50";
  return "border-zinc-200 bg-zinc-50";
}

export function getOrderProgressLabel(order: UserOrderOverview) {
  return `${order.revisionsUsed}/${order.revisionsIncluded} revisions`;
}

export function formatDeliveryWindow(min?: number | null, max?: number | null) {
  if (min && max) return `${min}-${max} days`;
  if (min) return `${min}+ days`;
  if (max) return `up to ${max} days`;
  return "Flexible";
}
