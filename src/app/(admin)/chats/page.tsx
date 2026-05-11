"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { MessageSquare } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

import { useAdminRealtime } from "@/hooks/use-admin-realtime";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

import { ChatStats } from "./_components/ChatStats";
import { ConversationList } from "./_components/ConversationList";
import { MessageView } from "./_components/MessageView";

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

      const nextUrl = params.toString()
        ? `/chats?${params.toString()}`
        : "/chats";
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
                  <p className="text-sm font-medium">Select a conversation</p>
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
