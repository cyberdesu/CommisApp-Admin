import { cn } from "@/lib/utils";
import { fmtNum } from "../_lib/helpers";

export function FlowLegend({
  label,
  percent,
  amount,
  tone,
}: {
  label: string;
  percent: number;
  amount: string;
  tone: "sky" | "rose" | "emerald";
}) {
  const dot =
    tone === "sky"
      ? "bg-sky-500"
      : tone === "rose"
        ? "bg-rose-500"
        : "bg-emerald-500";
  return (
    <div className="flex flex-col gap-1 rounded-xl border border-border/60 bg-background/60 px-3.5 py-3">
      <div className="flex items-center gap-2">
        <span className={cn("size-2 rounded-full", dot)} />
        <span className="text-[11px] font-semibold uppercase tracking-[0.09em] text-muted-foreground">
          {label}
        </span>
        <span className="ml-auto font-mono text-xs font-semibold tabular-nums text-foreground">
          {percent.toFixed(1)}%
        </span>
      </div>
      <div className="font-mono text-[15px] font-semibold tracking-tight tabular-nums">
        {amount}
      </div>
    </div>
  );
}

export function SyncTile({
  label,
  synced,
  pending,
}: {
  label: string;
  synced: number;
  pending: number;
}) {
  const total = synced + pending;
  const ratio = total > 0 ? (synced / total) * 100 : 0;
  return (
    <div className="rounded-xl border border-border/60 bg-background/60 px-3 py-3">
      <div className="flex items-center justify-between text-[11px] font-semibold text-muted-foreground">
        <span>{label}</span>
        <span className="font-mono tabular-nums">{ratio.toFixed(0)}%</span>
      </div>
      <div className="mt-2 h-1 overflow-hidden rounded-full bg-muted">
        <div
          className={cn(
            "h-full rounded-full",
            pending > 0 ? "bg-amber-500" : "bg-emerald-500",
          )}
          style={{ width: `${ratio}%` }}
        />
      </div>
      <div className="mt-2 flex justify-between text-[11px] text-muted-foreground">
        <span className="font-mono tabular-nums">{fmtNum(synced)} synced</span>
        <span
          className={cn(
            "font-mono tabular-nums",
            pending > 0 ? "text-amber-700" : "",
          )}
        >
          {fmtNum(pending)} pending
        </span>
      </div>
    </div>
  );
}

export function SnapStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <div className="text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
        {label}
      </div>
      <div className="mt-1 truncate font-mono text-[18px] font-semibold tabular-nums">
        {value}
      </div>
    </div>
  );
}
