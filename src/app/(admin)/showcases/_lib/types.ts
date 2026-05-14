export type ShowcaseItem = {
  id: string;
  title: string;
  isDraft: boolean;
  isFromVerifiedCommission: boolean;
  containsMatureContent: boolean;
  likeCount: number;
  viewCount: number;
  createdAt: string;
  showcase: {
    isVerified: boolean;
    user: {
      id: number;
      username: string;
      email: string;
    };
  };
  tags: { nameTag: string }[];
  showcaseFiles?: { id: string; url: string; type: string }[];
};

export type ShowcaseTabStats = Record<ShowcaseTab, number>;

export type ShowcasesResponse = {
  data: ShowcaseItem[];
  meta: {
    limit: number;
    page: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
  stats: ShowcaseTabStats;
  filters: {
    search: string;
    tab: ShowcaseTab;
  };
};

export type ShowcaseDetailData = {
  id: string;
  title: string;
  description: unknown;
  isDraft: boolean;
  isFromVerifiedCommission: boolean;
  containsMatureContent: boolean;

  contentWarnings: unknown;
  likeCount: number;
  viewCount: number;
  imageCount: number;
  createdAt: string;
  updatedAt: string;
  showcase: {
    isVerified: boolean;
    user: {
      id: number;
      username: string;
      name: string | null;
      email: string;
      avatar: string | null;
      isBanned: boolean;
      suspendedUntil: string | null;
    };
  };
  tags: { id: string; nameTag: string }[];
  showcaseFiles: {
    id: string;
    url: string;
    type: string;
    createdAt: string;
  }[];
  _count: {
    publicViews: number;
    bookmarkedBy: number;
    interactions: number;
  };
};

export type ShowcaseDetailResponse = {
  data: ShowcaseDetailData;
};

export type ShowcaseTab =
  | "ALL"
  | "PUBLISHED"
  | "DRAFTS"
  | "COMMISSION"
  | "MATURE"
  | "VERIFIED";

export type ShowcaseView = "GRID" | "TABLE";

export const PAGE_SIZE = 12;
