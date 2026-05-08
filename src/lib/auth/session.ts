import "server-only"
import { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { resolveAppEnv } from '@/lib/env/database-url-core';

export type AdminUser = NonNullable<Awaited<ReturnType<typeof prisma.adminUser.findUnique>>>;

export const SESSION_COOKIE_NAME = 'admin_session';
const SESSION_ABSOLUTE_MAX_MS = 12 * 60 * 60 * 1000; // 12 hours from createdAt
const SESSION_IDLE_WINDOW_MS = 60 * 60 * 1000; // 1 hour of inactivity
const SESSION_SLIDE_THRESHOLD_MS = 15 * 60 * 1000; // slide when <45m left

function shouldUseSecureCookie() {
  return (
    resolveAppEnv() === 'prod' ||
    process.env.NODE_ENV === 'production' ||
    process.env.COOKIE_SECURE === 'true'
  );
}

async function findValidSession(sessionId: string) {
  const session = await prisma.adminSession.findUnique({
    where: { id: sessionId },
    include: { admin: true },
  });

  if (!session) return null;

  const now = Date.now();
  const absoluteExpiresAt = session.createdAt.getTime() + SESSION_ABSOLUTE_MAX_MS;
  const idleExpiresAt = session.expiresAt.getTime();

  if (now >= idleExpiresAt || now >= absoluteExpiresAt) {
    await prisma.adminSession.delete({ where: { id: session.id } }).catch(() => {});
    return null;
  }

  const slideTarget = Math.min(now + SESSION_IDLE_WINDOW_MS, absoluteExpiresAt);
  const remainingMs = idleExpiresAt - now;
  const idleConsumedMs = SESSION_IDLE_WINDOW_MS - remainingMs;

  if (
    idleConsumedMs >= SESSION_SLIDE_THRESHOLD_MS &&
    slideTarget > idleExpiresAt
  ) {
    const slidExpiresAt = new Date(slideTarget);
    await prisma.adminSession
      .update({
        where: { id: session.id },
        data: { expiresAt: slidExpiresAt },
      })
      .catch(() => {});
    session.expiresAt = slidExpiresAt;
  }

  return session;
}

export async function createSession(admin: AdminUser): Promise<string> {
  const session = await prisma.adminSession.create({
    data: {
      adminId: admin.id,
      expiresAt: new Date(Date.now() + SESSION_IDLE_WINDOW_MS),
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
    secure: shouldUseSecureCookie(),
    path: '/',
    maxAge: SESSION_ABSOLUTE_MAX_MS / 1000,
  });
}

export function clearSessionCookie(response: NextResponse) {
  response.cookies.set({
    name: SESSION_COOKIE_NAME,
    value: '',
    httpOnly: true,
    sameSite: 'lax',
    secure: shouldUseSecureCookie(),
    path: '/',
    maxAge: 0,
  });
}
