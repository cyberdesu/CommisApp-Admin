import { Activity, ArrowUpRight, Sparkles } from "lucide-react";

import { DashboardOverview } from "@/components/admin/dashboard-overview";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export default function DashboardPage() {
  return (
    <div className="space-y-8">
      <section className="relative overflow-hidden rounded-3xl border border-orange-200/60 bg-gradient-to-br from-black via-zinc-950 to-orange-950 px-6 py-7 text-white shadow-[0_24px_80px_-32px_rgba(249,115,22,0.45)] sm:px-8 sm:py-8">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(249,115,22,0.28),transparent_34%),radial-gradient(circle_at_bottom_left,rgba(255,255,255,0.08),transparent_28%)]" />
        <div className="absolute -right-12 top-8 h-36 w-36 rounded-full bg-orange-500/20 blur-3xl" />
        <div className="absolute bottom-0 left-0 h-px w-full bg-gradient-to-r from-transparent via-orange-400/70 to-transparent" />

        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl space-y-4">
            <Badge className="w-fit border border-orange-400/30 bg-orange-500/15 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-orange-200 hover:bg-orange-500/15">
              <Sparkles className="size-3.5" />
              Admin Command Center
            </Badge>

            <div className="space-y-3">
              <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">
                Dashboard overview
              </h1>
              <p className="max-w-xl text-sm leading-6 text-zinc-300 sm:text-base">
                Pantau performa aplikasi, aktivitas operasional, dan insight
                bisnis utama dalam satu tampilan yang lebih modern, rapi, dan
                fokus.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3 text-xs text-zinc-300 sm:text-sm">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 backdrop-blur">
                <Activity className="size-4 text-orange-300" />
                Live performance monitoring
              </div>
              <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 backdrop-blur">
                <ArrowUpRight className="size-4 text-orange-300" />
                Updated every 5 minutes
              </div>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:min-w-[320px]">
            <div className="rounded-2xl border border-white/10 bg-white/6 p-4 backdrop-blur-sm">
              <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-zinc-400">
                Conversion
              </p>
              <div className="mt-3 flex items-end justify-between gap-3">
                <div>
                  <p className="text-2xl font-semibold text-white">18.4%</p>
                  <p className="mt-1 text-xs text-zinc-400">
                    +2.1% dari minggu lalu
                  </p>
                </div>
                <div className="rounded-full bg-orange-500/15 px-2.5 py-1 text-[11px] font-semibold text-orange-200">
                  Strong
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/6 p-4 backdrop-blur-sm">
              <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-zinc-400">
                Response Rate
              </p>
              <div className="mt-3 flex items-end justify-between gap-3">
                <div>
                  <p className="text-2xl font-semibold text-white">96.2%</p>
                  <p className="mt-1 text-xs text-zinc-400">SLA tetap stabil</p>
                </div>
                <div className="rounded-full bg-white/10 px-2.5 py-1 text-[11px] font-semibold text-white">
                  Healthy
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold tracking-tight text-foreground">
            Business snapshot
          </h2>
          <p className="text-sm text-muted-foreground">
            Ringkasan metrik utama dan tren performa terbaru.
          </p>
        </div>

        <Button
          variant="outline"
          className="rounded-xl border-orange-200 bg-white text-black hover:border-orange-400 hover:bg-orange-50"
        >
          Export report
        </Button>
      </div>

      <DashboardOverview />
    </div>
  );
}
