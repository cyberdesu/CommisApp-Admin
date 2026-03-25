import { Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";

import { getSessionAdmin } from "@/lib/auth/session";
import {
  ArtistRequestStatus,
  ensureArtistVerificationTable,
  isArtistRequestStatus,
} from "@/lib/artist-verification";
import prisma from "@/lib/prisma";
import { minio, MINIO_BUCKET_NAME } from "@/lib/minio";

type ArtistRequestRow = {
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

async function enrichMedia(row: ArtistRequestRow): Promise<ArtistRequestRow> {
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

function buildWhereClause(status: string, search: string) {
  const filters: Prisma.Sql[] = [];

  if (status !== "ALL") {
    filters.push(Prisma.sql`r."status" = ${status}::"VerificationStatus"`);
  }

  if (search) {
    const term = `%${search}%`;
    filters.push(
      Prisma.sql`(
        u.username ILIKE ${term}
        OR u.email ILIKE ${term}
        OR COALESCE(u.name, '') ILIKE ${term}
      )`,
    );
  }

  if (filters.length === 0) return Prisma.empty;
  return Prisma.sql`WHERE ${Prisma.join(filters, " AND ")}`;
}

export async function GET(req: NextRequest) {
  try {
    const admin = await getSessionAdmin(req);
    if (!admin) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    await ensureArtistVerificationTable();

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
    const whereClause = buildWhereClause(status, search);

    const [rows, countRows] = await Promise.all([
      prisma.$queryRaw<ArtistRequestRow[]>(Prisma.sql`
        SELECT
          r.id,
          r."userId" AS "userId",
          r."status" AS "status",
          r."requestedAt" AS "requestedAt",
          r."reviewedAt" AS "reviewedAt",
          r."reviewReason" AS "reviewReason",
          r."reviewedByAdminId" AS "reviewedByAdminId",
          u.username,
          u.email,
          u.name,
          u.role,
          u.verified,
          u."verifiedArtists",
          u.avatar,
          u.banner,
          u.country,
          u."createdAt"
        FROM "artist_verification_requests" r
        INNER JOIN "User" u ON u.id = r."userId"
        ${whereClause}
        ORDER BY r."requestedAt" DESC
        LIMIT ${limit}
        OFFSET ${offset}
      `),
      prisma.$queryRaw<Array<{ total: bigint }>>(Prisma.sql`
        SELECT COUNT(*)::BIGINT AS total
        FROM "artist_verification_requests" r
        INNER JOIN "User" u ON u.id = r."userId"
        ${whereClause}
      `),
    ]);

    const total = Number(countRows[0]?.total ?? 0);
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
