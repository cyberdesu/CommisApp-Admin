"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

export function PaginationBar({
  loadedCount,
  hasHistory,
  hasNextPage,
  nextCursor,
  isFetching,
  onPrev,
  onNext,
}: {
  loadedCount: number;
  hasHistory: boolean;
  hasNextPage: boolean;
  nextCursor: string | null;
  isFetching: boolean;
  onPrev: () => void;
  onNext: (next: string) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 border-t border-border/60 px-5 py-3 text-[12.5px] text-muted-foreground">
      <span>
        Showing{" "}
        <strong className="font-semibold text-foreground">
          {loadedCount}
        </strong>{" "}
        items in this batch · cursor pagination
      </span>
      <div className="flex items-center gap-2">
        <button
          type="button"
          disabled={!hasHistory || isFetching}
          onClick={onPrev}
          className="inline-flex size-8 items-center justify-center rounded-lg border border-border bg-background text-muted-foreground transition hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
        >
          <ChevronLeft className="size-3.5" />
        </button>
        <span className="font-mono text-xs">Cursor mode</span>
        <button
          type="button"
          disabled={!hasNextPage || !nextCursor || isFetching}
          onClick={() => nextCursor && onNext(nextCursor)}
          className="inline-flex size-8 items-center justify-center rounded-lg border border-border bg-background text-muted-foreground transition hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
        >
          <ChevronRight className="size-3.5" />
        </button>
      </div>
    </div>
  );
}
