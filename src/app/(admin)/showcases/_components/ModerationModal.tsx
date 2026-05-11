"use client";

import { AlertTriangle, EyeOff, ShieldCheck, X, XCircle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

export type ModerationAction = "MATURE" | "UNVERIFY" | "HIDE" | "WARN";

const OPTIONS: Array<{
  key: ModerationAction;
  icon: React.ReactNode;
  label: string;
  desc: string;
  danger?: boolean;
}> = [
  {
    key: "MATURE",
    icon: <AlertTriangle className="size-3.5" />,
    label: "Flag as mature",
    desc: "Tandai sebagai 18+. Akan di-blur di feed publik dan butuh confirm umur untuk dibuka.",
  },
  {
    key: "UNVERIFY",
    icon: <ShieldCheck className="size-3.5" />,
    label: 'Revoke "from commission" badge',
    desc: "Cabut linking ke verified order — biasanya jika upload dispute atau order belum complete.",
  },
  {
    key: "HIDE",
    icon: <EyeOff className="size-3.5" />,
    label: "Unpublish (hide from feed)",
    desc: "Karya tetap ada di drawer artist tapi tidak terlihat di publik. Bisa di-restore kapan saja.",
  },
  {
    key: "WARN",
    icon: <XCircle className="size-3.5" />,
    label: "Issue warning to author",
    desc: "Kirim moderation warning ke author. Tercatat di moderation history user.",
    danger: true,
  },
];

export function ModerationModal({
  open,
  onOpenChange,
  targetTitle,
  action,
  setAction,
  reason,
  setReason,
  onSubmit,
  isSubmitting,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  targetTitle: string | null;
  action: ModerationAction;
  setAction: (a: ModerationAction) => void;
  reason: string;
  setReason: (v: string) => void;
  onSubmit: () => void;
  isSubmitting: boolean;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="w-full max-w-[calc(100%-2rem)] rounded-2xl border border-border bg-card p-0 sm:max-w-md"
        showCloseButton={false}
      >
        <div className="flex items-start justify-between gap-4 border-b border-border/60 px-5 py-4">
          <DialogHeader className="gap-1">
            <DialogTitle className="flex items-center gap-2 text-[16px] font-semibold">
              <ShieldCheck className="size-4 text-primary" />
              Moderate showcase
            </DialogTitle>
            <DialogDescription className="text-[12.5px] text-muted-foreground">
              Pilih moderation action untuk{" "}
              <strong className="font-semibold text-foreground">
                {targetTitle ?? "showcase"}
              </strong>
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

        <div className="max-h-[60vh] overflow-y-auto px-5 py-4">
          <div className="space-y-1.5">
            {OPTIONS.map((opt) => {
              const selected = action === opt.key;
              const danger = opt.danger && selected;
              return (
                <button
                  key={opt.key}
                  type="button"
                  onClick={() => setAction(opt.key)}
                  className={cn(
                    "flex w-full items-start gap-3 rounded-xl border bg-card px-3 py-2.5 text-left transition",
                    selected
                      ? danger
                        ? "border-rose-400 bg-rose-50"
                        : "border-primary bg-primary/5"
                      : "border-border/60 hover:border-primary/30",
                  )}
                >
                  <span
                    className={cn(
                      "relative mt-0.5 inline-flex size-4 shrink-0 rounded-full border-2",
                      selected
                        ? danger
                          ? "border-rose-500"
                          : "border-primary"
                        : "border-border",
                    )}
                  >
                    {selected && (
                      <span
                        className={cn(
                          "absolute inset-[3px] rounded-full",
                          danger ? "bg-rose-500" : "bg-primary",
                        )}
                      />
                    )}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div
                      className={cn(
                        "flex items-center gap-1.5 text-[13px] font-semibold",
                        danger && "text-rose-700",
                      )}
                    >
                      {opt.icon}
                      {opt.label}
                    </div>
                    <div className="mt-0.5 text-[11.5px] leading-snug text-muted-foreground">
                      {opt.desc}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          <div className="mt-4 flex flex-col gap-1.5">
            <label className="text-[11.5px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
              Reason / admin note
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              maxLength={500}
              placeholder="Wajib diisi — jelaskan kenapa action ini diambil. Ini akan masuk audit log."
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
            disabled={isSubmitting || !targetTitle}
            onClick={onSubmit}
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground transition hover:brightness-105 disabled:opacity-50"
          >
            {isSubmitting ? "Applying…" : "Apply moderation"}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
