"use client";

import { AlertTriangle, Download, SlidersHorizontal } from "lucide-react";
import { toast } from "sonner";
import { useChatStats } from "../_hooks/useChatQueries";

export function ChatHead() {
  const { data } = useChatStats();

  const stats = [
    { l: "Conversations", v: data?.totalConversations ?? 0 },
    { l: "Messages", v: data?.totalMessages ?? 0 },
    {
      l: "Active today",
      v: data?.activeToday ?? 0,
      accent: true,
    },
    { l: "DMs", v: data?.totalDirect ?? 0 },
  ];

  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
      <div className="min-w-0">
        <h2 className="text-xl font-semibold tracking-tight text-foreground">
          Monitor user conversations
        </h2>
        <p className="mt-1 max-w-xl text-sm text-muted-foreground">
          Pantau DM, group, dan order chats secara realtime. Reveal pesan
          terhapus, escalate ke ticket, atau intervene saat ada pelanggaran.
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-4 text-xs">
          {stats.map((s) => (
            <div key={s.l} className="flex flex-col">
              <span className="text-[9.5px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                {s.l}
              </span>
              <span
                className={`font-mono text-[14px] font-semibold tabular-nums ${s.accent ? "text-primary" : "text-foreground"}`}
              >
                {s.v.toLocaleString("en-US")}
              </span>
            </div>
          ))}
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => toast.info("Saved filters coming soon")}
          className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-card px-3 py-2 text-xs font-medium text-foreground transition hover:border-primary/40 hover:text-primary"
        >
          <SlidersHorizontal className="size-3.5" />
          Saved filters
        </button>
        <button
          type="button"
          onClick={() => toast.info("Export coming soon")}
          className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-card px-3 py-2 text-xs font-medium text-foreground transition hover:border-primary/40 hover:text-primary"
        >
          <Download className="size-3.5" />
          Export thread
        </button>
        <button
          type="button"
          onClick={() => toast.info("Flagged queue coming soon")}
          className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground transition hover:brightness-105"
        >
          <AlertTriangle className="size-3.5" />
          Flagged queue
        </button>
      </div>
    </div>
  );
}
