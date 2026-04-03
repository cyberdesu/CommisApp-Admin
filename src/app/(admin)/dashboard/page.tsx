import Link from "next/link";
import { Activity, ArrowUpRight, Sparkles } from "lucide-react";

import { DashboardOverview } from "@/components/admin/dashboard-overview";
import { Badge } from "@/components/ui/badge";

export default function DashboardPage() {
  return (
    <div className="space-y-8">
      <section className="bg-admin-surface overflow-hidden rounded-2xl border border-border/80 p-6 shadow-sm md:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl space-y-4">
            <Badge className="rounded-md border border-primary/20 bg-primary/10 px-2.5 py-1 text-[11px] font-semibold text-primary hover:bg-primary/15">
              <Sparkles className="mr-1.5 inline-block size-3.5" />
              Admin Command Center
            </Badge>

            <div className="space-y-3">
              <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
                Dashboard overview
              </h1>
              <p className="max-w-xl text-sm leading-6 text-muted-foreground sm:text-base">
                Monitor app performance, operational activities, and key business
                insights in one modern, neat, and focused view.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground sm:text-sm">
              <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card/70 px-3 py-1.5">
                <Activity className="size-4 text-primary" />
                Live performance monitoring
              </div>
              <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card/70 px-3 py-1.5">
                <ArrowUpRight className="size-4 text-primary" />
                Updated every 5 minutes
              </div>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:min-w-[320px]">
            <div className="rounded-xl border border-border bg-card/80 p-4">
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                Conversion
              </p>
              <div className="mt-3 flex items-end justify-between gap-3">
                <div>
                  <p className="text-2xl font-semibold text-foreground">18.4%</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    +2.1% from last week
                  </p>
                </div>
                <div className="rounded-md bg-emerald-50 px-2.5 py-1 text-[10px] font-semibold text-emerald-700 border border-emerald-100">
                  Strong
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-border bg-card/80 p-4">
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                Response Rate
              </p>
              <div className="mt-3 flex items-end justify-between gap-3">
                <div>
                  <p className="text-2xl font-semibold text-foreground">96.2%</p>
                  <p className="mt-1 text-xs text-muted-foreground">SLA remains stable</p>
                </div>
                <div className="rounded-md border border-primary/20 bg-primary/10 px-2.5 py-1 text-[10px] font-semibold text-primary">
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
            Summary of key metrics and latest performance trends.
          </p>
        </div>

        <Link
          href="/analytics"
          className="inline-flex h-8 shrink-0 items-center justify-center gap-1.5 rounded-lg border border-border bg-card px-2.5 text-sm font-medium whitespace-nowrap text-foreground shadow-sm transition-all outline-none select-none hover:border-primary/35 hover:bg-primary/10"
        >
          Open Revenue Analytics
        </Link>
      </div>

      <DashboardOverview />
    </div>
  );
}
