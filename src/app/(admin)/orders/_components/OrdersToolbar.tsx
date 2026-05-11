"use client";

import { Search } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { AttentionFilter, SourceFilter } from "../_lib/types";

export function OrdersToolbar({
  searchInput,
  onSearchInputChange,
  onSearchSubmit,
  source,
  onSourceChange,
  attention,
  onAttentionChange,
}: {
  searchInput: string;
  onSearchInputChange: (v: string) => void;
  onSearchSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  source: SourceFilter;
  onSourceChange: (v: SourceFilter) => void;
  attention: AttentionFilter;
  onAttentionChange: (v: AttentionFilter) => void;
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
          placeholder="Cari order ID, title, artist, atau client…"
          className="h-full w-full min-w-0 flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground/60"
        />
      </form>

      <Select
        value={source}
        onValueChange={(v) => onSourceChange((v as SourceFilter) ?? "ALL")}
      >
        <SelectTrigger className="h-9 w-[140px] rounded-xl border-border bg-background text-xs">
          <SelectValue placeholder="Source" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="ALL">All sources</SelectItem>
          <SelectItem value="SERVICE">Service</SelectItem>
          <SelectItem value="CUSTOM_REQUEST">Custom request</SelectItem>
        </SelectContent>
      </Select>

      <Select
        value={attention}
        onValueChange={(v) =>
          onAttentionChange((v as AttentionFilter) ?? "ALL")
        }
      >
        <SelectTrigger className="h-9 w-[120px] rounded-xl border-border bg-background text-xs">
          <SelectValue placeholder="Flags" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="ALL">All flags</SelectItem>
          <SelectItem value="FLAGGED">Flagged</SelectItem>
          <SelectItem value="CLEAN">Clean</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
