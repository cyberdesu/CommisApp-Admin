import { cn } from "@/lib/utils";

export function DetailRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-0.5 text-[11.5px] text-muted-foreground">
      <span>{label}</span>
      <span className="break-words text-[12.5px] font-medium text-foreground">
        {children}
      </span>
    </div>
  );
}

export function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h4 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
      {children}
    </h4>
  );
}

export function StatCell({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "emerald";
}) {
  return (
    <div className="rounded-lg border border-border/60 bg-muted/30 px-3 py-2.5">
      <div className="text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
        {label}
      </div>
      <div
        className={cn(
          "mt-1 font-mono text-[15px] font-semibold tabular-nums",
          tone === "emerald" && "text-emerald-700",
        )}
      >
        {value}
      </div>
    </div>
  );
}

export function ActivityRow({
  tone,
  title,
  ts,
  amount,
  amountTone,
}: {
  tone: "em" | "rs" | "am";
  title: string;
  ts: string;
  amount?: string;
  amountTone?: "emerald" | "rose";
}) {
  const dotClass =
    tone === "em"
      ? "bg-emerald-500"
      : tone === "rs"
        ? "bg-rose-500"
        : "bg-amber-500";
  return (
    <div className="flex items-center gap-3 py-2.5">
      <span className={cn("size-2 shrink-0 rounded-full", dotClass)} />
      <div className="min-w-0 flex-1">
        <div className="truncate text-[12.5px] font-medium">{title}</div>
        <div className="text-[11.5px] text-muted-foreground">{ts}</div>
      </div>
      {amount && (
        <span
          className={cn(
            "font-mono text-[12.5px] font-semibold tabular-nums",
            amountTone === "emerald" && "text-emerald-700",
            amountTone === "rose" && "text-rose-700",
          )}
        >
          {amount}
        </span>
      )}
    </div>
  );
}

export function FormField({
  label,
  value,
  onChange,
  full,
  multiline,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  full?: boolean;
  multiline?: boolean;
}) {
  return (
    <div className={cn("flex flex-col gap-1.5", full && "sm:col-span-2")}>
      <label className="text-[11.5px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
        {label}
      </label>
      {multiline ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={3}
          className="resize-none rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
        />
      ) : (
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-9 rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-primary"
        />
      )}
    </div>
  );
}

export function ToggleRow({
  label,
  sub,
  on,
  onChange,
}: {
  label: string;
  sub: string;
  on: boolean;
  onChange: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-border/60 bg-muted/30 px-3 py-2.5">
      <div className="min-w-0">
        <div className="text-[13px] font-medium">{label}</div>
        <div className="text-[11.5px] text-muted-foreground">{sub}</div>
      </div>
      <button
        type="button"
        onClick={onChange}
        className={cn(
          "relative inline-flex h-5 w-9 shrink-0 rounded-full transition",
          on ? "bg-primary" : "bg-muted",
        )}
      >
        <span
          className={cn(
            "absolute top-[2px] inline-block size-4 rounded-full bg-white shadow transition",
            on ? "left-[18px]" : "left-[2px]",
          )}
        />
      </button>
    </div>
  );
}
