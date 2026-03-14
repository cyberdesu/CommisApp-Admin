import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';

export type AdminUser = NonNullable<Awaited<ReturnType<typeof prisma.adminUser.findUnique>>>;

export const SESSION_COOKIE_NAME = 'admin_session';
const SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

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

  return session.admin;
}

export async function deleteSession(sessionId: string): Promise<void> {
  await prisma.adminSession.delete({ where: { id: sessionId } }).catch(() => {});
}

export function setSessionCookie(response: Response, sessionId: string) {
  response.headers.append(
    'Set-Cookie',
    `${SESSION_COOKIE_NAME}=${sessionId}; HttpOnly; Path=/; Max-Age=${SESSION_DURATION_MS / 1000}; SameSite=Lax`,
  );
}

export function clearSessionCookie(response: Response) {
  response.headers.append(
    'Set-Cookie',
    `${SESSION_COOKIE_NAME}=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax`,
  );
}
