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
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useConversations } from "../_hooks/useChatQueries";
import { useDebounce } from "../_hooks/useDebounce";
import {
  formatRelativeTime,
  getConversationDisplayName,
  getConversationTypeLabel,
  getMessagePreview,
} from "../_lib/helpers";
import type { TypeFilter } from "../_lib/types";
import { UserAvatar } from "./UserAvatar";

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

  const { data, isLoading, isFetchingNextPage, hasNextPage, fetchNextPage } =
    useConversations({ search: debouncedSearch, typeFilter });

  const conversations = useMemo(
    () => data?.pages.flatMap((page) => page.data) ?? [],
    [data],
  );

  const handleScroll = useCallback(() => {
    const el = listRef.current;
    if (!el || isFetchingNextPage || !hasNextPage) return;

    const { scrollTop, scrollHeight, clientHeight } = el;
    if (scrollHeight - scrollTop - clientHeight < 200) {
      fetchNextPage();
    }
  }, [isFetchingNextPage, hasNextPage, fetchNextPage]);

  return (
    <div className="flex h-full flex-col">
      <div className="space-y-3 border-b border-border/60 p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by username, email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 pr-8"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="size-4" />
            </button>
          )}
        </div>
        <Select
          value={typeFilter}
          onValueChange={(v) => setTypeFilter((v as TypeFilter) ?? "ALL")}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="All types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Conversations</SelectItem>
            <SelectItem value="DIRECT">Direct Messages</SelectItem>
            <SelectItem value="GROUP">Group Chats</SelectItem>
            <SelectItem value="ORDER">Order Chats</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div
        ref={listRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto"
      >
        {isLoading ? (
          <div className="space-y-1 p-2">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 rounded-lg p-3">
                <Skeleton className="size-10 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : conversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-16 text-muted-foreground">
            <MessageSquare className="size-10 opacity-40" />
            <p className="text-sm">No conversations found</p>
          </div>
        ) : (
          <div className="space-y-0.5 p-2">
            {conversations.map((conv) => {
              const isSelected = conv.id === selectedId;
              const displayName = getConversationDisplayName(conv);
              const preview = getMessagePreview(conv.latestMessage);
              const hasBannedUser = conv.participantsPreview.some(
                (p) => p.isBanned,
              );

              return (
                <button
                  key={conv.id}
                  type="button"
                  onClick={() => onSelect(conv.id)}
                  className={cn(
                    "group flex w-full items-start gap-3 rounded-lg p-3 text-left transition-colors",
                    isSelected
                      ? "bg-primary/12 ring-1 ring-primary/25"
                      : "hover:bg-muted/50",
                  )}
                >
                  <div className="relative shrink-0">
                    <UserAvatar
                      src={conv.participantsPreview[0]?.avatar}
                      name={conv.participantsPreview[0]?.username ?? "?"}
                    />
                    {conv.type === "GROUP" && (
                      <div className="absolute -bottom-0.5 -right-0.5 flex size-5 items-center justify-center rounded-full border-2 border-background bg-primary text-[9px] font-bold text-primary-foreground">
                        {conv.participantCount}
                      </div>
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate text-sm font-semibold">
                        {displayName}
                      </span>
                      <span className="shrink-0 text-[11px] text-muted-foreground">
                        {formatRelativeTime(conv.updatedAt)}
                      </span>
                    </div>

                    <p className="mt-0.5 truncate text-xs text-muted-foreground">
                      {conv.latestMessage?.sender && (
                        <span className="font-medium text-foreground/70">
                          {conv.latestMessage.sender.username}:{" "}
                        </span>
                      )}
                      {preview}
                    </p>

                    <div className="mt-1.5 flex items-center gap-2">
                      <Badge
                        variant="outline"
                        className="px-1.5 py-0 text-[10px]"
                      >
                        {getConversationTypeLabel(conv.type)}
                      </Badge>
                      <span className="text-[10px] text-muted-foreground">
                        {conv.messageCount.toLocaleString()} msgs
                      </span>
                      {hasBannedUser && (
                        <ShieldAlert className="size-3.5 text-destructive" />
                      )}
                    </div>
                  </div>
                </button>
              );
            })}

            {isFetchingNextPage && (
              <div className="flex justify-center py-4">
                <Loader2 className="size-5 animate-spin text-muted-foreground" />
              </div>
            )}

            {hasNextPage && !isFetchingNextPage && (
              <button
                type="button"
                onClick={() => fetchNextPage()}
                className="flex w-full items-center justify-center gap-1.5 py-3 text-xs text-muted-foreground hover:text-foreground"
              >
                <ChevronDown className="size-4" />
                Load more
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
