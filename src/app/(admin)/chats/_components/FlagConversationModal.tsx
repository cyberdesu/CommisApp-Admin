"use client";

import { ShieldAlert, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export type FlagReason =
  | "HARASSMENT"
  | "NSFW"
  | "OFF_PLATFORM_PAYMENT"
  | "SCAM"
  | "OTHER";

export type FlagSeverity = "LOW" | "MEDIUM" | "HIGH";

export function FlagConversationModal({
  open,
  onOpenChange,
  reason,
  setReason,
  severity,
  setSeverity,
  note,
  setNote,
  onSubmit,
  isSubmitting,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  reason: FlagReason;
  setReason: (r: FlagReason) => void;
  severity: FlagSeverity;
  setSeverity: (s: FlagSeverity) => void;
  note: string;
  setNote: (n: string) => void;
  onSubmit: () => void;
  isSubmitting: boolean;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="w-full max-w-[calc(100%-2rem)] rounded-2xl border border-border bg-card p-0 sm:max-w-[520px]"
        showCloseButton={false}
      >
        <div className="flex items-start justify-between gap-4 border-b border-border/60 px-5 py-4">
          <DialogHeader className="gap-1">
            <div className="flex items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-[0.14em] text-rose-700">
              <ShieldAlert className="size-3" />
              Moderation
            </div>
            <DialogTitle className="text-[16px] font-semibold">
              Flag conversation
            </DialogTitle>
            <DialogDescription className="text-[12.5px] text-muted-foreground">
              Eskalasi ke tim moderasi dan kunci percakapan dari modifikasi
              lebih lanjut.
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

        <div className="space-y-3 px-5 py-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
              Reason
            </label>
            <Select
              value={reason}
              onValueChange={(v) => setReason((v as FlagReason) ?? "HARASSMENT")}
            >
              <SelectTrigger className="h-9 w-full rounded-lg border-border bg-card text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="HARASSMENT">
                  Harassment / abusive language
                </SelectItem>
                <SelectItem value="NSFW">
                  NSFW content shared outside policy
                </SelectItem>
                <SelectItem value="OFF_PLATFORM_PAYMENT">
                  Off-platform payment
                </SelectItem>
                <SelectItem value="SCAM">Scam / impersonation</SelectItem>
                <SelectItem value="OTHER">Other (specify in note)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
              Severity
            </label>
            <Select
              value={severity}
              onValueChange={(v) => setSeverity((v as FlagSeverity) ?? "LOW")}
            >
              <SelectTrigger className="h-9 w-full rounded-lg border-border bg-card text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="LOW">Low — warning only</SelectItem>
                <SelectItem value="MEDIUM">
                  Medium — suspend on next violation
                </SelectItem>
                <SelectItem value="HIGH">
                  High — restrict immediately
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
              Internal note · required
            </label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              maxLength={500}
              placeholder="Konteks untuk reviewer berikutnya…"
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
            disabled={isSubmitting}
            onClick={onSubmit}
            className="inline-flex items-center rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground transition hover:brightness-105 disabled:opacity-50"
          >
            {isSubmitting ? "Flagging…" : "Flag & escalate"}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
