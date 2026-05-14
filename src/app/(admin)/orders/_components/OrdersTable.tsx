"use client";

import { Clock3, Eye, MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";
import type { UserOrderOverview } from "@/lib/user-orders.types";
import { Pagination } from "@/components/ui/pagination";
import {
  formatDate,
  formatMoney,
  getFlagPillClass,
  getRevisionState,
  getStatusDotClass,
  getStatusLabel,
  getStatusPillClass,
} from "../_lib/helpers";
import { OrdersTableSkeleton } from "./OrdersTableSkeleton";

export function OrdersTable({
  rows,
  isLoading,
  isFetching,
  page,
  totalPages,
  total,
  onPageChange,
  onReview,
  onOpenChat,
}: {
  rows: UserOrderOverview[];
  isLoading: boolean;
  isFetching: boolean;
  page: number;
  totalPages: number;
  total: number;
  onPageChange: (next: number) => void;
  onReview: (o: UserOrderOverview) => void;
  onOpenChat: (conversationId: string) => void;
}) {
  if (isLoading) return <OrdersTableSkeleton />;

  if (rows.length === 0) {
    return (
      <div className="px-6 py-16 text-center">
        <div className="mx-auto flex size-14 items-center justify-center rounded-2xl border border-border bg-muted/40 text-muted-foreground">
          <Clock3 className="size-6" />
        </div>
        <p className="mt-4 text-sm font-semibold text-foreground">
          No orders found
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          Try adjusting the search term or current filters.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1080px] border-collapse text-[13px]">
          <thead>
            <tr className="border-b border-border/60 bg-muted/30 text-[10.5px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
              <th className="px-5 py-3 text-left">Order</th>
              <th className="px-5 py-3 text-left">Artist / Client</th>
              <th className="px-5 py-3 text-left">Status</th>
              <th className="px-5 py-3 text-left">Revisions</th>
              <th className="px-5 py-3 text-left">Flags</th>
              <th className="px-5 py-3 text-left">Updated</th>
              <th className="px-5 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((order) => {
              const rev = getRevisionState(order);
              const flagged = order.attentionFlags.length > 0;
              return (
                <tr
                  key={order.id}
                  className={cn(
                    "border-b border-border/40 last:border-b-0 hover:bg-muted/30",
                    flagged && "bg-rose-50/40 hover:bg-rose-50/60",
                  )}
                >
                  <td
                    className={cn(
                      "px-5 py-3",
                      flagged && "border-l-2 border-rose-500",
                    )}
                  >
                    <div className="min-w-0">
                      <div className="text-[13.5px] font-semibold text-foreground">
                        {order.title}
                      </div>
                      <div className="mt-0.5 flex flex-wrap items-center gap-2 text-[11.5px] text-muted-foreground">
                        <span className="rounded-md bg-muted px-1.5 py-0.5 font-mono text-[11px]">
                          #{order.id.slice(0, 8)}
                        </span>
                        <span className="font-mono">
                          {formatMoney(order.amount, order.currency)}
                        </span>
                        <span>·</span>
                        <span>{order.source}</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex flex-col gap-0.5">
                      <PartyRow label="Artist" value={`@${order.artist.username}`} />
                      <PartyRow
                        label="Client"
                        value={`@${order.client?.username ?? "guest"}`}
                      />
                    </div>
                  </td>
                  <td className="px-5 py-3">
                    <span
                      className={cn(
                        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11.5px] font-semibold",
                        getStatusPillClass(order.status),
                      )}
                    >
                      <span
                        className={cn(
                          "size-1.5 rounded-full",
                          getStatusDotClass(order.status),
                        )}
                      />
                      {getStatusLabel(order.status)}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2 text-[11.5px]">
                      <span className="font-mono tabular-nums">
                        {rev.used}/{rev.total}
                      </span>
                      {rev.danger && (
                        <span className="text-[10.5px] font-semibold uppercase text-rose-700">
                          Over
                        </span>
                      )}
                    </div>
                    <div className="mt-1.5 h-1 w-32 overflow-hidden rounded-full bg-muted">
                      <div
                        className={cn(
                          "h-full rounded-full",
                          rev.danger
                            ? "bg-rose-500"
                            : rev.warn
                              ? "bg-amber-500"
                              : "bg-primary",
                        )}
                        style={{ width: `${rev.danger ? 100 : rev.pct}%` }}
                      />
                    </div>
                  </td>
                  <td className="px-5 py-3">
                    {flagged ? (
                      <div className="flex flex-col gap-1">
                        {order.attentionFlags.slice(0, 2).map((flag) => (
                          <span
                            key={`${order.id}-${flag.code}`}
                            className={cn(
                              "inline-flex w-fit items-center rounded-full px-2 py-0.5 text-[11px] font-semibold",
                              getFlagPillClass(flag.level),
                            )}
                          >
                            {flag.label}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-[11.5px] italic text-muted-foreground/70">
                        Clean
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-3">
                    <span className="font-mono text-[12px] text-muted-foreground">
                      {formatDate(order.latestActivityAt)}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-right">
                    <div className="flex justify-end gap-1">
                      {order.conversationId && (
                        <button
                          type="button"
                          title="Open chat"
                          onClick={() => {
                            if (!order.conversationId) return;
                            onOpenChat(order.conversationId);
                          }}
                          className="inline-flex size-8 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground transition hover:border-primary/40 hover:text-primary"
                        >
                          <MessageSquare className="size-3.5" />
                        </button>
                      )}
                      <button
                        type="button"
                        title="Review"
                        onClick={() => onReview(order)}
                        className="inline-flex size-8 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground transition hover:border-primary/40 hover:text-primary"
                      >
                        <Eye className="size-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="flex flex-col items-start justify-between gap-3 border-t border-border/60 px-5 py-3 text-[12.5px] text-muted-foreground sm:flex-row sm:items-center">
        <span>
          Page{" "}
          <strong className="font-semibold text-foreground">{page}</strong> of{" "}
          <strong className="font-semibold text-foreground">{totalPages}</strong>{" "}
          ·{" "}
          <strong className="font-semibold text-foreground">
            {total.toLocaleString("en-US")}
          </strong>{" "}
          orders
        </span>
        <Pagination
          page={page}
          totalPages={totalPages}
          onPageChange={onPageChange}
          disabled={isFetching}
        />
      </div>
    </>
  );
}

function PartyRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center gap-2 text-[12.5px]">
      <span className="w-9 shrink-0 text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground/70">
        {label}
      </span>
      <span className="truncate font-medium text-foreground">{value}</span>
    </div>
  );
}
