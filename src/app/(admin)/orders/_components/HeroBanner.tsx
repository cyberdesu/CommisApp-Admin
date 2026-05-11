"use client";

import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import type { AdminOrderStats } from "@/lib/user-orders.types";

export function HeroBanner({
  stats,
  scopedUserId,
  onClearScope,
}: {
  stats: AdminOrderStats | undefined;
  scopedUserId: number | null;
  onClearScope: () => void;
}) {
  return (
    <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-slate-800 to-orange-950 p-8 text-white shadow-lg">
      <div className="pointer-events-none absolute -right-16 -top-16 size-64 rounded-full bg-orange-500/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-10 right-1/3 size-48 rounded-full bg-sky-500/10 blur-2xl" />

      <div className="relative flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
        <div className="space-y-3">
          <div className="inline-flex items-center gap-2 rounded-full border border-orange-400/30 bg-orange-500/15 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.2em] text-orange-300">
            <Sparkles className="size-3.5" />
            Order Oversight
          </div>
          <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
            Monitor Commission Orders
          </h1>
          <p className="max-w-2xl text-sm leading-relaxed text-slate-300 md:text-base">
            Search, filter, review progress, and intervene when artists abuse
            delivery loops or revision pressure.
          </p>
          {scopedUserId && (
            <div className="inline-flex items-center gap-3 rounded-2xl border border-white/15 bg-white/10 px-4 py-2 text-sm text-white/90">
              <span>Scoped to user #{scopedUserId}</span>
              <button
                type="button"
                className="font-semibold text-orange-300 hover:text-orange-200"
                onClick={onClearScope}
              >
                Clear scope
              </button>
            </div>
          )}
        </div>

        {stats && (
          <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
            {[
              { label: "Total", value: stats.total, tone: "text-white" },
              {
                label: "Active",
                value: stats.active,
                tone: "text-orange-200",
              },
              {
                label: "Delivered",
                value: stats.delivered,
                tone: "text-violet-200",
              },
              {
                label: "Completed",
                value: stats.completed,
                tone: "text-emerald-200",
              },
              {
                label: "Attention",
                value: stats.attention,
                tone: "text-red-200",
              },
            ].map((item) => (
              <div
                key={item.label}
                className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 backdrop-blur-sm"
              >
                <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-slate-400">
                  {item.label}
                </p>
                <p className={cn("mt-1 text-lg font-semibold", item.tone)}>
                  {item.value.toLocaleString("id-ID")}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
