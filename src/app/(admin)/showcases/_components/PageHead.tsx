"use client";

import { CheckCircle2, Download, SlidersHorizontal } from "lucide-react";
import { toast } from "sonner";

export function PageHead() {
  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
      <div>
        <h2 className="text-xl font-semibold tracking-tight text-foreground">
          Moderate creative showcases
        </h2>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          Pantau portofolio yang diunggah artist. Verifikasi authorship, flag
          mature content, atau hapus karya yang melanggar guideline.
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => toast.info("Saved filters coming soon")}
          className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-card px-3 py-2 text-xs font-medium text-foreground transition hover:border-primary/40 hover:text-primary"
        >
          <SlidersHorizontal className="size-3.5" />
          Saved filters
        </button>
        <button
          type="button"
          onClick={() => toast.info("Export coming soon")}
          className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-card px-3 py-2 text-xs font-medium text-foreground transition hover:border-primary/40 hover:text-primary"
        >
          <Download className="size-3.5" />
          Export
        </button>
        <button
          type="button"
          onClick={() => toast.info("Verify queue coming soon")}
          className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground transition hover:brightness-105"
        >
          <CheckCircle2 className="size-3.5" />
          Review verify queue
        </button>
      </div>
    </div>
  );
}
