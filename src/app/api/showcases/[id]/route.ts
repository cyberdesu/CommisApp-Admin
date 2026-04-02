import { NextRequest, NextResponse } from "next/server";

import { getSessionAdmin } from "@/lib/auth/session";
import { createRequestLogger } from "@/lib/logger";
import { minio, MINIO_BUCKET_NAME } from "@/lib/minio";
import prisma from "@/lib/prisma";

type RouteContext = {
  params: Promise<{ id: string }>;
};

async function resolveMedia(path?: string | null) {
  if (!path) return null;
  return minio.getFile(path, MINIO_BUCKET_NAME);
}

export async function GET(req: NextRequest, context: RouteContext) {
  const logger = createRequestLogger(req, {
    route: "api.showcases.detail",
  });

  try {
    const admin = await getSessionAdmin(req);
    if (!admin) {
      logger.warn("Rejected showcase detail due to missing admin session");
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { id } = await context.params;
    if (!id?.trim()) {
      logger.warn("Rejected showcase detail due to invalid showcase id", { id });
      return NextResponse.json(
        { message: "Invalid showcase id" },
        { status: 400 },
      );
    }

    const requestLogger = logger.child({
      adminId: admin.id,
      showcaseId: id,
    });

    const item = await prisma.showcaseItem.findUnique({
      where: { id },
      select: {
        id: true,
        title: true,
        description: true,
        isDraft: true,
        isFromVerifiedCommission: true,
        containsMatureContent: true,
        contentWarnings: true,
        likeCount: true,
        viewCount: true,
        imageCount: true,
        createdAt: true,
        updatedAt: true,
        showcase: {
          select: {
            isVerified: true,
            user: {
              select: {
                id: true,
                username: true,
                name: true,
                email: true,
                avatar: true,
                isBanned: true,
                suspendedUntil: true,
              },
            },
          },
        },
        tags: {
          select: { id: true, nameTag: true },
        },
        showcaseFiles: {
          orderBy: { createdAt: "asc" },
          select: {
            id: true,
            url: true,
            type: true,
            createdAt: true,
          },
        },
        _count: {
          select: {
            publicViews: true,
            bookmarkedBy: true,
            interactions: true,
          },
        },
      },
    });

    if (!item) {
      requestLogger.warn("Showcase not found");
      return NextResponse.json(
        { message: "Showcase not found" },
        { status: 404 },
      );
    }

    // Resolve media URLs in parallel
    const [authorAvatar, ...fileUrls] = await Promise.all([
      resolveMedia(item.showcase.user.avatar),
      ...item.showcaseFiles.map((f) => resolveMedia(f.url)),
    ]);

    const data = {
      ...item,
      showcase: {
        ...item.showcase,
        user: {
          ...item.showcase.user,
          avatar: authorAvatar,
        },
      },
      showcaseFiles: item.showcaseFiles.map((f, i) => ({
        ...f,
        url: fileUrls[i] ?? f.url,
      })),
    };

    requestLogger.info("Fetched showcase detail", {
      showcaseFileCount: data.showcaseFiles.length,
    });

    return NextResponse.json({ data });
  } catch (error) {
    logger.error("Failed to fetch showcase detail", { error });
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 },
    );
  }
}
