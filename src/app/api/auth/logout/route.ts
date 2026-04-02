import { NextRequest, NextResponse } from 'next/server';
import { deleteSession, clearSessionCookie, SESSION_COOKIE_NAME } from '@/lib/auth/session';
import { isAllowedOrigin } from '@/lib/auth/origin';
import { createRequestLogger } from '@/lib/logger';

export async function POST(req: NextRequest) {
  const logger = createRequestLogger(req, {
    route: "api.auth.logout",
  });

  try {
    if (!isAllowedOrigin(req)) {
      logger.warn("Rejected logout due to invalid origin");
      return NextResponse.json({ message: 'Forbidden origin' }, { status: 403 });
    }

    const sessionId = req.cookies.get(SESSION_COOKIE_NAME)?.value;

    if (sessionId) {
      await deleteSession(sessionId);
    }

    const response = NextResponse.json({ message: 'Logged out successfully' }, { status: 200 });
    clearSessionCookie(response);
    logger.info("Admin logout completed", {
      hadSession: Boolean(sessionId),
    });
    return response;
  } catch (error) {
    logger.error("Logout request failed", { error });
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
