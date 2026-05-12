"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import {
  ChevronDown,
  Loader2,
  MessageSquare,
  Search,
  ShieldAlert,
  X,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useChatStats, useConversations } from "../_hooks/useChatQueries";
import { useDebounce } from "../_hooks/useDebounce";
import {
  formatRelativeTime,
  getConversationDisplayName,
  getConversationTypeLabel,
  getMessagePreview,
} from "../_lib/helpers";
import type { TypeFilter } from "../_lib/types";
import { UserAvatar } from "./UserAvatar";

const FILTERS: Array<{ key: TypeFilter; label: string }> = [
  { key: "ALL", label: "All" },
  { key: "DIRECT", label: "DM" },
  { key: "GROUP", label: "Group" },
  { key: "ORDER", label: "Order" },
];

export function ConversationList({
  selectedId,
  onSelect,
}: {
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("ALL");
  const debouncedSearch = useDebounce(search, 300);
  const listRef = useRef<HTMLDivElement>(null);

  const { data: stats } = useChatStats();
  const { data, isLoading, isFetchingNextPage, hasNextPage, fetchNextPage } =
    useConversations({ search: debouncedSearch, typeFilter });

  const conversations = useMemo(
    () => data?.pages.flatMap((page) => page.data) ?? [],
    [data],
  );

  const counts: Record<TypeFilter, number | undefined> = {
    ALL: stats?.totalConversations,
    DIRECT: stats?.totalDirect,
    GROUP: stats?.totalGroup,
    ORDER:
      stats &&
      stats.totalConversations - (stats.totalDirect + stats.totalGroup) >= 0
        ? stats.totalConversations -
          (stats.totalDirect + stats.totalGroup)
        : undefined,
  };

  const handleScroll = useCallback(() => {
    const el = listRef.current;
    if (!el || isFetchingNextPage || !hasNextPage) return;

    const { scrollTop, scrollHeight, clientHeight } = el;
    if (scrollHeight - scrollTop - clientHeight < 200) {
      fetchNextPage();
    }
  }, [isFetchingNextPage, hasNextPage, fetchNextPage]);

  return (
    <div className="flex h-full flex-col bg-muted/30">
      <div className="flex flex-col gap-2.5 border-b border-border/60 p-3.5">
        <div className="flex h-9 items-center gap-2 rounded-lg border border-border bg-card px-2.5">
          <Search className="size-3.5 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search username, message, or order…"
            className="h-full w-full min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground/60"
          />
          {search ? (
            <button
              type="button"
              onClick={() => setSearch("")}
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="size-3" />
            </button>
          ) : (
            <span className="font-mono text-[10px] text-muted-foreground/70">
              ⌘K
            </span>
          )}
        </div>

        <div className="flex gap-0.5 rounded-lg border border-border bg-card p-[3px]">
          {FILTERS.map((f) => {
            const on = typeFilter === f.key;
            const count = counts[f.key];
            return (
              <button
                key={f.key}
                type="button"
                onClick={() => setTypeFilter(f.key)}
                className={cn(
                  "flex flex-1 items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-[11.5px] font-semibold text-muted-foreground transition",
                  on && "bg-primary/12 text-primary",
                )}
              >
                {f.label}
                {typeof count === "number" && (
                  <span className="text-[10px] font-normal opacity-75">
                    {count.toLocaleString("en-US")}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div
        ref={listRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto p-1.5"
      >
        {isLoading ? (
          <div className="space-y-1 p-1">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="flex items-start gap-2.5 rounded-lg p-2.5">
                <Skeleton className="size-9 shrink-0 rounded-lg" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-3.5 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : conversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-16 text-muted-foreground">
            <MessageSquare className="size-9 opacity-40" />
            <p className="text-sm">No conversations found</p>
          </div>
        ) : (
          <>
            {conversations.map((conv) => {
              const isSelected = conv.id === selectedId;
              const displayName = getConversationDisplayName(conv);
              const preview = getMessagePreview(conv.latestMessage);
              const hasBanned = conv.participantsPreview.some((p) => p.isBanned);

              return (
                <button
                  key={conv.id}
                  type="button"
                  onClick={() => onSelect(conv.id)}
                  className={cn(
                    "relative flex w-full items-start gap-2.5 rounded-lg p-2.5 text-left transition",
                    isSelected
                      ? "bg-primary/12 shadow-[inset_2px_0_0_var(--primary)]"
                      : "hover:bg-card/70",
                  )}
                >
                  <UserAvatar
                    src={conv.participantsPreview[0]?.avatar}
                    name={conv.participantsPreview[0]?.username ?? "?"}
                    size="sm"
                  />

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-1.5">
                      <span className="truncate text-[13px] font-semibold">
                        {displayName}
                      </span>
                      <span className="shrink-0 text-[10.5px] tabular-nums text-muted-foreground">
                        {formatRelativeTime(conv.updatedAt)}
                      </span>
                    </div>

                    <p className="mt-0.5 truncate text-[12px] text-muted-foreground">
                      {conv.latestMessage?.sender && (
                        <span className="font-medium text-foreground/80">
                          {conv.latestMessage.sender.username}:{" "}
                        </span>
                      )}
                      {preview}
                    </p>

                    <div className="mt-1 flex items-center gap-2 text-[10.5px] text-muted-foreground">
                      <TypePill type={conv.type} />
                      <span>{conv.messageCount.toLocaleString()} msgs</span>
                      {hasBanned && (
                        <span className="inline-flex items-center text-rose-600">
                          <ShieldAlert className="size-3" />
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}

            {isFetchingNextPage && (
              <div className="flex justify-center py-3">
                <Loader2 className="size-4 animate-spin text-muted-foreground" />
              </div>
            )}

            {hasNextPage && !isFetchingNextPage && (
              <button
                type="button"
                onClick={() => fetchNextPage()}
                className="flex w-full items-center justify-center gap-1.5 py-2.5 text-xs text-muted-foreground hover:text-foreground"
              >
                <ChevronDown className="size-3.5" />
                Load more
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function TypePill({ type }: { type: "DIRECT" | "GROUP" | "ORDER" }) {
  const styles: Record<string, string> = {
    DIRECT: "bg-blue-50 text-blue-800",
    GROUP: "bg-violet-50 text-violet-800",
    ORDER: "bg-amber-50 text-amber-900",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center rounded px-1.5 py-0.5 text-[9.5px] font-bold uppercase tracking-wide",
        styles[type],
      )}
    >
      {getConversationTypeLabel(type)}
    </span>
  );
}
