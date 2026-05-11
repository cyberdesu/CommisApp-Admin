"use client";

import { ImageIcon, Trash2 } from "lucide-react";
import { resolveMediaUrl } from "@/lib/media";
import { cn } from "@/lib/utils";
import { formatFullDate } from "../_lib/helpers";
import type { MessageItem } from "../_lib/types";
import { UserAvatar } from "./UserAvatar";

export function MessageBubble({
  msg,
  isSameSender,
}: {
  msg: MessageItem;
  isSameSender: boolean;
}) {
  if (msg.type === "SYSTEM") {
    return (
      <div className="flex justify-center py-1">
        <span className="rounded-full bg-muted/60 px-3 py-1 text-xs text-muted-foreground">
          {msg.content}
        </span>
      </div>
    );
  }

  return (
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
                  src={resolveMediaUrl(msg.fileUrl) ?? undefined}
                  alt={msg.fileName ?? "Image"}
                  className="max-h-60 max-w-full rounded-lg object-contain"
                  loading="lazy"
                  decoding="async"
                />
              )}
              {msg.content && <p className="text-sm">{msg.content}</p>}
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

        {isSameSender && (
          <span className="mt-0.5 hidden text-[10px] text-muted-foreground group-hover:inline-block">
            {formatFullDate(msg.createdAt)}
          </span>
        )}
      </div>
    </div>
  );
}
