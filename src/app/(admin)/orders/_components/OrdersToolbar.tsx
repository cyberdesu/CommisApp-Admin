"use client";

import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ADMIN_ORDER_STATUS_OPTIONS,
  type AttentionFilter,
  type SourceFilter,
  type StatusFilter,
} from "../_lib/types";

export function OrdersToolbar({
  searchInput,
  onSearchInputChange,
  onSearchSubmit,
  status,
  onStatusChange,
  source,
  onSourceChange,
  attention,
  onAttentionChange,
}: {
  searchInput: string;
  onSearchInputChange: (v: string) => void;
  onSearchSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  status: StatusFilter;
  onStatusChange: (v: StatusFilter) => void;
  source: SourceFilter;
  onSourceChange: (v: SourceFilter) => void;
  attention: AttentionFilter;
  onAttentionChange: (v: AttentionFilter) => void;
}) {
  return (
    <div className="flex w-full flex-col gap-3 xl:w-auto xl:flex-row xl:items-center">
      <form onSubmit={onSearchSubmit} className="flex w-full gap-2 xl:w-80">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-400" />
          <Input
            value={searchInput}
            onChange={(e) => onSearchInputChange(e.target.value)}
            placeholder="Search order ID, title, artist, client..."
            className="h-10 rounded-xl border-zinc-200 bg-zinc-50 pl-9"
          />
        </div>
        <Button
          type="submit"
          className="h-10 rounded-xl bg-orange-600 px-4 text-white hover:bg-orange-700"
        >
          Search
        </Button>
      </form>

      <div className="flex flex-col gap-2 sm:flex-row">
        <Select
          value={status}
          onValueChange={(v) => onStatusChange((v as StatusFilter) ?? "ALL")}
        >
          <SelectTrigger className="h-10 w-full rounded-xl border-zinc-200 bg-zinc-50 sm:w-[170px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent className="rounded-xl border-zinc-200 bg-white">
            <SelectItem value="ALL">All Statuses</SelectItem>
            {ADMIN_ORDER_STATUS_OPTIONS.map((item) => (
              <SelectItem key={item} value={item}>
                {item}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={source}
          onValueChange={(v) => onSourceChange((v as SourceFilter) ?? "ALL")}
        >
          <SelectTrigger className="h-10 w-full rounded-xl border-zinc-200 bg-zinc-50 sm:w-[170px]">
            <SelectValue placeholder="Source" />
          </SelectTrigger>
          <SelectContent className="rounded-xl border-zinc-200 bg-white">
            <SelectItem value="ALL">All Sources</SelectItem>
            <SelectItem value="SERVICE">Service</SelectItem>
            <SelectItem value="CUSTOM_REQUEST">Custom Request</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={attention}
          onValueChange={(v) =>
            onAttentionChange((v as AttentionFilter) ?? "ALL")
          }
        >
          <SelectTrigger className="h-10 w-full rounded-xl border-zinc-200 bg-zinc-50 sm:w-[170px]">
            <SelectValue placeholder="Attention" />
          </SelectTrigger>
          <SelectContent className="rounded-xl border-zinc-200 bg-white">
            <SelectItem value="ALL">All Orders</SelectItem>
            <SelectItem value="FLAGGED">Flagged</SelectItem>
            <SelectItem value="CLEAN">Clean</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
