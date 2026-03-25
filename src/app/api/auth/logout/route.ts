import { NextRequest, NextResponse } from 'next/server';
import { deleteSession, clearSessionCookie, SESSION_COOKIE_NAME } from '@/lib/auth/session';
import { isAllowedOrigin } from '@/lib/auth/origin';

export async function POST(req: NextRequest) {
  try {
    if (!isAllowedOrigin(req)) {
      return NextResponse.json({ message: 'Forbidden origin' }, { status: 403 });
    }

    const sessionId = req.cookies.get(SESSION_COOKIE_NAME)?.value;

    if (sessionId) {
      await deleteSession(sessionId);
    }

    const response = NextResponse.json({ message: 'Logged out successfully' }, { status: 200 });
    clearSessionCookie(response);
    return response;
  } catch (error) {
    console.error('Logout error:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
