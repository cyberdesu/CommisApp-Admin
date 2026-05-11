import type { UserFinanceSummary } from "@/lib/user-finance.types";
import type { UserItem } from "./types";

export function getRolePill(role: string) {
  const value = role.toLowerCase();
  if (value.includes("admin")) return "bg-slate-900 text-white";
  if (value.includes("artist")) return "bg-violet-100 text-violet-800";
  if (value.includes("manager")) return "bg-amber-100 text-amber-800";
  return "bg-muted text-muted-foreground";
}

export function formatDate(dateStr: string, withTime = false) {
  return new Date(dateStr).toLocaleString("id-ID", {
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

export function getPrimaryFinance(summary?: UserFinanceSummary | null) {
  return summary?.currencies[0] ?? null;
}

export function getFinancePreview(summary?: UserFinanceSummary | null) {
  const primary = getPrimaryFinance(summary);
  if (!primary) return null;
  return {
    earned: formatMoney(primary.grossEarnings, primary.currency),
    withdrawn: formatMoney(primary.withdrawnTotal, primary.currency),
    available: formatMoney(primary.availableBalance, primary.currency),
    pending: formatMoney(primary.pendingWithdrawals, primary.currency),
    hasMixedCurrencies: summary?.hasMixedCurrencies ?? false,
  };
}

export function isUserSuspended(user: Pick<UserItem, "suspendedUntil">) {
  if (!user.suspendedUntil) return false;
  return new Date(user.suspendedUntil) > new Date();
}

export function hasAvailableBalance(summary?: UserFinanceSummary | null) {
  const primary = getPrimaryFinance(summary);
  if (!primary) return false;
  const n = Number(primary.availableBalance);
  return Number.isFinite(n) && n > 0;
}

export function compactNumber(value: number) {
  return new Intl.NumberFormat("en-US", { notation: "compact" }).format(value);
}

export const AVATAR_GRADIENTS = [
  "from-orange-500 to-violet-600",
  "from-sky-500 to-violet-600",
  "from-emerald-500 to-sky-600",
  "from-rose-500 to-amber-500",
  "from-violet-500 to-rose-500",
  "from-amber-500 to-rose-500",
];
