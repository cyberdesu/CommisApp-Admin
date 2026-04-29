"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import {
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  RefreshCcw,
  Search,
} from "lucide-react";

import { apiClient } from "@/lib/api/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

type RefundStatus =
  | "REQUESTED"
  | "APPROVED_BY_ARTIST"
  | "DENIED_BY_ARTIST"
  | "ESCALATED"
  | "APPROVED_BY_ADMIN"
  | "DENIED_BY_ADMIN"
  | "REFUNDED"
  | "WITHDRAWN"
  | "FAILED";

type RefundRow = {
  id: string;
  orderId: string;
  status: RefundStatus;
  amount: string | number;
  currency: string;
  reason: string;
  artistResponse: string | null;
  adminNote: string | null;
  ticketId: string | null;
  resolvedAt: string | null;
  resolvedByRole: "ARTIST" | "ADMIN" | "CLIENT" | "SYSTEM" | null;
  paypalRefundId: string | null;
  refundedAt: string | null;
  failureReason: string | null;
  createdAt: string;
  updatedAt: string;
  client: { id: number; username: string; name: string | null; email: string };
  artist: { id: number; username: string; name: string | null; email: string };
  order: {
    id: string;
    titleSnapshot: string | null;
    status: string;
    priceSnapshot: string | number;
    currency: string;
  };
};

type RefundsResponse = {
  data: RefundRow[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
  stats: {
    statuses: { status: RefundStatus; count: number }[];
  };
};

const STATUS_LABEL: Record<RefundStatus, string> = {
  REQUESTED: "Requested",
  APPROVED_BY_ARTIST: "Approved (Artist)",
  DENIED_BY_ARTIST: "Denied (Artist)",
  ESCALATED: "Escalated",
  APPROVED_BY_ADMIN: "Approved (Admin)",
  DENIED_BY_ADMIN: "Denied (Admin)",
  REFUNDED: "Refunded",
  WITHDRAWN: "Withdrawn",
  FAILED: "Failed",
};

const STATUS_BADGE: Record<RefundStatus, string> = {
  REQUESTED: "border-amber-500/20 bg-amber-500/10 text-amber-700",
  APPROVED_BY_ARTIST: "border-blue-500/20 bg-blue-500/10 text-blue-700",
  DENIED_BY_ARTIST: "border-rose-500/20 bg-rose-500/10 text-rose-700",
  ESCALATED: "border-orange-500/20 bg-orange-500/10 text-orange-700",
  APPROVED_BY_ADMIN: "border-blue-500/20 bg-blue-500/10 text-blue-700",
  DENIED_BY_ADMIN: "border-slate-400/20 bg-slate-400/10 text-slate-700",
  REFUNDED: "border-emerald-500/20 bg-emerald-500/10 text-emerald-700",
  WITHDRAWN: "border-slate-400/20 bg-slate-400/10 text-slate-600",
  FAILED: "border-red-500/30 bg-red-500/15 text-red-700",
};

function formatMoney(value: string | number, currency: string) {
  const numeric = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(numeric)) return `${currency} ${value}`;
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
    }).format(numeric);
  } catch {
    return `${currency} ${numeric.toFixed(2)}`;
  }
}

function formatDate(value: string | null) {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return value;
  }
}

export default function RefundsPage() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<string>("all");
  const [onlyEscalated, setOnlyEscalated] = useState(false);
  const [page, setPage] = useState(1);
  const limit = 20;

  const queryKey = useMemo(
    () => ["refunds", { search, status, onlyEscalated, page, limit }],
    [search, status, onlyEscalated, page, limit],
  );

  const { data, isLoading, isFetching, refetch } = useQuery<RefundsResponse>({
    queryKey,
    placeholderData: keepPreviousData,
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("limit", String(limit));
      if (search.trim()) params.set("search", search.trim());
      if (status !== "all") params.set("status", status);
      if (onlyEscalated) params.set("onlyEscalated", "true");
      const res = await apiClient.get<RefundsResponse>(
        `/refunds?${params.toString()}`,
      );
      return res.data;
    },
  });

  const rows = data?.data ?? [];
  const meta = data?.meta;

  return (
    <div className="space-y-6">
      <Card className="border-black/10 bg-white shadow-none">
        <CardHeader>
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-xl bg-orange-500/10 text-orange-600">
                <RefreshCcw className="size-5" />
              </div>
              <div>
                <CardTitle className="text-lg font-semibold text-black">
                  Refund Requests
                </CardTitle>
                <p className="text-sm text-slate-500">
                  Resolve disputes &amp; force-refunds. Approving triggers a
                  PayPal refund immediately.
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => void refetch()}
              disabled={isFetching}
            >
              <RefreshCcw className="size-4" /> Refresh
            </Button>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative min-w-[260px] flex-1">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
              <Input
                placeholder="Search refund / order id, client, artist…"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="pl-9"
              />
            </div>

            <Select
              value={status}
              onValueChange={(v) => {
                setStatus(v ?? "all");
                setPage(1);
              }}
            >
              <SelectTrigger className="w-[210px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="REQUESTED">Requested</SelectItem>
                <SelectItem value="ESCALATED">Escalated</SelectItem>
                <SelectItem value="APPROVED_BY_ARTIST">
                  Approved (Artist)
                </SelectItem>
                <SelectItem value="APPROVED_BY_ADMIN">
                  Approved (Admin)
                </SelectItem>
                <SelectItem value="DENIED_BY_ARTIST">
                  Denied (Artist)
                </SelectItem>
                <SelectItem value="DENIED_BY_ADMIN">Denied (Admin)</SelectItem>
                <SelectItem value="REFUNDED">Refunded</SelectItem>
                <SelectItem value="WITHDRAWN">Withdrawn</SelectItem>
                <SelectItem value="FAILED">Failed</SelectItem>
              </SelectContent>
            </Select>

            <label className="flex items-center gap-2 text-sm text-slate-600">
              <input
                type="checkbox"
                className="size-4 accent-orange-500"
                checked={onlyEscalated}
                onChange={(e) => {
                  setOnlyEscalated(e.target.checked);
                  setPage(1);
                }}
              />
              Only Escalated / Failed
            </label>
          </div>

          <div className="overflow-x-auto rounded-xl border border-black/10">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Artist</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead className="text-right">Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 6 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell colSpan={7}>
                        <Skeleton className="h-6 w-full" />
                      </TableCell>
                    </TableRow>
                  ))
                ) : rows.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={7}
                      className="py-10 text-center text-sm text-slate-500"
                    >
                      <AlertTriangle className="mx-auto mb-2 size-5 text-slate-400" />
                      No refund requests match the current filters.
                    </TableCell>
                  </TableRow>
                ) : (
                  rows.map((row) => (
                    <TableRow key={row.id} className="hover:bg-slate-50">
                      <TableCell className="font-medium">
                        <Link
                          href={`/refunds/${row.id}`}
                          className="hover:text-orange-600"
                        >
                          {row.order.titleSnapshot ?? "Untitled order"}
                        </Link>
                        <div className="text-xs text-slate-400">
                          #{row.orderId.slice(0, 8)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={cn("border", STATUS_BADGE[row.status])}
                        >
                          {STATUS_LABEL[row.status]}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-slate-700">
                        {formatMoney(row.amount, row.currency)}
                      </TableCell>
                      <TableCell>
                        <div className="text-sm font-medium text-slate-800">
                          {row.client.name || row.client.username}
                        </div>
                        <div className="text-xs text-slate-500">
                          {row.client.email}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm font-medium text-slate-800">
                          {row.artist.name || row.artist.username}
                        </div>
                        <div className="text-xs text-slate-500">
                          {row.artist.email}
                        </div>
                      </TableCell>
                      <TableCell className="max-w-[260px] truncate text-xs text-slate-500">
                        {row.reason}
                      </TableCell>
                      <TableCell className="text-right text-sm text-slate-600">
                        {formatDate(row.createdAt)}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          <div className="flex items-center justify-between text-sm text-slate-500">
            <p>
              {meta
                ? `Page ${meta.page} of ${meta.totalPages} • ${meta.total} total`
                : ""}
              {isFetching && !isLoading ? " • refreshing…" : ""}
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={!meta?.hasPreviousPage}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                <ChevronLeft className="size-4" /> Prev
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={!meta?.hasNextPage}
                onClick={() => setPage((p) => p + 1)}
              >
                Next <ChevronRight className="size-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
