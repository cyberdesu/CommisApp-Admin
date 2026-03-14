import { NextRequest, NextResponse } from "next/server";
import { Client as MinioClient } from "minio";

import prisma from "@/lib/prisma";
import { getSessionAdmin } from "@/lib/auth/session";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

const DEFAULT_MEDIA_BUCKET = process.env.MINIO_BUCKET || "artwish";
const MINIO_URL_EXPIRATION_SECONDS = 60 * 60;

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

function isAbsoluteUrl(value: string) {
  return /^https?:\/\//i.test(value);
}

async function resolveMediaUrl(path?: string | null) {
  if (!path) return path;

  if (isAbsoluteUrl(path) || !minioClient) {
    return path;
  }

  try {
    return await minioClient.presignedGetObject(
      DEFAULT_MEDIA_BUCKET,
      path,
      MINIO_URL_EXPIRATION_SECONDS,
      {
        "response-cache-control": "no-cache",
      },
    );
  } catch {
    return path;
  }
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
      select: { id: true, email: true, username: true },
    });

    if (!existingUser) {
      return NextResponse.json({ message: "User not found" }, { status: 404 });
    }

    const body = await req.json();

    const email = normalizeString(body.email);
    const username = normalizeString(body.username);
    const name =
      typeof body.name === "string" ? body.name.trim() || null : undefined;
    const role = normalizeString(body.role);
    const bio =
      typeof body.bio === "string" ? body.bio.trim() || null : undefined;
    const country =
      typeof body.country === "string"
        ? body.country.trim() || null
        : undefined;
    const avatar = normalizeOptionalMediaPath(body.avatar);
    const banner = normalizeOptionalMediaPath(body.banner);

    const verified =
      typeof body.verified === "boolean" ? body.verified : undefined;
    const verifiedArtists =
      typeof body.verifiedArtists === "boolean"
        ? body.verifiedArtists
        : undefined;

    if (body.email !== undefined && !email) {
      return NextResponse.json(
        { message: "Email is required when provided" },
        { status: 400 },
      );
    }

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

    const updatedUser = await prisma.user.update({
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

    const enrichedUser = await enrichUserMedia(updatedUser);

    return NextResponse.json({
      message: "User updated successfully",
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
