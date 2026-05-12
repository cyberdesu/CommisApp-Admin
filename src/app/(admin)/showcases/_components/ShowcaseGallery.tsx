"use client";

import { useState } from "react";
import {
  CheckCircle2,
  Eye,
  Heart,
  MoreHorizontal,
  ShieldCheck,
  Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  compactNumber,
  formatRelativeTime,
  getThumbUrl,
} from "../_lib/helpers";
import type { ShowcaseItem } from "../_lib/types";
import { ShowcaseThumbnail } from "./ShowcaseThumbnail";

export function ShowcaseGallery({
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
    <div className="grid grid-cols-1 gap-3.5 p-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {items.map((item) => (
        <GalleryCard
          key={item.id}
          item={item}
          onView={() => onView(item.id)}
          onModerate={() => onModerate(item)}
          onDelete={() => onDelete(item)}
        />
      ))}
    </div>
  );
}

function GalleryCard({
  item,
  onView,
  onModerate,
  onDelete,
}: {
  item: ShowcaseItem;
  onView: () => void;
  onModerate: () => void;
  onDelete: () => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const initials = item.showcase.user.username.slice(0, 2).toUpperCase();

  return (
    <div
      className="group relative flex flex-col overflow-hidden rounded-xl border border-border/60 bg-card transition hover:border-primary/30 hover:shadow-lg hover:shadow-black/5"
      onMouseLeave={() => setMenuOpen(false)}
    >
      <button
        type="button"
        onClick={onView}
        className="relative aspect-[4/3] cursor-pointer overflow-hidden"
        aria-label={`View ${item.title}`}
      >
        <ShowcaseThumbnail
          src={getThumbUrl(item)}
          alt={item.title}
          seed={item.id}
        />
        <span className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-transparent" />

        <span className="absolute left-2 top-2 flex flex-wrap gap-1">
          {item.isDraft ? (
            <span className="inline-flex items-center rounded bg-white/80 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground backdrop-blur">
              Draft
            </span>
          ) : (
            <span className="inline-flex items-center rounded bg-slate-900/80 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white backdrop-blur">
              Published
            </span>
          )}
          {item.isFromVerifiedCommission && (
            <span className="inline-flex items-center rounded bg-primary px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary-foreground">
              Commission
            </span>
          )}
        </span>

        {item.showcase.isVerified && (
          <span className="absolute right-2 top-2 inline-flex items-center gap-1 rounded bg-white/85 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-700 backdrop-blur">
            <ShieldCheck className="size-3" />
            Verified
          </span>
        )}

        <span className="absolute bottom-2 left-3 right-3 flex items-center justify-end gap-2.5 text-[11.5px] font-semibold text-white">
          <span className="inline-flex items-center gap-1">
            <Eye className="size-3" />
            {compactNumber(item.viewCount)}
          </span>
          <span className="inline-flex items-center gap-1">
            <Heart className="size-3" />
            {compactNumber(item.likeCount)}
          </span>
        </span>
      </button>

      {/* Menu trigger overlay */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setMenuOpen((v) => !v);
        }}
        className="absolute right-2 top-2 hidden size-7 items-center justify-center rounded-lg bg-white/85 text-foreground opacity-0 backdrop-blur transition group-hover:flex group-hover:opacity-100 hover:bg-white hover:text-primary"
      >
        <MoreHorizontal className="size-3.5" />
      </button>
      {menuOpen && (
        <div
          className="absolute right-2 top-10 z-10 flex w-44 flex-col gap-0.5 rounded-lg border border-border bg-card p-1 shadow-lg"
          onClick={(e) => e.stopPropagation()}
        >
          <MenuButton icon={<Eye className="size-3" />} onClick={() => { setMenuOpen(false); onView(); }}>
            View detail
          </MenuButton>
          <MenuButton icon={<CheckCircle2 className="size-3" />} onClick={() => { setMenuOpen(false); onModerate(); }}>
            Moderate
          </MenuButton>
          <div className="my-0.5 h-px bg-border" />
          <MenuButton
            icon={<Trash2 className="size-3" />}
            danger
            onClick={() => { setMenuOpen(false); onDelete(); }}
          >
            Delete
          </MenuButton>
        </div>
      )}

      <div className="flex flex-col gap-1.5 px-3 pb-3 pt-2.5">
        <div className="line-clamp-2 min-h-[36px] text-[13.5px] font-semibold leading-tight">
          {item.title || "Untitled showcase"}
        </div>
        <div className="flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground">
          <span className="inline-flex size-5 shrink-0 items-center justify-center rounded-full bg-primary/15 font-mono text-[10px] font-bold text-primary">
            {initials}
          </span>
          <span className="truncate">@{item.showcase.user.username}</span>
          {item.showcase.isVerified && (
            <ShieldCheck className="size-3 shrink-0 text-emerald-600" />
          )}
        </div>
        <div className="flex flex-wrap items-center gap-1">
          {item.tags.slice(0, 3).map((tag, idx) => (
            <span
              key={`${item.id}-tag-${idx}`}
              className="rounded border border-border bg-muted/40 px-1.5 py-0 text-[10px] font-medium text-muted-foreground"
            >
              #{tag.nameTag}
            </span>
          ))}
          <span className="ml-auto text-[10px] text-muted-foreground/70">
            {formatRelativeTime(item.createdAt)}
          </span>
        </div>
      </div>
    </div>
  );
}

function MenuButton({
  icon,
  children,
  onClick,
  danger,
}: {
  icon: React.ReactNode;
  children: React.ReactNode;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs font-medium transition hover:bg-muted",
        danger ? "text-rose-700" : "text-foreground",
      )}
    >
      {icon}
      {children}
    </button>
  );
}
