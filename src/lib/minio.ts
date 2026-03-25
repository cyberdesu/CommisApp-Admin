import { Client as MinioClient } from "minio"
import { sanitizeImageSource } from "@/lib/security/url-safety"

const DEFAULT_BUCKET_NAME =
  process.env.MINIO_BUCKET || process.env.RUSTFS_BUCKET || "artwish"
const DEFAULT_EXPIRATION_SECONDS = 60 * 60
const URL_CACHE_MAX_TTL_MS = 50 * 60 * 1000

type CachedUrlEntry = {
  url: string
  expiresAt: number
}

type ParsedEndpoint = {
  endPoint: string
  port?: number
  useSSLFromScheme?: boolean
}

const ABSOLUTE_URL_REGEX = /^https?:\/\//i

class MinioHelper {
  private client: MinioClient | null = null
  private readonly urlCache = new Map<string, CachedUrlEntry>()

  private parseEndpoint(rawValue: string): ParsedEndpoint | null {
    const trimmed = rawValue.trim()
    if (!trimmed) return null

    let withoutPath = trimmed.replace(/\/+$/, "")
    let useSSLFromScheme: boolean | undefined
    let explicitPort: number | undefined

    if (ABSOLUTE_URL_REGEX.test(withoutPath)) {
      const parsedUrl = new URL(withoutPath)
      withoutPath = parsedUrl.host
      useSSLFromScheme = parsedUrl.protocol === "https:"
      if (parsedUrl.port) {
        const parsedPort = Number(parsedUrl.port)
        if (Number.isFinite(parsedPort) && parsedPort > 0) {
          explicitPort = parsedPort
        }
      }
    } else {
      withoutPath = withoutPath.replace(/^\/+/, "").split("/")[0] || ""
    }

    if (!withoutPath) return null

    if (withoutPath.includes(":")) {
      const [host, portText] = withoutPath.split(":")
      const parsedPort = Number(portText)

      if (host) {
        withoutPath = host
      }

      if (Number.isFinite(parsedPort) && parsedPort > 0) {
        explicitPort = parsedPort
      }
    }

    if (!withoutPath) return null

    return {
      endPoint: withoutPath,
      ...(explicitPort ? { port: explicitPort } : {}),
      ...(useSSLFromScheme !== undefined ? { useSSLFromScheme } : {}),
    }
  }

  private getClient() {
    if (this.client) return this.client

    const endpointFromEnv =
      process.env.MINIO_ENDPOINT ||
      process.env.RUSTFS_MINIO_ENDPOINT ||
      process.env.RUSTFS_ENDPOINT
    const accessKey = process.env.RUSTFS_ACCESS_KEY || process.env.MINIO_ACCESS_KEY
    const secretKey =
      process.env.RUSTFS_SECRET_KEY || process.env.MINIO_SECRET_KEY

    if (!endpointFromEnv || !accessKey || !secretKey) {
      return null
    }

    const parsedEndpoint = this.parseEndpoint(endpointFromEnv)
    if (!parsedEndpoint) {
      return null
    }

    const useSSL =
      process.env.MINIO_USE_SSL !== undefined
        ? process.env.MINIO_USE_SSL !== "false"
        : parsedEndpoint.useSSLFromScheme ?? true

    const portValue = process.env.MINIO_PORT
    const parsedPort = portValue ? Number(portValue) : undefined
    const port =
      parsedPort && Number.isFinite(parsedPort) && parsedPort > 0
        ? parsedPort
        : parsedEndpoint.port

    this.client = new MinioClient({
      endPoint: parsedEndpoint.endPoint,
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
    const sanitizedInput = sanitizeImageSource(objectName)
    if (!sanitizedInput) return null

    if (this.isAbsoluteUrl(sanitizedInput)) {
      return sanitizedInput
    }

    const normalizedObjectName = this.normalizeObjectName(sanitizedInput)
    if (!normalizedObjectName) return null

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

    const sanitizedInput = sanitizeImageSource(objectName)
    if (!sanitizedInput) return null

    if (this.isAbsoluteUrl(sanitizedInput)) {
      return sanitizedInput
    }

    const normalizedObjectName = this.normalizeObjectName(sanitizedInput)
    if (!normalizedObjectName) return null

    try {
      const resolved = await this.getPresignedUrl(bucket, normalizedObjectName)
      return resolved ?? sanitizeImageSource(normalizedObjectName)
    } catch {
      return sanitizeImageSource(normalizedObjectName)
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
