import { NextRequest, NextResponse } from "next/server";
import { filterXSS } from "xss";
import { getSessionAdmin } from "@/lib/auth/session";
import prisma from "@/lib/prisma";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const NOTE_MAX = 2000;
const NOTE_MIN = 5;

type DecidePayload = {
  approve: boolean;
  adminNote: string;
  ticketId?: string;
};

function validatePayload(input: unknown): {
  ok: true;
  data: DecidePayload;
} | { ok: false; message: string } {
  if (!input || typeof input !== "object") {
    return { ok: false, message: "Body must be a JSON object." };
  }

  const body = input as Record<string, unknown>;

  if (typeof body.approve !== "boolean") {
    return { ok: false, message: "`approve` must be a boolean." };
  }

  if (typeof body.adminNote !== "string") {
    return { ok: false, message: "`adminNote` is required." };
  }

  const sanitizedNote = filterXSS(body.adminNote).trim();
  if (sanitizedNote.length < NOTE_MIN) {
    return {
      ok: false,
      message: `Admin note must be at least ${NOTE_MIN} characters.`,
    };
  }
  if (sanitizedNote.length > NOTE_MAX) {
    return {
      ok: false,
      message: `Admin note must be no more than ${NOTE_MAX} characters.`,
    };
  }

  let ticketId: string | undefined;
  if (typeof body.ticketId === "string") {
    const trimmed = body.ticketId.trim();
    if (trimmed.length > 0) {
      if (!/^[A-Za-z0-9_-]{1,64}$/.test(trimmed)) {
        return { ok: false, message: "Invalid ticketId format." };
      }
      ticketId = trimmed;
    }
  }

  return {
    ok: true,
    data: {
      approve: body.approve,
      adminNote: sanitizedNote,
      ticketId,
    },
  };
}

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    const admin = await getSessionAdmin(req);
    if (!admin) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { id } = await ctx.params;
    if (!UUID_PATTERN.test(id)) {
      return NextResponse.json(
        { message: "Refund not found" },
        { status: 404 },
      );
    }

    let parsedBody: unknown;
    try {
      parsedBody = await req.json();
    } catch {
      return NextResponse.json(
        { message: "Invalid JSON body." },
        { status: 400 },
      );
    }

    const validation = validatePayload(parsedBody);
    if (!validation.ok) {
      return NextResponse.json(
        { message: validation.message },
        { status: 400 },
      );
    }

    const refund = await prisma.refundRequest.findUnique({
      where: { id },
      select: { id: true, status: true, ticketId: true },
    });
    if (!refund) {
      return NextResponse.json(
        { message: "Refund not found" },
        { status: 404 },
      );
    }

    const url = process.env.BACKEND_INTERNAL_URL;
    const secret = process.env.ADMIN_HOOK_SECRET;
    if (!url || !secret) {
      console.error(
        "BACKEND_INTERNAL_URL or ADMIN_HOOK_SECRET missing; cannot decide refund.",
      );
      return NextResponse.json(
        { message: "Refund webhook not configured." },
        { status: 503 },
      );
    }

    const response = await fetch(`${url}/internal/refunds/${id}/decision`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-internal-secret": secret,
      },
      body: JSON.stringify({
        adminId: admin.id,
        approve: validation.data.approve,
        adminNote: validation.data.adminNote,
        ticketId: validation.data.ticketId ?? refund.ticketId ?? undefined,
      }),
    });

    let responsePayload: unknown = null;
    const contentType = response.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      try {
        responsePayload = await response.json();
      } catch {
        responsePayload = null;
      }
    }

    if (!response.ok) {
      const message =
        (responsePayload &&
          typeof responsePayload === "object" &&
          "message" in (responsePayload as Record<string, unknown>) &&
          typeof (responsePayload as Record<string, unknown>).message === "string"
          ? (responsePayload as Record<string, string>).message
          : null) ?? "Refund decision rejected by backend.";

      return NextResponse.json(
        { message },
        { status: response.status === 401 || response.status === 403 ? 502 : response.status },
      );
    }

    return NextResponse.json(
      responsePayload ?? { message: "Refund decision applied." },
      { status: 200 },
    );
  } catch (error) {
    console.error("Refund decide error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 },
    );
  }
}
