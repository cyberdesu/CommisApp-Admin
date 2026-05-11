"use client";

import {
  ChevronLeft,
  ChevronRight,
  Clock3,
  MessageSquare,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import type { UserOrderOverview } from "@/lib/user-orders.types";
import {
  formatDate,
  formatMoney,
  getAttentionBadgeClass,
  getOrderProgressLabel,
  getOrderStatusBadgeClass,
} from "../_lib/helpers";
import { OrdersTableSkeleton } from "./OrdersTableSkeleton";

export function OrdersTable({
  rows,
  isLoading,
  isFetching,
  hasHistory,
  hasNextPage,
  nextCursor,
  onPrev,
  onNext,
  onReview,
  onOpenChat,
}: {
  rows: UserOrderOverview[];
  isLoading: boolean;
  isFetching: boolean;
  hasHistory: boolean;
  hasNextPage: boolean;
  nextCursor: string | null;
  onPrev: () => void;
  onNext: (next: string) => void;
  onReview: (o: UserOrderOverview) => void;
  onOpenChat: (conversationId: string) => void;
}) {
  if (isLoading) {
    return <OrdersTableSkeleton />;
  }

  if (rows.length === 0) {
    return (
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
    );
  }

  return (
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
                    <span className="text-xs text-zinc-400">Clean</span>
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
                          onOpenChat(order.conversationId);
                        }}
                      >
                        <MessageSquare className="mr-1.5 size-4" />
                        Chat
                      </Button>
                    ) : null}
                    <Button
                      variant="outline"
                      className="rounded-xl border-zinc-200 bg-white text-sm"
                      onClick={() => onReview(order)}
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
          <span className="font-semibold text-zinc-900">{rows.length}</span>{" "}
          orders in this page
        </p>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="h-9 rounded-xl border-zinc-200 bg-white text-sm"
            disabled={!hasHistory || isFetching}
            onClick={onPrev}
          >
            <ChevronLeft className="size-4" />
            Prev
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-9 rounded-xl border-zinc-200 bg-white text-sm"
            disabled={!hasNextPage || !nextCursor || isFetching}
            onClick={() => nextCursor && onNext(nextCursor)}
          >
            Next
            <ChevronRight className="size-4" />
          </Button>
        </div>
      </div>
    </>
  );
}
