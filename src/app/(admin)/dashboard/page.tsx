import { Activity, ArrowUpRight, Sparkles } from "lucide-react";

import { DashboardOverview } from "@/components/admin/dashboard-overview";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export default function DashboardPage() {
  return (
    <div className="space-y-8">
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm p-6 md:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl space-y-4">
            <Badge className="rounded-md bg-indigo-50 px-2.5 py-1 text-[11px] font-semibold text-indigo-700 hover:bg-indigo-100 border-indigo-100">
              <Sparkles className="mr-1.5 inline-block size-3.5" />
              Admin Command Center
            </Badge>

            <div className="space-y-3">
              <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
                Dashboard overview
              </h1>
              <p className="max-w-xl text-sm leading-6 text-slate-500 sm:text-base">
                Pantau performa aplikasi, aktivitas operasional, dan insight
                bisnis utama dalam satu tampilan yang lebih modern, rapi, dan
                fokus.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 sm:text-sm">
              <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5">
                <Activity className="size-4 text-indigo-500" />
                Live performance monitoring
              </div>
              <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5">
                <ArrowUpRight className="size-4 text-indigo-500" />
                Updated every 5 minutes
              </div>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:min-w-[320px]">
            <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
                Conversion
              </p>
              <div className="mt-3 flex items-end justify-between gap-3">
                <div>
                  <p className="text-2xl font-semibold text-slate-900">18.4%</p>
                  <p className="mt-1 text-xs text-slate-500">
                    +2.1% dari minggu lalu
                  </p>
                </div>
                <div className="rounded-md bg-emerald-50 px-2.5 py-1 text-[10px] font-semibold text-emerald-700 border border-emerald-100">
                  Strong
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
                Response Rate
              </p>
              <div className="mt-3 flex items-end justify-between gap-3">
                <div>
                  <p className="text-2xl font-semibold text-slate-900">96.2%</p>
                  <p className="mt-1 text-xs text-slate-500">SLA tetap stabil</p>
                </div>
                <div className="rounded-md bg-indigo-50 px-2.5 py-1 text-[10px] font-semibold text-indigo-700 border border-indigo-100">
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
          className="rounded-lg border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50 shadow-sm transition-colors"
        >
          Export report
        </Button>
      </div>

      <DashboardOverview />
    </div>
  );
}
