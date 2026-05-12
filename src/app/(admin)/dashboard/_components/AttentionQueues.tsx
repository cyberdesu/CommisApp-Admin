"use client";

import Link from "next/link";
import {
  AlertTriangle,
  ChevronRight,
  RefreshCcw,
  Ticket,
  UserCheck,
  Wallet,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { compactNumber } from "../_lib/helpers";

type QueueItem = {
  key: string;
  label: string;
  value: number;
  sub: string;
  href: string;
  icon: React.ReactNode;
  tone?: "warn" | "danger";
  badge?: string;
};

export function AttentionQueues({
  pendingPayouts,
  artistVerifications,
  refundRequests,
  openTickets,
}: {
  pendingPayouts: number;
  artistVerifications: number;
  refundRequests: number;
  openTickets: number;
}) {
  const items: QueueItem[] = [
    {
      key: "payouts",
      label: "Pending payouts",
      value: pendingPayouts,
      sub: `${compactNumber(pendingPayouts)} to disburse`,
      href: "/payouts",
      icon: <Wallet className="size-3" />,
      tone: "warn",
    },
    {
      key: "verifications",
      label: "Artist verifications",
      value: artistVerifications,
      sub: "Submitted recently",
      href: "/artist-requests",
      icon: <UserCheck className="size-3" />,
      badge: artistVerifications > 0 ? "NEW" : undefined,
    },
    {
      key: "refunds",
      label: "Refund requests",
      value: refundRequests,
      sub: "Pending review",
      href: "/refunds",
      icon: <RefreshCcw className="size-3" />,
      tone: "danger",
    },
    {
      key: "tickets",
      label: "Open tickets",
      value: openTickets,
      sub: "Across all categories",
      href: "/tickets",
      icon: <Ticket className="size-3" />,
    },
  ];

  const total =
    pendingPayouts + artistVerifications + refundRequests + openTickets;

  return (
    <section className="grid grid-cols-1 gap-px overflow-hidden rounded-2xl border border-border bg-border/60 lg:grid-cols-[1.2fr_repeat(4,1fr)]">
      <div className="flex flex-col justify-center gap-1 bg-gradient-to-br from-amber-50/70 to-card px-4 py-4">
        <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-amber-800">
          <AlertTriangle className="size-3" />
          Attention queues
        </div>
        <div className="text-[14px] font-semibold">
          {compactNumber(total)} items menunggu admin
        </div>
        <div className="text-[11.5px] text-muted-foreground">
          Klik kartu untuk drilldown.
        </div>
      </div>
      {items.map((it) => (
        <Link
          key={it.key}
          href={it.href}
          className="group relative flex flex-col gap-1 bg-card px-4 py-4 transition hover:bg-muted/40"
        >
          <div className="flex items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
            {it.icon}
            {it.label}
            {it.badge && (
              <span className="ml-0.5 rounded bg-rose-600 px-1 py-px text-[9px] font-bold uppercase tracking-wider text-white">
                {it.badge}
              </span>
            )}
          </div>
          <div
            className={cn(
              "font-mono text-[21px] font-semibold tracking-tight tabular-nums",
              it.tone === "warn" && "text-amber-700",
              it.tone === "danger" && "text-rose-700",
              !it.tone && "text-foreground",
            )}
          >
            {compactNumber(it.value)}
          </div>
          <div className="text-[11.5px] text-muted-foreground">{it.sub}</div>
          <ChevronRight className="absolute right-3 top-3.5 size-3 text-muted-foreground/60 transition group-hover:text-primary" />
        </Link>
      ))}
    </section>
  );
}
