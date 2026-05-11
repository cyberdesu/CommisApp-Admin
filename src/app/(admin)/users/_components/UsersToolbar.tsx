"use client";

import { Search, SlidersHorizontal, X } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function UsersToolbar({
  searchInput,
  onSearchInputChange,
  onSearchSubmit,
  onClearSearch,
  roleFilter,
  onRoleChange,
  verifiedFilter,
  onVerifiedChange,
  hasActiveFilters,
  onClearAll,
}: {
  searchInput: string;
  onSearchInputChange: (v: string) => void;
  onSearchSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  onClearSearch: () => void;
  roleFilter: string;
  onRoleChange: (v: string) => void;
  verifiedFilter: string;
  onVerifiedChange: (v: string) => void;
  hasActiveFilters: boolean;
  onClearAll: () => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <form
        onSubmit={onSearchSubmit}
        className="flex h-9 min-w-[260px] items-center gap-2 rounded-xl border border-border bg-background px-3"
      >
        <Search className="size-3.5 text-muted-foreground" />
        <input
          value={searchInput}
          onChange={(e) => onSearchInputChange(e.target.value)}
          placeholder="Cari nama, username, atau email…"
          className="h-full w-full min-w-0 flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground/60"
        />
        {searchInput && (
          <button
            type="button"
            onClick={onClearSearch}
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="size-3.5" />
          </button>
        )}
      </form>

      <Select value={roleFilter} onValueChange={(v) => onRoleChange(v ?? "all")}>
        <SelectTrigger className="h-9 w-[124px] rounded-xl border-border bg-background text-xs">
          <SelectValue placeholder="Role" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All roles</SelectItem>
          <SelectItem value="user">User</SelectItem>
          <SelectItem value="artist">Artist</SelectItem>
          <SelectItem value="admin">Admin</SelectItem>
          <SelectItem value="manager">Manager</SelectItem>
        </SelectContent>
      </Select>

      <Select
        value={verifiedFilter}
        onValueChange={(v) => onVerifiedChange(v ?? "all")}
      >
        <SelectTrigger className="h-9 w-[132px] rounded-xl border-border bg-background text-xs">
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All statuses</SelectItem>
          <SelectItem value="true">Verified</SelectItem>
          <SelectItem value="false">Unverified</SelectItem>
        </SelectContent>
      </Select>

      {hasActiveFilters && (
        <button
          type="button"
          onClick={onClearAll}
          className="inline-flex items-center gap-1.5 rounded-xl px-2.5 py-2 text-xs font-medium text-muted-foreground hover:text-foreground"
        >
          <SlidersHorizontal className="size-3.5" />
          Clear
        </button>
      )}
    </div>
  );
}
