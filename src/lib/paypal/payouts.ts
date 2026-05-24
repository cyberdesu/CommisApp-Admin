import "server-only";

import { createLogger, type AppLogger } from "@/lib/logger";
import { getAccessToken } from "./_auth";
import { PAYPAL_PAYOUT_TIMEOUT_MS, getPaypalConfig } from "./_config";
import { PaypalPayoutError, formatPaypalErrorMessage } from "./_errors";
import {
  buildPayoutMessage,
  extractDuplicateBatchLookupUrl,
  fetchPaypalBatchByUrl,
  fetchPaypalPayoutBatchDetails,
  fetchPaypalPayoutItemDetails,
  normalizeMoneyAmount,
  validatePayoutRequest,
} from "./_helpers";
import {
  isPaypalCreatePayoutResponse,
  type PaypalCreatePayoutResponse,
  type PaypalErrorResponse,
} from "./_types";

export async function getPaypalPayoutFinancials(options: {
  payoutId: string;
  payoutBatchId: string;
  payoutItemId?: string | null;
  logger?: AppLogger;
}) {
  const payoutId = options.payoutId.trim();
  const payoutBatchId = options.payoutBatchId.trim();

  if (!payoutId || !payoutBatchId) {
    throw new PaypalPayoutError(
      "PayPal payout sync requires both payout id and payout batch id.",
      { status: 400 },
    );
  }

  const logger = options.logger?.child({
    component: "paypal",
    payoutId,
    payoutBatchId,
  }) ?? createLogger({
    component: "paypal",
    payoutId,
    payoutBatchId,
  });

  const config = getPaypalConfig();
  const accessToken = await getAccessToken(config);

  logger.info("Fetching PayPal payout financial breakdown");

  let payoutItemId = options.payoutItemId?.trim() || null;
  let batchStatus: string | null = null;
  let itemStatus: string | null = null;

  if (!payoutItemId) {
    const batchDetails = await fetchPaypalPayoutBatchDetails({
      payoutBatchId,
      accessToken,
      apiBaseUrl: config.apiBaseUrl,
    });

    batchStatus = batchDetails.batch_header?.batch_status ?? null;
    const matchedItem =
      batchDetails.items?.find(
        (item) => item.payout_item?.sender_item_id === payoutId,
      ) ??
      batchDetails.items?.[0] ??
      null;

    payoutItemId = matchedItem?.payout_item_id ?? null;
    itemStatus = matchedItem?.transaction_status ?? null;
  }

  if (!payoutItemId) {
    logger.warn("PayPal payout item id is not available yet");
    return {
      payoutBatchId,
      payoutItemId: null,
      batchStatus,
      itemStatus,
      payoutFee: null,
      payoutAmount: null,
    };
  }

  const itemDetails = await fetchPaypalPayoutItemDetails({
    payoutItemId,
    accessToken,
    apiBaseUrl: config.apiBaseUrl,
  });

  const payoutFee = normalizeMoneyAmount(itemDetails.payout_item_fee);
  const payoutAmount = normalizeMoneyAmount(itemDetails.payout_item?.amount);
  itemStatus = itemDetails.transaction_status ?? itemStatus;

  logger.info("Fetched PayPal payout financial breakdown", {
    payoutItemId,
    batchStatus,
    itemStatus,
    payoutFee: payoutFee?.amount ?? null,
    payoutFeeCurrency: payoutFee?.currency ?? null,
    payoutAmount: payoutAmount?.amount ?? null,
    payoutAmountCurrency: payoutAmount?.currency ?? null,
  });

  return {
    payoutBatchId,
    payoutItemId,
    batchStatus,
    itemStatus,
    payoutFee,
    payoutAmount,
  };
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
      logger.warn(
        "PayPal reported a duplicate payout request, fetching existing batch",
        {
          statusCode: response.status,
        },
      );

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

      logger.info(
        "Recovered existing PayPal payout batch after duplicate request",
        {
          durationMs: Date.now() - startedAt,
          payoutBatchId: recoveredBatchId,
          batchStatus: recoveredBatchStatus,
        },
      );

      return {
        payoutBatchId: recoveredBatchId,
        batchStatus: recoveredBatchStatus,
        payoutItemId: recoveredPayoutItemId,
        itemStatus: isPaypalCreatePayoutResponse(recovered)
          ? recovered.items?.[0]?.transaction_status ?? null
          : null,
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
    itemStatus: isPaypalCreatePayoutResponse(raw)
      ? raw.items?.[0]?.transaction_status ?? null
      : null,
    wasRecoveredFromDuplicate: false,
  };
}
