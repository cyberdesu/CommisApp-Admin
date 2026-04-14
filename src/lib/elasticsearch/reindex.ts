import "server-only";
import prisma from "@/lib/prisma";
import { bulkIndex, deleteIndex, ensureIndex } from "./client";
import {
  BULK_BATCH_SIZE,
  ES_INDEX_PROFILES,
  ES_INDEX_SERVICES,
  ES_INDEX_SHOWCASES,
} from "./constants";
import {
  profilesMappings,
  servicesMappings,
  sharedIndexSettings,
  showcasesMappings,
} from "./mappings";

export type ReindexResult = {
  services: { indexed: number; total: number };
  showcases: { indexed: number; total: number };
  profiles: { indexed: number; total: number };
};

export type DeleteIndicesResult = {
  services: { deleted: boolean };
  showcases: { deleted: boolean };
  profiles: { deleted: boolean };
};

async function ensureAllIndices() {
  await Promise.all([
    ensureIndex(ES_INDEX_SERVICES, sharedIndexSettings, servicesMappings),
    ensureIndex(ES_INDEX_SHOWCASES, sharedIndexSettings, showcasesMappings),
    ensureIndex(ES_INDEX_PROFILES, sharedIndexSettings, profilesMappings),
  ]);
}

type ServiceRatingRow = {
  id: string;
  avgRating: string | null;
  reviewCount: number;
};

async function reindexServices() {
  const services = await prisma.service.findMany({
    where: { status: { not: "DRAFT" } },
    include: {
      user: { select: { username: true, name: true } },
      categories: { select: { nameTag: true } },
    },
  });

  const ratingRows = services.length
    ? await prisma.$queryRaw<ServiceRatingRow[]>`
        SELECT id, "avgRating"::text AS "avgRating", "reviewCount"
        FROM "Service"
        WHERE id = ANY(${services.map((s) => s.id)}::text[])
      `
    : [];
  const ratingMap = new Map(ratingRows.map((r) => [r.id, r]));

  const docs = services.map((s) => {
    const rating = ratingMap.get(s.id);
    return {
      id: s.id,
      body: {
        id: s.id,
        title: s.title,
        shortDescription: s.shortDescription,
        canDo: s.canDo,
        categories: s.categories.map((c) => c.nameTag),
        status: s.status,
        requestMode: s.requestMode,
        basePrice: Number(s.basePrice),
        avgRating: rating?.avgRating ? Number(rating.avgRating) : null,
        reviewCount: rating?.reviewCount ?? 0,
        slotsAvailable: s.slotsEnabled
          ? Math.max(0, (s.slotsTotal ?? 0) - s.slotsUsed)
          : null,
        userId: s.userId,
        username: s.user.username,
        artistName: s.user.name,
        slug: s.slug,
        coverImageUrl: s.coverImageUrl,
        updatedAt: s.updatedAt.toISOString(),
        createdAt: s.createdAt.toISOString(),
      },
    };
  });

  const indexed = await bulkIndex(ES_INDEX_SERVICES, docs, BULK_BATCH_SIZE);
  return { indexed, total: services.length };
}

async function reindexShowcases() {
  const items = await prisma.showcaseItem.findMany({
    where: { isDraft: false },
    include: {
      showcase: {
        include: { user: { select: { id: true, username: true } } },
      },
      tags: { select: { nameTag: true } },
    },
  });

  const docs = items.map((item) => ({
    id: item.id,
    body: {
      id: item.id,
      title: item.title,
      tags: item.tags.map((t) => t.nameTag),
      likeCount: item.likeCount,
      viewCount: item.viewCount,
      ownerId: item.showcase.user.id,
      username: item.showcase.user.username,
      showcaseId: item.showcaseId,
      isDraft: item.isDraft,
      containsMatureContent: item.containsMatureContent,
      createdAt: item.createdAt.toISOString(),
    },
  }));

  const indexed = await bulkIndex(ES_INDEX_SHOWCASES, docs, BULK_BATCH_SIZE);
  return { indexed, total: items.length };
}

async function reindexProfiles() {
  const users = await prisma.user.findMany({
    where: { verified: true },
    select: {
      id: true,
      username: true,
      name: true,
      bio: true,
      avatar: true,
      country: true,
      verifiedArtists: true,
      createdAt: true,
      _count: {
        select: { followers: true, following: true, services: true },
      },
      showcases: {
        select: { _count: { select: { showcaseItems: true } } },
      },
    },
  });

  const docs = users.map((u) => ({
    id: String(u.id),
    body: {
      id: String(u.id),
      username: u.username,
      name: u.name,
      bio: u.bio,
      avatar: u.avatar,
      followerCount: u._count.followers,
      followingCount: u._count.following,
      serviceCount: u._count.services,
      showcaseCount: u.showcases?._count.showcaseItems ?? 0,
      isArtist: u.verifiedArtists,
      country: u.country,
      createdAt: u.createdAt.toISOString(),
    },
  }));

  const indexed = await bulkIndex(ES_INDEX_PROFILES, docs, BULK_BATCH_SIZE);
  return { indexed, total: users.length };
}

export async function reindexAll(): Promise<ReindexResult> {
  await ensureAllIndices();
  const [services, showcases, profiles] = await Promise.all([
    reindexServices(),
    reindexShowcases(),
    reindexProfiles(),
  ]);
  return { services, showcases, profiles };
}

export async function deleteAllIndices(): Promise<DeleteIndicesResult> {
  const [services, showcases, profiles] = await Promise.all([
    deleteIndex(ES_INDEX_SERVICES),
    deleteIndex(ES_INDEX_SHOWCASES),
    deleteIndex(ES_INDEX_PROFILES),
  ]);

  return {
    services: { deleted: services },
    showcases: { deleted: showcases },
    profiles: { deleted: profiles },
  };
}
