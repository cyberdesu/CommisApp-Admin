export const ARTIST_REQUEST_STATUSES = [
  "PENDING",
  "APPROVED",
  "REJECTED",
] as const;

export type ArtistRequestStatus = (typeof ARTIST_REQUEST_STATUSES)[number];

export function isArtistRequestStatus(
  value: string,
): value is ArtistRequestStatus {
  return ARTIST_REQUEST_STATUSES.includes(value as ArtistRequestStatus);
}
