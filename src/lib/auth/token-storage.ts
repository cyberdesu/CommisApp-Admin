/**
 * Session is now handled server-side via HttpOnly cookie (admin_session).
 * No tokens need to be stored client-side.
 *
 * These are kept as stubs to avoid breaking references in the existing frontend code.
 * They can be cleaned up once all pages are migrated to use cookies natively.
 */

export function setSession(_accessToken: string, _refreshToken?: string) {}
export function getAccessToken() { return null }
export function getRefreshToken() { return null }
export function clearSession() {}
