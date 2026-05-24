import "server-only";

import { PaypalPayoutError } from "./_errors";
import type { PaypalConfig } from "./_types";

export const PAYPAL_AUTH_TIMEOUT_MS = 10_000;
export const PAYPAL_PAYOUT_TIMEOUT_MS = 15_000;
export const CURRENCY_CODE_REGEX = /^[A-Z]{3}$/;

function readEnv(...keys: string[]) {
  for (const key of keys) {
    const value = process.env[key]?.trim();
    if (value) return value;
  }

  return null;
}

export function getPaypalConfig(): PaypalConfig {
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

export function buildBasicAuthHeader(clientId: string, clientSecret: string) {
  return `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`;
}
