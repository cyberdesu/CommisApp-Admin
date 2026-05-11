"use client";

import { useState } from "react";
import {
  Bookmark,
  ExternalLink,
  Eye,
  Heart,
  Image as ImageIcon,
  Info,
  MessageSquare,
  ShieldAlert,
  ShieldCheck,
  Trash2,
  X,
} from "lucide-react";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { resolveMediaUrl } from "@/lib/media";
import {
  compactNumber,
  formatDate,
  getInitials,
} from "../_lib/helpers";
import type { ShowcaseDetailData } from "../_lib/types";
import { ShowcaseThumbnail } from "./ShowcaseThumbnail";

export function ShowcaseDetailDrawer({
  open,
  onOpenChange,
  detail,
  isLoading,
  onModerate,
  onDelete,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  detail: ShowcaseDetailData | undefined;
  isLoading: boolean;
  onModerate: () => void;
  onDelete: () => void;
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        showCloseButton={false}
        className="flex h-full w-full flex-col gap-0 border-l border-border bg-card p-0 sm:max-w-[880px]"
      >
        <div className="flex items-start justify-between gap-4 border-b border-border/60 px-6 py-5">
          <SheetHeader className="gap-1 p-0">
            <div className="flex items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-[0.14em] text-primary">
              <ImageIcon className="size-3" />
              Showcase detail
            </div>
            <SheetTitle className="text-[18px] font-semibold tracking-tight">
              {detail?.title || "Showcase"}
            </SheetTitle>
            <SheetDescription className="flex flex-wrap items-center gap-2 text-[12.5px] text-muted-foreground">
              {detail && (
                <>
                  <span className="font-mono">
                    #{detail.id.slice(0, 8)}
                  </span>
                  <span className="size-1 rounded-full bg-muted-foreground/60" />
                  <span>Created {formatDate(detail.createdAt)}</span>
                  <span className="size-1 rounded-full bg-muted-foreground/60" />
                  <span>{detail.imageCount} images</span>
                </>
              )}
            </SheetDescription>
          </SheetHeader>
          <SheetClose
            render={
              <button
                type="button"
                className="inline-flex size-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
                aria-label="Close"
              >
                <X className="size-3.5" />
              </button>
            }
          />
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5">
          {isLoading ? (
            <div className="space-y-4">
              <Skeleton className="aspect-[4/3] rounded-xl" />
              <Skeleton className="h-32 rounded-xl" />
            </div>
          ) : detail ? (
            <DrawerBody detail={detail} />
          ) : (
            <p className="py-12 text-center text-sm text-muted-foreground">
              Showcase details not available.
            </p>
          )}
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-border/60 bg-muted/30 px-6 py-3">
          <div className="flex items-center gap-1.5 text-[12px] text-muted-foreground">
            <Info className="size-3" />
            Aksi moderation tercatat di{" "}
            <strong className="font-semibold text-foreground">audit log</strong>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onModerate}
              disabled={!detail}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-semibold text-foreground transition hover:border-primary/40 hover:text-primary disabled:opacity-50"
            >
              <ShieldCheck className="size-3.5" />
              Moderate
            </button>
            <button
              type="button"
              onClick={onDelete}
              disabled={!detail}
              className="inline-flex items-center gap-1.5 rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:brightness-105 disabled:opacity-50"
            >
              <Trash2 className="size-3.5" />
              Delete
            </button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function DrawerBody({ detail }: { detail: ShowcaseDetailData }) {
  const [activeFileIdx, setActiveFileIdx] = useState(0);
  const files = detail.showcaseFiles;
  const activeFile = files[activeFileIdx];

  return (
    <div className="grid gap-6 md:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
      <div>
        {/* Hero image */}
        <div className="relative mb-3 aspect-[4/3] overflow-hidden rounded-xl bg-muted">
          {activeFile && activeFile.type.startsWith("image") ? (
            <DrawerImage url={activeFile.url} alt={detail.title} />
          ) : (
            <ShowcaseThumbnail src={null} alt={detail.title} seed={detail.id} />
          )}

          <div className="absolute left-3 top-3 flex flex-wrap gap-1">
            {detail.isDraft ? (
              <span className="inline-flex items-center rounded bg-white/85 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground backdrop-blur">
                Draft
              </span>
            ) : (
              <span className="inline-flex items-center rounded bg-slate-900/85 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white backdrop-blur">
                Published
              </span>
            )}
            {detail.isFromVerifiedCommission && (
              <span className="inline-flex items-center rounded bg-primary px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary-foreground">
                Commission
              </span>
            )}
            {detail.showcase.isVerified && (
              <span className="inline-flex items-center gap-1 rounded bg-white/85 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-700 backdrop-blur">
                <ShieldCheck className="size-3" />
                Verified
              </span>
            )}
            {detail.containsMatureContent && (
              <span className="inline-flex items-center rounded bg-rose-600 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
                Mature
              </span>
            )}
          </div>
        </div>

        {/* Thumbnail strip */}
        {files.length > 1 && (
          <div className="mb-4 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:thin]">
            {files.map((file, idx) => (
              <button
                key={file.id}
                type="button"
                onClick={() => setActiveFileIdx(idx)}
                className={cn(
                  "size-20 shrink-0 overflow-hidden rounded-lg border-2 transition",
                  idx === activeFileIdx
                    ? "border-primary"
                    : "border-transparent hover:border-border",
                )}
              >
                {file.type.startsWith("image") ? (
                  <DrawerImage
                    url={file.url}
                    alt={`${detail.title} ${idx + 1}`}
                  />
                ) : (
                  <ShowcaseThumbnail
                    src={null}
                    alt={file.type}
                    seed={file.id}
                  />
                )}
              </button>
            ))}
          </div>
        )}

        <SectionH>Description</SectionH>
        <p className="text-[13px] leading-relaxed text-muted-foreground">
          {typeof detail.description === "string" && detail.description.trim()
            ? detail.description
            : "No description provided."}
        </p>

        {detail.tags.length > 0 && (
          <>
            <SectionH>Tags</SectionH>
            <div className="flex flex-wrap gap-1">
              {detail.tags.map((tag) => (
                <span
                  key={tag.id}
                  className="rounded border border-border bg-muted/40 px-1.5 py-0.5 text-[11px] font-medium text-muted-foreground"
                >
                  #{tag.nameTag}
                </span>
              ))}
            </div>
          </>
        )}
      </div>

      <div className="min-w-0">
        <SectionH>Author</SectionH>
        <div className="flex items-center gap-3 rounded-xl border border-border/60 bg-muted/30 p-3">
          <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-sm font-bold text-primary">
            {getInitials(detail.showcase.user.username)}
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 text-[13px] font-semibold">
              @{detail.showcase.user.username}
              {detail.showcase.isVerified && (
                <span className="inline-flex items-center gap-1 rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-800">
                  <ShieldCheck className="size-3" />
                  Verified
                </span>
              )}
              {detail.showcase.user.isBanned && (
                <span className="inline-flex items-center gap-1 rounded bg-rose-100 px-1.5 py-0.5 text-[10px] font-semibold text-rose-800">
                  <ShieldAlert className="size-3" />
                  Banned
                </span>
              )}
            </div>
            <div className="truncate text-[11.5px] text-muted-foreground">
              {detail.showcase.user.email}
            </div>
          </div>
          <button
            type="button"
            title="Open profile"
            className="inline-flex size-8 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-primary"
          >
            <ExternalLink className="size-3.5" />
          </button>
        </div>

        <SectionH>Engagement</SectionH>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <StatCell
            icon={<Eye className="size-3" />}
            label="Views"
            value={compactNumber(detail.viewCount)}
          />
          <StatCell
            icon={<Heart className="size-3" />}
            label="Likes"
            value={compactNumber(detail.likeCount)}
          />
          <StatCell
            icon={<Bookmark className="size-3" />}
            label="Saves"
            value={compactNumber(detail._count.bookmarkedBy)}
          />
          <StatCell
            icon={<MessageSquare className="size-3" />}
            label="Reactions"
            value={compactNumber(detail._count.interactions)}
          />
        </div>

        <SectionH>Content flags</SectionH>
        <dl className="grid grid-cols-[auto_1fr] gap-y-1.5 text-[12.5px]">
          <Row label="Status">
            {detail.isDraft ? "Draft" : "Published"}
          </Row>
          <Row label="Mature content">
            {detail.containsMatureContent ? "Yes" : "No"}
          </Row>
          <Row label="Image count">{detail.imageCount}</Row>
          <Row label="Public views">
            {detail._count.publicViews.toLocaleString("en-US")}
          </Row>
        </dl>
      </div>
    </div>
  );
}

function DrawerImage({ url, alt }: { url: string; alt: string }) {
  const [loadFailed, setLoadFailed] = useState(false);
  const safeSrc = resolveMediaUrl(url);

  if (!safeSrc || loadFailed) {
    return <ShowcaseThumbnail src={null} alt={alt} seed={url} />;
  }

  return (
    <img
      src={safeSrc}
      alt={alt}
      onError={() => setLoadFailed(true)}
      className="h-full w-full object-cover"
      loading="lazy"
      decoding="async"
    />
  );
}

function SectionH({ children }: { children: React.ReactNode }) {
  return (
    <h4 className="mb-2 mt-4 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground first:mt-0">
      {children}
    </h4>
  );
}

function StatCell({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-lg border border-border/60 bg-card p-2.5">
      <div className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
        {icon}
        {label}
      </div>
      <div className="mt-1 font-mono text-[15px] font-semibold tabular-nums">
        {value}
      </div>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <>
      <dt className="pr-3 text-muted-foreground">{label}</dt>
      <dd className="m-0 font-medium tabular-nums">{children}</dd>
    </>
  );
}
