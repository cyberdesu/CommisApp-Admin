"use client";

import {
  AlertCircle,
  AlertTriangle,
  Ban,
  CheckCircle2,
  ListChecks,
  MessageSquare,
  RotateCcw,
  X,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  daysBetween,
  formatDate,
  formatDeliveryWindow,
  formatMoney,
  getFlagPillClass,
  getRevisionState,
  getStatusDotClass,
  getStatusLabel,
  getStatusPillClass,
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
  adminEmail,
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
  adminEmail?: string;
}) {
  const open = Boolean(order);

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) onClose();
      }}
    >
      <DialogContent
        className="flex max-h-[90vh] w-full max-w-[calc(100%-2rem)] flex-col overflow-hidden rounded-2xl border border-border bg-card p-0 sm:max-w-[1040px]"
        showCloseButton={false}
      >
        <div className="flex items-start justify-between gap-4 border-b border-border/60 px-6 py-5">
          <DialogHeader className="gap-1">
            <div className="flex items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-[0.14em] text-primary">
              <CheckCircle2 className="size-3" />
              Order review
            </div>
            <DialogTitle className="text-[18px] font-semibold tracking-tight">
              Inspect & intervene
            </DialogTitle>
            <DialogDescription className="text-[13px] text-muted-foreground">
              Review timeline, sesuaikan status, dan log intervensi admin.
            </DialogDescription>
          </DialogHeader>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex size-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <X className="size-3.5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {order && (
            <div className="grid min-h-full md:grid-cols-[1fr_320px]">
              <ReviewMain order={order} />
              <ReviewSide
                order={order}
                interventionStatus={interventionStatus}
                setInterventionStatus={setInterventionStatus}
                interventionRevisionsUsed={interventionRevisionsUsed}
                setInterventionRevisionsUsed={setInterventionRevisionsUsed}
                interventionNote={interventionNote}
                setInterventionNote={setInterventionNote}
                onOpenChat={onOpenChat}
              />
            </div>
          )}
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-border/60 bg-muted/30 px-6 py-3">
          <div className="text-[11.5px] text-muted-foreground">
            Logged sebagai{" "}
            <strong className="font-semibold text-foreground">
              {adminEmail ?? "admin@commisapp.io"}
            </strong>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={!order || isSubmitting}
              onClick={onSubmit}
              className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground transition hover:brightness-105 disabled:opacity-50"
            >
              {isSubmitting ? "Applying…" : "Apply intervention"}
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ReviewMain({ order }: { order: UserOrderOverview }) {
  const rev = getRevisionState(order);
  const daysOpen = daysBetween(order.createdAt);

  return (
    <div className="border-b border-border/60 px-6 py-6 md:border-b-0 md:border-r">
      {/* Hero card */}
      <div className="mb-4 flex items-start justify-between gap-4 rounded-xl border border-border/60 bg-muted/30 p-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
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
            <span className="rounded-md bg-muted px-1.5 py-0.5 font-mono text-[11px] text-muted-foreground">
              #{order.id.slice(0, 8)}
            </span>
          </div>
          <h4 className="mt-2 text-[17px] font-semibold leading-tight">
            {order.title}
          </h4>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-[11.5px] text-muted-foreground">
            <span>{order.source}</span>
            <span>·</span>
            <span>
              Delivery window{" "}
              {formatDeliveryWindow(order.deliveryDaysMin, order.deliveryDaysMax)}
            </span>
            <span>·</span>
            <span>Created {formatDate(order.createdAt, false)}</span>
          </div>
        </div>
        <div className="text-right">
          <div className="text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
            Price
          </div>
          <div className="mt-1 font-mono text-[18px] font-semibold tabular-nums text-primary">
            {formatMoney(order.amount, order.currency)}
          </div>
        </div>
      </div>

      {/* Meta grid */}
      <div className="mb-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <MetaCell label="Source" value={order.source} />
        <MetaCell label="Days open" value={`${daysOpen} days`} />
        <MetaCell
          label="Updated"
          value={formatDate(order.latestActivityAt, false)}
        />
        <MetaCell
          label="Conversation"
          value={order.conversationId ? "Linked" : "Not created"}
        />
      </div>

      {/* Revision pressure */}
      <SectionH icon={<AlertTriangle className="size-3" />}>
        Revision pressure
      </SectionH>
      <div
        className={cn(
          "mb-5 rounded-xl border p-3.5",
          rev.danger
            ? "border-rose-300/40 bg-rose-50"
            : rev.warn
              ? "border-amber-300/40 bg-amber-50/60"
              : "border-border/60 bg-muted/30",
        )}
      >
        <div className="mb-2 flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-[13px] font-semibold">
            {rev.danger ? (
              <AlertCircle className="size-3.5 text-rose-600" />
            ) : rev.warn ? (
              <AlertTriangle className="size-3.5 text-amber-600" />
            ) : (
              <CheckCircle2 className="size-3.5 text-emerald-600" />
            )}
            {rev.danger
              ? "Limit terlampaui · over-revise"
              : rev.warn
                ? "Mencapai limit revisi"
                : "Dalam limit"}
          </div>
          <div className="font-mono text-[13px] font-semibold tabular-nums">
            {rev.used} / {rev.total} used
          </div>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-muted">
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
        {order.attentionFlags.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {order.attentionFlags.map((flag) => (
              <span
                key={`${order.id}-${flag.code}`}
                className={cn(
                  "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold",
                  getFlagPillClass(flag.level),
                )}
              >
                {flag.label}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Timeline */}
      <SectionH icon={<ListChecks className="size-3" />}>
        Activity timeline
      </SectionH>
      {order.timeline.length === 0 ? (
        <p className="text-[12.5px] italic text-muted-foreground">
          No timeline recorded yet.
        </p>
      ) : (
        <div className="relative pl-5">
          <div className="absolute bottom-1.5 left-[5px] top-1.5 w-[1.5px] bg-border" />
          {order.timeline.map((item) => {
            const tone = getTimelineTone(item);
            const dotClass =
              tone === "admin"
                ? "border-sky-500"
                : tone === "warn"
                  ? "border-amber-500"
                  : tone === "complete"
                    ? "border-emerald-500"
                    : "border-muted-foreground";
            return (
              <div key={item.id} className="relative pb-3.5 pl-3">
                <span
                  className={cn(
                    "absolute left-[-15px] top-[6px] size-[11px] rounded-full border-2 bg-card",
                    dotClass,
                  )}
                />
                <div className="font-mono text-[11px] text-muted-foreground">
                  {formatDate(item.createdAt, true)}
                </div>
                <div className="mt-0.5 text-[13px] font-medium">
                  {item.description}
                </div>
                <div className="mt-0.5 text-[12px] text-muted-foreground">
                  {item.actorLabel}
                  {item.fromStatus && item.toStatus && (
                    <>
                      {" · "}
                      {getStatusLabel(item.fromStatus)} →{" "}
                      {getStatusLabel(item.toStatus)}
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function ReviewSide({
  order,
  interventionStatus,
  setInterventionStatus,
  interventionRevisionsUsed,
  setInterventionRevisionsUsed,
  interventionNote,
  setInterventionNote,
  onOpenChat,
}: {
  order: UserOrderOverview;
  interventionStatus: AdminOrderStatus | "UNCHANGED";
  setInterventionStatus: (v: AdminOrderStatus | "UNCHANGED") => void;
  interventionRevisionsUsed: string;
  setInterventionRevisionsUsed: (v: string) => void;
  interventionNote: string;
  setInterventionNote: (v: string) => void;
  onOpenChat: (conversationId: string) => void;
}) {
  function adjustStep(d: number) {
    const cur = Number.parseInt(interventionRevisionsUsed, 10);
    const next = Math.max(0, (Number.isFinite(cur) ? cur : 0) + d);
    setInterventionRevisionsUsed(String(next));
  }

  return (
    <div className="bg-muted/20 px-5 py-6">
      <SectionH>Parties</SectionH>
      <PartyCard
        label="Artist"
        name={order.artist.name ?? order.artist.username}
        handle={`@${order.artist.username}`}
        tone="primary"
      />
      <PartyCard
        label="Client"
        name={order.client?.name ?? order.client?.username ?? "Guest"}
        handle={order.client ? `@${order.client.username}` : "—"}
        tone="sky"
      />

      <div className="mt-5">
        <SectionH>Quick actions</SectionH>
        <div className="grid grid-cols-2 gap-1.5">
          <QuickButton
            icon={<MessageSquare className="size-3" />}
            label="Open chat"
            disabled={!order.conversationId}
            onClick={() => order.conversationId && onOpenChat(order.conversationId)}
          />
          <QuickButton
            icon={<CheckCircle2 className="size-3" />}
            label="Force complete"
            onClick={() => setInterventionStatus("COMPLETED")}
          />
          <QuickButton
            icon={<RotateCcw className="size-3" />}
            label="Free a slot"
            onClick={() => adjustStep(-1)}
          />
          <QuickButton
            icon={<Ban className="size-3" />}
            label="Cancel order"
            onClick={() => setInterventionStatus("CANCELLED")}
          />
        </div>
      </div>

      <div className="mt-5">
        <SectionH>Admin intervention</SectionH>
        <div className="space-y-3">
          <Field label="Change status">
            <Select
              value={interventionStatus}
              onValueChange={(v) =>
                setInterventionStatus(
                  (v as AdminOrderStatus | "UNCHANGED") ?? "UNCHANGED",
                )
              }
            >
              <SelectTrigger className="h-9 w-full rounded-lg border-border bg-card text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="UNCHANGED">
                  Unchanged ({getStatusLabel(order.status)})
                </SelectItem>
                {ADMIN_ORDER_STATUS_OPTIONS.map((s) => (
                  <SelectItem key={s} value={s}>
                    {getStatusLabel(s)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <Field
            label="Revisions used"
            helper={`Contract allows ${order.revisionsIncluded} revisions. Reducing membatalkan over-use.`}
          >
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => adjustStep(-1)}
                className="inline-flex size-9 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-primary"
              >
                −
              </button>
              <input
                type="number"
                min={0}
                value={interventionRevisionsUsed}
                onChange={(e) => setInterventionRevisionsUsed(e.target.value)}
                className="h-9 flex-1 rounded-lg border border-border bg-card px-3 text-center font-mono text-sm tabular-nums outline-none focus:border-primary"
              />
              <button
                type="button"
                onClick={() => adjustStep(1)}
                className="inline-flex size-9 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-primary"
              >
                +
              </button>
            </div>
          </Field>

          <Field label="Admin note · required">
            <textarea
              value={interventionNote}
              onChange={(e) => setInterventionNote(e.target.value)}
              rows={4}
              maxLength={500}
              placeholder="Misal: client over-revise di luar scope, set kembali ke delivered dan kunci revisi."
              className="w-full resize-none rounded-lg border border-border bg-card px-3 py-2 text-sm outline-none placeholder:text-muted-foreground/60 focus:border-primary"
            />
          </Field>
        </div>
      </div>
    </div>
  );
}

function MetaCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border/60 px-3 py-2.5">
      <div className="text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
        {label}
      </div>
      <div className="mt-0.5 font-mono text-[13px] font-medium tabular-nums">
        {value}
      </div>
    </div>
  );
}

function SectionH({
  icon,
  children,
}: {
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <h4 className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
      {icon}
      {children}
    </h4>
  );
}

function PartyCard({
  label,
  name,
  handle,
  tone,
}: {
  label: string;
  name: string;
  handle: string;
  tone: "primary" | "sky";
}) {
  const grad =
    tone === "primary"
      ? "from-primary to-violet-500"
      : "from-sky-500 to-emerald-500";
  const initials = name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
  return (
    <div className="mb-2 flex items-center gap-2.5 rounded-lg border border-border/60 bg-card px-3 py-2.5">
      <div
        className={cn(
          "flex size-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br font-semibold text-white",
          grad,
        )}
      >
        <span className="text-[11px]">{initials || "?"}</span>
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
          {label}
        </div>
        <div className="truncate text-[13px] font-semibold">{name}</div>
        <div className="truncate font-mono text-[11.5px] text-muted-foreground">
          {handle}
        </div>
      </div>
    </div>
  );
}

function QuickButton({
  icon,
  label,
  onClick,
  disabled,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-2.5 py-2 text-[12px] font-medium text-foreground transition hover:border-primary/40 hover:text-primary disabled:cursor-not-allowed disabled:opacity-50"
    >
      {icon}
      {label}
    </button>
  );
}

function Field({
  label,
  helper,
  children,
}: {
  label: string;
  helper?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
        {label}
      </label>
      {children}
      {helper && (
        <p className="text-[11px] text-muted-foreground">{helper}</p>
      )}
    </div>
  );
}
