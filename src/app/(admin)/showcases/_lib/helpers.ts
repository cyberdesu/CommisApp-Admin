import type { ShowcaseDetailData, ShowcaseItem, ShowcaseTab } from "./types";

export function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60_000);
  const diffHours = Math.floor(diffMs / 3_600_000);
  const diffDays = Math.floor(diffMs / 86_400_000);

  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 30) return `${diffDays}d ago`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function compactNumber(n: number): string {
  if (n >= 1_000_000) {
    const v = (n / 1_000_000).toFixed(1).replace(/\.0$/, "");
    return `${v}M`;
  }
  if (n >= 1_000) {
    const v = (n / 1_000).toFixed(1).replace(/\.0$/, "");
    return `${v}k`;
  }
  return n.toString();
}

export function matchesTab(item: ShowcaseItem, tab: ShowcaseTab): boolean {
  switch (tab) {
    case "ALL":
      return true;
    case "PUBLISHED":
      return !item.isDraft;
    case "DRAFTS":
      return item.isDraft;
    case "COMMISSION":
      return item.isFromVerifiedCommission;
    case "MATURE":
      return false; // batch items lack containsMatureContent — needs detail fetch
    case "VERIFIED":
      return item.showcase.isVerified;
  }
}

export function tabLabel(tab: ShowcaseTab): string {
  switch (tab) {
    case "ALL":
      return "All";
    case "PUBLISHED":
      return "Published";
    case "DRAFTS":
      return "Drafts";
    case "COMMISSION":
      return "Commission";
    case "MATURE":
      return "Mature";
    case "VERIFIED":
      return "Verified";
  }
}

export function getInitials(value: string): string {
  const v = value.trim();
  if (!v) return "?";
  return v.slice(0, 2).toUpperCase();
}

const THUMB_PALETTES: ReadonlyArray<readonly [string, string, string, string]> =
  [
    ["#fb923c", "#7c2d12", "#0b1220", "#f59e0b"],
    ["#6366f1", "#1e3a8a", "#0b1220", "#a78bfa"],
    ["#ec4899", "#831843", "#0b1220", "#f472b6"],
    ["#10b981", "#064e3b", "#0b1220", "#34d399"],
    ["#0ea5e9", "#0c4a6e", "#0b1220", "#7dd3fc"],
    ["#f97316", "#9a3412", "#1e1b4b", "#fb923c"],
    ["#a855f7", "#581c87", "#0b1220", "#c084fc"],
    ["#f43f5e", "#881337", "#1c1917", "#fb7185"],
  ];

export function getThumbPalette(seed: number) {
  const idx = ((seed % THUMB_PALETTES.length) + THUMB_PALETTES.length) %
    THUMB_PALETTES.length;
  const [a, b, c, d] = THUMB_PALETTES[idx];
  return { a, b, c, d };
}

export function hashSeed(value: string): number {
  let h = 0;
  for (let i = 0; i < value.length; i++) {
    h = (h * 31 + value.charCodeAt(i)) >>> 0;
  }
  return h;
}

export function getThumbUrl(item: ShowcaseItem): string | null {
  const first = item.showcaseFiles?.find((f) => f.type.startsWith("image"));
  return first?.url ?? null;
}

export function detailToItem(detail: ShowcaseDetailData): ShowcaseItem {
  return {
    id: detail.id,
    title: detail.title,
    isDraft: detail.isDraft,
    isFromVerifiedCommission: detail.isFromVerifiedCommission,
    likeCount: detail.likeCount,
    viewCount: detail.viewCount,
    createdAt: detail.createdAt,
    showcase: {
      isVerified: detail.showcase.isVerified,
      user: {
        id: detail.showcase.user.id,
        username: detail.showcase.user.username,
        email: detail.showcase.user.email,
      },
    },
    tags: detail.tags.map((t) => ({ nameTag: t.nameTag })),
  };
}
