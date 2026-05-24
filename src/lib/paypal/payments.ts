import "server-only";

import { createLogger, type AppLogger } from "@/lib/logger";
import { getAccessToken } from "./_auth";
import { PAYPAL_PAYOUT_TIMEOUT_MS, getPaypalConfig } from "./_config";
import { PaypalPayoutError, formatPaypalErrorMessage } from "./_errors";
import { normalizeMoneyAmount } from "./_helpers";
import {
  isPaypalCaptureDetailsResponse,
  type PaypalCaptureDetailsResponse,
  type PaypalErrorResponse,
} from "./_types";

export async function getPaypalCaptureFinancials(options: {
  captureId: string;
  logger?: AppLogger;
}) {
  const captureId = options.captureId.trim();
  if (!captureId) {
    throw new PaypalPayoutError("PayPal capture id is required.", {
      status: 400,
    });
  }

  const logger = options.logger?.child({
    component: "paypal",
    paypalCaptureId: captureId,
  }) ?? createLogger({
    component: "paypal",
    paypalCaptureId: captureId,
  });

  const config = getPaypalConfig();
  const accessToken = await getAccessToken(config);

  logger.info("Fetching PayPal capture financial breakdown");

  const response = await fetch(
    `${config.apiBaseUrl}/v2/payments/captures/${encodeURIComponent(captureId)}`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/json",
      },
      cache: "no-store",
      signal: AbortSignal.timeout(PAYPAL_PAYOUT_TIMEOUT_MS),
    },
  );

  const raw = (await response.json().catch(() => null)) as
    | PaypalCaptureDetailsResponse
    | PaypalErrorResponse
    | null;

  if (!response.ok) {
    throw new PaypalPayoutError(
      formatPaypalErrorMessage(
        raw as PaypalErrorResponse | null,
        "Failed to fetch PayPal capture details.",
      ),
      {
        status: response.status,
        details: (raw as PaypalErrorResponse | null) ?? null,
      },
    );
  }

  if (!isPaypalCaptureDetailsResponse(raw)) {
    throw new PaypalPayoutError(
      "PayPal capture details response is malformed.",
      { status: 502 },
    );
  }

  const breakdown = raw.seller_receivable_breakdown;
  const grossAmount = normalizeMoneyAmount(breakdown?.gross_amount);
  const paypalFee =
    normalizeMoneyAmount(breakdown?.paypal_fee_in_receivable_currency) ??
    normalizeMoneyAmount(breakdown?.paypal_fee);
  const netAmount =
    normalizeMoneyAmount(breakdown?.receivable_amount) ??
    normalizeMoneyAmount(breakdown?.net_amount);

  logger.info("Fetched PayPal capture financial breakdown", {
    status: raw.status ?? null,
    grossAmount: grossAmount?.amount ?? null,
    grossCurrency: grossAmount?.currency ?? null,
    paypalFee: paypalFee?.amount ?? null,
    paypalFeeCurrency: paypalFee?.currency ?? null,
    netAmount: netAmount?.amount ?? null,
    netCurrency: netAmount?.currency ?? null,
  });

  return {
    status: raw.status ?? null,
    grossAmount,
    paypalFee,
    netAmount,
  };
}
