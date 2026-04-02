"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import axios from "axios";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Clock3,
  MessageSquare,
  Search,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";

import { apiClient } from "@/lib/api/client";
import { useAdminRealtime } from "@/hooks/use-admin-realtime";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type {
  AdminOrderAnalytics,
  AdminOrderStats,
  AdminOrderStatus,
  UserOrderOverview,
  UserOrderTimelineItem,
} from "@/lib/user-orders.types";

type OrdersResponse = {
  data: UserOrderOverview[];
  meta: {
    limit: number;
    hasNextPage: boolean;
    nextCursor: string | null;
    cursor: string | null;
  };
  filters: {
    search: string;
    status: string;
    source: string;
    attention: string;
    userId: number | null;
  };
};

type OrderInterventionResponse = {
  message: string;
  data: {
    id: string;
    status: AdminOrderStatus;
    revisionsUsed: number;
    revisionsIncluded: number;
    updatedAt: string;
  };
};

const PAGE_SIZE = 10;
const ADMIN_ORDER_STATUS_OPTIONS: AdminOrderStatus[] = [
  "PENDING",
  "ACCEPTED",
  "IN_PROGRESS",
  "WAITING_FOR_CLIENT",
  "DELIVERED",
  "COMPLETED",
  "CANCELLED",
  "REJECTED",
];

function formatVolumeSummary(
  volumes: Array<{ currency: string; amount: string }>,
) {
  if (volumes.length === 0) return "No volume";

  return volumes
    .slice(0, 2)
    .map((item) => `${item.currency} ${item.amount}`)
    .join(" · ");
}

function formatDate(value: string, withTime = true) {
  return new Date(value).toLocaleString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    ...(withTime ? { hour: "2-digit", minute: "2-digit" } : {}),
  });
}

function formatMoney(amount: string, currency: string) {
  const numeric = Number(amount);

  if (!Number.isFinite(numeric)) {
    return `${currency} ${amount}`;
  }

  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(numeric);
}

function getOrderStatusBadgeClass(status: AdminOrderStatus) {
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
  }
}

function getAttentionBadgeClass(level: "info" | "warning" | "critical") {
  switch (level) {
    case "info":
      return "border-sky-200 bg-sky-50 text-sky-700";
    case "warning":
      return "border-amber-200 bg-amber-50 text-amber-700";
    case "critical":
      return "border-red-200 bg-red-50 text-red-700";
  }
}

function getTimelineTone(item: UserOrderTimelineItem) {
  if (item.isAdminIntervention) {
    return "border-sky-200 bg-sky-50";
  }

  if (item.type === "REVISION_REQUESTED" || item.toStatus === "DELIVERED") {
    return "border-amber-200 bg-amber-50";
  }

  if (item.toStatus === "COMPLETED") {
    return "border-emerald-200 bg-emerald-50";
  }

  return "border-zinc-200 bg-zinc-50";
}

function getOrderProgressLabel(order: UserOrderOverview) {
  return `${order.revisionsUsed}/${order.revisionsIncluded} revisions`;
}

function formatDeliveryWindow(
  min?: number | null,
  max?: number | null,
) {
  if (min && max) return `${min}-${max} days`;
  if (min) return `${min}+ days`;
  if (max) return `up to ${max} days`;
  return "Flexible";
}

function OrdersTableSkeleton() {
  return (
    <div className="space-y-2 p-6">
      {Array.from({ length: 6 }).map((_, index) => (
        <div
          key={index}
          className="flex items-center gap-4 rounded-2xl border border-zinc-100 px-5 py-4"
        >
          <div className="flex-1 space-y-2">
            <Skeleton className="h-3.5 w-48 rounded-full" />
            <Skeleton className="h-3 w-72 rounded-full" />
          </div>
          <Skeleton className="h-6 w-24 rounded-full" />
          <Skeleton className="h-6 w-20 rounded-full" />
          <Skeleton className="h-8 w-24 rounded-xl" />
        </div>
      ))}
    </div>
  );
}

export default function OrdersPage() {
  const queryClient = useQueryClient();
  const router = useRouter();
  const searchParams = useSearchParams();

  const scopedUserId = useMemo(() => {
    const raw = searchParams.get("userId");
    if (!raw) return null;
    const parsed = Number.parseInt(raw, 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
  }, [searchParams]);

  const [cursor, setCursor] = useState<string | null>(null);
  const [cursorHistory, setCursorHistory] = useState<Array<string | null>>([]);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<
    | "ALL"
    | "PENDING"
    | "ACCEPTED"
    | "IN_PROGRESS"
    | "WAITING_FOR_CLIENT"
    | "DELIVERED"
    | "COMPLETED"
    | "CANCELLED"
    | "REJECTED"
  >("ALL");
  const [source, setSource] = useState<"ALL" | "SERVICE" | "CUSTOM_REQUEST">(
    "ALL",
  );
  const [attention, setAttention] = useState<"ALL" | "FLAGGED" | "CLEAN">(
    "ALL",
  );
  const [selectedOrder, setSelectedOrder] = useState<UserOrderOverview | null>(
    null,
  );
  const [interventionStatus, setInterventionStatus] = useState<
    AdminOrderStatus | "UNCHANGED"
  >("UNCHANGED");
  const [interventionRevisionsUsed, setInterventionRevisionsUsed] =
    useState("");
  const [interventionNote, setInterventionNote] = useState("");

  const ordersQuery = useQuery({
    queryKey: ["orders", { cursor, search, status, source, attention, scopedUserId }],
    queryFn: async () => {
      const response = await apiClient.get<OrdersResponse>("/orders", {
        params: {
          limit: PAGE_SIZE,
          ...(cursor ? { cursor } : {}),
          ...(search ? { search } : {}),
          status,
          source,
          attention,
          ...(scopedUserId ? { userId: scopedUserId } : {}),
        },
      });
      return response.data;
    },
  });

  const statsQuery = useQuery({
    queryKey: ["orders-stats"],
    queryFn: async () => {
      const response = await apiClient.get<AdminOrderStats>("/orders/stats");
      return response.data;
    },
  });

  const analyticsQuery = useQuery({
    queryKey: ["orders-analytics", { scopedUserId }],
    queryFn: async () => {
      const response = await apiClient.get<AdminOrderAnalytics>(
        "/orders/analytics",
        {
          params: {
            ...(scopedUserId ? { userId: scopedUserId } : {}),
          },
        },
      );
      return response.data;
    },
  });

  useAdminRealtime({
    topics: ["orders"],
    onEvent: () => {
      void queryClient.invalidateQueries({ queryKey: ["orders"] });
      void queryClient.invalidateQueries({ queryKey: ["orders-stats"] });
      void queryClient.invalidateQueries({ queryKey: ["orders-analytics"] });
      void queryClient.invalidateQueries({ queryKey: ["user-detail"] });
    },
  });

  const interventionMutation = useMutation({
    mutationFn: async (payload: {
      id: string;
      status?: AdminOrderStatus;
      revisionsUsed?: number;
      note: string;
    }) => {
      const response = await apiClient.patch<OrderInterventionResponse>(
        `/orders/${payload.id}/admin`,
        payload,
      );
      return response.data;
    },
    onSuccess: (response) => {
      toast.success(response.message);
      setSelectedOrder(null);
      setInterventionStatus("UNCHANGED");
      setInterventionRevisionsUsed("");
      setInterventionNote("");
      void queryClient.invalidateQueries({ queryKey: ["orders"] });
      void queryClient.invalidateQueries({ queryKey: ["orders-stats"] });
      void queryClient.invalidateQueries({ queryKey: ["user-detail"] });
    },
    onError: (error) => {
      if (axios.isAxiosError<{ message?: string }>(error)) {
        toast.error(error.response?.data?.message ?? "Failed to update order");
        return;
      }

      toast.error("Failed to update order");
    },
  });

  const rows = ordersQuery.data?.data ?? [];
  const meta = ordersQuery.data?.meta;
  const hasNextPage = meta?.hasNextPage ?? false;
  const nextCursor = meta?.nextCursor ?? null;
  const stats = statsQuery.data;
  const analytics = analyticsQuery.data;

  function submitSearch(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setCursor(null);
    setCursorHistory([]);
    setSearch(searchInput.trim());
  }

  function openOrder(order: UserOrderOverview) {
    setSelectedOrder(order);
    setInterventionStatus("UNCHANGED");
    setInterventionRevisionsUsed(String(order.revisionsUsed));
    setInterventionNote("");
  }

  function openOrderChat(conversationId: string) {
    router.push(`/chats?conversationId=${encodeURIComponent(conversationId)}`);
  }

  function submitIntervention() {
    if (!selectedOrder) return;

    const note = interventionNote.trim();
    const parsedRevisionsUsed = Number.parseInt(interventionRevisionsUsed, 10);
    const nextStatus =
      interventionStatus === "UNCHANGED" ? undefined : interventionStatus;
    const shouldChangeRevisions =
      interventionRevisionsUsed.trim() !== "" &&
      Number.isFinite(parsedRevisionsUsed) &&
      parsedRevisionsUsed !== selectedOrder.revisionsUsed;

    if (!note || note.length < 3) {
      toast.error("Please add a short admin note");
      return;
    }

    if (
      interventionRevisionsUsed.trim() !== "" &&
      (!Number.isFinite(parsedRevisionsUsed) || parsedRevisionsUsed < 0)
    ) {
      toast.error("Revision usage must be 0 or higher");
      return;
    }

    if (!nextStatus && !shouldChangeRevisions) {
      toast.error("No order change selected");
      return;
    }

    interventionMutation.mutate({
      id: selectedOrder.id,
      ...(nextStatus ? { status: nextStatus } : {}),
      ...(shouldChangeRevisions
        ? { revisionsUsed: parsedRevisionsUsed }
        : {}),
      note,
    });
  }

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-slate-800 to-orange-950 p-8 text-white shadow-lg">
        <div className="pointer-events-none absolute -right-16 -top-16 size-64 rounded-full bg-orange-500/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-10 right-1/3 size-48 rounded-full bg-sky-500/10 blur-2xl" />

        <div className="relative flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full border border-orange-400/30 bg-orange-500/15 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.2em] text-orange-300">
              <Sparkles className="size-3.5" />
              Order Oversight
            </div>
            <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
              Monitor Commission Orders
            </h1>
            <p className="max-w-2xl text-sm leading-relaxed text-slate-300 md:text-base">
              Search, filter, review progress, and intervene when artists abuse
              delivery loops or revision pressure.
            </p>
            {scopedUserId && (
              <div className="inline-flex items-center gap-3 rounded-2xl border border-white/15 bg-white/10 px-4 py-2 text-sm text-white/90">
                <span>Scoped to user #{scopedUserId}</span>
                <button
                  type="button"
                  className="font-semibold text-orange-300 hover:text-orange-200"
                  onClick={() => router.replace("/orders")}
                >
                  Clear scope
                </button>
              </div>
            )}
          </div>

          {stats && (
            <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
              {[
                { label: "Total", value: stats.total, tone: "text-white" },
                { label: "Active", value: stats.active, tone: "text-orange-200" },
                { label: "Delivered", value: stats.delivered, tone: "text-violet-200" },
                { label: "Completed", value: stats.completed, tone: "text-emerald-200" },
                { label: "Attention", value: stats.attention, tone: "text-red-200" },
              ].map((item) => (
                <div
                  key={item.label}
                  className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 backdrop-blur-sm"
                >
                  <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-slate-400">
                    {item.label}
                  </p>
                  <p className={cn("mt-1 text-lg font-semibold", item.tone)}>
                    {item.value.toLocaleString("id-ID")}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {analytics && (
        <section className="grid gap-4 xl:grid-cols-2 2xl:grid-cols-3">
          <Card className="rounded-3xl border border-zinc-200/80 bg-white shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg font-bold text-zinc-900">
                Top Artist-Client Pairs
              </CardTitle>
              <CardDescription>
                Pairing yang paling sering repeat order.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {analytics.topPairs.length > 0 ? (
                analytics.topPairs.map((item) => (
                  <div
                    key={`${item.artist.id}-${item.client.id}`}
                    className="rounded-2xl border border-zinc-100 bg-zinc-50 p-3"
                  >
                    <p className="text-sm font-semibold text-zinc-900">
                      @{item.client.username} → @{item.artist.username}
                    </p>
                    <p className="mt-1 text-xs text-zinc-500">
                      {item.orderCount} orders
                    </p>
                    <p className="mt-1 text-xs text-zinc-400">
                      {formatVolumeSummary(item.grossVolume)}
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-sm text-zinc-400">No pair data yet.</p>
              )}
            </CardContent>
          </Card>

          <Card className="rounded-3xl border border-zinc-200/80 bg-white shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg font-bold text-zinc-900">
                Top Artists
              </CardTitle>
              <CardDescription>
                Artist dengan order volume paling tinggi.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {analytics.topArtists.length > 0 ? (
                analytics.topArtists.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between gap-3 rounded-2xl border border-zinc-100 bg-zinc-50 p-3"
                  >
                    <div>
                      <p className="text-sm font-semibold text-zinc-900">
                        @{item.username}
                      </p>
                      <p className="mt-1 text-xs text-zinc-500">
                        {item.orderCount} orders
                      </p>
                    </div>
                    <p className="text-xs text-zinc-400">
                      {formatVolumeSummary(item.grossVolume)}
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-sm text-zinc-400">No artist data yet.</p>
              )}
            </CardContent>
          </Card>

          <Card className="rounded-3xl border border-zinc-200/80 bg-white shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg font-bold text-zinc-900">
                Top Clients
              </CardTitle>
              <CardDescription>
                Client dengan jumlah order paling banyak.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {analytics.topClients.length > 0 ? (
                analytics.topClients.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between gap-3 rounded-2xl border border-zinc-100 bg-zinc-50 p-3"
                  >
                    <div>
                      <p className="text-sm font-semibold text-zinc-900">
                        @{item.username}
                      </p>
                      <p className="mt-1 text-xs text-zinc-500">
                        {item.orderCount} orders
                      </p>
                    </div>
                    <p className="text-xs text-zinc-400">
                      {formatVolumeSummary(item.grossVolume)}
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-sm text-zinc-400">No client data yet.</p>
              )}
            </CardContent>
          </Card>

          <Card className="rounded-3xl border border-zinc-200/80 bg-white shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg font-bold text-zinc-900">
                Top Services
              </CardTitle>
              <CardDescription>
                Jasa yang paling sering dipakai admin scope saat ini.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {analytics.topServices.length > 0 ? (
                analytics.topServices.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-2xl border border-zinc-100 bg-zinc-50 p-3"
                  >
                    <p className="text-sm font-semibold text-zinc-900">
                      {item.title}
                    </p>
                    <p className="mt-1 text-xs text-zinc-500">
                      by @{item.artist.username} · {item.orderCount} orders
                    </p>
                    <p className="mt-1 text-xs text-zinc-400">
                      {item.categories.join(", ")}
                    </p>
                    <p className="mt-1 text-xs text-zinc-400">
                      {formatVolumeSummary(item.grossVolume)}
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-sm text-zinc-400">No service data yet.</p>
              )}
            </CardContent>
          </Card>

          <Card className="rounded-3xl border border-zinc-200/80 bg-white shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg font-bold text-zinc-900">
                Popular Categories
              </CardTitle>
              <CardDescription>
                Kategori layanan yang paling banyak dipakai.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {analytics.topCategories.length > 0 ? (
                analytics.topCategories.map((item) => (
                  <div
                    key={item.name}
                    className="flex items-center justify-between gap-3 rounded-2xl border border-zinc-100 bg-zinc-50 p-3"
                  >
                    <div>
                      <p className="text-sm font-semibold text-zinc-900">
                        {item.name}
                      </p>
                      <p className="mt-1 text-xs text-zinc-500">
                        {item.orderCount} orders · {item.serviceCount} services
                      </p>
                    </div>
                    <p className="text-xs text-zinc-400">
                      {formatVolumeSummary(item.grossVolume)}
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-sm text-zinc-400">No category data yet.</p>
              )}
            </CardContent>
          </Card>

          <Card className="rounded-3xl border border-zinc-200/80 bg-white shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg font-bold text-zinc-900">
                Order Types
              </CardTitle>
              <CardDescription>
                Distribusi source order saat ini.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {analytics.sources.length > 0 ? (
                analytics.sources.map((item) => (
                  <div
                    key={item.source}
                    className="flex items-center justify-between gap-3 rounded-2xl border border-zinc-100 bg-zinc-50 p-3"
                  >
                    <div>
                      <p className="text-sm font-semibold text-zinc-900">
                        {item.source}
                      </p>
                      <p className="mt-1 text-xs text-zinc-500">
                        {item.orderCount} orders
                      </p>
                    </div>
                    <p className="text-xs text-zinc-400">
                      {formatVolumeSummary(item.grossVolume)}
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-sm text-zinc-400">No source data yet.</p>
              )}
            </CardContent>
          </Card>
        </section>
      )}

      <Card className="rounded-3xl border border-zinc-200/80 bg-white shadow-sm">
        <CardHeader className="flex flex-col gap-4 border-b border-zinc-100 pb-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-0.5">
            <CardTitle className="text-xl font-bold text-zinc-900">
              Orders Registry
            </CardTitle>
            <CardDescription className="text-sm text-zinc-500">
              Filter by workflow stage, source, and risky revision behavior.
            </CardDescription>
          </div>

          <div className="flex w-full flex-col gap-3 xl:w-auto xl:flex-row xl:items-center">
            <form onSubmit={submitSearch} className="flex w-full gap-2 xl:w-80">
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-400" />
                <Input
                  value={searchInput}
                  onChange={(event) => setSearchInput(event.target.value)}
                  placeholder="Search order ID, title, artist, client..."
                  className="h-10 rounded-xl border-zinc-200 bg-zinc-50 pl-9"
                />
              </div>
              <Button
                type="submit"
                className="h-10 rounded-xl bg-orange-600 px-4 text-white hover:bg-orange-700"
              >
                Search
              </Button>
            </form>

            <div className="flex flex-col gap-2 sm:flex-row">
              <Select
                value={status}
                onValueChange={(value) => {
                  setStatus(value as typeof status);
                  setCursor(null);
                  setCursorHistory([]);
                }}
              >
                <SelectTrigger className="h-10 w-full rounded-xl border-zinc-200 bg-zinc-50 sm:w-[170px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent className="rounded-xl border-zinc-200 bg-white">
                  <SelectItem value="ALL">All Statuses</SelectItem>
                  {ADMIN_ORDER_STATUS_OPTIONS.map((item) => (
                    <SelectItem key={item} value={item}>
                      {item}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={source}
                onValueChange={(value) => {
                  setSource(value as typeof source);
                  setCursor(null);
                  setCursorHistory([]);
                }}
              >
                <SelectTrigger className="h-10 w-full rounded-xl border-zinc-200 bg-zinc-50 sm:w-[170px]">
                  <SelectValue placeholder="Source" />
                </SelectTrigger>
                <SelectContent className="rounded-xl border-zinc-200 bg-white">
                  <SelectItem value="ALL">All Sources</SelectItem>
                  <SelectItem value="SERVICE">Service</SelectItem>
                  <SelectItem value="CUSTOM_REQUEST">Custom Request</SelectItem>
                </SelectContent>
              </Select>

              <Select
                value={attention}
                onValueChange={(value) => {
                  setAttention(value as typeof attention);
                  setCursor(null);
                  setCursorHistory([]);
                }}
              >
                <SelectTrigger className="h-10 w-full rounded-xl border-zinc-200 bg-zinc-50 sm:w-[170px]">
                  <SelectValue placeholder="Attention" />
                </SelectTrigger>
                <SelectContent className="rounded-xl border-zinc-200 bg-white">
                  <SelectItem value="ALL">All Orders</SelectItem>
                  <SelectItem value="FLAGGED">Flagged</SelectItem>
                  <SelectItem value="CLEAN">Clean</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {ordersQuery.isLoading ? (
            <OrdersTableSkeleton />
          ) : rows.length === 0 ? (
            <div className="px-6 py-16 text-center">
              <div className="mx-auto flex size-14 items-center justify-center rounded-3xl border border-zinc-200 bg-zinc-50 text-zinc-400">
                <Clock3 className="size-7" />
              </div>
              <p className="mt-4 text-base font-semibold text-zinc-900">
                No orders found
              </p>
              <p className="mt-2 text-sm text-zinc-500">
                Try adjusting the search term or current filters.
              </p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-zinc-50/80 hover:bg-zinc-50">
                      <TableHead className="px-5 py-3.5 text-[10px] font-bold uppercase tracking-[0.22em] text-zinc-500">
                        Order
                      </TableHead>
                      <TableHead className="px-5 py-3.5 text-[10px] font-bold uppercase tracking-[0.22em] text-zinc-500">
                        Artist / Client
                      </TableHead>
                      <TableHead className="px-5 py-3.5 text-[10px] font-bold uppercase tracking-[0.22em] text-zinc-500">
                        Status
                      </TableHead>
                      <TableHead className="hidden px-5 py-3.5 text-[10px] font-bold uppercase tracking-[0.22em] text-zinc-500 lg:table-cell">
                        Revision Pressure
                      </TableHead>
                      <TableHead className="hidden px-5 py-3.5 text-[10px] font-bold uppercase tracking-[0.22em] text-zinc-500 xl:table-cell">
                        Flags
                      </TableHead>
                      <TableHead className="hidden px-5 py-3.5 text-[10px] font-bold uppercase tracking-[0.22em] text-zinc-500 md:table-cell">
                        Updated
                      </TableHead>
                      <TableHead className="px-5 py-3.5 text-right text-[10px] font-bold uppercase tracking-[0.22em] text-zinc-500">
                        Action
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map((order) => (
                      <TableRow
                        key={order.id}
                        className="border-zinc-100 hover:bg-orange-50/30"
                      >
                        <TableCell className="px-5 py-3.5">
                          <div className="space-y-1">
                            <p className="text-sm font-semibold text-zinc-900">
                              {order.title}
                            </p>
                            <p className="text-xs text-zinc-500">
                              #{order.id.slice(0, 8)}
                              <span className="mx-1.5 text-zinc-300">·</span>
                              {formatMoney(order.amount, order.currency)}
                              <span className="mx-1.5 text-zinc-300">·</span>
                              {order.source}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell className="px-5 py-3.5">
                          <div className="space-y-1 text-xs">
                            <p className="text-zinc-800">
                              Artist:{" "}
                              <span className="font-semibold">
                                @{order.artist.username}
                              </span>
                            </p>
                            <p className="text-zinc-500">
                              Client:{" "}
                              <span className="font-medium">
                                @{order.client?.username ?? "guest"}
                              </span>
                            </p>
                          </div>
                        </TableCell>
                        <TableCell className="px-5 py-3.5">
                          <Badge
                            className={cn(
                              "rounded-full border",
                              getOrderStatusBadgeClass(order.status),
                            )}
                          >
                            {order.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="hidden px-5 py-3.5 lg:table-cell">
                          <div className="space-y-1 text-xs">
                            <p className="font-semibold text-zinc-900">
                              {getOrderProgressLabel(order)}
                            </p>
                            <p className="text-zinc-500">
                              Delivered {order.metrics.deliveredTransitions}x
                            </p>
                            <p className="text-zinc-500">
                              Revisions requested {order.metrics.revisionRequests}x
                            </p>
                          </div>
                        </TableCell>
                        <TableCell className="hidden px-5 py-3.5 xl:table-cell">
                          {order.attentionFlags.length > 0 ? (
                            <div className="flex flex-wrap gap-2">
                              {order.attentionFlags.slice(0, 2).map((flag) => (
                                <Badge
                                  key={`${order.id}-${flag.code}`}
                                  className={cn(
                                    "rounded-full border",
                                    getAttentionBadgeClass(flag.level),
                                  )}
                                >
                                  {flag.label}
                                </Badge>
                              ))}
                            </div>
                          ) : (
                            <span className="text-xs text-zinc-400">
                              Clean
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="hidden px-5 py-3.5 text-sm text-zinc-500 md:table-cell">
                          {formatDate(order.latestActivityAt)}
                        </TableCell>
                        <TableCell className="px-5 py-3.5 text-right">
                          <div className="flex justify-end gap-2">
                            {order.conversationId ? (
                              <Button
                                variant="outline"
                                className="rounded-xl border-zinc-200 bg-white text-sm"
                                onClick={() => {
                                  if (!order.conversationId) return;
                                  openOrderChat(order.conversationId);
                                }}
                              >
                                <MessageSquare className="mr-1.5 size-4" />
                                Chat
                              </Button>
                            ) : null}
                            <Button
                              variant="outline"
                              className="rounded-xl border-zinc-200 bg-white text-sm"
                              onClick={() => openOrder(order)}
                            >
                              Review
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div className="flex flex-col gap-3 border-t border-zinc-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-zinc-500">
                  <span className="font-semibold text-zinc-900">
                    {rows.length}
                  </span>{" "}
                  orders in this page
                </p>

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-9 rounded-xl border-zinc-200 bg-white text-sm"
                    disabled={cursorHistory.length === 0 || ordersQuery.isFetching}
                    onClick={() => {
                      if (cursorHistory.length === 0) return;
                      const nextHistory = [...cursorHistory];
                      const previousCursor = nextHistory.pop() ?? null;
                      setCursorHistory(nextHistory);
                      setCursor(previousCursor);
                    }}
                  >
                    <ChevronLeft className="size-4" />
                    Prev
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-9 rounded-xl border-zinc-200 bg-white text-sm"
                    disabled={!hasNextPage || !nextCursor || ordersQuery.isFetching}
                    onClick={() => {
                      if (!nextCursor) return;
                      setCursorHistory((current) => [...current, cursor]);
                      setCursor(nextCursor);
                    }}
                  >
                    Next
                    <ChevronRight className="size-4" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Dialog
        open={Boolean(selectedOrder)}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedOrder(null);
            setInterventionStatus("UNCHANGED");
            setInterventionRevisionsUsed("");
            setInterventionNote("");
          }
        }}
      >
        <DialogContent className="flex max-h-[90dvh] w-full max-w-[calc(100%-2rem)] flex-col overflow-hidden rounded-[28px] border border-zinc-200 bg-white p-0 sm:max-w-4xl">
          <div className="relative shrink-0 overflow-hidden bg-gradient-to-r from-slate-900 to-orange-950 p-6">
            <DialogHeader className="relative gap-1.5">
              <DialogTitle className="text-xl font-semibold text-white">
                Order Review
              </DialogTitle>
              <DialogDescription className="text-sm text-white/60">
                Inspect progress and intervene when delivery or revision behavior needs correction.
              </DialogDescription>
            </DialogHeader>
          </div>

          <div className="flex-1 overflow-y-auto p-6">
            {selectedOrder ? (
              <div className="space-y-5">
                <div className="rounded-3xl border border-zinc-200 bg-zinc-50/70 p-5">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-lg font-bold text-zinc-900">
                          {selectedOrder.title}
                        </p>
                        <Badge
                          className={cn(
                            "rounded-full border",
                            getOrderStatusBadgeClass(selectedOrder.status),
                          )}
                        >
                          {selectedOrder.status}
                        </Badge>
                      </div>
                      <p className="mt-1 text-sm text-zinc-500">
                        Order #{selectedOrder.id.slice(0, 8)}
                        <span className="mx-1.5 text-zinc-300">·</span>
                        {selectedOrder.source}
                        <span className="mx-1.5 text-zinc-300">·</span>
                        Updated {formatDate(selectedOrder.latestActivityAt)}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Badge
                        variant="outline"
                        className="rounded-full border-zinc-200 bg-white text-zinc-700"
                      >
                        {formatMoney(selectedOrder.amount, selectedOrder.currency)}
                      </Badge>
                      {selectedOrder.conversationId ? (
                        <Button
                          variant="outline"
                          className="rounded-full border-zinc-200 bg-white text-zinc-700"
                          onClick={() => {
                            if (!selectedOrder.conversationId) return;
                            openOrderChat(selectedOrder.conversationId);
                          }}
                        >
                          <MessageSquare className="mr-1.5 size-4" />
                          Open Chat
                        </Button>
                      ) : (
                        <Badge
                          variant="outline"
                          className="rounded-full border-zinc-200 bg-white text-zinc-500"
                        >
                          Chat not created
                        </Badge>
                      )}
                      {selectedOrder.paymentCaptured && (
                        <Badge className="rounded-full border border-emerald-200 bg-emerald-50 text-emerald-700">
                          Payment captured
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>

                <div className="grid gap-5 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
                  <div className="space-y-4">
                    <div className="rounded-2xl border border-zinc-200 bg-white p-4">
                      <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400">
                        Order Snapshot
                      </p>
                      <div className="mt-4 grid gap-3 sm:grid-cols-2">
                        <div className="rounded-2xl border border-zinc-100 bg-zinc-50 p-3">
                          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-zinc-400">
                            Delivery Window
                          </p>
                          <p className="mt-1 text-sm font-semibold text-zinc-900">
                            {formatDeliveryWindow(
                              selectedOrder.deliveryDaysMin,
                              selectedOrder.deliveryDaysMax,
                            )}
                          </p>
                        </div>
                        <div className="rounded-2xl border border-zinc-100 bg-zinc-50 p-3">
                          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-zinc-400">
                            Revision Usage
                          </p>
                          <p className="mt-1 text-sm font-semibold text-zinc-900">
                            {getOrderProgressLabel(selectedOrder)}
                          </p>
                        </div>
                        <div className="rounded-2xl border border-zinc-100 bg-zinc-50 p-3">
                          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-zinc-400">
                            Delivery Attempts
                          </p>
                          <p className="mt-1 text-sm font-semibold text-zinc-900">
                            {selectedOrder.metrics.deliveredTransitions}
                          </p>
                        </div>
                        <div className="rounded-2xl border border-zinc-100 bg-zinc-50 p-3">
                          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-zinc-400">
                            Revision Requests
                          </p>
                          <p className="mt-1 text-sm font-semibold text-zinc-900">
                            {selectedOrder.metrics.revisionRequests}
                          </p>
                        </div>
                      </div>

                      <div className="mt-4 flex flex-wrap gap-2">
                        {selectedOrder.attentionFlags.length > 0 ? (
                          selectedOrder.attentionFlags.map((flag) => (
                            <Badge
                              key={`${selectedOrder.id}-${flag.code}`}
                              className={cn(
                                "rounded-full border",
                                getAttentionBadgeClass(flag.level),
                              )}
                            >
                              {flag.label}
                            </Badge>
                          ))
                        ) : (
                          <Badge className="rounded-full border border-emerald-200 bg-emerald-50 text-emerald-700">
                            No active risk signal
                          </Badge>
                        )}
                      </div>
                    </div>

                    <div className="rounded-2xl border border-zinc-200 bg-white p-4">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400">
                          Timeline
                        </p>
                        <p className="text-xs text-zinc-400">
                          {selectedOrder.timeline.length} recent events
                        </p>
                      </div>
                      <div className="mt-3 space-y-2">
                        {selectedOrder.timeline.length > 0 ? (
                          selectedOrder.timeline.map((item) => (
                            <div
                              key={item.id}
                              className={cn(
                                "rounded-2xl border px-3 py-2",
                                getTimelineTone(item),
                              )}
                            >
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <p className="text-sm font-medium text-zinc-900">
                                  {item.description}
                                </p>
                                <p className="text-[11px] text-zinc-500">
                                  {formatDate(item.createdAt)}
                                </p>
                              </div>
                              <p className="mt-1 text-xs text-zinc-500">
                                {item.actorLabel}
                                {item.fromStatus && item.toStatus && (
                                  <>
                                    <span className="mx-1 text-zinc-300">·</span>
                                    {item.fromStatus} → {item.toStatus}
                                  </>
                                )}
                              </p>
                            </div>
                          ))
                        ) : (
                          <p className="text-sm italic text-zinc-400">
                            No timeline recorded yet.
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="rounded-2xl border border-zinc-200 bg-white p-4">
                      <div className="flex items-center gap-2">
                        <ShieldCheck className="size-4 text-sky-600" />
                        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400">
                          Admin Intervention
                        </p>
                      </div>
                      <div className="mt-4 space-y-4">
                        <div className="space-y-2">
                          <Label className="text-sm font-medium text-zinc-700">
                            Override Status
                          </Label>
                          <Select
                            value={interventionStatus}
                            onValueChange={(value) =>
                              setInterventionStatus(
                                value as AdminOrderStatus | "UNCHANGED",
                              )
                            }
                          >
                            <SelectTrigger className="h-11 rounded-2xl border-zinc-200 bg-zinc-50">
                              <SelectValue placeholder="Keep current status" />
                            </SelectTrigger>
                            <SelectContent className="rounded-xl border-zinc-200 bg-white">
                              <SelectItem value="UNCHANGED">Keep current status</SelectItem>
                              {ADMIN_ORDER_STATUS_OPTIONS.map((item) => (
                                <SelectItem key={item} value={item}>
                                  {item}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <Label
                            htmlFor="intervention-revisions"
                            className="text-sm font-medium text-zinc-700"
                          >
                            Revisions Used
                          </Label>
                          <Input
                            id="intervention-revisions"
                            type="number"
                            min={0}
                            max={999}
                            value={interventionRevisionsUsed}
                            onChange={(event) =>
                              setInterventionRevisionsUsed(event.target.value)
                            }
                            className="h-11 rounded-2xl border-zinc-200 bg-zinc-50"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label
                            htmlFor="intervention-note"
                            className="text-sm font-medium text-zinc-700"
                          >
                            Audit Note
                          </Label>
                          <textarea
                            id="intervention-note"
                            value={interventionNote}
                            onChange={(event) => setInterventionNote(event.target.value)}
                            rows={5}
                            maxLength={500}
                            placeholder="Explain why this order needs manual correction..."
                            className="w-full resize-none rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-900 outline-none placeholder:text-zinc-400 transition-all focus:border-orange-400 focus:bg-white focus:ring-4 focus:ring-orange-100"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
                      <div className="flex items-start gap-3">
                        <AlertTriangle className="mt-0.5 size-5 text-amber-600" />
                        <div>
                          <p className="text-sm font-semibold text-amber-900">
                            Use intervention only for operational correction
                          </p>
                          <p className="mt-1 text-sm leading-relaxed text-amber-800">
                            This action is designed for abusive delivery loops,
                            revision slot misuse, or incorrect workflow states.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : null}
          </div>

          <DialogFooter className="rounded-b-[28px] border-t border-zinc-100 bg-zinc-50/80 px-6 py-4">
            <Button
              variant="outline"
              className="rounded-xl border-zinc-200 bg-white text-sm"
              onClick={() => setSelectedOrder(null)}
            >
              Close
            </Button>
            <Button
              className="rounded-xl bg-slate-900 text-sm text-white hover:bg-slate-800"
              disabled={!selectedOrder || interventionMutation.isPending}
              onClick={submitIntervention}
            >
              {interventionMutation.isPending ? (
                <>
                  <span className="mr-2 size-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                  Applying...
                </>
              ) : (
                "Apply Intervention"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
