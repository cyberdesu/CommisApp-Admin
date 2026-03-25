const ABSOLUTE_HTTP_URL_REGEX = /^https?:\/\//i;
const PROTOCOL_RELATIVE_URL_REGEX = /^\/\//;
const DANGEROUS_SCHEME_REGEX = /^(?:javascript|vbscript|data|file):/i;
const GENERIC_SCHEME_REGEX = /^[a-zA-Z][a-zA-Z\d+\-.]*:/;
const CONTROL_CHAR_REGEX = /[\u0000-\u001F\u007F]/;

export function sanitizeImageSource(value?: string | null): string | null {
  if (!value) return null;

  const trimmed = value.trim();
  if (!trimmed) return null;
  if (CONTROL_CHAR_REGEX.test(trimmed)) return null;
  if (PROTOCOL_RELATIVE_URL_REGEX.test(trimmed)) return null;
  if (DANGEROUS_SCHEME_REGEX.test(trimmed)) return null;

  if (ABSOLUTE_HTTP_URL_REGEX.test(trimmed)) {
    try {
      const parsed = new URL(trimmed);
      if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
        return null;
      }
      return parsed.toString();
    } catch {
      return null;
    }
  }

  if (GENERIC_SCHEME_REGEX.test(trimmed)) {
    return null;
  }

  const normalized = trimmed.replace(/^\/+/, "");
  if (!normalized) return null;

  return `/${normalized}`;
}

