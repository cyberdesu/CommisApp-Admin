"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BadgeCheck, CheckCircle2, Search, XCircle } from "lucide-react";
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

type ArtistRequestItem = {
  id: number;
  userId: number;
  status: "PENDING" | "APPROVED" | "REJECTED";
  requestedAt: string;
  reviewedAt: string | null;
  reviewReason: string | null;
  reviewedByAdminId: number | null;
  username: string;
  email: string;
  name: string | null;
  role: string;
  verified: boolean;
  verifiedArtists: boolean;
  avatar: string | null;
  banner: string | null;
  country: string | null;
  createdAt: string;
};

type ArtistRequestsResponse = {
  data: ArtistRequestItem[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
  filters: {
    status: "ALL" | "PENDING" | "APPROVED" | "REJECTED";
    search: string;
  };
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

export default function ArtistRequestsPage() {
  const queryClient = useQueryClient();

  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<"ALL" | "PENDING" | "APPROVED" | "REJECTED">("PENDING");

  const requestsQuery = useQuery({
    queryKey: ["artist-requests", { page, search, status }],
    queryFn: async () => {
      const response = await apiClient.get<ArtistRequestsResponse>("/artist-requests", {
        params: {
          page,
          limit: PAGE_SIZE,
          search,
          status,
        },
      });
      return response.data;
    },
  });

  const actionMutation = useMutation({
    mutationFn: async (payload: { id: number; action: "approve" | "reject"; reason?: string }) => {
      const response = await apiClient.patch(`/artist-requests/${payload.id}`, {
        action: payload.action,
        ...(payload.reason ? { reason: payload.reason } : {}),
      });
      return response.data;
    },
    onSuccess: (_data, variables) => {
      toast.success(
        variables.action === "approve"
          ? "Artist approved successfully"
          : "Artist request rejected",
      );
      void queryClient.invalidateQueries({ queryKey: ["artist-requests"] });
      void queryClient.invalidateQueries({ queryKey: ["users"] });
    },
    onError: () => {
      toast.error("Failed to process artist request");
    },
  });

  const rows = requestsQuery.data?.data ?? [];
  const meta = requestsQuery.data?.meta;
  const total = meta?.total ?? 0;
  const totalPages = Math.max(meta?.totalPages ?? 1, 1);

  function submitSearch(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPage(1);
    setSearch(searchInput.trim());
  }

  return (
    <div className="space-y-6">
      <section className="bg-admin-surface overflow-hidden rounded-2xl border border-border shadow-sm transition-all duration-300">
        <div className="flex flex-col gap-6 p-6 md:flex-row md:items-end md:justify-between md:p-8">
          <div className="space-y-3">
            <Badge className="rounded-md bg-primary/10 px-2.5 py-1 text-[11px] font-semibold text-primary hover:bg-primary/15 border-primary/20">
              <BadgeCheck className="mr-1.5 inline-block size-3.5" />
              Verification Queue
            </Badge>

            <div className="max-w-2xl space-y-2">
              <h1 className="text-3xl font-bold tracking-tight text-foreground md:text-4xl">
                Artist Verification Requests
              </h1>
              <p className="text-sm leading-6 text-muted-foreground md:text-base">
                Review requests submitted by users who want to become verified artists.
              </p>
            </div>
          </div>

          <div className="rounded-xl border border-border/70 bg-secondary/45 p-4 w-full sm:w-auto">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              Total Requests
            </p>
            <p className="mt-1.5 text-base font-semibold text-foreground">
              {total.toLocaleString("id-ID")}
            </p>
          </div>
        </div>
      </section>

      <Card className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        <CardHeader className="flex flex-col gap-4 border-b border-border/70 pb-5 pt-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-1">
            <CardTitle className="text-xl font-bold tracking-tight text-foreground">
              Request List
            </CardTitle>
            <CardDescription className="text-sm text-muted-foreground">
              Approve or reject pending artist verification requests.
            </CardDescription>
          </div>

          <div className="flex w-full flex-col gap-3 sm:flex-row sm:justify-end">
            <form onSubmit={submitSearch} className="flex w-full gap-2 sm:max-w-md">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={searchInput}
                  onChange={(event) => setSearchInput(event.target.value)}
                  placeholder="Search username/email/name..."
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
                setStatus(value as "ALL" | "PENDING" | "APPROVED" | "REJECTED");
                setPage(1);
              }}
            >
              <SelectTrigger className="h-10 w-full rounded-lg border-border bg-card text-sm sm:w-[180px]">
                <SelectValue placeholder="Filter status" />
              </SelectTrigger>
              <SelectContent className="rounded-xl border-border bg-card">
                <SelectItem value="PENDING">Pending</SelectItem>
                <SelectItem value="APPROVED">Approved</SelectItem>
                <SelectItem value="REJECTED">Rejected</SelectItem>
                <SelectItem value="ALL">All Statuses</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {rows.length === 0 ? (
            <div className="px-6 py-16 text-center text-sm text-muted-foreground">
              {requestsQuery.isLoading
                ? "Loading artist requests..."
                : "No artist verification requests found."}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-secondary/70">
                  <TableRow className="border-border/70 hover:bg-transparent">
                    <TableHead className="px-6 py-4 text-xs font-semibold uppercase tracking-[0.18em] text-foreground/45">
                      User
                    </TableHead>
                    <TableHead className="px-6 py-4 text-xs font-semibold uppercase tracking-[0.18em] text-foreground/45">
                      Request Time
                    </TableHead>
                    <TableHead className="px-6 py-4 text-xs font-semibold uppercase tracking-[0.18em] text-foreground/45">
                      Status
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
                            {item.name || item.username}
                          </p>
                          <p className="text-xs text-muted-foreground">@{item.username}</p>
                          <p className="text-xs text-muted-foreground">{item.email}</p>
                        </div>
                      </TableCell>
                      <TableCell className="px-6 py-4 align-top text-sm text-muted-foreground">
                        {formatDate(item.requestedAt)}
                      </TableCell>
                      <TableCell className="px-6 py-4 align-top">
                        <Badge
                          className={
                            item.status === "PENDING"
                              ? "border-primary/20 bg-primary/10 text-primary hover:bg-primary/15"
                              : item.status === "APPROVED"
                                ? "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                                : "border-red-200 bg-red-50 text-red-700 hover:bg-red-100"
                          }
                        >
                          {item.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="px-6 py-4 text-right align-top">
                        {item.status === "PENDING" ? (
                          <div className="flex justify-end gap-2">
                            <Button
                              size="sm"
                              className="h-8 rounded-lg bg-emerald-600 px-3 text-white hover:bg-emerald-700"
                              disabled={actionMutation.isPending}
                              onClick={() => {
                                actionMutation.mutate({ id: item.id, action: "approve" });
                              }}
                            >
                              <CheckCircle2 className="mr-1 size-3.5" />
                              Approve
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8 rounded-lg border-red-200 bg-red-50 px-3 text-red-700 hover:bg-red-100"
                              disabled={actionMutation.isPending}
                              onClick={() => {
                                actionMutation.mutate({ id: item.id, action: "reject" });
                              }}
                            >
                              <XCircle className="mr-1 size-3.5" />
                              Reject
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
              Showing <span className="text-foreground">{rows.length}</span> of{" "}
              <span className="text-foreground">{total}</span> requests
            </p>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                className="rounded-xl border-border bg-card shadow-sm hover:border-primary/35"
                disabled={page <= 1 || requestsQuery.isFetching}
                onClick={() => setPage((current) => Math.max(current - 1, 1))}
              >
                Prev
              </Button>
              <div className="rounded-xl border border-border bg-card px-4 py-2 text-sm font-semibold text-foreground shadow-sm">
                Page {page} of {totalPages}
              </div>
              <Button
                variant="outline"
                className="rounded-xl border-border bg-card shadow-sm hover:border-primary/35"
                disabled={page >= totalPages || requestsQuery.isFetching}
                onClick={() =>
                  setPage((current) => Math.min(current + 1, totalPages))
                }
              >
                Next
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
