import prisma from "@/lib/prisma";

export const ARTIST_REQUEST_STATUSES = [
  "PENDING",
  "APPROVED",
  "REJECTED",
] as const;

export type ArtistRequestStatus = (typeof ARTIST_REQUEST_STATUSES)[number];

export function isArtistRequestStatus(value: string): value is ArtistRequestStatus {
  return ARTIST_REQUEST_STATUSES.includes(value as ArtistRequestStatus);
}

let ensureArtistVerificationTablePromise: Promise<void> | null = null;

async function ensureArtistVerificationTableOnce() {
  await prisma.$executeRawUnsafe(`
    DO $$
    BEGIN
      CREATE TYPE "VerificationStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');
    EXCEPTION
      WHEN duplicate_object THEN NULL;
    END
    $$;
  `);

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "artist_verification_requests" (
      "id" BIGSERIAL PRIMARY KEY,
      "userId" INTEGER NOT NULL UNIQUE,
      "status" "VerificationStatus" NOT NULL DEFAULT 'PENDING',
      "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "reviewedAt" TIMESTAMP(3),
      "reviewReason" TEXT,
      "reviewedByAdminId" INTEGER,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "artist_verification_requests_userId_fkey"
        FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
    );
  `);

  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "artist_verification_requests_status_requestedAt_idx"
    ON "artist_verification_requests" ("status", "requestedAt");
  `);
}

export async function ensureArtistVerificationTable() {
  if (!ensureArtistVerificationTablePromise) {
    ensureArtistVerificationTablePromise = ensureArtistVerificationTableOnce()
      .catch((error) => {
        ensureArtistVerificationTablePromise = null;
        throw error;
      });
  }

  await ensureArtistVerificationTablePromise;
}
