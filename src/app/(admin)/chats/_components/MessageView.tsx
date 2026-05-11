"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  Loader2,
  MessageSquare,
  ShieldAlert,
  Trash2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useMessages } from "../_hooks/useChatQueries";
import { getConversationTypeLabel } from "../_lib/helpers";
import { MessageBubble } from "./MessageBubble";
import { UserAvatar } from "./UserAvatar";

export function MessageView({
  conversationId,
  onBack,
}: {
  conversationId: string;
  onBack: () => void;
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
        <div className="flex items-center gap-3 border-b border-border/60 p-4">
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={onBack}
          >
            <ArrowLeft className="size-5" />
          </Button>
          <Skeleton className="h-5 w-48" />
        </div>
        <div className="flex-1 space-y-4 p-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className={cn(
                "flex gap-3",
                i % 2 === 0 ? "justify-start" : "justify-end",
              )}
            >
              <Skeleton className="size-8 rounded-full" />
              <Skeleton className="h-16 w-64 rounded-xl" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!conversation) {
    return (
      <div className="flex h-full items-center justify-center text-muted-foreground">
        Conversation not found
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between gap-3 border-b border-border/60 p-4">
        <div className="flex min-w-0 items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            className="shrink-0 lg:hidden"
            onClick={onBack}
          >
            <ArrowLeft className="size-5" />
          </Button>
          <div className="min-w-0">
            <h3 className="truncate text-sm font-semibold">
              {conversation.name ??
                conversation.participants
                  .slice(0, 3)
                  .map((p) => p.user.username)
                  .join(", ")}
            </h3>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Badge variant="outline" className="px-1.5 py-0 text-[10px]">
                {getConversationTypeLabel(conversation.type)}
              </Badge>
              <span>{conversation.participantCount} participants</span>
              <span>
                {conversation.messageCount.toLocaleString()} messages
              </span>
            </div>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIncludeDeleted((prev) => !prev)}
          className={cn(
            "text-xs",
            includeDeleted && "border-destructive/30 text-destructive",
          )}
        >
          <Trash2 className="mr-1.5 size-3.5" />
          {includeDeleted ? "Hiding deleted" : "Show deleted"}
        </Button>
      </div>

      <div className="flex items-center gap-2 overflow-x-auto border-b border-border/40 px-4 py-2">
        {conversation.participants.map((p) => (
          <div
            key={p.id}
            className="flex shrink-0 items-center gap-1.5 rounded-full border border-border/60 bg-muted/30 px-2 py-1"
          >
            <UserAvatar src={p.user.avatar} name={p.user.username} size="sm" />
            <span className="text-xs font-medium">{p.user.username}</span>
            {p.user.isBanned && (
              <ShieldAlert className="size-3 text-destructive" />
            )}
          </div>
        ))}
      </div>

      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="flex flex-1 flex-col-reverse overflow-y-auto p-4"
      >
        <div ref={messagesEndRef} />

        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-16 text-muted-foreground">
            <MessageSquare className="size-8 opacity-40" />
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
                    <div className="my-4 flex items-center gap-3">
                      <div className="h-px flex-1 bg-border/60" />
                      <span className="text-[11px] font-medium text-muted-foreground">
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
