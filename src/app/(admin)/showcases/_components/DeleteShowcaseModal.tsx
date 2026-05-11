"use client";

import { AlertTriangle, Trash2, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { compactNumber } from "../_lib/helpers";
import type { ShowcaseItem } from "../_lib/types";

export function DeleteShowcaseModal({
  target,
  open,
  onOpenChange,
  confirmInput,
  onConfirmInputChange,
  onSubmit,
  isSubmitting,
}: {
  target: ShowcaseItem | null;
  open: boolean;
  onOpenChange: (o: boolean) => void;
  confirmInput: string;
  onConfirmInputChange: (v: string) => void;
  onSubmit: () => void;
  isSubmitting: boolean;
}) {
  const valid = confirmInput.trim() === "DELETE";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="w-full max-w-[calc(100%-2rem)] rounded-2xl border border-border bg-card p-0 sm:max-w-md"
        showCloseButton={false}
      >
        <div className="flex items-start justify-between gap-4 border-b border-border/60 px-5 py-4">
          <DialogHeader className="gap-1">
            <DialogTitle className="flex items-center gap-2 text-[16px] font-semibold text-rose-700">
              <Trash2 className="size-4" />
              Delete showcase
            </DialogTitle>
            <DialogDescription className="text-[12.5px] text-muted-foreground">
              Tindakan ini permanen dan tidak bisa di-undo.
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
          {target && (
            <div className="mb-4 flex items-start gap-2.5 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2.5 text-[12.5px]">
              <AlertTriangle className="mt-0.5 size-4 shrink-0 text-rose-600" />
              <div>
                <p className="font-semibold text-rose-900">
                  Karya{" "}
                  <span className="font-mono">{target.title || "untitled"}</span>{" "}
                  akan dihapus permanen
                </p>
                <p className="text-rose-800/80">
                  Engagement ({compactNumber(target.viewCount)} views ·{" "}
                  {compactNumber(target.likeCount)} likes) juga akan hilang.
                  Artist akan dapat email notifikasi otomatis.
                </p>
              </div>
            </div>
          )}

          <p className="mb-2 text-[13px] text-foreground">
            Untuk konfirmasi, ketik{" "}
            <strong className="font-mono font-semibold">DELETE</strong> di bawah.
          </p>
          <input
            value={confirmInput}
            onChange={(e) => onConfirmInputChange(e.target.value)}
            placeholder="DELETE"
            className="w-full rounded-lg border border-border bg-background px-3 py-2 font-mono text-sm outline-none placeholder:text-muted-foreground/60 focus:border-primary"
          />
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
            disabled={!target || !valid || isSubmitting}
            onClick={onSubmit}
            className="inline-flex items-center gap-1.5 rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:brightness-105 disabled:opacity-50"
          >
            <Trash2 className="size-3.5" />
            {isSubmitting ? "Deleting…" : "Delete permanently"}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
