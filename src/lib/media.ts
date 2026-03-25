const ABSOLUTE_URL_REGEX = /^https?:\/\//i

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
  if (!path) return null

  const normalizedPath = path.trim()
  if (!normalizedPath) return null

  if (ABSOLUTE_URL_REGEX.test(normalizedPath)) {
    return normalizedPath
  }

  const baseUrl = getBaseMediaUrl()
  if (!baseUrl) {
    return `/${trimSlashes(normalizedPath)}`
  }

  return `${baseUrl}/${trimSlashes(normalizedPath)}`
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
