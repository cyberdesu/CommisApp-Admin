import { NextRequest, NextResponse } from 'next/server';
import '@/lib/auth/passport';
import passport from 'passport';
import { z } from 'zod';
import { isAllowedOrigin } from '@/lib/auth/origin';
import {
  checkLoginRateLimit,
  clearLoginRateLimit,
  recordFailedLogin,
} from '@/lib/auth/login-rate-limit';
import { createSession, setSessionCookie } from '@/lib/auth/session';
import { createRequestLogger } from '@/lib/logger';
import prisma from '@/lib/prisma';

type AdminUser = NonNullable<Awaited<ReturnType<typeof prisma.adminUser.findUnique>>>;

const loginSchema = z.object({
  email: z.string().email().max(255),
  password: z.string().min(1).max(255),
});

function runPassportLocal(
  body: { email: string; password: string },
): Promise<{ user?: AdminUser; info?: { message: string } }> {
  return new Promise((resolve) => {
    const fakeReq = { body, headers: {} };
    const fakeRes = {};

    passport.authenticate(
      'local',
      { session: false },
      (err: Error | null, user: AdminUser | false, info?: { message: string }) => {
        if (err || !user) {
          resolve({ info });
        } else {
          resolve({ user });
        }
      },
    )(fakeReq, fakeRes, () => {});
  });
}

function extractClientIp(req: NextRequest): string | null {
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) {
    const first = forwarded.split(',')[0]?.trim();
    if (first) return first;
  }
  return req.headers.get('x-real-ip')?.trim() || null;
}

function rateLimitResponse(retryAfterSec: number) {
  const response = NextResponse.json(
    { message: 'Too many login attempts. Try again later.' },
    { status: 429 },
  );
  response.headers.set('Retry-After', String(retryAfterSec));
  return response;
}

export async function POST(req: NextRequest) {
  const logger = createRequestLogger(req, {
    route: 'api.auth.login',
  });

  try {
    if (!isAllowedOrigin(req)) {
      logger.warn('Rejected login due to invalid origin');
      return NextResponse.json({ message: 'Forbidden origin' }, { status: 403 });
    }

    const parsed = loginSchema.safeParse(await req.json());
    if (!parsed.success) {
      logger.warn('Rejected login due to validation failure');
      return NextResponse.json(
        { message: 'Email and password are required' },
        { status: 400 },
      );
    }
    const { email, password } = parsed.data;
    const ip = extractClientIp(req);

    const limitCheck = checkLoginRateLimit({ ip, email });
    if (limitCheck.blocked) {
      logger.warn('Rejected login due to rate limit', {
        reason: limitCheck.reason,
        retryAfterSec: limitCheck.retryAfterSec,
      });
      return rateLimitResponse(limitCheck.retryAfterSec);
    }

    const { user } = await runPassportLocal({ email, password });

    if (!user) {
      recordFailedLogin({ ip, email });
      logger.warn('Rejected login due to invalid credentials');
      return NextResponse.json({ message: 'Invalid credentials' }, { status: 401 });
    }

    clearLoginRateLimit({ email });

    const sessionId = await createSession(user);

    const response = NextResponse.json(
      {
        data: {
          id: user.id,
          email: user.email,
          name: user.name,
        },
      },
      { status: 200 },
    );

    setSessionCookie(response, sessionId);
    logger.info('Admin login successful', {
      adminId: user.id,
    });
    return response;
  } catch (error) {
    logger.error('Login request failed', { error });
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
