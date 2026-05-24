import "server-only";

import {
  CURRENCY_CODE_REGEX,
  PAYPAL_PAYOUT_TIMEOUT_MS,
} from "./_config";
import { PaypalPayoutError, formatPaypalErrorMessage } from "./_errors";
import {
  isPaypalPayoutBatchDetailsResponse,
  isPaypalPayoutItemDetailsResponse,
  type PaypalCreatePayoutResponse,
  type PaypalErrorResponse,
  type PaypalLink,
  type PaypalMoneyAmount,
  type PaypalPayoutBatchDetailsResponse,
  type PaypalPayoutItemDetailsResponse,
} from "./_types";

export function findLinkByRel(
  links: PaypalLink[] | undefined,
  rel: string,
  method?: string,
) {
  return (
    links?.find(
      (link) =>
        link.rel === rel &&
        (!method || !link.method || link.method.toUpperCase() === method),
    ) ?? null
  );
}

export function normalizeMoneyAmount(value: PaypalMoneyAmount | undefined) {
  const amount = value?.value?.trim();
  const currency = (value?.currency_code ?? value?.currency)
    ?.trim()
    .toUpperCase();

  if (!amount || !currency) {
    return null;
  }

  return {
    amount,
    currency,
  };
}

export function buildPayoutMessage(note?: string | null) {
  if (note?.trim()) return note.trim();
  return "Your commission payout has been approved.";
}

export function validatePayoutRequest(options: {
  payoutId: string;
  receiverEmail: string;
  amount: string;
  currency: string;
}) {
  const receiverEmail = options.receiverEmail.trim();
  const amount = Number(options.amount);
  const currency = options.currency.trim().toUpperCase();

  if (!receiverEmail || !receiverEmail.includes("@")) {
    throw new PaypalPayoutError("Payout recipient PayPal email is invalid.", {
      status: 400,
    });
  }

  if (!Number.isFinite(amount) || amount <= 0) {
    throw new PaypalPayoutError("Payout amount must be greater than zero.", {
      status: 400,
    });
  }

  if (!CURRENCY_CODE_REGEX.test(currency)) {
    throw new PaypalPayoutError(
      "Payout currency must be a 3-letter ISO code.",
      { status: 400 },
    );
  }
}

export function extractDuplicateBatchLookupUrl(
  payload: PaypalErrorResponse | null,
) {
  return (
    findLinkByRel(payload?.links, "self", "GET")?.href ??
    findLinkByRel(payload?.links, "duplicate", "GET")?.href ??
    null
  );
}

export async function fetchPaypalBatchByUrl(options: {
  url: string;
  accessToken: string;
}) {
  const response = await fetch(options.url, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${options.accessToken}`,
      Accept: "application/json",
    },
    cache: "no-store",
    signal: AbortSignal.timeout(PAYPAL_PAYOUT_TIMEOUT_MS),
  });

  const raw = (await response.json().catch(() => null)) as
    | PaypalCreatePayoutResponse
    | PaypalErrorResponse
    | null;

  if (!response.ok) {
    throw new PaypalPayoutError(
      formatPaypalErrorMessage(
        raw as PaypalErrorResponse | null,
        "Failed to fetch PayPal payout batch details.",
      ),
      {
        status: response.status,
        details: (raw as PaypalErrorResponse | null) ?? null,
      },
    );
  }

  return raw;
}

export async function fetchPaypalPayoutBatchDetails(options: {
  payoutBatchId: string;
  accessToken: string;
  apiBaseUrl: string;
}) {
  const response = await fetch(
    `${options.apiBaseUrl}/v1/payments/payouts/${encodeURIComponent(options.payoutBatchId)}`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${options.accessToken}`,
        Accept: "application/json",
      },
      cache: "no-store",
      signal: AbortSignal.timeout(PAYPAL_PAYOUT_TIMEOUT_MS),
    },
  );

  const raw = (await response.json().catch(() => null)) as
    | PaypalPayoutBatchDetailsResponse
    | PaypalErrorResponse
    | null;

  if (!response.ok) {
    throw new PaypalPayoutError(
      formatPaypalErrorMessage(
        raw as PaypalErrorResponse | null,
        "Failed to fetch PayPal payout batch details.",
      ),
      {
        status: response.status,
        details: (raw as PaypalErrorResponse | null) ?? null,
      },
    );
  }

  if (!isPaypalPayoutBatchDetailsResponse(raw)) {
    throw new PaypalPayoutError(
      "PayPal payout batch details response is malformed.",
      { status: 502 },
    );
  }

  return raw;
}

export async function fetchPaypalPayoutItemDetails(options: {
  payoutItemId: string;
  accessToken: string;
  apiBaseUrl: string;
}) {
  const response = await fetch(
    `${options.apiBaseUrl}/v1/payments/payouts-item/${encodeURIComponent(options.payoutItemId)}`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${options.accessToken}`,
        Accept: "application/json",
      },
      cache: "no-store",
      signal: AbortSignal.timeout(PAYPAL_PAYOUT_TIMEOUT_MS),
    },
  );

  const raw = (await response.json().catch(() => null)) as
    | PaypalPayoutItemDetailsResponse
    | PaypalErrorResponse
    | null;

  if (!response.ok) {
    throw new PaypalPayoutError(
      formatPaypalErrorMessage(
        raw as PaypalErrorResponse | null,
        "Failed to fetch PayPal payout item details.",
      ),
      {
        status: response.status,
        details: (raw as PaypalErrorResponse | null) ?? null,
      },
    );
  }

  if (!isPaypalPayoutItemDetailsResponse(raw)) {
    throw new PaypalPayoutError(
      "PayPal payout item details response is malformed.",
      { status: 502 },
    );
  }

  return raw;
}
