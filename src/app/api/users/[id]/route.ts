import { NextRequest, NextResponse } from "next/server";

import prisma from "@/lib/prisma";
import { getSessionAdmin } from "@/lib/auth/session";
import { ensureArtistVerificationTable } from "@/lib/artist-verification";
import { minio, MINIO_BUCKET_NAME } from "@/lib/minio";

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

async function resolveMediaUrl(path?: string | null) {
  return minio.getFile(path, MINIO_BUCKET_NAME)
}

async function enrichUserMedia<
  T extends { avatar?: string | null; banner?: string | null },
>(user: T): Promise<T> {
  const [avatar, banner] = await Promise.all([
    resolveMediaUrl(user.avatar),
    resolveMediaUrl(user.banner),
  ]);

  return {
    ...user,
    avatar,
    banner,
  };
}

export async function GET(req: NextRequest, context: RouteContext) {
  try {
    const admin = await getSessionAdmin(req);

    if (!admin) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    await ensureArtistVerificationTable();

    const { id: rawId } = await context.params;
    const id = parseUserId(rawId);

    if (!id) {
      return NextResponse.json({ message: "Invalid user id" }, { status: 400 });
    }

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
        avatar: true,
        banner: true,
        bio: true,
        country: true,
        createdAt: true,
        updatedAt: true,
        socials: {
          select: {
            instagram: true,
            twitter: true,
            facebook: true,
            tiktok: true,
          },
        },
        _count: {
          select: {
            followers: true,
            following: true,
            bookmarks: true,
            folders: true,
            workflows: true,
            form: true,
            refreshTokens: true,
            otps: true,
            interactions: true,
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ message: "User not found" }, { status: 404 });
    }

    const enrichedUser = await enrichUserMedia(user);

    return NextResponse.json({ data: enrichedUser });
  } catch (error) {
    console.error("Fetch user detail error:", error);
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
  try {
    const admin = await getSessionAdmin(req);

    if (!admin) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { id: rawId } = await context.params;
    const id = parseUserId(rawId);

    if (!id) {
      return NextResponse.json({ message: "Invalid user id" }, { status: 400 });
    }

    const existingUser = await prisma.user.findUnique({
      where: { id },
      select: { id: true, email: true, username: true, verifiedArtists: true },
    });

    if (!existingUser) {
      return NextResponse.json({ message: "User not found" }, { status: 404 });
    }

    const body = await req.json();
    const validationResult = updateUserSchema.safeParse(body);

    if (!validationResult.success) {
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
      return NextResponse.json(
        { message: "Username is required when provided" },
        { status: 400 },
      );
    }

    if (body.role !== undefined && !role) {
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
        return NextResponse.json(
          { message: "Username is already in use" },
          { status: 409 },
        );
      }
    }

    const shouldApproveArtist =
      verifiedArtists === true && existingUser.verifiedArtists === false;

    if (shouldApproveArtist) {
      await ensureArtistVerificationTable();
    }

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
          avatar: true,
          banner: true,
          bio: true,
          country: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      if (shouldApproveArtist) {
        await tx.$executeRaw`
          UPDATE "artist_verification_requests"
          SET
            "status" = 'APPROVED'::"VerificationStatus",
            "reviewedAt" = NOW(),
            "reviewedByAdminId" = ${admin.id},
            "updatedAt" = NOW()
          WHERE "userId" = ${id}
            AND "status" = 'PENDING'::"VerificationStatus"
        `;
      }

      return updated;
    });

    const enrichedUser = await enrichUserMedia(updatedUser);

    return NextResponse.json({
      message: shouldApproveArtist
        ? "Artist approved successfully"
        : "User updated successfully",
      data: enrichedUser,
    });
  } catch (error) {
    console.error("Update user error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function DELETE(req: NextRequest, context: RouteContext) {
  try {
    const admin = await getSessionAdmin(req);

    if (!admin) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { id: rawId } = await context.params;
    const id = parseUserId(rawId);

    if (!id) {
      return NextResponse.json({ message: "Invalid user id" }, { status: 400 });
    }

    const existingUser = await prisma.user.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!existingUser) {
      return NextResponse.json({ message: "User not found" }, { status: 404 });
    }

    await prisma.user.delete({
      where: { id },
    });

    return NextResponse.json({
      message: "User deleted successfully",
    });
  } catch (error) {
    console.error("Delete user error:", error);
    return NextResponse.json(
      { message: "Failed to delete user" },
      { status: 500 },
    );
  }
}
