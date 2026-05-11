"use client";

import { AlertTriangle, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import type { ModerationAction, UserItem } from "../_lib/types";

const DURATION_PRESETS: Array<[string, string]> = [
  ["24", "24h"],
  ["72", "72h"],
  ["168", "7d"],
  ["720", "30d"],
];

function actionTitle(a: ModerationAction) {
  switch (a) {
    case "BAN":
      return "Ban user";
    case "UNBAN":
      return "Unban user";
    case "SUSPEND":
      return "Suspend user";
    case "UNSUSPEND":
      return "Unsuspend user";
  }
}

function actionSub(a: ModerationAction) {
  switch (a) {
    case "BAN":
      return "User akan kehilangan akses login dan semua sesi aktif di-revoke.";
    case "SUSPEND":
      return "User di-pause sementara berdasarkan durasi yang dipilih.";
    case "UNBAN":
      return "Akses login user akan dipulihkan.";
    case "UNSUSPEND":
      return "Status suspend akan dilepas.";
  }
}

export function ModerationDialog({
  target,
  action,
  setAction,
  reason,
  setReason,
  durationHours,
  setDurationHours,
  onCancel,
  onSubmit,
  isSubmitting,
}: {
  target: UserItem | null;
  action: ModerationAction;
  setAction: (a: ModerationAction) => void;
  reason: string;
  setReason: (v: string) => void;
  durationHours: string;
  setDurationHours: (v: string) => void;
  onCancel: () => void;
  onSubmit: () => void;
  isSubmitting: boolean;
}) {
  const showActionSeg = action === "BAN" || action === "SUSPEND";
  const showDuration = action === "SUSPEND";

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
              <AlertTriangle className="size-3" />
              Moderation
            </div>
            <DialogTitle className="text-[18px] font-semibold tracking-tight">
              {actionTitle(action)}
            </DialogTitle>
            <DialogDescription className="text-[13px] text-muted-foreground">
              {actionSub(action)}
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
                  @{target.username}
                  {target.name ? ` (${target.name})` : ""}
                </p>
                <p className="text-rose-800/80">
                  Action ini akan dicatat di moderation log dan dapat di-revert nanti.
                </p>
              </div>
            </div>
          )}

          <div className="space-y-4">
            {showActionSeg && (
              <div>
                <label className="text-[11.5px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
                  Action
                </label>
                <div className="mt-1.5 grid grid-cols-2 gap-0.5 rounded-lg border border-border bg-background p-[3px]">
                  {(["BAN", "SUSPEND"] as const).map((a) => (
                    <button
                      key={a}
                      type="button"
                      onClick={() => setAction(a)}
                      className={cn(
                        "rounded-md px-3 py-1.5 text-xs font-medium text-muted-foreground transition",
                        action === a &&
                          "bg-card font-semibold text-foreground shadow-sm",
                      )}
                    >
                      {a === "BAN" ? "Ban" : "Suspend"}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {showDuration && (
              <div>
                <label className="text-[11.5px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
                  Duration
                </label>
                <div className="mt-1.5 grid grid-cols-5 gap-0.5 rounded-lg border border-border bg-background p-[3px]">
                  {DURATION_PRESETS.map(([val, label]) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setDurationHours(val)}
                      className={cn(
                        "rounded-md px-2 py-1.5 text-xs font-medium text-muted-foreground transition",
                        durationHours === val &&
                          "bg-card font-semibold text-foreground shadow-sm",
                      )}
                    >
                      {label}
                    </button>
                  ))}
                  <input
                    type="number"
                    min={1}
                    max={24 * 365}
                    value={durationHours}
                    onChange={(e) => setDurationHours(e.target.value)}
                    placeholder="Custom h"
                    className="w-full rounded-md bg-transparent px-2 py-1.5 text-xs outline-none placeholder:text-muted-foreground/60 focus:bg-card"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="text-[11.5px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
                Reason (shown to user)
              </label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={3}
                maxLength={300}
                placeholder="Misal: melanggar guideline soal konten NSFW di showcase publik."
                className="mt-1.5 w-full resize-none rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none placeholder:text-muted-foreground/60 focus:border-primary"
              />
            </div>
          </div>
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
            disabled={!target || isSubmitting}
            onClick={onSubmit}
            className="inline-flex items-center gap-1.5 rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:brightness-105 disabled:opacity-50"
          >
            {isSubmitting ? "Applying…" : actionTitle(action)}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
