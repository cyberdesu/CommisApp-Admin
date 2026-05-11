"use client";

import { cn } from "@/lib/utils";
import { matchesTab, tabLabel } from "../_lib/helpers";
import type { ShowcaseItem, ShowcaseTab } from "../_lib/types";

const TABS: ShowcaseTab[] = [
  "ALL",
  "PUBLISHED",
  "DRAFTS",
  "COMMISSION",
  "MATURE",
  "VERIFIED",
];

export function ShowcaseTabs({
  tab,
  onChange,
  items,
}: {
  tab: ShowcaseTab;
  onChange: (t: ShowcaseTab) => void;
  items: ShowcaseItem[];
}) {
  return (
    <div className="inline-flex flex-wrap gap-1 rounded-xl border border-border bg-background p-[5px]">
      {TABS.map((t) => {
        const on = tab === t;
        const count = items.filter((it) => matchesTab(it, t)).length;
        return (
          <button
            key={t}
            type="button"
            onClick={() => onChange(t)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-muted-foreground transition",
              on && "bg-card font-semibold text-foreground shadow-sm",
            )}
          >
            {tabLabel(t)}
            <span
              className={cn(
                "font-mono text-[11px] tabular-nums",
                on ? "text-primary" : "text-muted-foreground/70",
              )}
            >
              {count}
            </span>
          </button>
        );
      })}
    </div>
  );
}
