"use client";

import { Pencil, X } from "lucide-react";
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
import type { UpdateUserPayload } from "../_lib/types";
import { FormField, ToggleRow } from "./primitives";

export function EditUserDialog({
  open,
  onOpenChange,
  form,
  patchForm,
  isLoading,
  isSubmitting,
  onSubmit,
  canSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  form: UpdateUserPayload;
  patchForm: <K extends keyof UpdateUserPayload>(
    key: K,
    value: UpdateUserPayload[K],
  ) => void;
  isLoading: boolean;
  isSubmitting: boolean;
  onSubmit: () => void;
  canSubmit: boolean;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="flex max-h-[88vh] w-full max-w-[calc(100%-2rem)] flex-col overflow-hidden rounded-2xl border border-border bg-card p-0 sm:max-w-2xl"
        showCloseButton={false}
      >
        <div className="flex items-start justify-between gap-4 border-b border-border/60 px-6 py-5">
          <DialogHeader className="gap-1">
            <div className="flex items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-[0.14em] text-primary">
              <Pencil className="size-3" />
              Edit profile
            </div>
            <DialogTitle className="text-[18px] font-semibold tracking-tight">
              Update user details
            </DialogTitle>
            <DialogDescription className="text-[13px] text-muted-foreground">
              Perubahan langsung disimpan via Prisma + Supabase.
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

        <div className="flex-1 overflow-y-auto px-6 py-5">
          {isLoading ? (
            <p className="py-12 text-center text-sm text-muted-foreground">
              Loading…
            </p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                label="Display name"
                value={form.name}
                onChange={(v) => patchForm("name", v)}
              />
              <FormField
                label="Username"
                value={form.username}
                onChange={(v) => patchForm("username", v)}
              />
              <FormField
                full
                label="Email"
                value={form.email}
                onChange={(v) => patchForm("email", v)}
              />
              <div className="flex flex-col gap-1.5">
                <label className="text-[11.5px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
                  Role
                </label>
                <Select
                  value={form.role}
                  onValueChange={(val) => {
                    if (val) patchForm("role", val);
                  }}
                >
                  <SelectTrigger className="h-9 w-full rounded-lg border-border bg-background text-sm">
                    <SelectValue placeholder="Pilih role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="user">User</SelectItem>
                    <SelectItem value="artist">Artist</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="manager">Manager</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <FormField
                label="Country"
                value={form.country}
                onChange={(v) => patchForm("country", v)}
              />
              <FormField
                full
                multiline
                label="Bio"
                value={form.bio}
                onChange={(v) => patchForm("bio", v)}
              />

              <div className="col-span-full flex flex-col gap-2">
                <label className="text-[11.5px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
                  Verification
                </label>
                <ToggleRow
                  label="Email verified"
                  sub="User has confirmed ownership of their email address."
                  on={form.verified}
                  onChange={() => patchForm("verified", !form.verified)}
                />
                <ToggleRow
                  label="Verified artist"
                  sub="Tampilkan badge artist resmi dan akses ke payout tools."
                  on={form.verifiedArtists}
                  onChange={() =>
                    patchForm("verifiedArtists", !form.verifiedArtists)
                  }
                />
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-border/60 bg-muted/30 px-6 py-3">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!canSubmit || isSubmitting}
            onClick={onSubmit}
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground transition hover:brightness-105 disabled:opacity-50"
          >
            {isSubmitting ? "Saving…" : "Save changes"}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
