import { NextRequest, NextResponse } from "next/server";
import jwt, { JwtPayload } from "jsonwebtoken";
import { z } from "zod";

import { isAllowedOrigin } from "@/lib/auth/origin";
import { getSessionAdmin } from "@/lib/auth/session";
import { generateAccessToken, generateRefreshToken } from "@/lib/auth/jwt";
import { createRequestLogger } from "@/lib/logger";
import prisma from "@/lib/prisma";

const refreshSchema = z.object({
  refreshToken: z.string().min(1).max(4096),
});

function requireJwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("JWT_SECRET is required");
  }
  return secret;
}

function parseTokenSubject(payload: string | JwtPayload): number | null {
  if (typeof payload === "string") return null;

  const subject = payload.sub;
  const parsedSubject =
    typeof subject === "number"
      ? subject
      : typeof subject === "string"
        ? Number.parseInt(subject, 10)
        : Number.NaN;

  if (
    !Number.isFinite(parsedSubject) ||
    !Number.isInteger(parsedSubject) ||
    parsedSubject <= 0
  ) {
    return null;
  }

  return parsedSubject;
}

export async function PUT(req: NextRequest) {
  const logger = createRequestLogger(req, {
    route: "api.auth.refresh",
  });

  try {
    if (!isAllowedOrigin(req)) {
      logger.warn("Rejected refresh due to invalid origin");
      return NextResponse.json({ message: "Forbidden origin" }, { status: 403 });
    }

    const admin = await getSessionAdmin(req);
    if (!admin) {
      logger.warn("Rejected refresh due to missing admin session");
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const parsedBody = refreshSchema.safeParse(await req.json());
    if (!parsedBody.success) {
      logger.warn("Rejected refresh due to validation failure");
      return NextResponse.json(
        { message: "Refresh token is required" },
        { status: 400 },
      );
    }

    const { refreshToken } = parsedBody.data;

    let payload: string | JwtPayload;
    try {
      payload = jwt.verify(refreshToken, requireJwtSecret());
    } catch {
      logger.warn("Rejected refresh due to invalid or expired JWT", {
        adminId: admin.id,
      });
      return NextResponse.json(
        { message: "Invalid or expired refresh token" },
        { status: 401 },
      );
    }

    const tokenSub = parseTokenSubject(payload);
    if (!tokenSub) {
      logger.warn("Rejected refresh due to invalid token subject", {
        adminId: admin.id,
      });
      return NextResponse.json({ message: "Invalid refresh token" }, { status: 401 });
    }

    const storedToken = await prisma.refreshToken.findUnique({
      where: { token: refreshToken },
      include: { user: true },
    });

    if (
      !storedToken ||
      storedToken.isRevoked ||
      storedToken.userId !== tokenSub ||
      storedToken.expiresAt <= new Date()
    ) {
      logger.warn("Rejected refresh due to token lookup mismatch", {
        adminId: admin.id,
        tokenUserId: tokenSub,
      });
      return NextResponse.json({ message: "Invalid refresh token" }, { status: 401 });
    }

    const newAccessToken = generateAccessToken(
      storedToken.user.id,
      storedToken.user.email,
      storedToken.user.role,
    );
    const newRefreshToken = generateRefreshToken(storedToken.user.id);

    await prisma.$transaction([
      prisma.refreshToken.update({
        where: { id: storedToken.id },
        data: { isRevoked: true },
      }),
      prisma.refreshToken.create({
        data: {
          token: newRefreshToken,
          userId: storedToken.user.id,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        },
      }),
    ]);

    logger.info("Refresh token rotation completed", {
      adminId: admin.id,
      tokenUserId: storedToken.user.id,
    });

    return NextResponse.json(
      {
        data: {
          accessToken: newAccessToken,
          refreshToken: newRefreshToken,
        },
      },
      { status: 200 },
    );
  } catch (error) {
    logger.error("Refresh request failed", { error });
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
