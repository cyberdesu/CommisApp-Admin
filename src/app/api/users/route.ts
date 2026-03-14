import { NextRequest, NextResponse } from "next/server";
import { Client as MinioClient } from "minio";

import prisma from "@/lib/prisma";
import { getSessionAdmin } from "@/lib/auth/session";

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 100;

type SortField = "createdAt" | "updatedAt" | "name" | "email" | "username";
type SortOrder = "asc" | "desc";

const MINIO_BUCKET = process.env.MINIO_BUCKET || "artwish";

const minioClient =
  process.env.MINIO_ENDPOINT &&
  process.env.RUSTFS_ACCESS_KEY &&
  process.env.RUSTFS_SECRET_KEY
    ? new MinioClient({
        endPoint: process.env.MINIO_ENDPOINT,
        useSSL: process.env.MINIO_USE_SSL !== "false",
        accessKey: process.env.RUSTFS_ACCESS_KEY,
        secretKey: process.env.RUSTFS_SECRET_KEY,
      })
    : null;

async function resolveMinioObjectUrl(path?: string | null) {
  if (!path) return path;
  if (/^https?:\/\//i.test(path)) return path;
  if (!minioClient) return path;

  try {
    return await minioClient.presignedGetObject(MINIO_BUCKET, path, 60 * 60, {
      "response-content-type": "image/webp",
      "content-disposition": "inline",
      "response-cache-control": "no-cache",
    });
  } catch {
    return path;
  }
}

async function enrichUserMedia<
  T extends { avatar?: string | null; banner?: string | null },
>(user: T) {
  const [avatar, banner] = await Promise.all([
    resolveMinioObjectUrl(user.avatar),
    resolveMinioObjectUrl(user.banner),
  ]);

  return {
    ...user,
    avatar,
    banner,
  };
}

function parsePositiveInt(value: string | null, fallback: number) {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function parseBooleanFilter(value: string | null) {
  if (!value || value === "all") return undefined;
  if (value === "true") return true;
  if (value === "false") return false;
  return undefined;
}

function parseSortField(value: string | null): SortField {
  const allowed: SortField[] = [
    "createdAt",
    "updatedAt",
    "name",
    "email",
    "username",
  ];
  return allowed.includes(value as SortField)
    ? (value as SortField)
    : "createdAt";
}

function parseSortOrder(value: string | null): SortOrder {
  return value === "asc" ? "asc" : "desc";
}

export async function GET(req: NextRequest) {
  try {
    const admin = await getSessionAdmin(req);

    if (!admin) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);

    const page = parsePositiveInt(searchParams.get("page"), DEFAULT_PAGE);
    const requestedLimit = parsePositiveInt(
      searchParams.get("limit"),
      DEFAULT_LIMIT,
    );
    const limit = Math.min(requestedLimit, MAX_LIMIT);
    const skip = (page - 1) * limit;

    const search = (searchParams.get("search") || "").trim();
    const role = (searchParams.get("role") || "").trim();
    const verified = parseBooleanFilter(searchParams.get("verified"));
    const verifiedArtists = parseBooleanFilter(
      searchParams.get("verifiedArtists"),
    );
    const hasAvatar = parseBooleanFilter(searchParams.get("hasAvatar"));

    const sortBy = parseSortField(searchParams.get("sortBy"));
    const sortOrder = parseSortOrder(searchParams.get("sortOrder"));

    const whereClause = {
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: "insensitive" as const } },
              { email: { contains: search, mode: "insensitive" as const } },
              { username: { contains: search, mode: "insensitive" as const } },
            ],
          }
        : {}),
      ...(role && role !== "all" ? { role } : {}),
      ...(verified !== undefined ? { verified } : {}),
      ...(verifiedArtists !== undefined ? { verifiedArtists } : {}),
      ...(hasAvatar !== undefined
        ? hasAvatar
          ? {
              avatar: {
                not: null,
              },
            }
          : {
              OR: [{ avatar: null }, { avatar: "" }],
            }
        : {}),
    };

    const [users, total, roleCounts] = await Promise.all([
      prisma.user.findMany({
        where: whereClause,
        skip,
        take: limit,
        orderBy: {
          [sortBy]: sortOrder,
        },
        select: {
          id: true,
          email: true,
          name: true,
          username: true,
          role: true,
          verified: true,
          verifiedArtists: true,
          avatar: true,
          banner: true,
          bio: true,
          country: true,
          createdAt: true,
          updatedAt: true,
          _count: {
            select: {
              followers: true,
              following: true,
              bookmarks: true,
              folders: true,
              workflows: true,
              refreshTokens: true,
            },
          },
          socials: {
            select: {
              instagram: true,
              twitter: true,
              facebook: true,
              tiktok: true,
            },
          },
          showcases: {
            select: {
              id: true,
              isVerified: true,
              _count: {
                select: {
                  showcaseItems: true,
                },
              },
            },
          },
          settings: {
            select: {
              likesPrivacy: true,
            },
          },
        },
      }),
      prisma.user.count({ where: whereClause }),
      prisma.user.groupBy({
        by: ["role"],
        _count: {
          role: true,
        },
      }),
    ]);

    const usersWithResolvedMedia = await Promise.all(
      users.map((user) => enrichUserMedia(user)),
    );

    const totalPages = Math.ceil(total / limit);

    return NextResponse.json({
      data: usersWithResolvedMedia,
      meta: {
        total,
        page,
        limit,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
      filters: {
        search,
        role: role || "all",
        verified: verified ?? "all",
        verifiedArtists: verifiedArtists ?? "all",
        hasAvatar: hasAvatar ?? "all",
        sortBy,
        sortOrder,
      },
      stats: {
        totalUsers: total,
        roles: roleCounts.map((item) => ({
          role: item.role,
          count: item._count.role,
        })),
      },
    });
  } catch (error) {
    console.error("Fetch users error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 },
    );
  }
}
