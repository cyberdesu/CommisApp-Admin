"use client";

import Link from "next/link";
import {
  BadgeCheck,
  CheckCircle2,
  Info,
  Pencil,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  formatDate,
  formatMoney,
  getFinancePreview,
  getPrimaryFinance,
  getRolePill,
  isUserSuspended,
} from "../_lib/helpers";
import type { UserItem } from "../_lib/types";
import { UserAvatar } from "./UserAvatar";
import {
  ActivityRow,
  DetailRow,
  SectionHeading,
  StatCell,
} from "./primitives";

export function ViewUserDialog({
  open,
  onOpenChange,
  activeDetail,
  isLoading,
  onEditClick,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  activeDetail: UserItem | undefined;
  isLoading: boolean;
  onEditClick: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="flex max-h-[88vh] w-full max-w-[calc(100%-2rem)] flex-col overflow-hidden rounded-2xl border border-border bg-card p-0 sm:max-w-4xl"
        showCloseButton={false}
      >
        <div className="flex items-start justify-between gap-4 border-b border-border/60 px-6 py-5">
          <DialogHeader className="gap-1">
            <div className="flex items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-[0.14em] text-primary">
              <Info className="size-3" />
              User profile
            </div>
            <DialogTitle className="text-[18px] font-semibold tracking-tight">
              Account details
            </DialogTitle>
            <DialogDescription className="text-[13px] text-muted-foreground">
              Complete account information & recent activity.
            </DialogDescription>
          </DialogHeader>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="inline-flex size-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <X className="size-3.5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5">
          {isLoading ? (
            <div className="py-12 text-center text-sm text-muted-foreground">
              Loading…
            </div>
          ) : activeDetail ? (
            <ViewBody detail={activeDetail} />
          ) : (
            <p className="py-12 text-center text-sm text-muted-foreground">
              User details not available.
            </p>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-border/60 bg-muted/30 px-6 py-3">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground"
          >
            Close
          </button>
          <button
            type="button"
            disabled={!activeDetail}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-semibold text-foreground transition hover:border-primary/40 hover:text-primary disabled:opacity-50"
            onClick={onEditClick}
          >
            <Pencil className="size-3.5" />
            Edit user
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ViewBody({ detail }: { detail: UserItem }) {
  const fp = getFinancePreview(detail.finance);
  const cur = getPrimaryFinance(detail.finance)?.currency ?? "USD";

  return (
    <div className="grid gap-6 md:grid-cols-[240px_1fr]">
      {/* Identity card */}
      <div className="rounded-xl border border-border/60 bg-muted/30 p-5">
        <UserAvatar user={detail} size="lg" />
        <div className="mt-3 flex items-center gap-1.5">
          <span className="text-base font-semibold">
            {detail.name || (
              <span className="italic font-medium text-muted-foreground/70">
                No display name
              </span>
            )}
          </span>
          {detail.verified && (
            <CheckCircle2 className="size-3.5 text-emerald-600" />
          )}
          {detail.verifiedArtists && (
            <BadgeCheck className="size-3.5 text-violet-600" />
          )}
        </div>
        <div className="text-xs text-muted-foreground">
          @{detail.username}
          {detail.country ? ` · ${detail.country}` : ""}
        </div>

        <div className="mt-4 flex flex-col gap-3">
          <DetailRow label="User ID">
            <span className="font-mono">#{detail.id}</span>
          </DetailRow>
          <DetailRow label="Email">{detail.email}</DetailRow>
          <DetailRow label="Role">
            <span
              className={cn(
                "inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold",
                getRolePill(detail.role),
              )}
            >
              {detail.role}
            </span>
          </DetailRow>
          <DetailRow label="Joined">
            {formatDate(detail.createdAt, true)}
          </DetailRow>
          <DetailRow label="Moderation">
            {detail.isBanned
              ? "Banned"
              : isUserSuspended(detail)
                ? `Suspended until ${formatDate(detail.suspendedUntil ?? "", true)}`
                : "No active sanction"}
          </DetailRow>
        </div>
      </div>

      {/* Right column */}
      <div className="min-w-0 space-y-6">
        {detail.finance && (
          <div>
            <SectionHeading>Finance summary · {cur}</SectionHeading>
            <div className="mt-2 grid grid-cols-2 gap-2.5 sm:grid-cols-3">
              <StatCell label="Gross earned" value={fp?.earned ?? "—"} />
              <StatCell label="Withdrawn" value={fp?.withdrawn ?? "—"} />
              <StatCell
                label="Available"
                tone="emerald"
                value={fp?.available ?? "—"}
              />
              <StatCell label="Pending" value={fp?.pending ?? "—"} />
              <StatCell
                label="Orders"
                value={(detail.finance.totalOrders ?? 0).toLocaleString(
                  "en-US",
                )}
              />
              <StatCell
                label="Completed"
                value={(detail.finance.completedOrders ?? 0).toLocaleString(
                  "en-US",
                )}
              />
            </div>
          </div>
        )}

        <div>
          <SectionHeading>Recent activity</SectionHeading>
          <div className="mt-2 divide-y divide-border/60">
            {detail.recentPayments?.slice(0, 3).map((p) => (
              <ActivityRow
                key={p.id}
                tone="em"
                title={`Payment received · ${p.status}`}
                ts={formatDate(p.paidAt ?? p.createdAt, true)}
                amount={`+${formatMoney(p.amount, p.currency)}`}
                amountTone="emerald"
              />
            ))}
            {detail.recentPayouts?.slice(0, 3).map((p) => (
              <ActivityRow
                key={p.id}
                tone="rs"
                title={`Payout via PayPal · ${p.status}`}
                ts={formatDate(p.reviewedAt ?? p.createdAt, true)}
                amount={`−${formatMoney(p.amount, p.currency)}`}
                amountTone="rose"
              />
            ))}
            {!detail.recentPayments?.length &&
              !detail.recentPayouts?.length && (
                <p className="py-3 text-xs italic text-muted-foreground">
                  No recent finance activity.
                </p>
              )}
          </div>
        </div>

        {detail.bio && (
          <div>
            <SectionHeading>Bio</SectionHeading>
            <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">
              {detail.bio}
            </p>
          </div>
        )}

        {detail.moderations && detail.moderations.length > 0 && (
          <div>
            <SectionHeading>Moderation history</SectionHeading>
            <div className="mt-2 space-y-2">
              {detail.moderations.slice(0, 4).map((log) => (
                <div
                  key={log.id}
                  className="rounded-lg border border-border/60 bg-muted/30 px-3 py-2 text-[12.5px]"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold">{log.action}</span>
                    <span className="text-[11.5px] text-muted-foreground">
                      {formatDate(log.createdAt, true)}
                    </span>
                  </div>
                  <p className="text-[11.5px] text-muted-foreground">
                    by {log.admin.name}
                  </p>
                  {log.reason && (
                    <p className="mt-1 text-[12px]">{log.reason}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {detail.orders && (
          <div className="rounded-xl border border-border/60 bg-muted/30 p-4">
            <SectionHeading>Order oversight</SectionHeading>
            <div className="mt-2 flex flex-wrap items-center gap-3 text-[12px] text-muted-foreground">
              <span>
                Total{" "}
                <strong className="font-semibold text-foreground">
                  {detail.orders.summary.totalOrders}
                </strong>
              </span>
              <span>·</span>
              <span>
                Active{" "}
                <strong className="font-semibold text-foreground">
                  {detail.orders.summary.activeOrders}
                </strong>
              </span>
              <span>·</span>
              <span>
                Completed{" "}
                <strong className="font-semibold text-foreground">
                  {detail.orders.summary.completedOrders}
                </strong>
              </span>
              <span>·</span>
              <span className="text-rose-700">
                Need attention{" "}
                <strong className="font-semibold">
                  {detail.orders.summary.atRiskOrders}
                </strong>
              </span>
            </div>
            <Link
              href={`/orders?userId=${detail.id}`}
              className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-800"
            >
              Open orders page
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
