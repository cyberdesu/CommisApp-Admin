"use client";

import { cn } from "@/lib/utils";

type HealthStatus = "ok" | "warn" | "err";

type HealthRow = {
  label: string;
  status: HealthStatus;
  value: React.ReactNode;
};

const ROWS: HealthRow[] = [
  {
    label: "API gateway",
    status: "ok",
    value: (
      <>
        p95 <strong className="font-mono text-foreground">142ms</strong> · 99.98%
      </>
    ),
  },
  {
    label: "Postgres (Prisma)",
    status: "ok",
    value: (
      <>
        p95 <strong className="font-mono text-foreground">38ms</strong> · pool
        12/30
      </>
    ),
  },
  {
    label: "Search index",
    status: "warn",
    value: (
      <>
        <strong className="font-mono text-amber-700">1.4k</strong> docs lag
      </>
    ),
  },
  {
    label: "Media (MinIO + CDN)",
    status: "ok",
    value: (
      <>
        cache hit <strong className="font-mono text-foreground">94%</strong>
      </>
    ),
  },
  {
    label: "Payment provider",
    status: "ok",
    value: (
      <>
        success <strong className="font-mono text-foreground">99.4%</strong>
      </>
    ),
  },
  {
    label: "Background jobs",
    status: "ok",
    value: (
      <>
        queue <strong className="font-mono text-foreground">8</strong> · failed{" "}
        <strong className="font-mono text-foreground">0</strong>
      </>
    ),
  },
];

const LED_CLASS: Record<HealthStatus, string> = {
  ok: "bg-emerald-500",
  warn: "bg-amber-500",
  err: "bg-rose-500",
};

export function SystemHealth() {
  const anyWarn = ROWS.some((r) => r.status === "warn");
  const anyErr = ROWS.some((r) => r.status === "err");
  const statusTag = anyErr
    ? { label: "Degraded", cls: "bg-rose-100 text-rose-800" }
    : anyWarn
      ? { label: "Watch", cls: "bg-amber-100 text-amber-800" }
      : { label: "All systems normal", cls: "bg-emerald-100 text-emerald-800" };

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card">
      <div className="flex items-start justify-between gap-3 border-b border-border/60 px-5 py-4">
        <div>
          <h3 className="text-[14.5px] font-semibold">System health</h3>
          <p className="mt-0.5 text-[12px] text-muted-foreground">
            Infrastruktur dan job queues (static placeholders).
          </p>
        </div>
        <span
          className={cn(
            "inline-flex items-center rounded px-1.5 py-0.5 text-[9.5px] font-bold uppercase tracking-wider",
            statusTag.cls,
          )}
        >
          {statusTag.label}
        </span>
      </div>
      <div className="grid gap-2 px-5 py-4">
        {ROWS.map((row) => (
          <div
            key={row.label}
            className="flex items-center justify-between gap-3 rounded-lg border border-border/60 bg-muted/30 px-3 py-2"
          >
            <div className="flex items-center gap-2 text-[12px] font-medium">
              <span
                className={cn("size-2 rounded-full", LED_CLASS[row.status])}
              />
              {row.label}
            </div>
            <div className="text-[11.5px] text-muted-foreground">
              {row.value}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
