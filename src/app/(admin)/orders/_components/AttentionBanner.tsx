"use client";

import { AlertCircle } from "lucide-react";

export function AttentionBanner({
  attentionCount,
  onViewAttention,
}: {
  attentionCount: number;
  onViewAttention: () => void;
}) {
  if (attentionCount <= 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-4 rounded-2xl border border-amber-300/60 bg-gradient-to-r from-amber-50/70 to-card px-4 py-3">
      <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
        <AlertCircle className="size-4" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-[13.5px] font-semibold text-foreground">
          {attentionCount.toLocaleString("en-US")} orders perlu perhatian
        </div>
        <div className="mt-0.5 text-[12.5px] text-muted-foreground">
          Mostly client over-revise atau artist menahan delivery. Pertimbangkan
          intervensi.
        </div>
      </div>
      <div className="flex items-center gap-2">
        <span className="rounded-full border border-rose-300/40 bg-rose-50 px-2 py-0.5 text-[11px] font-semibold text-rose-800">
          Revision pressure
        </span>
        <button
          type="button"
          onClick={onViewAttention}
          className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground transition hover:border-primary/40 hover:text-primary"
        >
          View list
        </button>
      </div>
    </div>
  );
}
