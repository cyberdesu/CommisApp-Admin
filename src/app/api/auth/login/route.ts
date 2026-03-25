import { NextRequest, NextResponse } from 'next/server';
import '@/lib/auth/passport';
import passport from 'passport';
import { z } from 'zod';
import { createSession, setSessionCookie } from '@/lib/auth/session';
import prisma from '@/lib/prisma';

type AdminUser = NonNullable<Awaited<ReturnType<typeof prisma.adminUser.findUnique>>>;

const loginSchema = z.object({
  email: z.string().email().max(255),
  password: z.string().min(1).max(255),
});

// Passport authenticate helper wrapped for Next.js App Router
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

export async function POST(req: NextRequest) {
  try {
    const parsed = loginSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ message: 'Email and password are required' }, { status: 400 });
    }
    const { email, password } = parsed.data;

    const { user } = await runPassportLocal({ email, password });

    if (!user) {
      return NextResponse.json({ message: 'Invalid credentials' }, { status: 401 });
    }

    const sessionId = await createSession(user);

    const response = NextResponse.json({
      data: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
    }, { status: 200 });

    setSessionCookie(response, sessionId);
    return response;
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
