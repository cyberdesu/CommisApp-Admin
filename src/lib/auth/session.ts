import "server-only"
import { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export type AdminUser = NonNullable<Awaited<ReturnType<typeof prisma.adminUser.findUnique>>>;

export const SESSION_COOKIE_NAME = 'admin_session';
const SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

async function findValidSession(sessionId: string) {
  const session = await prisma.adminSession.findUnique({
    where: { id: sessionId },
    include: { admin: true },
  });

  if (!session || session.expiresAt < new Date()) {
    if (session) {
      await prisma.adminSession.delete({ where: { id: session.id } });
    }
    return null;
  }

  return session;
}

export async function createSession(admin: AdminUser): Promise<string> {
  const session = await prisma.adminSession.create({
    data: {
      adminId: admin.id,
      expiresAt: new Date(Date.now() + SESSION_DURATION_MS),
    },
  });
  return session.id;
}

export async function getSessionAdmin(req: NextRequest): Promise<AdminUser | null> {
  const sessionId = req.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (!sessionId) return null;

  const session = await findValidSession(sessionId);
  if (!session) return null;

  return session.admin;
}

export async function getSessionAdminBySessionId(
  sessionId?: string | null,
): Promise<AdminUser | null> {
  if (!sessionId) return null;
  const session = await findValidSession(sessionId);
  if (!session) return null;
  return session.admin;
}

export async function deleteSession(sessionId: string): Promise<void> {
  await prisma.adminSession.delete({ where: { id: sessionId } }).catch(() => {});
}

export function setSessionCookie(response: NextResponse, sessionId: string) {
  response.cookies.set({
    name: SESSION_COOKIE_NAME,
    value: sessionId,
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: SESSION_DURATION_MS / 1000,
  });
}

export function clearSessionCookie(response: NextResponse) {
  response.cookies.set({
    name: SESSION_COOKIE_NAME,
    value: '',
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 0,
  });
}
