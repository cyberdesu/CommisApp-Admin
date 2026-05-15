export const ADMIN_PRIVATE_RESPONSE_HEADERS = {
  "Cache-Control": "private, no-store",
  Pragma: "no-cache",
  Expires: "0",
  "X-Content-Type-Options": "nosniff",
} as const;

const DEFAULT_MAX_SEARCH_LENGTH = 120;
const DEFAULT_MIN_TOKEN_LENGTH = 2;
const MAX_SEARCH_TOKENS = 6;

export function parsePositiveInt(value: string | null, fallback: number) {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export function normalizeAdminSearch(
  value: string | null,
  maxLength = DEFAULT_MAX_SEARCH_LENGTH,
) {
  return (value ?? "")
    .trim()
    .replace(/\s+/g, " ")
    .slice(0, maxLength);
}

/**
 * Splits a normalized search string into tokens for token-AND search.
 * Filters tokens shorter than `minLength` so 1-char noise doesn't trigger
 * full-table ILIKE scans. Caps total tokens to prevent pathological queries.
 */
export function tokenizeSearch(
  value: string,
  minLength: number = DEFAULT_MIN_TOKEN_LENGTH,
): string[] {
  if (!value) return [];
  return value
    .split(/\s+/)
    .map((token) => token.trim())
    .filter((token) => token.length >= minLength)
    .slice(0, MAX_SEARCH_TOKENS);
}

export function escapeSqlLikePattern(value: string) {
  return value.replace(/[\\%_]/g, "\\$&");
}
