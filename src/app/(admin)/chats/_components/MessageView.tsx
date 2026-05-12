"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  Download,
  Loader2,
  MessageSquare,
  ShieldAlert,
  Trash2,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useMessages } from "../_hooks/useChatQueries";
import {
  formatRelativeTime,
  getConversationTypeLabel,
} from "../_lib/helpers";
import type { ConversationDetail } from "../_lib/types";
import { MessageBubble } from "./MessageBubble";

export function MessageView({
  conversationId,
  onBack,
  onFlag,
  onDetailLoaded,
}: {
  conversationId: string;
  onBack: () => void;
  onFlag: () => void;
  onDetailLoaded?: (detail: ConversationDetail | null) => void;
}) {
  const [includeDeleted, setIncludeDeleted] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const { data, isLoading, isFetchingNextPage, hasNextPage, fetchNextPage } =
    useMessages({ conversationId, includeDeleted });

  const conversation = data?.pages[0]?.data.conversation ?? null;
  const messages = useMemo(
    () => data?.pages.flatMap((page) => page.data.items) ?? [],
    [data],
  );

  useEffect(() => {
    onDetailLoaded?.(conversation);
  }, [conversation, onDetailLoaded]);

  useEffect(() => {
    if (!isLoading && messages.length > 0) {
      messagesEndRef.current?.scrollIntoView({ behavior: "instant" });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading, conversationId]);

  const handleScroll = useCallback(() => {
    const el = containerRef.current;
    if (!el || isFetchingNextPage || !hasNextPage) return;
    if (el.scrollTop < 200) fetchNextPage();
  }, [isFetchingNextPage, hasNextPage, fetchNextPage]);

  if (isLoading) {
    return (
      <div className="flex h-full flex-col">
        <div className="flex h-[57px] items-center gap-3 border-b border-border/60 px-4">
          <button
            type="button"
            className="inline-flex size-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground lg:hidden"
            onClick={onBack}
          >
            <ArrowLeft className="size-4" />
          </button>
          <Skeleton className="h-4 w-48" />
        </div>
        <div className="flex-1 space-y-3 p-5">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className={cn(
                "flex gap-2.5",
                i % 2 === 0 ? "justify-start" : "justify-end",
              )}
            >
              <Skeleton className="size-8 rounded-lg" />
              <Skeleton className="h-14 w-60 rounded-xl" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!conversation) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
        Conversation not found
      </div>
    );
  }

  const typePillClass =
    conversation.type === "DIRECT"
      ? "bg-blue-50 text-blue-800"
      : conversation.type === "GROUP"
        ? "bg-violet-50 text-violet-800"
        : "bg-amber-50 text-amber-900";

  const title =
    conversation.name ??
    conversation.participants
      .slice(0, 3)
      .map((p) => p.user.username)
      .join(", ");

  return (
    <div className="flex h-full min-w-0 flex-col">
      <div className="flex flex-shrink-0 items-center justify-between gap-3 border-b border-border/60 bg-card px-4 py-2.5">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex size-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground lg:hidden"
          >
            <ArrowLeft className="size-4" />
          </button>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h3 className="truncate text-sm font-semibold">{title}</h3>
              <span
                className={cn(
                  "shrink-0 rounded px-1.5 py-0.5 text-[9.5px] font-bold uppercase tracking-wider",
                  typePillClass,
                )}
              >
                {getConversationTypeLabel(conversation.type)}
              </span>
            </div>
            <div className="mt-0.5 flex items-center gap-2 text-[11.5px] text-muted-foreground">
              <span>{conversation.participantCount} participants</span>
              <span className="size-1 rounded-full bg-muted-foreground/60" />
              <span>
                {conversation.messageCount.toLocaleString("en-US")} messages
              </span>
              <span className="size-1 rounded-full bg-muted-foreground/60" />
              <span>Last activity {formatRelativeTime(conversation.updatedAt)}</span>
            </div>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <button
            type="button"
            onClick={() => setIncludeDeleted((v) => !v)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[11.5px] font-medium transition",
              includeDeleted
                ? "border-rose-300/40 bg-rose-50 text-rose-700"
                : "border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-primary",
            )}
          >
            <Trash2 className="size-3" />
            {includeDeleted ? "Hide deleted" : "Show deleted"}
          </button>
          <button
            type="button"
            title="Export"
            className="inline-flex size-7 items-center justify-center rounded-md border border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-primary"
          >
            <Download className="size-3.5" />
          </button>
          <button
            type="button"
            title="Flag conversation"
            onClick={onFlag}
            className="inline-flex size-7 items-center justify-center rounded-md border border-border bg-card text-muted-foreground hover:border-rose-300 hover:text-rose-600"
          >
            <ShieldAlert className="size-3.5" />
          </button>
        </div>
      </div>

      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="flex flex-1 flex-col-reverse overflow-y-auto bg-gradient-to-b from-muted/30 to-card px-5 py-4"
      >
        <div ref={messagesEndRef} />

        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-16 text-muted-foreground">
            <MessageSquare className="size-7 opacity-40" />
            <p className="text-sm">No messages in this conversation</p>
          </div>
        ) : (
          <div className="space-y-3">
            {isFetchingNextPage && (
              <div className="flex justify-center py-2">
                <Loader2 className="size-4 animate-spin text-muted-foreground" />
              </div>
            )}
            {hasNextPage && !isFetchingNextPage && (
              <button
                type="button"
                onClick={() => fetchNextPage()}
                className="flex w-full items-center justify-center gap-1 py-2 text-xs text-muted-foreground hover:text-foreground"
              >
                Load older messages
              </button>
            )}

            {[...messages].reverse().map((msg, i, arr) => {
              const prevMsg = i > 0 ? arr[i - 1] : null;
              const showDate =
                !prevMsg ||
                new Date(msg.createdAt).toDateString() !==
                  new Date(prevMsg.createdAt).toDateString();
              const isSameSender = Boolean(
                prevMsg &&
                  prevMsg.senderId === msg.senderId &&
                  !showDate &&
                  prevMsg.type !== "SYSTEM",
              );

              return (
                <div key={msg.id}>
                  {showDate && (
                    <div className="my-3 flex items-center gap-2.5">
                      <div className="h-px flex-1 bg-border/60" />
                      <span className="text-[10.5px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
                        {new Date(msg.createdAt).toLocaleDateString("en-US", {
                          weekday: "short",
                          month: "short",
                          day: "numeric",
                        })}
                      </span>
                      <div className="h-px flex-1 bg-border/60" />
                    </div>
                  )}

                  <MessageBubble msg={msg} isSameSender={isSameSender} />
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
