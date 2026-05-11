"use client";

import { AlertTriangle, MessageSquare, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type {
  AdminOrderStatus,
  UserOrderOverview,
} from "@/lib/user-orders.types";
import {
  formatDate,
  formatDeliveryWindow,
  formatMoney,
  getAttentionBadgeClass,
  getOrderProgressLabel,
  getOrderStatusBadgeClass,
  getTimelineTone,
} from "../_lib/helpers";
import { ADMIN_ORDER_STATUS_OPTIONS } from "../_lib/types";

export function OrderReviewDialog({
  order,
  onClose,
  interventionStatus,
  setInterventionStatus,
  interventionRevisionsUsed,
  setInterventionRevisionsUsed,
  interventionNote,
  setInterventionNote,
  isSubmitting,
  onSubmit,
  onOpenChat,
}: {
  order: UserOrderOverview | null;
  onClose: () => void;
  interventionStatus: AdminOrderStatus | "UNCHANGED";
  setInterventionStatus: (v: AdminOrderStatus | "UNCHANGED") => void;
  interventionRevisionsUsed: string;
  setInterventionRevisionsUsed: (v: string) => void;
  interventionNote: string;
  setInterventionNote: (v: string) => void;
  isSubmitting: boolean;
  onSubmit: () => void;
  onOpenChat: (conversationId: string) => void;
}) {
  return (
    <Dialog
      open={Boolean(order)}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="flex max-h-[90dvh] w-full max-w-[calc(100%-2rem)] flex-col overflow-hidden rounded-[28px] border border-zinc-200 bg-white p-0 sm:max-w-4xl">
        <div className="relative shrink-0 overflow-hidden bg-gradient-to-r from-slate-900 to-orange-950 p-6">
          <DialogHeader className="relative gap-1.5">
            <DialogTitle className="text-xl font-semibold text-white">
              Order Review
            </DialogTitle>
            <DialogDescription className="text-sm text-white/60">
              Inspect progress and intervene when delivery or revision behavior
              needs correction.
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {order ? (
            <div className="space-y-5">
              <div className="rounded-3xl border border-zinc-200 bg-zinc-50/70 p-5">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-lg font-bold text-zinc-900">
                        {order.title}
                      </p>
                      <Badge
                        className={cn(
                          "rounded-full border",
                          getOrderStatusBadgeClass(order.status),
                        )}
                      >
                        {order.status}
                      </Badge>
                    </div>
                    <p className="mt-1 text-sm text-zinc-500">
                      Order #{order.id.slice(0, 8)}
                      <span className="mx-1.5 text-zinc-300">·</span>
                      {order.source}
                      <span className="mx-1.5 text-zinc-300">·</span>
                      Updated {formatDate(order.latestActivityAt)}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Badge
                      variant="outline"
                      className="rounded-full border-zinc-200 bg-white text-zinc-700"
                    >
                      {formatMoney(order.amount, order.currency)}
                    </Badge>
                    {order.conversationId ? (
                      <Button
                        variant="outline"
                        className="rounded-full border-zinc-200 bg-white text-zinc-700"
                        onClick={() => {
                          if (!order.conversationId) return;
                          onOpenChat(order.conversationId);
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
                    {order.paymentCaptured && (
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
                      <SnapshotCell
                        label="Delivery Window"
                        value={formatDeliveryWindow(
                          order.deliveryDaysMin,
                          order.deliveryDaysMax,
                        )}
                      />
                      <SnapshotCell
                        label="Revision Usage"
                        value={getOrderProgressLabel(order)}
                      />
                      <SnapshotCell
                        label="Delivery Attempts"
                        value={String(order.metrics.deliveredTransitions)}
                      />
                      <SnapshotCell
                        label="Revision Requests"
                        value={String(order.metrics.revisionRequests)}
                      />
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2">
                      {order.attentionFlags.length > 0 ? (
                        order.attentionFlags.map((flag) => (
                          <Badge
                            key={`${order.id}-${flag.code}`}
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
                        {order.timeline.length} recent events
                      </p>
                    </div>
                    <div className="mt-3 space-y-2">
                      {order.timeline.length > 0 ? (
                        order.timeline.map((item) => (
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
                              (value as AdminOrderStatus | "UNCHANGED") ??
                                "UNCHANGED",
                            )
                          }
                        >
                          <SelectTrigger className="h-11 rounded-2xl border-zinc-200 bg-zinc-50">
                            <SelectValue placeholder="Keep current status" />
                          </SelectTrigger>
                          <SelectContent className="rounded-xl border-zinc-200 bg-white">
                            <SelectItem value="UNCHANGED">
                              Keep current status
                            </SelectItem>
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
                          onChange={(e) =>
                            setInterventionRevisionsUsed(e.target.value)
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
                          onChange={(e) => setInterventionNote(e.target.value)}
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
            onClick={onClose}
          >
            Close
          </Button>
          <Button
            className="rounded-xl bg-slate-900 text-sm text-white hover:bg-slate-800"
            disabled={!order || isSubmitting}
            onClick={onSubmit}
          >
            {isSubmitting ? (
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
  );
}

function SnapshotCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-zinc-100 bg-zinc-50 p-3">
      <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-zinc-400">
        {label}
      </p>
      <p className="mt-1 text-sm font-semibold text-zinc-900">{value}</p>
    </div>
  );
}
