import { NextRequest, NextResponse } from "next/server";

import prisma from "@/lib/prisma";
import { getSessionAdmin } from "@/lib/auth/session";
import { isAllowedOrigin } from "@/lib/auth/origin";
import { createRequestLogger } from "@/lib/logger";
import { minio, MINIO_BUCKET_NAME } from "@/lib/minio";
import { getUserFinanceDetail } from "@/lib/user-finance";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

function parseUserId(rawId: string) {
  const id = Number(rawId);

  if (!Number.isInteger(id) || id <= 0) {
    return null;
  }

  return id;
}

function normalizeString(value: unknown) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function normalizeOptionalMediaPath(value: unknown) {
  if (value === null) return null;
  if (typeof value !== "string") return undefined;

  const trimmed = value.trim();
  if (trimmed.length === 0) return null;

  return trimmed;
}

export async function GET(req: NextRequest, context: RouteContext) {
  const logger = createRequestLogger(req, {
    route: "api.users.detail",
  });

  try {
    const admin = await getSessionAdmin(req);

    if (!admin) {
      logger.warn("Rejected user detail due to missing admin session");
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { id: rawId } = await context.params;
    const id = parseUserId(rawId);

    if (!id) {
      logger.warn("Rejected user detail due to invalid user id", { rawId });
      return NextResponse.json({ message: "Invalid user id" }, { status: 400 });
    }

    const requestLogger = logger.child({
      adminId: admin.id,
      userId: id,
    });

    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        name: true,
        username: true,
        role: true,
        verified: true,
        verifiedArtists: true,
        isBanned: true,
        suspendedUntil: true,
        banReason: true,
        avatar: true,
        banner: true,
        bio: true,
        country: true,
        createdAt: true,
        updatedAt: true,
        moderations: {
          take: 10,
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            action: true,
            reason: true,
            duration: true,
            expiresAt: true,
            createdAt: true,
            admin: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
      },
    });

    if (!user) {
      requestLogger.warn("User not found");
      return NextResponse.json({ message: "User not found" }, { status: 404 });
    }

    const [enrichedUser, finance] = await Promise.all([
      minio.enrichUserMedia(user, MINIO_BUCKET_NAME),
      getUserFinanceDetail(id),
    ]);

    requestLogger.info("Fetched user detail");

    return NextResponse.json({
      data: {
        ...user,
        ...enrichedUser,
        finance: finance.summary,
        recentPayments: finance.recentPayments,
        recentPayouts: finance.recentPayouts,
      },
    });
  } catch (error) {
    logger.error("Failed to fetch user detail", { error });
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 },
    );
  }
}

import { z } from "zod";

const updateUserSchema = z.object({
  email: z.string().email("Invalid email format").optional(),
  username: z.string().min(3, "Username must be at least 3 characters").max(30).optional(),
  name: z.string().max(50).nullable().optional(),
  role: z.string().min(1, "Role is required").optional(),
  bio: z.string().max(500).nullable().optional(),
  country: z.string().max(100).nullable().optional(),
  avatar: z.string().nullable().optional(),
  banner: z.string().nullable().optional(),
  verified: z.boolean().optional(),
  verifiedArtists: z.boolean().optional(),
});

export async function PATCH(req: NextRequest, context: RouteContext) {
  const logger = createRequestLogger(req, {
    route: "api.users.update",
  });

  try {
    if (!isAllowedOrigin(req)) {
      logger.warn("Rejected user update due to invalid origin");
      return NextResponse.json({ message: "Forbidden origin" }, { status: 403 });
    }

    const admin = await getSessionAdmin(req);

    if (!admin) {
      logger.warn("Rejected user update due to missing admin session");
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { id: rawId } = await context.params;
    const id = parseUserId(rawId);

    if (!id) {
      logger.warn("Rejected user update due to invalid user id", { rawId });
      return NextResponse.json({ message: "Invalid user id" }, { status: 400 });
    }

    const requestLogger = logger.child({
      adminId: admin.id,
      userId: id,
    });

    const existingUser = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        username: true,
        verifiedArtists: true,
      },
    });

    if (!existingUser) {
      requestLogger.warn("User not found for update");
      return NextResponse.json({ message: "User not found" }, { status: 404 });
    }

    const body = await req.json();
    const validationResult = updateUserSchema.safeParse(body);

    if (!validationResult.success) {
      requestLogger.warn("Rejected user update due to validation failure", {
        errors: validationResult.error.flatten().fieldErrors,
      });
      return NextResponse.json(
        { 
          message: "Validation failed", 
          errors: validationResult.error.flatten().fieldErrors 
        },
        { status: 400 }
      );
    }

    const validatedData = validationResult.data;
    
    // Normalize data (optional string fields should be trimmed)
    const email = validatedData.email ? normalizeString(validatedData.email) : undefined;
    const username = validatedData.username ? normalizeString(validatedData.username) : undefined;
    const name = validatedData.name !== undefined ? (validatedData.name ? validatedData.name.trim() : null) : undefined;
    const role = validatedData.role ? normalizeString(validatedData.role) : undefined;
    const bio = validatedData.bio !== undefined ? (validatedData.bio ? validatedData.bio.trim() : null) : undefined;
    const country = validatedData.country !== undefined ? (validatedData.country ? validatedData.country.trim() : null) : undefined;
    const avatar = validatedData.avatar !== undefined ? normalizeOptionalMediaPath(validatedData.avatar) : undefined;
    const banner = validatedData.banner !== undefined ? normalizeOptionalMediaPath(validatedData.banner) : undefined;
    const verified = validatedData.verified;
    const verifiedArtists = validatedData.verifiedArtists;

    if (body.username !== undefined && !username) {
      requestLogger.warn("Rejected user update due to empty username");
      return NextResponse.json(
        { message: "Username is required when provided" },
        { status: 400 },
      );
    }

    if (body.role !== undefined && !role) {
      requestLogger.warn("Rejected user update due to empty role");
      return NextResponse.json(
        { message: "Role is required when provided" },
        { status: 400 },
      );
    }

    if (email && email !== existingUser.email) {
      const duplicateEmail = await prisma.user.findUnique({
        where: { email },
        select: { id: true },
      });

      if (duplicateEmail) {
        requestLogger.warn("Rejected user update due to duplicate email");
        return NextResponse.json(
          { message: "Email is already in use" },
          { status: 409 },
        );
      }
    }

    if (username && username !== existingUser.username) {
      const duplicateUsername = await prisma.user.findUnique({
        where: { username },
        select: { id: true },
      });

      if (duplicateUsername) {
        requestLogger.warn("Rejected user update due to duplicate username");
        return NextResponse.json(
          { message: "Username is already in use" },
          { status: 409 },
        );
      }
    }

    const shouldApproveArtist =
      verifiedArtists === true && existingUser.verifiedArtists === false;

    const updatedUser = await prisma.$transaction(async (tx) => {
      if (shouldApproveArtist) {
        await tx.authToken.deleteMany({
          where: { userId: id },
        });
        await tx.refreshToken.deleteMany({
          where: { userId: id },
        });
      }

      const existingShowcase = shouldApproveArtist
        ? await tx.showcase.findUnique({
            where: { userId: id },
            select: { id: true },
          })
        : null;

      const updated = await tx.user.update({
        where: { id },
        data: {
          ...(email ? { email } : {}),
          ...(username ? { username } : {}),
          ...(name !== undefined ? { name } : {}),
          ...(role ? { role } : {}),
          ...(bio !== undefined ? { bio } : {}),
          ...(country !== undefined ? { country } : {}),
          ...(avatar !== undefined ? { avatar } : {}),
          ...(banner !== undefined ? { banner } : {}),
          ...(verified !== undefined ? { verified } : {}),
          ...(verifiedArtists !== undefined ? { verifiedArtists } : {}),
          ...(shouldApproveArtist ? { role: "artist", verifiedArtists: true } : {}),
          ...(shouldApproveArtist && !existingShowcase
            ? { showcases: { create: {} } }
            : {}),
        },
        select: {
          id: true,
          email: true,
          name: true,
          username: true,
          role: true,
          verified: true,
          verifiedArtists: true,
          isBanned: true,
          suspendedUntil: true,
          banReason: true,
          avatar: true,
          banner: true,
          bio: true,
          country: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      if (shouldApproveArtist) {
        await tx.artistVerificationRequest.updateMany({
          where: {
            userId: id,
            status: "PENDING",
          },
          data: {
            status: "APPROVED",
            reviewedAt: new Date(),
            reviewedByAdminId: admin.id,
          },
        });
      }

      return updated;
    });

    const enrichedUser =
      await minio.enrichUserMedia(updatedUser, MINIO_BUCKET_NAME);

    requestLogger.info("Updated user successfully", {
      promotedToArtist: shouldApproveArtist,
    });

    return NextResponse.json({
      message: shouldApproveArtist
        ? "Artist approved successfully"
        : "User updated successfully",
      data: {
        ...updatedUser,
        ...enrichedUser,
      },
    });
  } catch (error) {
    logger.error("Failed to update user", { error });
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function DELETE(req: NextRequest, context: RouteContext) {
  const logger = createRequestLogger(req, {
    route: "api.users.delete",
  });

  try {
    if (!isAllowedOrigin(req)) {
      logger.warn("Rejected user delete due to invalid origin");
      return NextResponse.json({ message: "Forbidden origin" }, { status: 403 });
    }

    const admin = await getSessionAdmin(req);

    if (!admin) {
      logger.warn("Rejected user delete due to missing admin session");
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { id: rawId } = await context.params;
    const id = parseUserId(rawId);

    if (!id) {
      logger.warn("Rejected user delete due to invalid user id", { rawId });
      return NextResponse.json({ message: "Invalid user id" }, { status: 400 });
    }

    const requestLogger = logger.child({
      adminId: admin.id,
      userId: id,
    });

    const existingUser = await prisma.user.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!existingUser) {
      requestLogger.warn("User not found for delete");
      return NextResponse.json({ message: "User not found" }, { status: 404 });
    }

    await prisma.user.delete({
      where: { id },
    });

    requestLogger.info("Deleted user successfully");

    return NextResponse.json({
      message: "User deleted successfully",
    });
  } catch (error) {
    logger.error("Failed to delete user", { error });
    return NextResponse.json(
      { message: "Failed to delete user" },
      { status: 500 },
    );
  }
}
