"use client";

import {
  ChevronLeft,
  ChevronRight,
  Eye,
  Filter,
  MoreHorizontal,
  Search,
  ShieldAlert,
  ShieldCheck,
  Star,
  Trash2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { ShowcaseItem } from "../_lib/types";
import { ShowcasesTableSkeleton } from "./ShowcasesTableSkeleton";

export function ShowcasesTable({
  showcases,
  isLoading,
  isFetching,
  hasHistory,
  hasNextPage,
  nextCursor,
  searchInput,
  onSearchInputChange,
  onSearchSubmit,
  onPrev,
  onNext,
  onViewDetail,
}: {
  showcases: ShowcaseItem[];
  isLoading: boolean;
  isFetching: boolean;
  hasHistory: boolean;
  hasNextPage: boolean;
  nextCursor: string | null;
  searchInput: string;
  onSearchInputChange: (v: string) => void;
  onSearchSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  onPrev: () => void;
  onNext: (next: string) => void;
  onViewDetail: (id: string) => void;
}) {
  return (
    <Card className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
      <CardHeader className="flex flex-col gap-4 border-b border-border/70 pb-5 pt-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="space-y-1">
          <CardTitle className="text-xl font-bold tracking-tight text-foreground">
            All Works
          </CardTitle>
          <CardDescription className="text-sm text-muted-foreground">
            Review showcase catalogs from all users arranged chronologically.
          </CardDescription>
        </div>

        <form
          onSubmit={onSearchSubmit}
          className="flex w-full gap-3 sm:max-w-md"
        >
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 size-4.5 -translate-y-1/2 text-foreground/40" />
            <Input
              value={searchInput}
              onChange={(e) => onSearchInputChange(e.target.value)}
              placeholder="Search showcase title..."
              className="h-10 rounded-lg border-border bg-card pl-10 text-sm placeholder:text-muted-foreground focus-visible:border-primary focus-visible:ring-primary/20 shadow-sm"
            />
          </div>
          <Button
            type="submit"
            className="h-10 rounded-lg bg-primary px-5 font-semibold text-primary-foreground transition-all hover:bg-primary/90 shadow-sm"
          >
            Search
          </Button>
        </form>
      </CardHeader>

      <CardContent className="p-0">
        {isLoading ? (
          <div className="p-6">
            <ShowcasesTableSkeleton />
          </div>
        ) : showcases.length === 0 ? (
          <div className="flex flex-col items-center justify-center border-t border-dashed border-border bg-secondary/30 px-6 py-20 text-center">
            <div className="flex size-16 items-center justify-center rounded-3xl bg-secondary/55 text-muted-foreground shadow-inner">
              <Filter className="size-8" />
            </div>
            <h3 className="mt-5 text-lg font-semibold text-foreground">
              No showcases found
            </h3>
            <p className="mt-2 max-w-sm text-sm leading-relaxed text-foreground/50">
              Your search yielded no results. Try using different keywords or
              clear the filters.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-secondary/70">
                <TableRow className="border-border/70 hover:bg-transparent">
                  <TableHead className="px-6 py-4 text-xs font-semibold uppercase tracking-[0.18em] text-foreground/45">
                    Showcase Info
                  </TableHead>
                  <TableHead className="px-6 py-4 text-xs font-semibold uppercase tracking-[0.18em] text-foreground/45">
                    Author
                  </TableHead>
                  <TableHead className="px-6 py-4 text-xs font-semibold uppercase tracking-[0.18em] text-foreground/45">
                    Stats
                  </TableHead>
                  <TableHead className="px-6 py-4 text-xs font-semibold uppercase tracking-[0.18em] text-foreground/45">
                    Status
                  </TableHead>
                  <TableHead className="px-6 py-4 text-right text-xs font-semibold uppercase tracking-[0.18em] text-foreground/45">
                    Action
                  </TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {showcases.map((item) => (
                  <TableRow
                    key={item.id}
                    className="border-border/70 transition-colors hover:bg-secondary/30"
                  >
                    <TableCell className="px-6 py-4 align-top">
                      <div className="min-w-0 space-y-2">
                        <p className="truncate font-semibold text-foreground">
                          {item.title || "Untitled Showcase"}
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {item.tags.slice(0, 3).map((tag, idx) => (
                            <Badge
                              key={idx}
                              variant="outline"
                              className="rounded-full border-border bg-secondary/45 px-2 py-0 text-[10px] font-medium text-foreground/60"
                            >
                              #{tag.nameTag}
                            </Badge>
                          ))}
                          {item.tags.length > 3 && (
                            <Badge
                              variant="outline"
                              className="rounded-full border-border bg-secondary/45 px-2 py-0 text-[10px] font-medium text-foreground/60"
                            >
                              +{item.tags.length - 3}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </TableCell>

                    <TableCell className="px-6 py-4 align-top">
                      <div className="space-y-1">
                        <p className="truncate font-medium text-foreground">
                          @{item.showcase.user.username}
                        </p>
                        {item.showcase.isVerified && (
                          <Badge className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 border border-emerald-200">
                            <ShieldCheck className="mr-1 size-3" />
                            Verified Author
                          </Badge>
                        )}
                      </div>
                    </TableCell>

                    <TableCell className="px-6 py-4 align-top">
                      <div className="flex items-center gap-4 text-sm font-medium text-foreground/70">
                        <span className="flex items-center gap-1.5" title="Views">
                          <Eye className="size-4 text-foreground/40" />
                          {item.viewCount}
                        </span>
                        <span className="flex items-center gap-1.5" title="Likes">
                          <Star className="size-4 text-primary" />
                          {item.likeCount}
                        </span>
                      </div>
                    </TableCell>

                    <TableCell className="px-6 py-4 align-top">
                      <div className="flex flex-col gap-2">
                        {item.isDraft ? (
                          <Badge className="w-fit rounded-full bg-secondary/70 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground hover:bg-secondary">
                            Draft
                          </Badge>
                        ) : (
                          <Badge className="w-fit rounded-full bg-sidebar px-2.5 py-0.5 text-sidebar-foreground text-[10px] font-bold uppercase tracking-widest hover:bg-sidebar/90">
                            Published
                          </Badge>
                        )}
                        {item.isFromVerifiedCommission && (
                          <Badge className="w-fit rounded-full border-primary/25 bg-primary/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-widest text-primary hover:bg-primary/15">
                            Commission
                          </Badge>
                        )}
                      </div>
                    </TableCell>

                    <TableCell className="px-6 py-4 text-right align-top">
                      <DropdownMenu>
                        <DropdownMenuTrigger
                          render={
                            <Button
                              variant="outline"
                              size="icon-sm"
                              className="rounded-[10px] border-border bg-card transition-all hover:border-primary/40 hover:bg-primary/10 hover:text-primary"
                            />
                          }
                        >
                          <MoreHorizontal className="size-4" />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent
                          align="end"
                          className="w-48 rounded-2xl border border-border bg-card p-1.5 shadow-xl"
                        >
                          <DropdownMenuItem
                            className="rounded-xl px-3 py-2 text-sm font-medium text-foreground focus:bg-primary/10 focus:text-primary"
                            onClick={() => onViewDetail(item.id)}
                          >
                            <Eye className="mr-2 size-4" />
                            View detail
                          </DropdownMenuItem>
                          <DropdownMenuItem className="rounded-xl px-3 py-2 text-sm font-medium text-foreground focus:bg-primary/10 focus:text-primary">
                            <ShieldAlert className="mr-2 size-4" />
                            Moderate content
                          </DropdownMenuItem>
                          <DropdownMenuItem className="rounded-xl px-3 py-2 text-sm font-medium text-red-600 focus:bg-red-50 focus:text-red-700">
                            <Trash2 className="mr-2 size-4" />
                            Delete showcase
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        <div className="flex flex-col items-center justify-between gap-4 border-t border-border bg-secondary/50 px-6 py-4 sm:flex-row">
          <p className="text-sm font-medium text-foreground/50">
            Showing <span className="text-foreground">{showcases.length}</span>{" "}
            items in this batch
          </p>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              className="rounded-xl border-border bg-card shadow-sm hover:border-primary/35"
              disabled={!hasHistory || isFetching}
              onClick={onPrev}
            >
              <ChevronLeft className="mr-1 size-4" />
              Prev
            </Button>
            <div className="rounded-xl border border-border bg-card px-4 py-2 text-sm font-semibold text-foreground shadow-sm">
              Cursor Mode
            </div>
            <Button
              variant="outline"
              className="rounded-xl border-border bg-card shadow-sm hover:border-primary/35"
              disabled={!hasNextPage || !nextCursor || isFetching}
              onClick={() => nextCursor && onNext(nextCursor)}
            >
              Next
              <ChevronRight className="ml-1 size-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
