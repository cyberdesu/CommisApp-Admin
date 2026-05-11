"use client";

import { cn } from "@/lib/utils";
import type { AdminOrderStats } from "@/lib/user-orders.types";
import {
  ADMIN_ORDER_STATUS_OPTIONS,
  type StatusFilter,
} from "../_lib/types";
import { getStatusLabel } from "../_lib/helpers";

export function StatusTabs({
  status,
  onChange,
  stats,
}: {
  status: StatusFilter;
  onChange: (s: StatusFilter) => void;
  stats: AdminOrderStats | undefined;
}) {
  const tabs: Array<{ key: StatusFilter; label: string; count?: number }> = [
    { key: "ALL", label: "All", count: stats?.total },
    ...ADMIN_ORDER_STATUS_OPTIONS.map((s) => ({
      key: s as StatusFilter,
      label: getStatusLabel(s),
    })),
  ];

  return (
    <div className="flex gap-1 overflow-x-auto border-b border-border/60 px-5 py-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {tabs.map((t) => {
        const on = status === t.key;
        return (
          <button
            key={t.key}
            type="button"
            onClick={() => onChange(t.key)}
            className={cn(
              "inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-1.5 text-[12.5px] font-medium transition",
              on
                ? "bg-primary/10 font-semibold text-primary"
                : "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
            )}
          >
            {t.label}
            {typeof t.count === "number" && (
              <span
                className={cn(
                  "rounded-full px-1.5 py-0.5 text-[10.5px] font-semibold",
                  on
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground",
                )}
              >
                {t.count.toLocaleString("en-US")}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
