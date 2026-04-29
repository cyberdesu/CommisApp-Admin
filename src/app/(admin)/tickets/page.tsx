"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import {
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  LifeBuoy,
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

type TicketRow = {
  id: string;
  type: "SUPPORT" | "USER_REPORT" | "CONTENT_REPORT" | "ORDER_DISPUTE";
  subject: string;
  status:
    | "OPEN"
    | "IN_PROGRESS"
    | "AWAITING_USER"
    | "RESOLVED"
    | "CLOSED";
  priority: "LOW" | "NORMAL" | "HIGH" | "URGENT";
  category: string | null;
  createdAt: string;
  updatedAt: string;
  lastReplyAt: string | null;
  resolvedAt: string | null;
  assignedAdminId: number | null;
  reporter: {
    id: number;
    username: string;
    name: string | null;
    email: string;
  };
  assignedAdmin: { id: number; name: string; email: string } | null;
  _count: { messages: number };
};

type TicketsResponse = {
  data: TicketRow[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
  stats: {
    total: number;
    statuses: { status: TicketRow["status"]; count: number }[];
  };
};

const STATUS_LABEL: Record<TicketRow["status"], string> = {
  OPEN: "Open",
  IN_PROGRESS: "In Progress",
  AWAITING_USER: "Awaiting User",
  RESOLVED: "Resolved",
  CLOSED: "Closed",
};

const STATUS_BADGE: Record<TicketRow["status"], string> = {
  OPEN: "border-orange-500/20 bg-orange-500/10 text-orange-600",
  IN_PROGRESS: "border-blue-500/20 bg-blue-500/10 text-blue-600",
  AWAITING_USER: "border-amber-500/20 bg-amber-500/10 text-amber-600",
  RESOLVED: "border-emerald-500/20 bg-emerald-500/10 text-emerald-600",
  CLOSED: "border-slate-400/20 bg-slate-400/10 text-slate-600",
};

const PRIORITY_BADGE: Record<TicketRow["priority"], string> = {
  LOW: "border-slate-400/20 bg-slate-400/10 text-slate-600",
  NORMAL: "border-slate-500/20 bg-slate-500/10 text-slate-700",
  HIGH: "border-orange-500/30 bg-orange-500/15 text-orange-700",
  URGENT: "border-red-500/30 bg-red-500/15 text-red-700",
};

const TYPE_LABEL: Record<TicketRow["type"], string> = {
  SUPPORT: "Support",
  USER_REPORT: "User Report",
  CONTENT_REPORT: "Content Report",
  ORDER_DISPUTE: "Order Dispute",
};

function formatDate(value: string | null) {
  if (!value) return "—";
  const d = new Date(value);
  return d.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function TicketsPage() {
  const [search, setSearch] = useState("");
  const [type, setType] = useState<string>("all");
  const [status, setStatus] = useState<string>("all");
  const [priority, setPriority] = useState<string>("all");
  const [page, setPage] = useState(1);
  const limit = 20;

  const queryKey = useMemo(
    () => ["tickets", { search, type, status, priority, page, limit }],
    [search, type, status, priority, page, limit],
  );

  const { data, isLoading, isFetching } = useQuery<TicketsResponse>({
    queryKey,
    placeholderData: keepPreviousData,
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("limit", String(limit));
      if (search.trim()) params.set("search", search.trim());
      if (type !== "all") params.set("type", type);
      if (status !== "all") params.set("status", status);
      if (priority !== "all") params.set("priority", priority);
      const res = await apiClient.get<TicketsResponse>(
        `/tickets?${params.toString()}`,
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
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-indigo-600/10 text-indigo-600">
              <LifeBuoy className="size-5" />
            </div>
            <div>
              <CardTitle className="text-lg font-semibold text-black">
                Support tickets
              </CardTitle>
              <p className="text-sm text-slate-500">
                {data?.stats?.total ?? 0} total tickets
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative min-w-[220px] flex-1">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
              <Input
                placeholder="Search subject / reporter"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="pl-9"
              />
            </div>

            <Select
              value={type}
              onValueChange={(v) => {
                setType(v ?? "all");
                setPage(1);
              }}
            >
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All types</SelectItem>
                <SelectItem value="SUPPORT">Support</SelectItem>
                <SelectItem value="USER_REPORT">User Report</SelectItem>
                <SelectItem value="CONTENT_REPORT">Content Report</SelectItem>
                <SelectItem value="ORDER_DISPUTE">Order Dispute</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={status}
              onValueChange={(v) => {
                setStatus(v ?? "all");
                setPage(1);
              }}
            >
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="OPEN">Open</SelectItem>
                <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                <SelectItem value="AWAITING_USER">Awaiting User</SelectItem>
                <SelectItem value="RESOLVED">Resolved</SelectItem>
                <SelectItem value="CLOSED">Closed</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={priority}
              onValueChange={(v) => {
                setPriority(v ?? "all");
                setPage(1);
              }}
            >
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All priorities</SelectItem>
                <SelectItem value="LOW">Low</SelectItem>
                <SelectItem value="NORMAL">Normal</SelectItem>
                <SelectItem value="HIGH">High</SelectItem>
                <SelectItem value="URGENT">Urgent</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="overflow-x-auto rounded-xl border border-black/10">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Subject</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Reporter</TableHead>
                  <TableHead>Last reply</TableHead>
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
                      No tickets match the current filters.
                    </TableCell>
                  </TableRow>
                ) : (
                  rows.map((row) => (
                    <TableRow key={row.id} className="hover:bg-slate-50">
                      <TableCell className="font-medium">
                        <Link
                          href={`/tickets/${row.id}`}
                          className="hover:text-indigo-600"
                        >
                          {row.subject}
                        </Link>
                        {row._count.messages > 1 && (
                          <span className="ml-2 text-xs text-slate-400">
                            {row._count.messages} msgs
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{TYPE_LABEL[row.type]}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={cn(
                            "border",
                            STATUS_BADGE[row.status],
                          )}
                        >
                          {STATUS_LABEL[row.status]}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={cn(
                            "border",
                            PRIORITY_BADGE[row.priority],
                          )}
                        >
                          {row.priority}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm font-medium text-slate-800">
                          {row.reporter.name || row.reporter.username}
                        </div>
                        <div className="text-xs text-slate-500">
                          {row.reporter.email}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-slate-600">
                        {formatDate(row.lastReplyAt)}
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
