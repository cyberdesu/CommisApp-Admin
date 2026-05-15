import { NextRequest, NextResponse } from "next/server";

import {
  normalizeAdminSearch,
  parsePositiveInt,
  tokenizeSearch,
} from "@/lib/admin-api";
import { getSessionAdmin } from "@/lib/auth/session";
import { createRequestLogger } from "@/lib/logger";
import { minio, MINIO_BUCKET_NAME } from "@/lib/minio";
import prisma from "@/lib/prisma";
import { Prisma } from "@/prisma/generated/client";

const DEFAULT_LIMIT = 12;
const MAX_LIMIT = 100;

const VALID_TABS = [
  "ALL",
  "PUBLISHED",
  "DRAFTS",
  "COMMISSION",
  "MATURE",
  "VERIFIED",
] as const;
type ShowcaseTabFilter = (typeof VALID_TABS)[number];

function isOneOf<T extends readonly string[]>(
  value: string,
  allowed: T,
): value is T[number] {
  return (allowed as readonly string[]).includes(value);
}

function buildTabWhere(
  tab: ShowcaseTabFilter,
): Prisma.ShowcaseItemWhereInput | null {
  switch (tab) {
    case "ALL":
      return null;
    case "PUBLISHED":
      return { isDraft: false };
    case "DRAFTS":
      return { isDraft: true };
    case "COMMISSION":
      return { isFromVerifiedCommission: true };
    case "MATURE":
      return { containsMatureContent: true };
    case "VERIFIED":
      return { showcase: { is: { isVerified: true } } };
  }
}

export async function GET(req: NextRequest) {
  const logger = createRequestLogger(req, {
    route: "api.showcases.list",
  });

  try {
    const admin = await getSessionAdmin(req);
    if (!admin) {
      logger.warn("Rejected showcases list due to missing admin session");
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const requestedLimit = parsePositiveInt(
      searchParams.get("limit"),
      DEFAULT_LIMIT,
    );
    const limit = Math.min(requestedLimit, MAX_LIMIT);
    const requestedPage = parsePositiveInt(searchParams.get("page"), 1);
    const search = normalizeAdminSearch(searchParams.get("search"));
    const tokens = tokenizeSearch(search);

    const tabRaw = (searchParams.get("tab") || "ALL").trim().toUpperCase();
    const tab: ShowcaseTabFilter = isOneOf(tabRaw, VALID_TABS)
      ? tabRaw
      : "ALL";

    const requestLogger = logger.child({
      adminId: admin.id,
      limit,
      page: requestedPage,
      tab,
      hasSearch: Boolean(search),
      searchLength: search.length,
      tokenCount: tokens.length,
    });

    const buildShowcaseTokenClause = (
      token: string,
    ): Prisma.ShowcaseItemWhereInput => ({
      OR: [
        { title: { contains: token, mode: "insensitive" } },
        {
          showcase: {
            is: {
              user: {
                is: {
                  OR: [
                    { username: { contains: token, mode: "insensitive" } },
                    { name: { contains: token, mode: "insensitive" } },
                  ],
                },
              },
            },
          },
        },
        {
          tags: {
            some: {
              nameTag: { contains: token, mode: "insensitive" },
            },
          },
        },
      ],
    });

    const baseWhere: Prisma.ShowcaseItemWhereInput =
      tokens.length > 0
        ? { AND: tokens.map(buildShowcaseTokenClause) }
        : {};

    const tabWhere = buildTabWhere(tab);
    const where: Prisma.ShowcaseItemWhereInput = tabWhere
      ? { AND: [baseWhere, tabWhere] }
      : baseWhere;

    const [
      allCount,
      publishedCount,
      draftsCount,
      commissionCount,
      matureCount,
      verifiedCount,
    ] = await prisma.$transaction([
      prisma.showcaseItem.count({ where: baseWhere }),
      prisma.showcaseItem.count({
        where: { AND: [baseWhere, { isDraft: false }] },
      }),
      prisma.showcaseItem.count({
        where: { AND: [baseWhere, { isDraft: true }] },
      }),
      prisma.showcaseItem.count({
        where: { AND: [baseWhere, { isFromVerifiedCommission: true }] },
      }),
      prisma.showcaseItem.count({
        where: { AND: [baseWhere, { containsMatureContent: true }] },
      }),
      prisma.showcaseItem.count({
        where: {
          AND: [baseWhere, { showcase: { is: { isVerified: true } } }],
        },
      }),
    ]);

    const stats: Record<ShowcaseTabFilter, number> = {
      ALL: allCount,
      PUBLISHED: publishedCount,
      DRAFTS: draftsCount,
      COMMISSION: commissionCount,
      MATURE: matureCount,
      VERIFIED: verifiedCount,
    };

    const total = stats[tab];
    const totalPages = Math.max(1, Math.ceil(total / limit));
    const page = Math.min(requestedPage, totalPages);
    const skip = (page - 1) * limit;

    const rows = await prisma.showcaseItem.findMany({
      where,
      take: limit,
      skip,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      select: {
        id: true,
        title: true,
        isDraft: true,
        isFromVerifiedCommission: true,
        containsMatureContent: true,
        likeCount: true,
        viewCount: true,
        createdAt: true,
        showcase: {
          select: {
            isVerified: true,
            user: {
              select: {
                id: true,
                username: true,
                email: true,
              },
            },
          },
        },
        tags: {
          select: {
            nameTag: true,
          },
        },
        showcaseFiles: {
          select: {
            id: true,
            url: true,
            type: true,
          },
          orderBy: { createdAt: "asc" },
          take: 1,
        },
      },
    });

    const data = await Promise.all(
      rows.map(async (row) => {
        const files = await Promise.all(
          row.showcaseFiles.map(async (file) => ({
            ...file,
            url: (await minio.getFile(file.url, MINIO_BUCKET_NAME)) ?? file.url,
          })),
        );
        return { ...row, showcaseFiles: files };
      }),
    );

    requestLogger.info("Fetched showcases list", {
      resultCount: data.length,
      page,
      totalPages,
      total,
    });

    return NextResponse.json({
      data,
      meta: {
        limit,
        page,
        total,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
      stats,
      filters: {
        search,
        tab,
      },
    });
  } catch (error) {
    logger.error("Failed to fetch showcases", { error });
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 },
    );
  }
}
