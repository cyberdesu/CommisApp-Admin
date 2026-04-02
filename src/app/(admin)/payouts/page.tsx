"use client";

import { useState } from "react";
import axios from "axios";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Search,
  Wallet,
} from "lucide-react";
import { toast } from "sonner";

import { apiClient } from "@/lib/api/client";
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

type PayoutArtist = {
  id: number;
  username: string;
  email: string;
  name: string | null;
  avatar: string | null;
};

type PayoutItem = {
  id: string;
  artistId: number;
  amount: string;
  currency: string;
  status: "PENDING" | "SENT" | "FRAUD";
  paypalEmail: string;
  reviewNote: string | null;
  reviewedAt: string | null;
  reviewedByAdminId: number | null;
  createdAt: string;
  artist: PayoutArtist;
};

type PayoutsResponse = {
  data: PayoutItem[];
  meta: {
    limit: number;
    hasNextPage: boolean;
    nextCursor: string | null;
    cursor: string | null;
  };
  filters: {
    status: string;
    search: string;
  };
};

type PayoutStatsResponse = {
  pending: number;
  sent: number;
  fraud: number;
  total: number;
};

const PAGE_SIZE = 10;

function formatDate(value: string | null) {
  if (!value) return "-";
  return new Date(value).toLocaleString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function statusBadgeClass(status: string) {
  switch (status) {
    case "PENDING":
      return "border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100";
    case "SENT":
      return "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100";
    case "FRAUD":
      return "border-red-200 bg-red-50 text-red-700 hover:bg-red-100";
    default:
      return "border-border bg-secondary text-foreground";
  }
}

export default function PayoutsPage() {
  const queryClient = useQueryClient();

  const [cursor, setCursor] = useState<string | null>(null);
  const [cursorHistory, setCursorHistory] = useState<Array<string | null>>([]);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<
    "ALL" | "PENDING" | "SENT" | "FRAUD"
  >("PENDING");

  const payoutsQuery = useQuery({
    queryKey: ["payouts", { cursor, search, status }],
    queryFn: async () => {
      const response = await apiClient.get<PayoutsResponse>("/payouts", {
        params: {
          limit: PAGE_SIZE,
          ...(cursor ? { cursor } : {}),
          search,
          status,
        },
      });
      return response.data;
    },
  });

  const statsQuery = useQuery({
    queryKey: ["payouts-stats"],
    queryFn: async () => {
      const response =
        await apiClient.get<PayoutStatsResponse>("/payouts/stats");
      return response.data;
    },
    refetchInterval: 30_000,
  });

  const actionMutation = useMutation({
    mutationFn: async (payload: {
      id: string;
      action: "approve" | "flag_fraud";
      note?: string;
    }) => {
      const response = await apiClient.patch<{ message: string }>(
        `/payouts/${payload.id}`,
        {
          action: payload.action,
          ...(payload.note ? { note: payload.note } : {}),
        },
      );
      return response.data;
    },
    onSuccess: (data) => {
      toast.success(data.message);
      void queryClient.invalidateQueries({ queryKey: ["payouts"] });
      void queryClient.invalidateQueries({ queryKey: ["payouts-stats"] });
      void queryClient.invalidateQueries({
        queryKey: ["payouts-pending-meta"],
      });
    },
    onError: (error) => {
      if (axios.isAxiosError<{ message?: string }>(error)) {
        toast.error(
          error.response?.data?.message ?? "Failed to process payout",
        );
        return;
      }

      toast.error("Failed to process payout");
    },
  });

  const rows = payoutsQuery.data?.data ?? [];
  const meta = payoutsQuery.data?.meta;
  const hasNextPage = meta?.hasNextPage ?? false;
  const nextCursor = meta?.nextCursor ?? null;
  const stats = statsQuery.data;

  function submitSearch(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setCursor(null);
    setCursorHistory([]);
    setSearch(searchInput.trim());
  }

  return (
    <div className="space-y-6">
      <section className="bg-admin-surface overflow-hidden rounded-2xl border border-border shadow-sm transition-all duration-300">
        <div className="flex flex-col gap-6 p-6 md:flex-row md:items-end md:justify-between md:p-8">
          <div className="space-y-3">
            <Badge className="rounded-md border-primary/20 bg-primary/10 px-2.5 py-1 text-[11px] font-semibold text-primary hover:bg-primary/15">
              <Wallet className="mr-1.5 inline-block size-3.5" />
              Payout Management
            </Badge>

            <div className="max-w-2xl space-y-2">
              <h1 className="text-3xl font-bold tracking-tight text-foreground md:text-4xl">
                Artist Payouts
              </h1>
              <p className="text-sm leading-6 text-muted-foreground md:text-base">
                Review and process artist payout requests. Approve to mark as
                sent, or flag suspicious payouts as fraud.
              </p>
            </div>
          </div>

          {stats && (
            <div className="flex gap-3">
              <div className="rounded-xl border border-amber-200/70 bg-amber-50/50 p-4">
                <p className="text-[10px] font-bold uppercase tracking-widest text-amber-600">
                  Pending
                </p>
                <p className="mt-1.5 text-base font-semibold text-amber-700">
                  {stats.pending}
                </p>
              </div>
              <div className="rounded-xl border border-emerald-200/70 bg-emerald-50/50 p-4">
                <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-600">
                  Sent
                </p>
                <p className="mt-1.5 text-base font-semibold text-emerald-700">
                  {stats.sent}
                </p>
              </div>
              <div className="rounded-xl border border-red-200/70 bg-red-50/50 p-4">
                <p className="text-[10px] font-bold uppercase tracking-widest text-red-600">
                  Fraud
                </p>
                <p className="mt-1.5 text-base font-semibold text-red-700">
                  {stats.fraud}
                </p>
              </div>
            </div>
          )}
        </div>
      </section>

      <Card className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        <CardHeader className="flex flex-col gap-4 border-b border-border/70 pb-5 pt-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-1">
            <CardTitle className="text-xl font-bold tracking-tight text-foreground">
              Payout Requests
            </CardTitle>
            <CardDescription className="text-sm text-muted-foreground">
              Approve or flag pending artist payout requests.
            </CardDescription>
          </div>

          <div className="flex w-full flex-col gap-3 sm:flex-row sm:justify-end">
            <form
              onSubmit={submitSearch}
              className="flex w-full gap-2 sm:max-w-md"
            >
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={searchInput}
                  onChange={(event) => setSearchInput(event.target.value)}
                  placeholder="Search artist username/email..."
                  className="h-10 rounded-lg border-border bg-card pl-10 text-sm placeholder:text-muted-foreground focus-visible:border-primary focus-visible:ring-primary/20"
                />
              </div>
              <Button
                type="submit"
                className="h-10 rounded-lg bg-primary px-4 font-semibold text-primary-foreground hover:bg-primary/90"
              >
                Search
              </Button>
            </form>

            <Select
              value={status}
              onValueChange={(value) => {
                if (!value) return;
                setStatus(
                  value as "ALL" | "PENDING" | "SENT" | "FRAUD",
                );
                setCursor(null);
                setCursorHistory([]);
              }}
            >
              <SelectTrigger className="h-10 w-full rounded-lg border-border bg-card text-sm sm:w-[180px]">
                <SelectValue placeholder="Filter status" />
              </SelectTrigger>
              <SelectContent className="rounded-xl border-border bg-card">
                <SelectItem value="PENDING">Pending</SelectItem>
                <SelectItem value="SENT">Sent</SelectItem>
                <SelectItem value="FRAUD">Fraud</SelectItem>
                <SelectItem value="ALL">All Statuses</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {rows.length === 0 ? (
            <div className="px-6 py-16 text-center text-sm text-muted-foreground">
              {payoutsQuery.isLoading
                ? "Loading payout requests..."
                : "No payout requests found."}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-secondary/70">
                  <TableRow className="border-border/70 hover:bg-transparent">
                    <TableHead className="px-6 py-4 text-xs font-semibold uppercase tracking-[0.18em] text-foreground/45">
                      Artist
                    </TableHead>
                    <TableHead className="px-6 py-4 text-xs font-semibold uppercase tracking-[0.18em] text-foreground/45">
                      Amount
                    </TableHead>
                    <TableHead className="px-6 py-4 text-xs font-semibold uppercase tracking-[0.18em] text-foreground/45">
                      PayPal Email
                    </TableHead>
                    <TableHead className="px-6 py-4 text-xs font-semibold uppercase tracking-[0.18em] text-foreground/45">
                      Status
                    </TableHead>
                    <TableHead className="px-6 py-4 text-xs font-semibold uppercase tracking-[0.18em] text-foreground/45">
                      Requested
                    </TableHead>
                    <TableHead className="px-6 py-4 text-right text-xs font-semibold uppercase tracking-[0.18em] text-foreground/45">
                      Actions
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((item) => (
                    <TableRow
                      key={item.id}
                      className="border-border/70 transition-colors hover:bg-secondary/30"
                    >
                      <TableCell className="px-6 py-4 align-top">
                        <div className="space-y-1">
                          <p className="text-sm font-semibold text-foreground">
                            {item.artist.name || item.artist.username}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            @{item.artist.username}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {item.artist.email}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell className="px-6 py-4 align-top">
                        <p className="text-sm font-semibold text-foreground">
                          ${item.amount}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {item.currency}
                        </p>
                      </TableCell>
                      <TableCell className="px-6 py-4 align-top text-sm text-muted-foreground">
                        {item.paypalEmail}
                      </TableCell>
                      <TableCell className="px-6 py-4 align-top">
                        <Badge className={statusBadgeClass(item.status)}>
                          {item.status}
                        </Badge>
                        {item.reviewNote && (
                          <p className="mt-1 text-xs text-muted-foreground">
                            {item.reviewNote}
                          </p>
                        )}
                      </TableCell>
                      <TableCell className="px-6 py-4 align-top text-sm text-muted-foreground">
                        {formatDate(item.createdAt)}
                      </TableCell>
                      <TableCell className="px-6 py-4 text-right align-top">
                        {item.status === "PENDING" ? (
                          <div className="flex justify-end gap-2">
                            <Button
                              size="sm"
                              className="h-8 rounded-lg bg-emerald-600 px-3 text-white hover:bg-emerald-700"
                              disabled={actionMutation.isPending}
                              onClick={() => {
                                actionMutation.mutate({
                                  id: item.id,
                                  action: "approve",
                                });
                              }}
                            >
                              <CheckCircle2 className="mr-1 size-3.5" />
                              Approve & Send
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8 rounded-lg border-red-200 bg-red-50 px-3 text-red-700 hover:bg-red-100"
                              disabled={actionMutation.isPending}
                              onClick={() => {
                                actionMutation.mutate({
                                  id: item.id,
                                  action: "flag_fraud",
                                });
                              }}
                            >
                              <AlertTriangle className="mr-1 size-3.5" />
                              Fraud
                            </Button>
                          </div>
                        ) : (
                          <p className="text-xs text-muted-foreground">
                            Reviewed: {formatDate(item.reviewedAt)}
                          </p>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          <div className="flex flex-col items-center justify-between gap-4 border-t border-border bg-secondary/50 px-6 py-4 sm:flex-row">
            <p className="text-sm font-medium text-foreground/50">
              Showing{" "}
              <span className="text-foreground">{rows.length}</span> payouts
              in this batch
            </p>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                className="rounded-xl border-border bg-card shadow-sm hover:border-primary/35"
                disabled={
                  cursorHistory.length === 0 || payoutsQuery.isFetching
                }
                onClick={() => {
                  if (cursorHistory.length === 0) return;
                  const nextHistory = [...cursorHistory];
                  const previousCursor = nextHistory.pop() ?? null;
                  setCursorHistory(nextHistory);
                  setCursor(previousCursor);
                }}
              >
                <ChevronLeft className="mr-1 size-4" />
                Prev
              </Button>
              <div className="rounded-xl border border-border bg-card px-4 py-2 text-sm font-semibold text-foreground shadow-sm">
                Cursor Mode
              </div>
              <Button
                variant="outline"
                className="rounded-xl border-border bg-card shadow-sm hover:border-primary/35"
                disabled={
                  !hasNextPage || !nextCursor || payoutsQuery.isFetching
                }
                onClick={() => {
                  if (!nextCursor) return;
                  setCursorHistory((current) => [...current, cursor]);
                  setCursor(nextCursor);
                }}
              >
                Next
                <ChevronRight className="ml-1 size-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
