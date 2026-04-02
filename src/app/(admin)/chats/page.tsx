"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  ChevronDown,
  ImageIcon,
  Loader2,
  MessageSquare,
  Search,
  ShieldAlert,
  Trash2,
  Users,
  X,
} from "lucide-react";
import {
  keepPreviousData,
  useInfiniteQuery,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import { apiClient } from "@/lib/api/client";
import { useAdminRealtime } from "@/hooks/use-admin-realtime";
import { sanitizeImageSource } from "@/lib/security/url-safety";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";

// ─── Types ───────────────────────────────────────────────────────────────────

type ParticipantUser = {
  id: number;
  username: string;
  name: string | null;
  email: string;
  avatar: string | null;
  isBanned: boolean;
  suspendedUntil: string | null;
};

type LatestMessage = {
  id: string;
  type: "TEXT" | "IMAGE" | "SYSTEM";
  content: string | null;
  fileUrl: string | null;
  isDeleted: boolean;
  createdAt: string;
  senderId: number | null;
  sender: {
    id: number;
    username: string;
    name: string | null;
  } | null;
};

type ConversationItem = {
  id: string;
  type: "DIRECT" | "GROUP" | "ORDER";
  name: string | null;
  createdAt: string;
  updatedAt: string;
  participantCount: number;
  messageCount: number;
  participantsPreview: ParticipantUser[];
  latestMessage: LatestMessage | null;
};

type ConversationsResponse = {
  data: ConversationItem[];
  meta: {
    limit: number;
    hasNextPage: boolean;
    nextCursor: string | null;
    cursor: string | null;
  };
  filters: {
    search: string;
    type: string;
  };
};

type MessageSender = {
  id: number;
  username: string;
  name: string | null;
  avatar: string | null;
};

type MessageItem = {
  id: string;
  conversationId: string;
  senderId: number | null;
  type: "TEXT" | "IMAGE" | "SYSTEM";
  content: string | null;
  fileUrl: string | null;
  fileName: string | null;
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
  sender: MessageSender | null;
};

type ConversationDetail = {
  id: string;
  type: "DIRECT" | "GROUP" | "ORDER";
  name: string | null;
  createdAt: string;
  updatedAt: string;
  participantCount: number;
  messageCount: number;
  participants: Array<{
    id: string;
    joinedAt: string;
    user: ParticipantUser;
  }>;
};

type MessagesResponse = {
  data: {
    conversation: ConversationDetail;
    items: MessageItem[];
  };
  meta: {
    limit: number;
    hasNextPage: boolean;
    nextCursor: string | null;
    cursor: string | null;
    includeDeleted: boolean;
  };
};

type StatsResponse = {
  data: {
    totalConversations: number;
    totalMessages: number;
    activeToday: number;
    totalDirect: number;
    totalGroup: number;
  };
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

function formatRelativeTime(dateStr: string) {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60_000);
  const diffHours = Math.floor(diffMs / 3_600_000);
  const diffDays = Math.floor(diffMs / 86_400_000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function formatFullDate(dateStr: string) {
  return new Date(dateStr).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getMessagePreview(msg: LatestMessage | null): string {
  if (!msg) return "No messages yet";
  if (msg.isDeleted) return "Message deleted";
  if (msg.type === "IMAGE") return "Sent an image";
  if (msg.type === "SYSTEM") return msg.content ?? "System message";
  return msg.content ?? "";
}

function getConversationDisplayName(conv: ConversationItem): string {
  if (conv.name) return conv.name;
  if (conv.participantsPreview.length === 0) return "Empty conversation";
  return conv.participantsPreview
    .slice(0, 3)
    .map((p) => p.username)
    .join(", ");
}

function getConversationTypeLabel(type: ConversationItem["type"]) {
  switch (type) {
    case "DIRECT":
      return "DM";
    case "GROUP":
      return "Group";
    case "ORDER":
      return "Order";
  }
}

// ─── Avatar ──────────────────────────────────────────────────────────────────

function UserAvatar({
  src,
  name,
  size = "md",
}: {
  src?: string | null;
  name: string;
  size?: "sm" | "md";
}) {
  const safeSrc = sanitizeImageSource(src);
  const sizeClass = size === "sm" ? "size-8" : "size-10";
  const textClass = size === "sm" ? "text-[10px]" : "text-xs";

  if (safeSrc) {
    return (
      <img
        src={safeSrc}
        alt={name}
        className={cn(sizeClass, "shrink-0 rounded-full object-cover")}
        loading="lazy"
        decoding="async"
      />
    );
  }

  return (
    <div
      className={cn(
        sizeClass,
        "flex shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary",
        textClass,
        "font-bold uppercase",
      )}
    >
      {name.charAt(0)}
    </div>
  );
}

// ─── Stats Cards ─────────────────────────────────────────────────────────────

function ChatStats() {
  const { data, isLoading } = useQuery({
    queryKey: ["chat-stats"],
    queryFn: async () => {
      const res = await apiClient.get<StatsResponse>("/chats/stats");
      return res.data.data;
    },
    staleTime: 15_000,
  });

  const stats = [
    {
      label: "Total Conversations",
      value: data?.totalConversations ?? 0,
      icon: MessageSquare,
    },
    {
      label: "Total Messages",
      value: data?.totalMessages ?? 0,
      icon: MessageSquare,
    },
    {
      label: "Active Today",
      value: data?.activeToday ?? 0,
      icon: Users,
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      {stats.map((stat) => (
        <Card key={stat.label} className="border-border/60">
          <CardContent className="flex items-center gap-4 p-4">
            <div className="flex size-11 items-center justify-center rounded-xl bg-primary/10">
              <stat.icon className="size-5 text-primary" />
            </div>
            <div>
              {isLoading ? (
                <Skeleton className="mb-1 h-6 w-16" />
              ) : (
                <p className="text-xl font-bold tabular-nums">
                  {stat.value.toLocaleString()}
                </p>
              )}
              <p className="text-xs text-muted-foreground">{stat.label}</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// ─── Conversation List ───────────────────────────────────────────────────────

function ConversationList({
  selectedId,
  onSelect,
}: {
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<
    "ALL" | "DIRECT" | "GROUP" | "ORDER"
  >("ALL");
  const debouncedSearch = useDebounce(search, 300);
  const listRef = useRef<HTMLDivElement>(null);

  const {
    data,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
  } = useInfiniteQuery({
    queryKey: ["conversations", debouncedSearch, typeFilter],
    queryFn: async ({ pageParam }) => {
      const params: Record<string, string> = { limit: "20" };
      if (pageParam) params.cursor = pageParam;
      if (debouncedSearch) params.search = debouncedSearch;
      if (typeFilter !== "ALL") params.type = typeFilter;

      const res = await apiClient.get<ConversationsResponse>(
        "/chats/conversations",
        { params },
      );
      return res.data;
    },
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.meta.nextCursor,
    placeholderData: keepPreviousData,
    staleTime: 10_000,
  });

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
      {/* Search & Filters */}
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
          onValueChange={(v) =>
            setTypeFilter(v as "ALL" | "DIRECT" | "GROUP" | "ORDER")
          }
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

      {/* List */}
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
                  {/* Avatar stack */}
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

// ─── Message View ────────────────────────────────────────────────────────────

function MessageView({
  conversationId,
  onBack,
}: {
  conversationId: string;
  onBack: () => void;
}) {
  const [includeDeleted, setIncludeDeleted] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const {
    data,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
  } = useInfiniteQuery({
    queryKey: ["messages", conversationId, includeDeleted],
    queryFn: async ({ pageParam }) => {
      const params: Record<string, string> = { limit: "40" };
      if (pageParam) params.cursor = pageParam;
      if (includeDeleted) params.includeDeleted = "true";

      const res = await apiClient.get<MessagesResponse>(
        `/chats/conversations/${conversationId}/messages`,
        { params },
      );
      return res.data;
    },
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.meta.nextCursor,
    staleTime: 10_000,
  });

  const conversation = data?.pages[0]?.data.conversation ?? null;
  const messages = useMemo(
    () => data?.pages.flatMap((page) => page.data.items) ?? [],
    [data],
  );

  // Scroll to bottom on initial load
  useEffect(() => {
    if (!isLoading && messages.length > 0) {
      messagesEndRef.current?.scrollIntoView({ behavior: "instant" });
    }
  }, [isLoading, conversationId]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleScroll = useCallback(() => {
    const el = containerRef.current;
    if (!el || isFetchingNextPage || !hasNextPage) return;

    // Load more when scrolled near the top (messages are reversed)
    if (el.scrollTop < 200) {
      fetchNextPage();
    }
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
      {/* Header */}
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
              <span>
                {conversation.participantCount} participants
              </span>
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

      {/* Participants bar */}
      <div className="flex items-center gap-2 overflow-x-auto border-b border-border/40 px-4 py-2">
        {conversation.participants.map((p) => (
          <div
            key={p.id}
            className="flex shrink-0 items-center gap-1.5 rounded-full border border-border/60 bg-muted/30 px-2 py-1"
          >
            <UserAvatar
              src={p.user.avatar}
              name={p.user.username}
              size="sm"
            />
            <span className="text-xs font-medium">{p.user.username}</span>
            {p.user.isBanned && (
              <ShieldAlert className="size-3 text-destructive" />
            )}
          </div>
        ))}
      </div>

      {/* Messages */}
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
            {/* Load more indicator at top */}
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

            {/* Messages rendered oldest-first */}
            {[...messages].reverse().map((msg, i, arr) => {
              const isSystem = msg.type === "SYSTEM";
              const prevMsg = i > 0 ? arr[i - 1] : null;
              const showDate =
                !prevMsg ||
                new Date(msg.createdAt).toDateString() !==
                  new Date(prevMsg.createdAt).toDateString();
              const isSameSender =
                prevMsg &&
                prevMsg.senderId === msg.senderId &&
                !showDate &&
                prevMsg.type !== "SYSTEM";

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

                  {isSystem ? (
                    <div className="flex justify-center py-1">
                      <span className="rounded-full bg-muted/60 px-3 py-1 text-xs text-muted-foreground">
                        {msg.content}
                      </span>
                    </div>
                  ) : (
                    <div
                      className={cn(
                        "group flex items-start gap-2.5",
                        msg.isDeleted && "opacity-50",
                      )}
                    >
                      {!isSameSender ? (
                        <UserAvatar
                          src={msg.sender?.avatar}
                          name={msg.sender?.username ?? "?"}
                          size="sm"
                        />
                      ) : (
                        <div className="w-8 shrink-0" />
                      )}

                      <div className="min-w-0 max-w-[75%]">
                        {!isSameSender && (
                          <div className="mb-0.5 flex items-center gap-2">
                            <span className="text-xs font-semibold">
                              {msg.sender?.username ?? "Deleted user"}
                            </span>
                            <span className="text-[10px] text-muted-foreground">
                              {formatFullDate(msg.createdAt)}
                            </span>
                          </div>
                        )}

                        <div
                          className={cn(
                            "rounded-xl px-3 py-2",
                            msg.isDeleted
                              ? "border border-destructive/20 bg-destructive/5"
                              : "bg-muted/50",
                          )}
                        >
                          {msg.isDeleted ? (
                            <p className="flex items-center gap-1.5 text-xs italic text-destructive/70">
                              <Trash2 className="size-3" />
                              This message was deleted
                            </p>
                          ) : msg.type === "IMAGE" ? (
                            <div className="space-y-1">
                              {msg.fileUrl && (
                                <img
                                  src={
                                    sanitizeImageSource(msg.fileUrl) ?? undefined
                                  }
                                  alt={msg.fileName ?? "Image"}
                                  className="max-h-60 max-w-full rounded-lg object-contain"
                                  loading="lazy"
                                  decoding="async"
                                />
                              )}
                              {msg.content && (
                                <p className="text-sm">{msg.content}</p>
                              )}
                              {!msg.fileUrl && (
                                <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                  <ImageIcon className="size-3" />
                                  Image unavailable
                                </p>
                              )}
                            </div>
                          ) : (
                            <p className="whitespace-pre-wrap break-words text-sm">
                              {msg.content}
                            </p>
                          )}
                        </div>

                        {/* Timestamp on hover for grouped messages */}
                        {isSameSender && (
                          <span className="mt-0.5 hidden text-[10px] text-muted-foreground group-hover:inline-block">
                            {formatFullDate(msg.createdAt)}
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function ChatsPage() {
  const queryClient = useQueryClient();
  const router = useRouter();
  const searchParams = useSearchParams();
  const deepLinkedConversationId = useMemo(() => {
    const value = searchParams.get("conversationId");
    return value?.trim() || null;
  }, [searchParams]);
  const [selectedConversation, setSelectedConversation] = useState<
    string | null
  >(deepLinkedConversationId);

  useEffect(() => {
    setSelectedConversation(deepLinkedConversationId);
  }, [deepLinkedConversationId]);

  const syncConversationQuery = useCallback(
    (conversationId: string | null) => {
      const params = new URLSearchParams(searchParams.toString());

      if (conversationId) {
        params.set("conversationId", conversationId);
      } else {
        params.delete("conversationId");
      }

      const nextUrl = params.toString() ? `/chats?${params.toString()}` : "/chats";
      router.replace(nextUrl);
    },
    [router, searchParams],
  );

  const handleSelectConversation = useCallback(
    (conversationId: string) => {
      setSelectedConversation(conversationId);
      syncConversationQuery(conversationId);
    },
    [syncConversationQuery],
  );

  const handleBack = useCallback(() => {
    setSelectedConversation(null);
    syncConversationQuery(null);
  }, [syncConversationQuery]);

  useAdminRealtime({
    topics: ["chats"],
    onEvent: () => {
      void queryClient.invalidateQueries({ queryKey: ["chat-stats"] });
      void queryClient.invalidateQueries({ queryKey: ["conversations"] });

      if (selectedConversation) {
        void queryClient.invalidateQueries({
          queryKey: ["messages", selectedConversation],
        });
      }
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Chat Monitoring</h2>
        <p className="text-sm text-muted-foreground">
          Monitor all user conversations across the platform
        </p>
      </div>

      <ChatStats />

      <Card className="overflow-hidden border-border/60">
        <div className="flex h-[calc(100vh-340px)] min-h-[500px]">
          {/* Conversation list - always visible on desktop, toggled on mobile */}
          <div
            className={cn(
              "w-full border-r border-border/60 lg:w-[380px] lg:shrink-0",
              selectedConversation && "hidden lg:flex lg:flex-col",
              !selectedConversation && "flex flex-col",
            )}
          >
            <ConversationList
              selectedId={selectedConversation}
              onSelect={handleSelectConversation}
            />
          </div>

          {/* Message view */}
          <div
            className={cn(
              "min-w-0 flex-1",
              !selectedConversation && "hidden lg:flex",
              selectedConversation && "flex",
            )}
          >
            {selectedConversation ? (
              <MessageView
                key={selectedConversation}
                conversationId={selectedConversation}
                onBack={handleBack}
              />
            ) : (
              <div className="flex h-full flex-col items-center justify-center gap-3 text-muted-foreground">
                <MessageSquare className="size-12 opacity-30" />
                <div className="text-center">
                  <p className="text-sm font-medium">
                    Select a conversation
                  </p>
                  <p className="text-xs">
                    Choose a conversation from the list to view messages
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
}
