import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { AdminShell } from "@/components/admin/admin-shell";
import {
  getSessionAdminBySessionId,
  SESSION_COOKIE_NAME,
} from "@/lib/auth/session";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  const admin = await getSessionAdminBySessionId(sessionId);

  if (!admin) {
    redirect("/login");
  }

  return <AdminShell>{children}</AdminShell>;
}
