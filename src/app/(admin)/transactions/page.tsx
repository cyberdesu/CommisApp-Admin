"use client";

import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowDownLeft,
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
  Coins,
  RefreshCcw,
  Search,
  WalletCards,
} from "lucide-react";

import { useAdminRealtime } from "@/hooks/use-admin-realtime";
import { apiClient } from "@/lib/api/client";
import type {
  AdminTransactionEntryType,
  AdminTransactionFeeSyncStatus,
  AdminTransactionLogEntry,
  AdminTransactionStats,
  AdminTransactionStatus,
} from "@/lib/transaction-log.types";
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
import { Input } from "@/components/ui/input";
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

type TransactionsResponse = {
  data: AdminTransactionLogEntry[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
  stats: AdminTransactionStats;
  filters: {
    page: number;
    limit: number;
    search: string;
    type: "ALL" | AdminTransactionEntryType;
    status: "ALL" | AdminTransactionStatus;
    feeSync: "ALL" | AdminTransactionFeeSyncStatus;
  };
};

const PAGE_SIZE = 20;

function formatMoney(amount: string | null, currency: string) {
  if (amount === null) return "—";

  const numeric = Number(amount);
  if (!Number.isFinite(numeric)) return `${currency} ${amount}`;

  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(numeric);
}

function formatDate(value: string | null) {
  if (!value) return "—";

  return new Date(value).toLocaleString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getStatusBadgeClass(status: AdminTransactionStatus) {
  switch (status) {
    case "COMPLETED":
    case "SENT":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
    case "PENDING":
      return "border-amber-200 bg-amber-50 text-amber-700";
    case "FAILED":
    case "FRAUD":
      return "border-rose-200 bg-rose-50 text-rose-700";
    case "REFUNDED":
      return "border-zinc-200 bg-zinc-100 text-zinc-700";
  }
}

function getSyncBadgeClass(status: AdminTransactionFeeSyncStatus) {
  switch (status) {
    case "SYNCED":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
    case "PENDING_SYNC":
      return "border-amber-200 bg-amber-50 text-amber-700";
    case "NOT_REQUIRED":
      return "border-zinc-200 bg-zinc-100 text-zinc-700";
  }
}

function TransactionsTableSkeleton() {
  return (
    <div className="space-y-2 p-6">
      {Array.from({ length: 8 }).map((_, index) => (
        <div
          key={index}
          className="flex items-center gap-4 rounded-2xl border border-zinc-100 px-5 py-4"
        >
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-48 rounded-full" />
            <Skeleton className="h-3 w-72 rounded-full" />
          </div>
          <Skeleton className="h-6 w-20 rounded-full" />
          <Skeleton className="h-6 w-24 rounded-full" />
          <Skeleton className="h-6 w-28 rounded-full" />
        </div>
      ))}
    </div>
  );
}

function TransactionDirectionBadge({
  entryType,
}: {
  entryType: AdminTransactionEntryType;
}) {
  if (entryType === "PAYMENT") {
    return (
      <Badge className="gap-1 rounded-full border border-emerald-200 bg-emerald-50 text-emerald-700">
        <ArrowDownLeft className="size-3.5" />
        Payment
      </Badge>
    );
  }

  return (
    <Badge className="gap-1 rounded-full border border-orange-200 bg-orange-50 text-orange-700">
      <ArrowUpRight className="size-3.5" />
      Payout
    </Badge>
  );
}

export default function TransactionsPage() {
  const queryClient = useQueryClient();

  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [type, setType] = useState<"ALL" | AdminTransactionEntryType>("ALL");
  const [status, setStatus] = useState<"ALL" | AdminTransactionStatus>("ALL");
  const [feeSync, setFeeSync] = useState<
    "ALL" | AdminTransactionFeeSyncStatus
  >("ALL");

  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    params.set("page", String(page));
    params.set("limit", String(PAGE_SIZE));
    if (search) params.set("search", search);
    if (type !== "ALL") params.set("type", type);
    if (status !== "ALL") params.set("status", status);
    if (feeSync !== "ALL") params.set("feeSync", feeSync);
    return params.toString();
  }, [feeSync, page, search, status, type]);

  const transactionsQuery = useQuery({
    queryKey: ["admin-transactions", queryString],
    queryFn: async () => {
      const response = await apiClient.get<TransactionsResponse>(
        `/transactions?${queryString}`,
      );
      return response.data;
    },
    staleTime: 30_000,
    refetchInterval: 60_000,
  });

  useAdminRealtime({
    topics: ["finance"],
    onEvent: () => {
      void queryClient.invalidateQueries({ queryKey: ["admin-transactions"] });
    },
  });

  const payload = transactionsQuery.data;
  const rows = payload?.data ?? [];
  const stats = payload?.stats;
  const meta = payload?.meta;

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-slate-900 to-sky-950 p-8 text-white shadow-lg">
        <div className="pointer-events-none absolute -right-10 top-0 size-52 rounded-full bg-sky-500/20 blur-3xl" />
        <div className="pointer-events-none absolute bottom-0 left-1/3 size-44 rounded-full bg-emerald-500/15 blur-3xl" />

        <div className="relative flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full border border-sky-400/20 bg-sky-500/10 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.2em] text-sky-300">
              <WalletCards className="size-3.5" />
              Transaction Ledger
            </div>
            <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
              Website Payments & Payout Logs
            </h1>
            <p className="max-w-2xl text-sm leading-relaxed text-slate-300 md:text-base">
              Monitor all money movement across the platform, including PayPal cuts, platform fee, artist transfer amounts, and fee-sync status in real time.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <Card className="rounded-2xl border border-white/10 bg-white/5 text-white shadow-none">
              <CardContent className="p-4">
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">
                  Total Logs
                </p>
                <p className="mt-2 text-2xl font-semibold">
                  {stats?.totalTransactions ?? "—"}
                </p>
              </CardContent>
            </Card>
            <Card className="rounded-2xl border border-white/10 bg-white/5 text-white shadow-none">
              <CardContent className="p-4">
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">
                  Payments
                </p>
                <p className="mt-2 text-2xl font-semibold">
                  {stats?.paymentTransactions ?? "—"}
                </p>
              </CardContent>
            </Card>
            <Card className="rounded-2xl border border-white/10 bg-white/5 text-white shadow-none">
              <CardContent className="p-4">
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">
                  Payouts
                </p>
                <p className="mt-2 text-2xl font-semibold">
                  {stats?.payoutTransactions ?? "—"}
                </p>
              </CardContent>
            </Card>
            <Card className="rounded-2xl border border-white/10 bg-white/5 text-white shadow-none">
              <CardContent className="p-4">
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">
                  Pending Sync
                </p>
                <p className="mt-2 text-2xl font-semibold">
                  {stats?.pendingFeeSyncRows ?? "—"}
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      <Card className="rounded-3xl border border-zinc-200/80 bg-white shadow-sm">
        <CardHeader className="space-y-4 border-b border-zinc-100">
          <div className="flex flex-col gap-2 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <CardTitle className="text-xl font-bold text-zinc-950">
                Transaction Log
              </CardTitle>
              <CardDescription>
                Auto-refreshes via server-sent events on the `finance` channel.
              </CardDescription>
            </div>

            <Button
              type="button"
              variant="outline"
              className="rounded-xl border-zinc-200 bg-white"
              onClick={() =>
                void queryClient.invalidateQueries({
                  queryKey: ["admin-transactions"],
                })
              }
            >
              <RefreshCcw className="mr-2 size-4" />
              Refresh Now
            </Button>
          </div>

          <div className="grid gap-3 xl:grid-cols-[1.6fr_repeat(3,minmax(0,0.8fr))]">
            <form
              className="relative"
              onSubmit={(event) => {
                event.preventDefault();
                setPage(1);
                setSearch(searchInput.trim());
              }}
            >
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-400" />
              <Input
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                placeholder="Search order, payout, PayPal ID, username, email..."
                className="h-11 rounded-2xl border-zinc-200 pl-10"
              />
            </form>

            <Select
              value={type}
              onValueChange={(value) => {
                setType(value as "ALL" | AdminTransactionEntryType);
                setPage(1);
              }}
            >
              <SelectTrigger className="h-11 rounded-2xl border-zinc-200">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Types</SelectItem>
                <SelectItem value="PAYMENT">Payments</SelectItem>
                <SelectItem value="PAYOUT">Payouts</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={status}
              onValueChange={(value) => {
                setStatus(value as "ALL" | AdminTransactionStatus);
                setPage(1);
              }}
            >
              <SelectTrigger className="h-11 rounded-2xl border-zinc-200">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Statuses</SelectItem>
                <SelectItem value="PENDING">Pending</SelectItem>
                <SelectItem value="COMPLETED">Completed</SelectItem>
                <SelectItem value="FAILED">Failed</SelectItem>
                <SelectItem value="REFUNDED">Refunded</SelectItem>
                <SelectItem value="SENT">Sent</SelectItem>
                <SelectItem value="FRAUD">Fraud</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={feeSync}
              onValueChange={(value) => {
                setFeeSync(value as "ALL" | AdminTransactionFeeSyncStatus);
                setPage(1);
              }}
            >
              <SelectTrigger className="h-11 rounded-2xl border-zinc-200">
                <SelectValue placeholder="Fee Sync" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Sync States</SelectItem>
                <SelectItem value="SYNCED">Synced</SelectItem>
                <SelectItem value="PENDING_SYNC">Pending Sync</SelectItem>
                <SelectItem value="NOT_REQUIRED">Not Required</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>

        {transactionsQuery.isLoading ? (
          <TransactionsTableSkeleton />
        ) : rows.length > 0 ? (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-zinc-100">
                  <TableHead>When</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Reference</TableHead>
                  <TableHead>Parties</TableHead>
                  <TableHead>Gross</TableHead>
                  <TableHead>Platform</TableHead>
                  <TableHead>PayPal Cut</TableHead>
                  <TableHead>Artist / Transfer</TableHead>
                  <TableHead>Admin Impact</TableHead>
                  <TableHead>Sync</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => (
                  <TableRow key={`${row.entryType}-${row.id}`} className="border-zinc-100 align-top">
                    <TableCell className="min-w-40">
                      <div className="space-y-1">
                        <p className="font-medium text-zinc-900">
                          {formatDate(row.settledAt ?? row.occurredAt)}
                        </p>
                        <p className="text-xs text-zinc-500">
                          Created {formatDate(row.occurredAt)}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <TransactionDirectionBadge entryType={row.entryType} />
                    </TableCell>
                    <TableCell>
                      <Badge className={cn("rounded-full", getStatusBadgeClass(row.status))}>
                        {row.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="min-w-56">
                      <div className="space-y-1">
                        <p className="font-medium text-zinc-900">
                          {row.entryType === "PAYMENT"
                            ? row.orderTitle || "Untitled order"
                            : "Artist payout"}
                        </p>
                        <p className="text-xs text-zinc-500">
                          {row.entryType === "PAYMENT"
                            ? `Order ${row.orderId}`
                            : `Payout ${row.id}`}
                        </p>
                        {row.paypalCaptureId && (
                          <p className="text-xs text-zinc-500">
                            Capture {row.paypalCaptureId}
                          </p>
                        )}
                        {row.paypalBatchId && (
                          <p className="text-xs text-zinc-500">
                            Batch {row.paypalBatchId}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="min-w-56">
                      <div className="space-y-1">
                        <p className="font-medium text-zinc-900">
                          Artist @{row.artist.username}
                        </p>
                        <p className="text-xs text-zinc-500">{row.artist.email}</p>
                        {row.client && (
                          <p className="text-xs text-zinc-500">
                            Client @{row.client.username ?? "unknown"}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="font-medium text-zinc-900">
                      {formatMoney(row.grossAmount, row.currency)}
                    </TableCell>
                    <TableCell>
                      {formatMoney(row.platformFee, row.currency)}
                    </TableCell>
                    <TableCell>
                      {formatMoney(
                        row.paypalFee,
                        row.paypalFeeCurrency ?? row.currency,
                      )}
                    </TableCell>
                    <TableCell>
                      {row.entryType === "PAYMENT"
                        ? formatMoney(row.artistAmount, row.currency)
                        : formatMoney(row.transferAmount, row.currency)}
                    </TableCell>
                    <TableCell>
                      <span
                        className={cn(
                          "font-semibold",
                          Number(row.adminImpact) >= 0
                            ? "text-emerald-700"
                            : "text-rose-700",
                        )}
                      >
                        {formatMoney(row.adminImpact, row.currency)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge className={cn("rounded-full", getSyncBadgeClass(row.feeSyncStatus))}>
                        {row.feeSyncStatus === "PENDING_SYNC"
                          ? "Pending"
                          : row.feeSyncStatus === "SYNCED"
                            ? "Synced"
                            : "N/A"}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <CardContent className="flex min-h-56 flex-col items-center justify-center px-6 text-center">
            <div className="flex size-14 items-center justify-center rounded-2xl bg-zinc-100 text-zinc-500">
              <Coins className="size-6" />
            </div>
            <p className="mt-4 text-base font-semibold text-zinc-900">
              No transaction logs found
            </p>
            <p className="mt-1 max-w-md text-sm text-zinc-500">
              Try changing the type, status, or fee-sync filters to explore more entries.
            </p>
          </CardContent>
        )}

        <div className="flex items-center justify-between border-t border-zinc-100 px-6 py-4">
          <p className="text-sm text-zinc-500">
            {meta
              ? `Page ${meta.page} of ${meta.totalPages} · ${meta.total} entries`
              : "Loading pagination"}
          </p>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="rounded-xl"
              disabled={!meta?.hasPreviousPage}
              onClick={() => setPage((current) => Math.max(1, current - 1))}
            >
              <ChevronLeft className="mr-1 size-4" />
              Previous
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="rounded-xl"
              disabled={!meta?.hasNextPage}
              onClick={() => setPage((current) => current + 1)}
            >
              Next
              <ChevronRight className="ml-1 size-4" />
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
