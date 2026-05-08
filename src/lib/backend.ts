import "server-only";

/**
 * Resolves the backend (NestJS) base URL and appends the global `/api` prefix.
 *
 * Reads `BACKEND_INTERNAL_URL` first, then falls back to `BE_DOMAIN`.
 * Tolerant to operator-supplied URLs that already include the `/api` suffix —
 * the trailing `/api` is stripped before re-appending so we always emit
 * exactly one `/api` segment.
 *
 * Returns `null` when neither env var is set so callers can return a
 * configuration error to the admin instead of issuing a malformed request.
 */
export function getBackendApiUrl(path: string): string | null {
  const raw = (
    process.env.BACKEND_INTERNAL_URL?.trim() ||
    process.env.BE_DOMAIN?.trim() ||
    ""
  ).replace(/\/+$/, "");

  if (!raw) return null;

  const root = raw.replace(/\/api$/i, "");
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${root}/api${normalizedPath}`;
}
