const ABSOLUTE_URL_REGEX = /^https?:\/\//i
import { sanitizeImageSource } from "@/lib/security/url-safety"

const trimSlashes = (value: string) => value.replace(/^\/+|\/+$/g, "")

const getBaseMediaUrl = () => {
  const explicitBaseUrl = process.env.NEXT_PUBLIC_MINIO_PUBLIC_URL?.trim()
  if (explicitBaseUrl) {
    return explicitBaseUrl.replace(/\/+$/, "")
  }

  const endpoint =
    process.env.NEXT_PUBLIC_MINIO_ENDPOINT?.trim() ||
    process.env.NEXT_PUBLIC_RUSTFS_MINIO_ENDPOINT?.trim() ||
    process.env.NEXT_PUBLIC_RUSTFS_ENDPOINT?.trim()
  const bucket =
    process.env.NEXT_PUBLIC_MINIO_BUCKET?.trim() ||
    process.env.NEXT_PUBLIC_RUSTFS_BUCKET?.trim()
  const useSsl =
    process.env.NEXT_PUBLIC_MINIO_USE_SSL?.trim() ||
    process.env.NEXT_PUBLIC_RUSTFS_USE_SSL?.trim()

  if (!endpoint || !bucket) {
    return ""
  }

  const protocol = useSsl === "false" ? "http" : "https"
  return `${protocol}://${endpoint.replace(/^https?:\/\//i, "").replace(/\/+$/, "")}/${trimSlashes(bucket)}`
}

export function resolveMediaUrl(path?: string | null) {
  const safePath = sanitizeImageSource(path)
  if (!safePath) return null

  if (ABSOLUTE_URL_REGEX.test(safePath)) {
    return safePath
  }

  const normalizedPath = trimSlashes(safePath)
  const baseUrl = getBaseMediaUrl()
  if (!baseUrl) {
    return `/${normalizedPath}`
  }

  return `${baseUrl}/${normalizedPath}`
}

export function resolveAvatarUrl(path?: string | null) {
  return resolveMediaUrl(path ?? "avatars/default.jpg")
}

export function resolveBannerUrl(path?: string | null) {
  return resolveMediaUrl(path ?? "banners/default.jpg")
}

export function isMediaPathFromMinio(path?: string | null) {
  if (!path) return false
  return !ABSOLUTE_URL_REGEX.test(path.trim())
}
