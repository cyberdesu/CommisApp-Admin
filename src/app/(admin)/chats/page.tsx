"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { MessageSquare } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { useAdminRealtime } from "@/hooks/use-admin-realtime";
import { cn } from "@/lib/utils";

import { ChatDetailsPane } from "./_components/ChatDetailsPane";
import { ChatHead } from "./_components/ChatHead";
import { ConversationList } from "./_components/ConversationList";
import {
  FlagConversationModal,
  type FlagReason,
  type FlagSeverity,
} from "./_components/FlagConversationModal";
import { MessageView } from "./_components/MessageView";
import { PurgeConversationModal } from "./_components/PurgeConversationModal";
import type { ConversationDetail } from "./_lib/types";

export default function ChatsPage() {
  const queryClient = useQueryClient();
  const router = useRouter();
  const searchParams = useSearchParams();

  const deepLinked = useMemo(() => {
    const v = searchParams.get("conversationId");
    return v?.trim() || null;
  }, [searchParams]);

  const [selected, setSelected] = useState<string | null>(deepLinked);
  const [detail, setDetail] = useState<ConversationDetail | null>(null);

  // Modals
  const [flagOpen, setFlagOpen] = useState(false);
  const [flagReason, setFlagReason] = useState<FlagReason>("HARASSMENT");
  const [flagSeverity, setFlagSeverity] = useState<FlagSeverity>("HIGH");
  const [flagNote, setFlagNote] = useState("");
  const [flagPending, setFlagPending] = useState(false);

  const [purgeOpen, setPurgeOpen] = useState(false);
  const [purgeConfirm, setPurgeConfirm] = useState("");
  const [purgeReason, setPurgeReason] = useState("");
  const [purgePending, setPurgePending] = useState(false);

  useEffect(() => {
    setSelected(deepLinked);
  }, [deepLinked]);

  const syncQuery = useCallback(
    (id: string | null) => {
      const params = new URLSearchParams(searchParams.toString());
      if (id) params.set("conversationId", id);
      else params.delete("conversationId");
      const url = params.toString() ? `/chats?${params.toString()}` : "/chats";
      router.replace(url);
    },
    [router, searchParams],
  );

  const handleSelect = useCallback(
    (id: string) => {
      setSelected(id);
      syncQuery(id);
    },
    [syncQuery],
  );

  const handleBack = useCallback(() => {
    setSelected(null);
    setDetail(null);
    syncQuery(null);
  }, [syncQuery]);

  useAdminRealtime({
    topics: ["chats"],
    onEvent: () => {
      void queryClient.invalidateQueries({ queryKey: ["chat-stats"] });
      void queryClient.invalidateQueries({ queryKey: ["conversations"] });
      if (selected) {
        void queryClient.invalidateQueries({
          queryKey: ["messages", selected],
        });
      }
    },
  });

  function openFlag() {
    setFlagReason("HARASSMENT");
    setFlagSeverity("HIGH");
    setFlagNote("");
    setFlagOpen(true);
  }

  function submitFlag() {
    if (flagNote.trim().length < 3) {
      toast.error("Please add a short internal note");
      return;
    }
    setFlagPending(true);
    setTimeout(() => {
      setFlagPending(false);
      toast.info("Conversation flagged (backend pending)");
      setFlagOpen(false);
    }, 400);
  }

  function openPurge() {
    setPurgeConfirm("");
    setPurgeReason("");
    setPurgeOpen(true);
  }

  function submitPurge() {
    setPurgePending(true);
    setTimeout(() => {
      setPurgePending(false);
      toast.info("Conversation purged (backend pending)");
      setPurgeOpen(false);
    }, 400);
  }

  return (
    <div className="flex flex-col gap-5">
      <ChatHead />

      <section className="grid h-[calc(100vh-280px)] min-h-[520px] grid-cols-1 overflow-hidden rounded-2xl border border-border bg-card lg:grid-cols-[340px_minmax(0,1fr)] xl:grid-cols-[340px_minmax(0,1fr)_320px]">
        {/* Left pane */}
        <div
          className={cn(
            "h-full min-h-0 overflow-hidden border-r border-border/60",
            selected && "hidden lg:block",
          )}
        >
          <ConversationList selectedId={selected} onSelect={handleSelect} />
        </div>

        {/* Mid pane */}
        <div
          className={cn(
            "h-full min-h-0 min-w-0 overflow-hidden",
            !selected && "hidden lg:flex lg:items-center lg:justify-center",
          )}
        >
          {selected ? (
            <MessageView
              key={selected}
              conversationId={selected}
              onBack={handleBack}
              onFlag={openFlag}
              onDetailLoaded={setDetail}
            />
          ) : (
            <EmptyMid />
          )}
        </div>

        {/* Right pane (xl only) */}
        <div className="hidden h-full min-h-0 overflow-hidden border-l border-border/60 xl:block">
          <ChatDetailsPane
            conversation={detail}
            onFlag={openFlag}
            onPurge={openPurge}
          />
        </div>
      </section>

      <FlagConversationModal
        open={flagOpen}
        onOpenChange={setFlagOpen}
        reason={flagReason}
        setReason={setFlagReason}
        severity={flagSeverity}
        setSeverity={setFlagSeverity}
        note={flagNote}
        setNote={setFlagNote}
        onSubmit={submitFlag}
        isSubmitting={flagPending}
      />

      <PurgeConversationModal
        open={purgeOpen}
        onOpenChange={setPurgeOpen}
        messageCount={detail?.messageCount ?? 0}
        confirm={purgeConfirm}
        setConfirm={setPurgeConfirm}
        reason={purgeReason}
        setReason={setPurgeReason}
        onSubmit={submitPurge}
        isSubmitting={purgePending}
      />
    </div>
  );
}

function EmptyMid() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 text-muted-foreground">
      <MessageSquare className="size-10 opacity-30" />
      <div className="text-center">
        <p className="text-sm font-medium">Select a conversation</p>
        <p className="text-xs">Choose from list to view messages</p>
      </div>
    </div>
  );
}
