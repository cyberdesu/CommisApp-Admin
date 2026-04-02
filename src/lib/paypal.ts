import "server-only";

import { createLogger, type AppLogger } from "@/lib/logger";

const PAYPAL_AUTH_TIMEOUT_MS = 10_000;
const PAYPAL_PAYOUT_TIMEOUT_MS = 15_000;
const CURRENCY_CODE_REGEX = /^[A-Z]{3}$/;

type PaypalConfig = {
  clientId: string;
  clientSecret: string;
  apiBaseUrl: string;
};

type PaypalAccessTokenResponse = {
  access_token?: string;
  token_type?: string;
};

type PaypalErrorDetail = {
  field?: string;
  issue?: string;
  description?: string;
  value?: string;
};

type PaypalErrorResponse = {
  name?: string;
  message?: string;
  debug_id?: string;
  details?: PaypalErrorDetail[];
  links?: PaypalLink[];
};

type PaypalLink = {
  href?: string;
  rel?: string;
  method?: string;
  encType?: string;
};

type PaypalCreatePayoutResponse = {
  batch_header?: {
    payout_batch_id?: string;
    batch_status?: string;
    sender_batch_header?: {
      sender_batch_id?: string;
    };
  };
  links?: PaypalLink[];
  items?: Array<{
    payout_item_id?: string;
    transaction_status?: string;
  }>;
};

function isPaypalAccessTokenResponse(
  payload: PaypalAccessTokenResponse | PaypalErrorResponse | null,
): payload is PaypalAccessTokenResponse {
  return Boolean(payload && "access_token" in payload);
}

function isPaypalCreatePayoutResponse(
  payload: PaypalCreatePayoutResponse | PaypalErrorResponse | null,
): payload is PaypalCreatePayoutResponse {
  return Boolean(payload && ("batch_header" in payload || "items" in payload));
}

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

function findLinkByRel(
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

function readEnv(...keys: string[]) {
  for (const key of keys) {
    const value = process.env[key]?.trim();
    if (value) return value;
  }

  return null;
}

function getPaypalConfig(): PaypalConfig {
  const clientId = readEnv("PAYPAL_CLIENT_ID", "paypal_client_id");
  const clientSecret = readEnv(
    "PAYPAL_CLIENT_SECRET",
    "PAYPAL_SECRET",
    "paypal_secret",
  );
  const apiBaseUrl =
    readEnv("PAYPAL_API_URL", "paypal_api_url") ??
    "https://api-m.sandbox.paypal.com";

  if (!clientId || !clientSecret) {
    throw new PaypalPayoutError(
      "PayPal payout credentials are missing. Set PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET in .env.",
      { status: 500 },
    );
  }

  if (clientId === clientSecret) {
    throw new PaypalPayoutError(
      "PayPal credentials look misconfigured. Client ID and client secret must be different values.",
      { status: 500 },
    );
  }

  let parsedApiBaseUrl: URL;
  try {
    parsedApiBaseUrl = new URL(apiBaseUrl);
  } catch {
    throw new PaypalPayoutError("PAYPAL_API_URL is not a valid URL.", {
      status: 500,
    });
  }

  if (parsedApiBaseUrl.protocol !== "https:") {
    throw new PaypalPayoutError("PAYPAL_API_URL must use HTTPS.", {
      status: 500,
    });
  }

  return {
    clientId,
    clientSecret,
    apiBaseUrl: parsedApiBaseUrl.toString().replace(/\/+$/, ""),
  };
}

function buildBasicAuthHeader(clientId: string, clientSecret: string) {
  return `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`;
}

function formatPaypalErrorMessage(
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

function validatePayoutRequest(options: {
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
    throw new PaypalPayoutError("Payout currency must be a 3-letter ISO code.", {
      status: 400,
    });
  }
}

async function getAccessToken(config: PaypalConfig) {
  const response = await fetch(`${config.apiBaseUrl}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: buildBasicAuthHeader(config.clientId, config.clientSecret),
      Accept: "application/json",
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
    cache: "no-store",
    signal: AbortSignal.timeout(PAYPAL_AUTH_TIMEOUT_MS),
  });

  const raw = (await response.json().catch(() => null)) as
    | PaypalAccessTokenResponse
    | PaypalErrorResponse
    | null;

  if (!response.ok) {
    throw new PaypalPayoutError(
      formatPaypalErrorMessage(
        raw as PaypalErrorResponse | null,
        "Failed to authenticate with PayPal.",
      ),
      {
        status: response.status,
        details: (raw as PaypalErrorResponse | null) ?? null,
      },
    );
  }

  const accessToken = isPaypalAccessTokenResponse(raw)
    ? raw.access_token?.trim()
    : undefined;

  if (!accessToken) {
    throw new PaypalPayoutError("PayPal did not return an access token.", {
      status: 502,
    });
  }

  return accessToken;
}

async function fetchPaypalBatchByUrl(options: {
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

function extractDuplicateBatchLookupUrl(payload: PaypalErrorResponse | null) {
  return (
    findLinkByRel(payload?.links, "self", "GET")?.href ??
    findLinkByRel(payload?.links, "duplicate", "GET")?.href ??
    null
  );
}

function buildPayoutMessage(note?: string | null) {
  if (note?.trim()) return note.trim();
  return "Your commission payout has been approved.";
}

export async function createPaypalPayout(options: {
  payoutId: string;
  receiverEmail: string;
  amount: string;
  currency: string;
  note?: string | null;
  logger?: AppLogger;
}) {
  const logger = options.logger?.child({ component: "paypal" }) ??
    createLogger({ component: "paypal", payoutId: options.payoutId });
  const startedAt = Date.now();

  validatePayoutRequest(options);

  const config = getPaypalConfig();
  logger.debug("Requesting PayPal access token", {
    apiBaseUrl: config.apiBaseUrl,
  });
  const accessToken = await getAccessToken(config);

  const payoutMessage = buildPayoutMessage(options.note);
  const payload = {
    sender_batch_header: {
      sender_batch_id: options.payoutId,
      recipient_type: "EMAIL",
      email_subject: "You have a payout from CommisApp",
      email_message: payoutMessage,
    },
    items: [
      {
        recipient_type: "EMAIL",
        amount: {
          value: options.amount,
          currency: options.currency,
        },
        sender_item_id: options.payoutId,
        receiver: options.receiverEmail,
        recipient_wallet: "PAYPAL",
        note: payoutMessage,
      },
    ],
  };

  logger.info("Submitting payout to PayPal", {
    currency: options.currency,
    amount: options.amount,
  });

  const response = await fetch(`${config.apiBaseUrl}/v1/payments/payouts`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
      "Content-Type": "application/json",
      "PayPal-Request-Id": options.payoutId,
    },
    body: JSON.stringify(payload),
    cache: "no-store",
    signal: AbortSignal.timeout(PAYPAL_PAYOUT_TIMEOUT_MS),
  });

  const raw = (await response.json().catch(() => null)) as
    | PaypalCreatePayoutResponse
    | PaypalErrorResponse
    | null;

  if (!response.ok) {
    const errorPayload = (raw as PaypalErrorResponse | null) ?? null;
    const duplicateBatchLookupUrl = extractDuplicateBatchLookupUrl(errorPayload);

    if (duplicateBatchLookupUrl) {
      logger.warn("PayPal reported a duplicate payout request, fetching existing batch", {
        statusCode: response.status,
      });

      const recovered = await fetchPaypalBatchByUrl({
        url: duplicateBatchLookupUrl,
        accessToken,
      });

      const recoveredBatchId = isPaypalCreatePayoutResponse(recovered)
        ? recovered.batch_header?.payout_batch_id ?? null
        : null;
      const recoveredBatchStatus = isPaypalCreatePayoutResponse(recovered)
        ? recovered.batch_header?.batch_status ?? null
        : null;
      const recoveredPayoutItemId = isPaypalCreatePayoutResponse(recovered)
        ? recovered.items?.[0]?.payout_item_id ?? null
        : null;

      logger.info("Recovered existing PayPal payout batch after duplicate request", {
        durationMs: Date.now() - startedAt,
        payoutBatchId: recoveredBatchId,
        batchStatus: recoveredBatchStatus,
      });

      return {
        payoutBatchId: recoveredBatchId,
        batchStatus: recoveredBatchStatus,
        payoutItemId: recoveredPayoutItemId,
        wasRecoveredFromDuplicate: true,
      };
    }

    throw new PaypalPayoutError(
      formatPaypalErrorMessage(
        errorPayload,
        "PayPal rejected the payout request.",
      ),
      {
        status: response.status,
        details: errorPayload,
      },
    );
  }

  const payoutBatchId = isPaypalCreatePayoutResponse(raw)
    ? raw.batch_header?.payout_batch_id ?? null
    : null;
  const batchStatus = isPaypalCreatePayoutResponse(raw)
    ? raw.batch_header?.batch_status ?? null
    : null;
  const payoutItemId = isPaypalCreatePayoutResponse(raw)
    ? raw.items?.[0]?.payout_item_id ?? null
    : null;

  logger.info("PayPal payout created", {
    durationMs: Date.now() - startedAt,
    statusCode: response.status,
    batchStatus,
    payoutBatchId,
    payoutItemId,
  });

  return {
    payoutBatchId,
    batchStatus,
    payoutItemId,
    wasRecoveredFromDuplicate: false,
  };
}
