import "server-only";

import type { PaypalErrorResponse } from "./_types";

export class PaypalPayoutError extends Error {
  status: number;
  details: PaypalErrorResponse | null;

  constructor(
    message: string,
    options?: { status?: number; details?: PaypalErrorResponse | null },
  ) {
    super(message);
    this.name = "PaypalPayoutError";
    this.status = options?.status ?? 500;
    this.details = options?.details ?? null;
  }
}

export function getPaypalDebugId(error: PaypalPayoutError) {
  return error.details?.debug_id ?? null;
}

export function formatPaypalErrorMessage(
  payload: PaypalErrorResponse | null,
  fallback: string,
) {
  if (!payload) return fallback;

  const detail = payload.details?.find(
    (item) => item.description || item.issue || item.field,
  );
  const detailMessage = [detail?.issue, detail?.description]
    .filter(Boolean)
    .join(": ");

  if (payload.message && detailMessage) {
    return `${payload.message} (${detailMessage})`;
  }

  return payload.message || detailMessage || fallback;
}
