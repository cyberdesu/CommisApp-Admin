import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

const SESSION_COOKIE_NAME = "admin_session";
const PUBLIC_API_PREFIXES = ["/api/auth/login", "/api/auth/logout"] as const;
const MUTATING_METHODS = new Set(["POST", "PATCH", "PUT", "DELETE"]);

function isPublicApiPath(pathname: string) {
  return PUBLIC_API_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

function isSameOrigin(req: NextRequest) {
  const origin = req.headers.get("origin");
  if (!origin) {
    const referer = req.headers.get("referer");
    if (!referer) return true;
    try {
      const refererHost = new URL(referer).host;
      const requestHost =
        req.headers.get("x-forwarded-host") ?? req.headers.get("host");
      return Boolean(requestHost) && refererHost === requestHost;
    } catch {
      return false;
    }
  }

  let originHost: string;
  try {
    originHost = new URL(origin).host;
  } catch {
    return false;
  }
  const requestHost =
    req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  return Boolean(requestHost) && originHost === requestHost;
}

function buildCsp(nonce: string, isDev: boolean) {
  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${
      isDev ? " 'unsafe-eval'" : ""
    }`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' blob: data: https: http:",
    "font-src 'self' data:",
    "connect-src 'self' https: http: ws: wss:",
    "object-src 'none'",
    "base-uri 'self'",
    "frame-ancestors 'none'",
    "form-action 'self'",
    "upgrade-insecure-requests",
  ].join("; ");
}

function applySecurityHeaders(response: NextResponse, csp?: string) {
  response.headers.set("Cache-Control", "no-store");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "same-origin");
  response.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=()",
  );
  if (csp) {
    response.headers.set("Content-Security-Policy", csp);
  }
  return response;
}

export function proxy(req: NextRequest) {
  const pathname = req.nextUrl.pathname;
  const isApiRequest = pathname.startsWith("/api/");
  const hasSessionCookie = Boolean(req.cookies.get(SESSION_COOKIE_NAME)?.value);

  const nonce = isApiRequest ? undefined : btoa(crypto.randomUUID());
  const csp = nonce
    ? buildCsp(nonce, process.env.NODE_ENV !== "production")
    : undefined;

  if (pathname === "/login" && hasSessionCookie) {
    return applySecurityHeaders(
      NextResponse.redirect(new URL("/dashboard", req.url)),
      csp,
    );
  }

  if (isApiRequest) {
    if (
      MUTATING_METHODS.has(req.method) &&
      !isPublicApiPath(pathname) &&
      !isSameOrigin(req)
    ) {
      return applySecurityHeaders(
        NextResponse.json({ message: "Forbidden origin" }, { status: 403 }),
      );
    }

    if (!hasSessionCookie && !isPublicApiPath(pathname)) {
      return applySecurityHeaders(
        NextResponse.json({ message: "Unauthorized" }, { status: 401 }),
      );
    }

    return applySecurityHeaders(NextResponse.next());
  }

  if (!hasSessionCookie && pathname !== "/login") {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("next", req.nextUrl.pathname);
    return applySecurityHeaders(NextResponse.redirect(loginUrl), csp);
  }

  const requestHeaders = new Headers(req.headers);
  if (nonce) requestHeaders.set("x-nonce", nonce);
  if (csp) requestHeaders.set("content-security-policy", csp);

  return applySecurityHeaders(
    NextResponse.next({ request: { headers: requestHeaders } }),
    csp,
  );
}

export const config = {
  matcher: [
    // Catch-all except framework assets, static files, and image optimizer.
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff2?|ttf|map)$).*)",
  ],
};
