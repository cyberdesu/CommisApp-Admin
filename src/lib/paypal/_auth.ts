import "server-only";

import {
  PAYPAL_AUTH_TIMEOUT_MS,
  buildBasicAuthHeader,
} from "./_config";
import { PaypalPayoutError, formatPaypalErrorMessage } from "./_errors";
import {
  isPaypalAccessTokenResponse,
  type PaypalAccessTokenResponse,
  type PaypalConfig,
  type PaypalErrorResponse,
} from "./_types";

export async function getAccessToken(config: PaypalConfig) {
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
