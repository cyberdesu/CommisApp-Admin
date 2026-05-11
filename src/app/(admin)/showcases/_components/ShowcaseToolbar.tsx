"use client";

import { Grid3x3, LayoutList, Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ShowcaseView } from "../_lib/types";

export function ShowcaseToolbar({
  searchInput,
  onSearchInputChange,
  onSearchSubmit,
  view,
  onViewChange,
}: {
  searchInput: string;
  onSearchInputChange: (v: string) => void;
  onSearchSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  view: ShowcaseView;
  onViewChange: (v: ShowcaseView) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <form
        onSubmit={onSearchSubmit}
        className="flex h-9 min-w-[280px] items-center gap-2 rounded-xl border border-border bg-background px-3"
      >
        <Search className="size-3.5 text-muted-foreground" />
        <input
          value={searchInput}
          onChange={(e) => onSearchInputChange(e.target.value)}
          placeholder="Cari title, tag, atau @username…"
          className="h-full w-full min-w-0 flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground/60"
        />
        {searchInput && (
          <button
            type="button"
            onClick={() => onSearchInputChange("")}
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="size-3.5" />
          </button>
        )}
      </form>

      <div className="inline-flex gap-0.5 rounded-xl border border-border bg-background p-[3px]">
        <ToggleButton
          on={view === "GRID"}
          onClick={() => onViewChange("GRID")}
          icon={<Grid3x3 className="size-3.5" />}
          label="Grid"
        />
        <ToggleButton
          on={view === "TABLE"}
          onClick={() => onViewChange("TABLE")}
          icon={<LayoutList className="size-3.5" />}
          label="Table"
        />
      </div>
    </div>
  );
}

function ToggleButton({
  on,
  onClick,
  icon,
  label,
}: {
  on: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-muted-foreground transition",
        on && "bg-card font-semibold text-foreground shadow-sm",
      )}
    >
      {icon}
      {label}
    </button>
  );
}
