import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { isAllowedOrigin } from "@/lib/auth/origin";
import { getSessionAdmin } from "@/lib/auth/session";
import { getBackendApiUrl } from "@/lib/backend";
import { createRequestLogger, type AppLogger } from "@/lib/logger";
import prisma from "@/lib/prisma";

const updateArtistRequestSchema = z.object({
  action: z.enum(["approve", "reject"]),
  reason: z.string().max(300).optional(),
});

const ARTIST_VERIFY_TIMEOUT_MS = 15_000;

type ArtistVerifyHookResult =
  | { ok: true; alreadyArtist: boolean }
  | { ok: false; status: number; message: string };

async function callBackendArtistVerify(
  userId: number,
  logger: AppLogger,
): Promise<ArtistVerifyHookResult> {
  const baseUrl = getBackendApiUrl("/auth/ArtistVerify");
  const secret = process.env.ARTIST_VERIFY_SECRET?.trim();

  if (!baseUrl || !secret) {
    logger.error(
      "Backend URL or ARTIST_VERIFY_SECRET missing; cannot promote artist.",
      { hasBaseUrl: Boolean(baseUrl), hasSecret: Boolean(secret) },
    );
    return {
      ok: false,
      status: 503,
      message: "Artist verification hook is not configured.",
    };
  }

  const url = new URL(baseUrl);
  url.searchParams.set("id", String(userId));

  let response: Response;
  try {
    response = await fetch(url.toString(), {
      method: "GET",
      headers: {
        secret,
        accept: "application/json",
      },
      cache: "no-store",
      signal: AbortSignal.timeout(ARTIST_VERIFY_TIMEOUT_MS),
    });
  } catch (error) {
    logger.error("Artist verification hook fetch failed", { error });
    return {
      ok: false,
      status: 502,
      message: "Backend unreachable while approving artist.",
    };
  }

  if (response.ok) {
    return { ok: true, alreadyArtist: false };
  }

  let bodyMessage: string | null = null;
  try {
    const body = (await response.json().catch(() => null)) as {
      message?: unknown;
    } | null;
    if (body && typeof body.message === "string") {
      bodyMessage = body.message;
    }
  } catch {}

  if (
    response.status === 400 &&
    bodyMessage &&
    /already.*artist/i.test(bodyMessage)
  ) {
    return { ok: true, alreadyArtist: true };
  }

  return {
    ok: false,
    status: response.status,
    message: bodyMessage ?? "Backend rejected artist verification.",
  };
}

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

function parseRequestId(rawId: string) {
  try {
    const id = BigInt(rawId);
    return id > BigInt(0) ? id : null;
  } catch {
    return null;
  }
}

export async function PATCH(req: NextRequest, context: RouteContext) {
  const logger = createRequestLogger(req, {
    route: "api.artist-requests.update",
  });

  try {
    if (!isAllowedOrigin(req)) {
      logger.warn("Rejected artist request update due to invalid origin");
      return NextResponse.json({ message: "Forbidden origin" }, { status: 403 });
    }

    const admin = await getSessionAdmin(req);
    if (!admin) {
      logger.warn("Rejected artist request update due to missing admin session");
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { id: rawId } = await context.params;
    const requestId = parseRequestId(rawId);
    if (!requestId) {
      logger.warn("Rejected artist request update due to invalid request id", {
        rawId,
      });
      return NextResponse.json(
        { message: "Invalid request id" },
        { status: 400 },
      );
    }

    const payload = updateArtistRequestSchema.safeParse(await req.json());
    if (!payload.success) {
      logger.warn("Rejected artist request update due to validation failure", {
        errors: payload.error.flatten().fieldErrors,
      });
      return NextResponse.json(
        {
          message: "Validation failed",
          errors: payload.error.flatten().fieldErrors,
        },
        { status: 400 },
      );
    }

    const requestLogger = logger.child({
      adminId: admin.id,
      requestId: requestId.toString(),
      action: payload.data.action,
    });

    const requestItem = await prisma.artistVerificationRequest.findUnique({
      where: { id: requestId },
      select: {
        id: true,
        userId: true,
        status: true,
      },
    });

    if (!requestItem) {
      return NextResponse.json(
        { message: "Request not found" },
        { status: 404 },
      );
    }

    if (requestItem.status !== "PENDING") {
      return NextResponse.json(
        { message: "Request has already been processed" },
        { status: 409 },
      );
    }

    const reason = payload.data.reason?.trim() || null;

    if (payload.data.action === "reject") {
      await prisma.artistVerificationRequest.update({
        where: { id: requestId },
        data: {
          status: "REJECTED",
          reviewedAt: new Date(),
          reviewReason: reason,
          reviewedByAdminId: admin.id,
        },
      });

      requestLogger.info("Rejected artist verification request");

      return NextResponse.json({
        message: "Artist request rejected",
      });
    }

    const hookResult = await callBackendArtistVerify(
      requestItem.userId,
      requestLogger,
    );

    if (!hookResult.ok) {
      requestLogger.warn("Backend rejected artist verification", {
        backendStatus: hookResult.status,
        backendMessage: hookResult.message,
      });
      return NextResponse.json(
        { message: hookResult.message },
        {
          status:
            hookResult.status >= 500
              ? 502
              : hookResult.status >= 400
                ? hookResult.status
                : 500,
        },
      );
    }

    await prisma.artistVerificationRequest.update({
      where: { id: requestId },
      data: {
        status: "APPROVED",
        reviewedAt: new Date(),
        reviewReason: reason,
        reviewedByAdminId: admin.id,
      },
    });

    requestLogger.info("Approved artist verification request", {
      userId: requestItem.userId,
      alreadyArtist: hookResult.alreadyArtist,
    });

    return NextResponse.json({
      message: hookResult.alreadyArtist
        ? "Artist request marked as approved (user was already an artist)."
        : "Artist approved successfully",
    });
  } catch (error) {
    logger.error("Failed to update artist request", { error });
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 },
    );
  }
}
