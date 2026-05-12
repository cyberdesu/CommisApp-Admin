"use client";

import { Bookmark, Eye, Heart, ShieldCheck, Trash2 } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import {
  compactNumber,
  formatRelativeTime,
  getThumbUrl,
} from "../_lib/helpers";
import type { ShowcaseItem } from "../_lib/types";
import { ShowcaseThumbnail } from "./ShowcaseThumbnail";

export function ShowcasesTable({
  items,
  onView,
  onModerate,
  onDelete,
}: {
  items: ShowcaseItem[];
  onView: (id: string) => void;
  onModerate: (item: ShowcaseItem) => void;
  onDelete: (item: ShowcaseItem) => void;
}) {
  if (items.length === 0) {
    return (
      <div className="py-16 text-center text-sm text-muted-foreground">
        No showcases match current filters.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <Table className="min-w-[1100px]">
        <TableHeader>
          <TableRow className="border-border/60 bg-muted/30 hover:bg-muted/30">
            <TableHead className="px-5 py-3 text-[10.5px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
              Work
            </TableHead>
            <TableHead className="px-5 py-3 text-[10.5px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
              Author
            </TableHead>
            <TableHead className="px-5 py-3 text-[10.5px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
              Engagement
            </TableHead>
            <TableHead className="px-5 py-3 text-[10.5px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
              Status
            </TableHead>
            <TableHead className="px-5 py-3 text-[10.5px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
              Created
            </TableHead>
            <TableHead className="w-[180px] px-5 py-3 text-right text-[10.5px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
              Actions
            </TableHead>
          </TableRow>
        </TableHeader>

        <TableBody>
          {items.map((item) => {
            const initials = item.showcase.user.username
              .slice(0, 2)
              .toUpperCase();
            return (
              <TableRow
                key={item.id}
                className="border-border/40 transition hover:bg-muted/30"
              >
                <TableCell className="px-5 py-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg">
                      <ShowcaseThumbnail
                        src={getThumbUrl(item)}
                        alt={item.title}
                        seed={item.id}
                      />
                    </div>
                    <div className="min-w-0">
                      <div className="truncate text-[13.5px] font-semibold">
                        {item.title || "Untitled showcase"}
                      </div>
                      <div className="mt-0.5 flex items-center gap-1.5 text-[11.5px] text-muted-foreground">
                        <span className="font-mono">
                          #{item.id.slice(0, 8)}
                        </span>
                        {item.tags.length > 0 && (
                          <>
                            <span className="size-1 rounded-full bg-muted-foreground/60" />
                            <span className="truncate">
                              {item.tags
                                .slice(0, 2)
                                .map((t) => `#${t.nameTag}`)
                                .join(" ")}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="px-5 py-3">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/15 font-mono text-[10px] font-bold text-primary">
                      {initials}
                    </span>
                    <div className="min-w-0">
                      <div className="truncate text-[12.5px] font-semibold">
                        @{item.showcase.user.username}
                      </div>
                      <div
                        className={cn(
                          "text-[10.5px] font-semibold",
                          item.showcase.isVerified
                            ? "text-emerald-700"
                            : "text-muted-foreground",
                        )}
                      >
                        {item.showcase.isVerified ? "Verified" : "Unverified"}
                      </div>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="px-5 py-3">
                  <div className="flex items-center gap-3 text-[12.5px] tabular-nums text-muted-foreground">
                    <span className="inline-flex items-center gap-1">
                      <Eye className="size-3" />
                      {compactNumber(item.viewCount)}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Heart className="size-3" />
                      {compactNumber(item.likeCount)}
                    </span>
                    <span className="inline-flex items-center gap-1 text-muted-foreground/60">
                      <Bookmark className="size-3" />—
                    </span>
                  </div>
                </TableCell>
                <TableCell className="px-5 py-3">
                  <div className="flex flex-wrap gap-1">
                    {item.isDraft ? (
                      <span className="inline-flex items-center rounded bg-muted px-2 py-0.5 text-[11px] font-semibold text-muted-foreground">
                        Draft
                      </span>
                    ) : (
                      <span className="inline-flex items-center rounded bg-slate-900 px-2 py-0.5 text-[11px] font-semibold text-white">
                        Published
                      </span>
                    )}
                    {item.isFromVerifiedCommission && (
                      <span className="inline-flex items-center gap-1 rounded bg-primary/15 px-2 py-0.5 text-[11px] font-semibold text-primary">
                        <ShieldCheck className="size-3" />
                        Commission
                      </span>
                    )}
                  </div>
                </TableCell>
                <TableCell className="px-5 py-3 font-mono text-[12px] text-muted-foreground">
                  {formatRelativeTime(item.createdAt)}
                </TableCell>
                <TableCell className="px-5 py-3 text-right">
                  <div className="flex justify-end gap-1">
                    <button
                      type="button"
                      onClick={() => onView(item.id)}
                      className="inline-flex items-center rounded-lg border border-border bg-card px-2.5 py-1.5 text-[11.5px] font-semibold text-foreground transition hover:border-primary/40 hover:text-primary"
                    >
                      View
                    </button>
                    <button
                      type="button"
                      onClick={() => onModerate(item)}
                      title="Moderate"
                      className="inline-flex size-8 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground transition hover:border-primary/40 hover:text-primary"
                    >
                      <ShieldCheck className="size-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onDelete(item)}
                      title="Delete"
                      className="inline-flex size-8 items-center justify-center rounded-lg border border-border bg-card text-rose-600 transition hover:border-rose-300 hover:bg-rose-50"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
