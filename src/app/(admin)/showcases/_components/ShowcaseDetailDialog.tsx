"use client";

import { useState } from "react";
import {
  AlertTriangle,
  Bookmark,
  Calendar,
  Eye,
  Image as ImageIcon,
  Layers,
  ShieldCheck,
  Star,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { resolveMediaUrl } from "@/lib/media";
import { formatDate } from "../_lib/helpers";
import type { ShowcaseDetailData } from "../_lib/types";

export function ShowcaseDetailDialog({
  detailId,
  detail,
  isLoading,
  onClose,
}: {
  detailId: string | null;
  detail: ShowcaseDetailData | undefined;
  isLoading: boolean;
  onClose: () => void;
}) {
  return (
    <Dialog
      open={detailId !== null}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent
        className="flex max-h-[90dvh] w-full max-w-[calc(100%-2rem)] flex-col overflow-hidden rounded-[28px] border border-border bg-card p-0 sm:max-w-2xl"
        showCloseButton={false}
      >
        <div className="relative shrink-0 overflow-hidden bg-gradient-to-r from-sidebar to-sidebar/80 p-6">
          <div className="pointer-events-none absolute -right-8 -top-8 size-40 rounded-full bg-primary/15 blur-2xl" />
          <DialogHeader className="relative gap-1.5">
            <DialogTitle className="text-xl font-semibold text-sidebar-foreground">
              Showcase Detail
            </DialogTitle>
            <DialogDescription className="text-sm text-sidebar-foreground/60">
              Complete showcase information and media files.
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {isLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-24 rounded-2xl" />
              <Skeleton className="h-40 rounded-2xl" />
              <Skeleton className="h-32 rounded-2xl" />
            </div>
          ) : detail ? (
            <DetailBody detail={detail} />
          ) : (
            <div className="rounded-2xl border border-dashed border-border bg-secondary/30 p-8 text-center text-sm text-muted-foreground">
              Showcase details not available.
            </div>
          )}
        </div>

        <DialogFooter className="shrink-0 rounded-b-[28px] border-t border-border bg-secondary/50 px-6 py-4">
          <Button
            variant="outline"
            className="rounded-xl border-border bg-card text-sm"
            onClick={onClose}
          >
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DetailBody({ detail }: { detail: ShowcaseDetailData }) {
  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-border bg-secondary/30 p-5">
        <h3 className="text-lg font-bold text-foreground">
          {detail.title || "Untitled Showcase"}
        </h3>
        <div className="mt-2 flex items-center gap-3">
          <AuthorAvatar
            avatar={detail.showcase.user.avatar}
            username={detail.showcase.user.username}
          />
          <div>
            <p className="text-sm font-medium text-foreground">
              @{detail.showcase.user.username}
            </p>
            <p className="text-xs text-muted-foreground">
              {detail.showcase.user.email}
            </p>
          </div>
          {detail.showcase.isVerified && (
            <Badge className="ml-auto rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 border border-emerald-200">
              <ShieldCheck className="mr-1 size-3" />
              Verified
            </Badge>
          )}
          {detail.showcase.user.isBanned && (
            <Badge className="rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-semibold text-red-700 border border-red-200">
              <AlertTriangle className="mr-1 size-3" />
              Banned
            </Badge>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "Views", value: detail.viewCount, icon: Eye },
          { label: "Likes", value: detail.likeCount, icon: Star },
          {
            label: "Bookmarks",
            value: detail._count.bookmarkedBy,
            icon: Bookmark,
          },
          { label: "Images", value: detail.imageCount, icon: Layers },
        ].map((stat) => (
          <div
            key={stat.label}
            className="rounded-xl border border-border bg-card p-3 text-center"
          >
            <stat.icon className="mx-auto size-4 text-muted-foreground" />
            <p className="mt-1 text-lg font-bold tabular-nums text-foreground">
              {stat.value.toLocaleString()}
            </p>
            <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              {stat.label}
            </p>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        {detail.isDraft ? (
          <Badge variant="outline" className="rounded-full text-xs">
            Draft
          </Badge>
        ) : (
          <Badge className="rounded-full bg-sidebar px-2.5 py-0.5 text-[10px] font-bold uppercase text-sidebar-foreground">
            Published
          </Badge>
        )}
        {detail.isFromVerifiedCommission && (
          <Badge className="rounded-full border-primary/25 bg-primary/10 px-2.5 py-0.5 text-[10px] font-bold uppercase text-primary">
            Commission
          </Badge>
        )}
        {detail.containsMatureContent && (
          <Badge className="rounded-full bg-red-50 px-2.5 py-0.5 text-[10px] font-bold uppercase text-red-700 border border-red-200">
            Mature Content
          </Badge>
        )}
      </div>

      {detail.tags.length > 0 && (
        <div className="rounded-2xl border border-border bg-card p-4">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
            Tags
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {detail.tags.map((tag) => (
              <Badge
                key={tag.id}
                variant="outline"
                className="rounded-full border-border bg-secondary/45 px-2 py-0 text-[10px] font-medium text-foreground/60"
              >
                #{tag.nameTag}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {detail.showcaseFiles.length > 0 && (
        <div className="rounded-2xl border border-border bg-card p-4">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
            Media Files ({detail.showcaseFiles.length})
          </p>
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
            {detail.showcaseFiles.map((file) => (
              <MediaTile
                key={file.id}
                url={file.url}
                type={file.type}
                title={detail.title}
              />
            ))}
          </div>
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        <DateCell label="Created" value={formatDate(detail.createdAt)} />
        <DateCell label="Updated" value={formatDate(detail.updatedAt)} />
      </div>
    </div>
  );
}

function AuthorAvatar({
  avatar,
  username,
}: {
  avatar: string | null;
  username: string;
}) {
  const [loadFailed, setLoadFailed] = useState(false);
  const safeSrc = avatar ? resolveMediaUrl(avatar) : null;

  if (safeSrc && !loadFailed) {
    return (
      <img
        src={safeSrc}
        alt={username}
        onError={() => setLoadFailed(true)}
        className="size-8 rounded-full object-cover"
        loading="lazy"
      />
    );
  }

  return (
    <div className="flex size-8 items-center justify-center rounded-full bg-primary/15 text-xs font-bold uppercase text-primary">
      {username.charAt(0)}
    </div>
  );
}

function MediaTile({
  url,
  type,
  title,
}: {
  url: string;
  type: string;
  title: string;
}) {
  const [loadFailed, setLoadFailed] = useState(false);
  const safeSrc = resolveMediaUrl(url);
  const showImage =
    type.startsWith("image") && safeSrc && !loadFailed;

  return (
    <div className="group relative overflow-hidden rounded-xl border border-border bg-secondary/30">
      {showImage ? (
        <img
          src={safeSrc}
          alt={title}
          onError={() => setLoadFailed(true)}
          className="aspect-square w-full object-cover transition-transform group-hover:scale-105"
          loading="lazy"
          decoding="async"
        />
      ) : (
        <div className="flex aspect-square items-center justify-center">
          <ImageIcon className="size-8 text-muted-foreground/40" />
        </div>
      )}
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/50 to-transparent px-2 pb-1.5 pt-4">
        <p className="truncate text-[10px] font-medium text-white">{type}</p>
      </div>
    </div>
  );
}

function DateCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-3">
      <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
        <Calendar className="mr-1 inline-block size-3" />
        {label}
      </p>
      <p className="mt-1 text-sm font-medium text-foreground">{value}</p>
    </div>
  );
}
