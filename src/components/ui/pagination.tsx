"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

type PaginationItem = number | "ellipsis-left" | "ellipsis-right";

function buildPageItems(current: number, total: number): PaginationItem[] {
  if (total <= 7) {
    return Array.from({ length: total }, (_, index) => index + 1);
  }

  const items: PaginationItem[] = [];
  const left = Math.max(2, current - 1);
  const right = Math.min(total - 1, current + 1);

  items.push(1);
  if (left > 2) items.push("ellipsis-left");
  for (let page = left; page <= right; page += 1) {
    items.push(page);
  }
  if (right < total - 1) items.push("ellipsis-right");
  items.push(total);

  return items;
}

export function Pagination({
  page,
  totalPages,
  onPageChange,
  disabled = false,
  className,
}: {
  page: number;
  totalPages: number;
  onPageChange: (next: number) => void;
  disabled?: boolean;
  className?: string;
}) {
  if (totalPages <= 1) return null;

  const items = buildPageItems(page, totalPages);

  function goTo(target: number) {
    if (disabled) return;
    const clamped = Math.min(Math.max(1, target), totalPages);
    if (clamped !== page) onPageChange(clamped);
  }

  return (
    <div className={cn("flex items-center gap-1", className)}>
      <button
        type="button"
        onClick={() => goTo(page - 1)}
        disabled={disabled || page <= 1}
        aria-label="Previous page"
        className="inline-flex size-8 items-center justify-center rounded-lg border border-border bg-background text-muted-foreground transition hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
      >
        <ChevronLeft className="size-3.5" />
      </button>

      {items.map((item, index) => {
        if (item === "ellipsis-left" || item === "ellipsis-right") {
          return (
            <span
              key={`${item}-${index}`}
              className="inline-flex size-8 items-center justify-center text-xs text-muted-foreground"
            >
              …
            </span>
          );
        }

        const isActive = item === page;
        return (
          <button
            key={item}
            type="button"
            onClick={() => goTo(item)}
            disabled={disabled}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "inline-flex size-8 items-center justify-center rounded-lg border text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-40",
              isActive
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-background text-muted-foreground hover:text-foreground",
            )}
          >
            {item}
          </button>
        );
      })}

      <button
        type="button"
        onClick={() => goTo(page + 1)}
        disabled={disabled || page >= totalPages}
        aria-label="Next page"
        className="inline-flex size-8 items-center justify-center rounded-lg border border-border bg-background text-muted-foreground transition hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
      >
        <ChevronRight className="size-3.5" />
      </button>
    </div>
  );
}
