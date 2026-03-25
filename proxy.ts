import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

const SESSION_COOKIE_NAME = "admin_session";
const API_PROTECTED_PREFIXES = [
  "/api/users",
  "/api/showcases",
  "/api/artist-requests",
  "/api/auth/refresh",
] as const;

function isProtectedApiPath(pathname: string) {
  return API_PROTECTED_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

function applySecurityHeaders(response: NextResponse) {
  response.headers.set("Cache-Control", "no-store");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "same-origin");
  return response;
}

export function proxy(req: NextRequest) {
  const pathname = req.nextUrl.pathname;
  const isApiRequest = pathname.startsWith("/api/");
  const hasSessionCookie = Boolean(req.cookies.get(SESSION_COOKIE_NAME)?.value);

  if (pathname === "/login" && hasSessionCookie) {
    return applySecurityHeaders(
      NextResponse.redirect(new URL("/dashboard", req.url)),
    );
  }

  if (!hasSessionCookie) {
    if (isApiRequest && isProtectedApiPath(pathname)) {
      return applySecurityHeaders(
        NextResponse.json({ message: "Unauthorized" }, { status: 401 }),
      );
    }

    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("next", req.nextUrl.pathname);
    return applySecurityHeaders(NextResponse.redirect(loginUrl));
  }

  return applySecurityHeaders(NextResponse.next());
}

export const config = {
  matcher: [
    "/login",
    "/dashboard/:path*",
    "/users/:path*",
    "/showcases/:path*",
    "/artist-requests/:path*",
    "/settings/:path*",
    "/api/users/:path*",
    "/api/showcases/:path*",
    "/api/artist-requests/:path*",
    "/api/auth/refresh/:path*",
  ],
};

