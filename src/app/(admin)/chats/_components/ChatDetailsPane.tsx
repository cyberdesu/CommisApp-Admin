"use client";

import {
  AlertTriangle,
  ChevronRight,
  Download,
  Loader2,
  ShieldAlert,
  Ticket,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { formatFullDate, formatRelativeTime } from "../_lib/helpers";
import type { ConversationDetail } from "../_lib/types";
import { UserAvatar } from "./UserAvatar";

export function ChatDetailsPane({
  conversation,
  onFlag,
  onPurge,
  onOpenTicket,
  isOpeningTicket,
}: {
  conversation: ConversationDetail | null;
  onFlag: () => void;
  onPurge: () => void;
  onOpenTicket: () => void;
  isOpeningTicket?: boolean;
}) {
  if (!conversation) {
    return (
      <div className="flex h-full items-center justify-center bg-muted/20 p-6 text-center text-xs text-muted-foreground">
        Select a conversation to view details
      </div>
    );
  }

  const title =
    conversation.name ??
    conversation.participants
      .slice(0, 3)
      .map((p) => p.user.username)
      .join(" ↔ ");

  const bannedCount = conversation.participants.filter(
    (p) => p.user.isBanned,
  ).length;

  return (
    <aside className="flex h-full min-h-0 flex-col overflow-y-auto bg-muted/20">
      <SectionWrap>
        <div className="flex flex-col items-center gap-2 py-1">
          <div className="flex items-center justify-center">
            {conversation.participants.slice(0, 2).map((p, idx) => (
              <div
                key={p.id}
                className={cn(
                  "size-12 overflow-hidden rounded-2xl border-[3px] border-card",
                  idx > 0 && "-ml-3.5",
                )}
              >
                <UserAvatar
                  src={p.user.avatar}
                  name={p.user.username}
                  size="md"
                />
              </div>
            ))}
          </div>
          <div className="text-center text-[13.5px] font-semibold">
            {title}
          </div>
          <div className="text-[11.5px] text-muted-foreground">
            {conversation.type === "DIRECT"
              ? "Direct message"
              : conversation.type === "GROUP"
                ? "Group conversation"
                : "Order conversation"}{" "}
            · started {formatFullDate(conversation.createdAt)}
          </div>
        </div>

        <div className="mt-3 grid grid-cols-3 overflow-hidden rounded-xl border border-border/60 bg-card">
          <Stat label="Messages" value={conversation.messageCount} />
          <Stat label="Participants" value={conversation.participantCount} />
          <Stat label="Banned" value={bannedCount} tone={bannedCount > 0 ? "rose" : undefined} />
        </div>
      </SectionWrap>

      <SectionWrap title="Participants">
        <div className="flex flex-col gap-1.5">
          {conversation.participants.map((p) => (
            <div
              key={p.id}
              className="flex items-center gap-2.5 rounded-lg p-1.5 transition hover:bg-card"
            >
              <UserAvatar
                src={p.user.avatar}
                name={p.user.username}
                size="sm"
              />
              <div className="min-w-0 flex-1">
                <div className="truncate text-[12.5px] font-semibold">
                  {p.user.name ?? p.user.username}
                </div>
                <div className="truncate font-mono text-[11px] text-muted-foreground">
                  @{p.user.username}
                </div>
              </div>
              <span
                className={cn(
                  "shrink-0 rounded border px-1.5 py-0.5 text-[9.5px] font-bold uppercase tracking-wide",
                  p.user.isBanned
                    ? "border-transparent bg-rose-50 text-rose-800"
                    : "border-border bg-card text-muted-foreground",
                )}
              >
                {p.user.isBanned ? "Banned" : "Member"}
              </span>
            </div>
          ))}
        </div>
      </SectionWrap>

      <SectionWrap title="Context">
        <KV
          k="Conversation ID"
          v={
            <span className="font-mono text-[11px]">
              {conversation.id.slice(0, 12)}
            </span>
          }
        />
        <KV
          k="Created"
          v={formatFullDate(conversation.createdAt)}
        />
        <KV
          k="Updated"
          v={formatRelativeTime(conversation.updatedAt)}
        />
        <KV
          k="Encryption"
          v={
            <span className="text-emerald-700">TLS · server stored</span>
          }
        />
      </SectionWrap>

      <SectionWrap title="Moderation">
        <div className="flex flex-col gap-1.5">
          <ModAction
            icon={<ShieldAlert className="size-3.5" />}
            label="Flag conversation"
            onClick={onFlag}
          />
          <ModAction
            icon={
              isOpeningTicket ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Ticket className="size-3.5" />
              )
            }
            label={isOpeningTicket ? "Opening…" : "Open ticket"}
            onClick={onOpenTicket}
          />
          <ModAction
            icon={<Download className="size-3.5" />}
            label="Export transcript"
            onClick={() => toast.info("Export coming soon")}
          />
          <ModAction
            icon={<Trash2 className="size-3.5" />}
            label="Purge conversation"
            onClick={onPurge}
            danger
          />
        </div>

        {bannedCount > 0 && (
          <div className="mt-3 flex items-start gap-2 rounded-lg border border-amber-300/40 bg-amber-50/60 p-2.5">
            <AlertTriangle className="mt-0.5 size-3.5 shrink-0 text-amber-700" />
            <div className="text-[11.5px]">
              <div className="font-semibold text-amber-900">
                {bannedCount} banned participant
                {bannedCount > 1 ? "s" : ""} in thread
              </div>
              <div className="mt-0.5 text-amber-800/80">
                Review participant tab untuk audit.
              </div>
            </div>
          </div>
        )}
      </SectionWrap>
    </aside>
  );
}

function SectionWrap({
  title,
  children,
}: {
  title?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="border-b border-border/60 px-4 py-4 last:border-b-0">
      {title && (
        <h4 className="mb-2.5 text-[10.5px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
          {title}
        </h4>
      )}
      {children}
    </div>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone?: "rose";
}) {
  return (
    <div className="border-r border-border/60 px-2 py-2 text-center last:border-r-0">
      <div
        className={cn(
          "font-mono text-[14px] font-semibold tabular-nums",
          tone === "rose" && "text-rose-700",
        )}
      >
        {value.toLocaleString("en-US")}
      </div>
      <div className="mt-0.5 text-[9.5px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
        {label}
      </div>
    </div>
  );
}

function KV({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-2 border-b border-dashed border-border/40 py-1.5 text-[12px] last:border-b-0">
      <span className="text-muted-foreground">{k}</span>
      <span className="text-right font-medium tabular-nums">{v}</span>
    </div>
  );
}

function ModAction({
  icon,
  label,
  onClick,
  danger,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex items-center gap-2 rounded-lg border border-border/60 bg-card px-2.5 py-2 text-left text-[12.5px] font-medium text-foreground transition hover:border-primary/40 hover:text-primary",
        danger && "hover:border-rose-300 hover:text-rose-600",
      )}
    >
      <span
        className={cn(
          "shrink-0 text-muted-foreground",
          danger && "group-hover:text-rose-600",
        )}
      >
        {icon}
      </span>
      <span className="flex-1">{label}</span>
      <ChevronRight className="size-3 text-muted-foreground/60" />
    </button>
  );
}

