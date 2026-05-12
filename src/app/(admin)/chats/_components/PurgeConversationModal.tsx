"use client";

import { AlertTriangle, Trash2, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export function PurgeConversationModal({
  open,
  onOpenChange,
  messageCount,
  confirm,
  setConfirm,
  reason,
  setReason,
  onSubmit,
  isSubmitting,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  messageCount: number;
  confirm: string;
  setConfirm: (v: string) => void;
  reason: string;
  setReason: (v: string) => void;
  onSubmit: () => void;
  isSubmitting: boolean;
}) {
  const valid = confirm.trim() === "CONFIRM" && reason.trim().length >= 3;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="w-full max-w-[calc(100%-2rem)] rounded-2xl border border-border bg-card p-0 sm:max-w-[520px]"
        showCloseButton={false}
      >
        <div className="flex items-start justify-between gap-4 border-b border-border/60 px-5 py-4">
          <DialogHeader className="gap-1">
            <div className="flex items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-[0.14em] text-rose-700">
              <Trash2 className="size-3" />
              Destructive action
            </div>
            <DialogTitle className="text-[16px] font-semibold">
              Purge conversation
            </DialogTitle>
            <DialogDescription className="text-[12.5px] text-muted-foreground">
              Hard-delete {messageCount} messages dan attachments. Audit log
              tetap menyimpan referensi metadata.
            </DialogDescription>
          </DialogHeader>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="inline-flex size-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <X className="size-3.5" />
          </button>
        </div>

        <div className="px-5 py-4">
          <div className="mb-3 flex items-start gap-2.5 rounded-lg border border-rose-300/40 bg-rose-50 px-3 py-2.5 text-[12.5px]">
            <AlertTriangle className="mt-0.5 size-4 shrink-0 text-rose-600" />
            <div>
              <p className="font-semibold text-rose-900">
                This cannot be undone
              </p>
              <p className="text-rose-800/80">
                {messageCount} messages dan thread metadata akan dihapus
                permanen. Notifikasi tidak dikirim ke user.
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
              Type CONFIRM to proceed
            </label>
            <input
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="CONFIRM"
              className="rounded-lg border border-border bg-card px-3 py-2 font-mono text-sm outline-none placeholder:text-muted-foreground/60 focus:border-primary"
            />
          </div>
          <div className="mt-3 flex flex-col gap-1.5">
            <label className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
              Reason for audit log
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              maxLength={500}
              placeholder="Why is this conversation being purged…"
              className="rounded-lg border border-border bg-card px-3 py-2 text-sm outline-none placeholder:text-muted-foreground/60 focus:border-primary"
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-border/60 bg-muted/30 px-5 py-3">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="inline-flex items-center rounded-lg px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!valid || isSubmitting}
            onClick={onSubmit}
            className="inline-flex items-center rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:brightness-105 disabled:opacity-50"
          >
            {isSubmitting ? "Purging…" : "Purge permanently"}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
