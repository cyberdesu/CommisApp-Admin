"use client";

import { AlertTriangle, Trash2, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  getFinancePreview,
  hasAvailableBalance,
} from "../_lib/helpers";
import type { UserItem } from "../_lib/types";

export function DeleteUserDialog({
  target,
  confirmInput,
  onConfirmInputChange,
  onCancel,
  onSubmit,
  isSubmitting,
  canSubmit,
}: {
  target: UserItem | null;
  confirmInput: string;
  onConfirmInputChange: (v: string) => void;
  onCancel: () => void;
  onSubmit: () => void;
  isSubmitting: boolean;
  canSubmit: boolean;
}) {
  return (
    <Dialog
      open={Boolean(target)}
      onOpenChange={(open) => {
        if (!open) onCancel();
      }}
    >
      <DialogContent className="w-full max-w-[calc(100%-2rem)] rounded-2xl border border-border bg-card p-0 sm:max-w-md">
        <div className="flex items-start justify-between gap-4 border-b border-border/60 px-6 py-5">
          <DialogHeader className="gap-1">
            <div className="flex items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-[0.14em] text-rose-700">
              <Trash2 className="size-3" />
              Destructive action
            </div>
            <DialogTitle className="text-[18px] font-semibold tracking-tight">
              Delete this user?
            </DialogTitle>
            <DialogDescription className="text-[13px] text-muted-foreground">
              Akun beserta showcases, chat, dan order history-nya akan dihapus permanen.
            </DialogDescription>
          </DialogHeader>
          <button
            type="button"
            onClick={onCancel}
            className="inline-flex size-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <X className="size-3.5" />
          </button>
        </div>

        <div className="px-6 py-5">
          {target && (
            <div className="mb-4 flex items-start gap-2.5 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2.5 text-[13px]">
              <AlertTriangle className="mt-0.5 size-4 shrink-0 text-rose-600" />
              <div>
                <p className="font-semibold text-rose-900">
                  Tindakan ini tidak bisa dibatalkan.
                </p>
                <p className="text-rose-800/80">
                  User{" "}
                  <span className="font-mono font-semibold">
                    @{target.username}
                  </span>
                  {hasAvailableBalance(target.finance) ? (
                    <>
                      {" "}
                      masih punya{" "}
                      <span className="font-semibold">
                        {getFinancePreview(target.finance)?.available}
                      </span>{" "}
                      available balance.
                    </>
                  ) : (
                    "."
                  )}
                </p>
              </div>
            </div>
          )}

          <label className="text-[11.5px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
            Ketik username untuk konfirmasi
          </label>
          <input
            value={confirmInput}
            onChange={(e) => onConfirmInputChange(e.target.value)}
            placeholder={target?.username ?? ""}
            className="mt-1.5 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none placeholder:text-muted-foreground/60 focus:border-primary"
          />
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-border/60 bg-muted/30 px-6 py-3">
          <button
            type="button"
            onClick={onCancel}
            className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!target || isSubmitting || !canSubmit}
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
