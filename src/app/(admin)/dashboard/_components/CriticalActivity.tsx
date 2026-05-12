"use client";

import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  MessageSquare,
  Wallet,
} from "lucide-react";
import { cn } from "@/lib/utils";

type Tone = "success" | "warn" | "danger" | "info";

type ActivityEntry = {
  id: string;
  tone: Tone;
  title: string;
  tag: { label: string; tone: Tone };
  desc: React.ReactNode;
  time: string;
  icon: React.ReactNode;
};

const TONE_BG: Record<Tone, string> = {
  success: "bg-emerald-50 text-emerald-700",
  warn: "bg-amber-50 text-amber-800",
  danger: "bg-rose-50 text-rose-700",
  info: "bg-sky-50 text-sky-800",
};

const TAG_BG: Record<Tone, string> = {
  success: "bg-emerald-100 text-emerald-800",
  warn: "bg-amber-100 text-amber-900",
  danger: "bg-rose-100 text-rose-800",
  info: "bg-sky-100 text-sky-800",
};

export function CriticalActivity({
  pendingPayouts,
  refundRequests,
  artistVerifications,
}: {
  pendingPayouts: number;
  refundRequests: number;
  artistVerifications: number;
}) {
  // Derived placeholder events based on real counters.
  // Real event log will require a dedicated /admin/activity stream endpoint.
  const entries: ActivityEntry[] = [
    {
      id: "refunds",
      tone: "danger",
      icon: <AlertCircle className="size-3.5" />,
      title: "Refund requests pending",
      tag: { label: "High", tone: "danger" },
      desc: (
        <>
          <strong className="font-mono">{refundRequests}</strong> open refund
          dispute{refundRequests === 1 ? "" : "s"} need admin review.
        </>
      ),
      time: "Realtime",
    },
    {
      id: "payouts",
      tone: "warn",
      icon: <Wallet className="size-3.5" />,
      title: "Payout batch ready",
      tag: { label: "Action", tone: "warn" },
      desc: (
        <>
          <strong className="font-mono">{pendingPayouts}</strong> artist payout
          {pendingPayouts === 1 ? "" : "s"} awaiting approval.
        </>
      ),
      time: "Realtime",
    },
    {
      id: "verify",
      tone: "success",
      icon: <CheckCircle2 className="size-3.5" />,
      title: "Artist verification queue",
      tag: { label: "Review", tone: "success" },
      desc: (
        <>
          <strong className="font-mono">{artistVerifications}</strong> KYC
          submission{artistVerifications === 1 ? "" : "s"} pending verification.
        </>
      ),
      time: "Realtime",
    },
    {
      id: "chat-flag",
      tone: "info",
      icon: <MessageSquare className="size-3.5" />,
      title: "Chat auto-flag policy active",
      tag: { label: "Info", tone: "info" },
      desc: (
        <>Conversations flagged by policy filters route into moderation queue.</>
      ),
      time: "Background",
    },
    {
      id: "revision-watch",
      tone: "warn",
      icon: <AlertTriangle className="size-3.5" />,
      title: "Revision pressure monitoring",
      tag: { label: "Watch", tone: "warn" },
      desc: (
        <>
          Orders flagged for over-revision are surfaced in{" "}
          <strong>Orders / Attention</strong>.
        </>
      ),
      time: "Continuous",
    },
  ];

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card">
      <div className="flex items-start justify-between gap-3 border-b border-border/60 px-5 py-4">
        <div>
          <h3 className="text-[14.5px] font-semibold">Critical activity</h3>
          <p className="mt-0.5 text-[12px] text-muted-foreground">
            Event yang membutuhkan awareness admin.
          </p>
        </div>
      </div>
      <div className="px-5 py-2">
        {entries.map((e) => (
          <div
            key={e.id}
            className="flex gap-3 border-b border-border/60 py-3 last:border-b-0"
          >
            <div
              className={cn(
                "flex size-8 shrink-0 items-center justify-center rounded-lg",
                TONE_BG[e.tone],
              )}
            >
              {e.icon}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-1.5 text-[13px] font-semibold">
                {e.title}
                <span
                  className={cn(
                    "inline-flex items-center rounded px-1.5 py-0.5 text-[9.5px] font-bold uppercase tracking-wider",
                    TAG_BG[e.tag.tone],
                  )}
                >
                  {e.tag.label}
                </span>
              </div>
              <div className="mt-0.5 text-[12px] text-muted-foreground">
                {e.desc}
              </div>
              <div className="mt-1 font-mono text-[11px] text-muted-foreground/70">
                {e.time}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
