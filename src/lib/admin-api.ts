export const ADMIN_PRIVATE_RESPONSE_HEADERS = {
  "Cache-Control": "private, no-store",
  Pragma: "no-cache",
  Expires: "0",
  "X-Content-Type-Options": "nosniff",
} as const;

const DEFAULT_MAX_SEARCH_LENGTH = 120;

export function parsePositiveInt(value: string | null, fallback: number) {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export function normalizeAdminSearch(
  value: string | null,
  maxLength = DEFAULT_MAX_SEARCH_LENGTH,
) {
  return (value ?? "").trim().slice(0, maxLength);
}

export function escapeSqlLikePattern(value: string) {
  return value.replace(/[\\%_]/g, "\\$&");
}
