import { Client as MinioClient } from "minio"

const DEFAULT_BUCKET_NAME = process.env.MINIO_BUCKET || "artwish"
const DEFAULT_EXPIRATION_SECONDS = 60 * 60
const URL_CACHE_MAX_TTL_MS = 50 * 60 * 1000

type CachedUrlEntry = {
  url: string
  expiresAt: number
}

const ABSOLUTE_URL_REGEX = /^https?:\/\//i

class MinioHelper {
  private client: MinioClient | null = null
  private readonly urlCache = new Map<string, CachedUrlEntry>()

  private getClient() {
    if (this.client) return this.client

    const endPoint = process.env.MINIO_ENDPOINT
    const accessKey = process.env.RUSTFS_ACCESS_KEY || process.env.MINIO_ACCESS_KEY
    const secretKey =
      process.env.RUSTFS_SECRET_KEY || process.env.MINIO_SECRET_KEY

    if (!endPoint || !accessKey || !secretKey) {
      return null
    }

    const useSSL = process.env.MINIO_USE_SSL !== "false"
    const portValue = process.env.MINIO_PORT
    const port = portValue ? Number(portValue) : undefined

    this.client = new MinioClient({
      endPoint: endPoint.replace(/^https?:\/\//i, "").replace(/\/+$/, ""),
      useSSL,
      ...(port ? { port } : {}),
      accessKey,
      secretKey,
    })

    return this.client
  }

  private getCacheKey(bucket: string, objectName: string, expiresIn: number) {
    return `${bucket}:${objectName}:${expiresIn}`
  }

  private isAbsoluteUrl(value: string) {
    return ABSOLUTE_URL_REGEX.test(value)
  }

  private normalizeObjectName(value: string) {
    return value.replace(/^\/+/, "").trim()
  }

  private getSafeExpiration(expiresIn: number) {
    const normalized = Math.max(1, Math.floor(expiresIn))
    return normalized
  }

  async getPresignedUrl(
    bucket: string,
    objectName: string,
    expiresIn = DEFAULT_EXPIRATION_SECONDS,
  ) {
    const normalizedObjectName = this.normalizeObjectName(objectName)
    if (!normalizedObjectName) return null

    if (this.isAbsoluteUrl(normalizedObjectName)) {
      return normalizedObjectName
    }

    const client = this.getClient()
    if (!client) {
      return null
    }

    const normalizedExpiration = this.getSafeExpiration(expiresIn)
    const cacheKey = this.getCacheKey(
      bucket,
      normalizedObjectName,
      normalizedExpiration,
    )
    const cached = this.urlCache.get(cacheKey)

    if (cached && cached.expiresAt > Date.now()) {
      return cached.url
    }

    const url = await client.presignedGetObject(
      bucket,
      normalizedObjectName,
      normalizedExpiration,
      {
        "response-content-type": "image/webp",
        "content-disposition": "inline",
        "response-cache-control": "no-cache",
      },
    )

    const signedTtlMs = normalizedExpiration * 1000
    const safeTtlMs = Math.max(1000, signedTtlMs - 15_000)
    const cacheTtlMs = Math.min(URL_CACHE_MAX_TTL_MS, safeTtlMs)

    this.urlCache.set(cacheKey, {
      url,
      expiresAt: Date.now() + cacheTtlMs,
    })

    return url
  }

  async getFile(objectName?: string | null, bucket = DEFAULT_BUCKET_NAME) {
    if (!objectName) return objectName ?? null

    const normalizedObjectName = this.normalizeObjectName(objectName)
    if (!normalizedObjectName) return null

    if (this.isAbsoluteUrl(normalizedObjectName)) {
      return normalizedObjectName
    }

    try {
      const resolved = await this.getPresignedUrl(bucket, normalizedObjectName)
      return resolved ?? normalizedObjectName
    } catch {
      return normalizedObjectName
    }
  }

  async enrichUserMedia<T extends { avatar?: string | null; banner?: string | null }>(
    user: T | null | undefined,
    bucket = DEFAULT_BUCKET_NAME,
  ): Promise<T | null | undefined> {
    if (!user) return user

    const [avatar, banner] = await Promise.all([
      user.avatar ? this.getFile(user.avatar, bucket) : Promise.resolve(user.avatar),
      user.banner ? this.getFile(user.banner, bucket) : Promise.resolve(user.banner),
    ])

    return {
      ...user,
      avatar,
      banner,
    }
  }

  async enrichUsersMedia<T extends { avatar?: string | null; banner?: string | null }>(
    users: T[],
    bucket = DEFAULT_BUCKET_NAME,
  ) {
    return Promise.all(users.map((user) => this.enrichUserMedia(user, bucket))) as Promise<T[]>
  }

  clearCache() {
    this.urlCache.clear()
  }
}

export const minio = new MinioHelper()
export const MINIO_BUCKET_NAME = DEFAULT_BUCKET_NAME
export const MINIO_URL_EXPIRES_IN = DEFAULT_EXPIRATION_SECONDS
