import { NextRequest } from "next/server";

function parseOriginHost(originHeader: string) {
  try {
    return new URL(originHeader).host;
  } catch {
    return null;
  }
}

function getRequestHost(req: NextRequest) {
  return req.headers.get("x-forwarded-host") ?? req.headers.get("host");
}

export function isAllowedOrigin(req: NextRequest) {
  const originHeader = req.headers.get("origin");
  if (!originHeader) return true;

  const originHost = parseOriginHost(originHeader);
  const requestHost = getRequestHost(req);

  if (!originHost || !requestHost) return false;
  return originHost === requestHost;
}

