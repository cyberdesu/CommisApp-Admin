import { NextRequest, NextResponse } from "next/server";

import { getSessionAdmin } from "@/lib/auth/session";
import { ArtistRequestStatus, isArtistRequestStatus } from "@/lib/artist-verification";
import { minio, MINIO_BUCKET_NAME } from "@/lib/minio";
import prisma from "@/lib/prisma";
import { Prisma } from "@/prisma/generated/client";

type ArtistRequestItem = {
  id: number;
  userId: number;
  status: ArtistRequestStatus;
  requestedAt: Date;
  reviewedAt: Date | null;
  reviewReason: string | null;
  reviewedByAdminId: number | null;
  username: string;
  email: string;
  name: string | null;
  role: string;
  verified: boolean;
  verifiedArtists: boolean;
  avatar: string | null;
  banner: string | null;
  country: string | null;
  createdAt: Date;
};

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 50;

function parsePositiveInt(value: string | null, fallback: number) {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

async function enrichMedia(row: ArtistRequestItem): Promise<ArtistRequestItem> {
  const [avatar, banner] = await Promise.all([
    minio.getFile(row.avatar, MINIO_BUCKET_NAME),
    minio.getFile(row.banner, MINIO_BUCKET_NAME),
  ]);

  return {
    ...row,
    avatar,
    banner,
  };
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
    const offset = (page - 1) * limit;

    const statusRaw = (searchParams.get("status") || "PENDING")
      .trim()
      .toUpperCase();
    const status = statusRaw === "ALL" || isArtistRequestStatus(statusRaw)
      ? statusRaw
      : "PENDING";

    const search = (searchParams.get("search") || "").trim();

    const statusFilter: ArtistRequestStatus | undefined = status === "ALL"
      ? undefined
      : status;
    const userSearchFilters: Prisma.UserWhereInput[] = search
      ? [
          { username: { contains: search, mode: "insensitive" } },
          { email: { contains: search, mode: "insensitive" } },
          { name: { contains: search, mode: "insensitive" } },
        ]
      : [];

    const where: Prisma.ArtistVerificationRequestWhereInput = {
      ...(statusFilter
        ? { status: statusFilter }
        : {}),
      ...(search
        ? {
            user: {
              is: {
                OR: userSearchFilters,
              },
            },
          }
        : {}),
    };

    const [requests, total] = await Promise.all([
      prisma.artistVerificationRequest.findMany({
        where,
        orderBy: { requestedAt: "desc" },
        skip: offset,
        take: limit,
        include: {
          user: {
            select: {
              username: true,
              email: true,
              name: true,
              role: true,
              verified: true,
              verifiedArtists: true,
              avatar: true,
              banner: true,
              country: true,
              createdAt: true,
            },
          },
        },
      }),
      prisma.artistVerificationRequest.count({ where }),
    ]);

    const rows: ArtistRequestItem[] = requests.map((request) => ({
      id: Number(request.id),
      userId: request.userId,
      status: request.status,
      requestedAt: request.requestedAt,
      reviewedAt: request.reviewedAt,
      reviewReason: request.reviewReason,
      reviewedByAdminId: request.reviewedByAdminId,
      username: request.user.username,
      email: request.user.email,
      name: request.user.name,
      role: request.user.role,
      verified: request.user.verified,
      verifiedArtists: request.user.verifiedArtists,
      avatar: request.user.avatar,
      banner: request.user.banner,
      country: request.user.country,
      createdAt: request.user.createdAt,
    }));

    const totalPages = Math.max(1, Math.ceil(total / limit));
    const data = await Promise.all(rows.map((row) => enrichMedia(row)));

    return NextResponse.json({
      data,
      meta: {
        total,
        page,
        limit,
        totalPages,
      },
      filters: {
        status,
        search,
      },
    });
  } catch (error) {
    console.error("Fetch artist requests error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 },
    );
  }
}
