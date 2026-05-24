import "server-only";

export type PaypalConfig = {
  clientId: string;
  clientSecret: string;
  apiBaseUrl: string;
};

export type PaypalAccessTokenResponse = {
  access_token?: string;
  token_type?: string;
};

export type PaypalErrorDetail = {
  field?: string;
  issue?: string;
  description?: string;
  value?: string;
};

export type PaypalLink = {
  href?: string;
  rel?: string;
  method?: string;
  encType?: string;
};

export type PaypalErrorResponse = {
  name?: string;
  message?: string;
  debug_id?: string;
  details?: PaypalErrorDetail[];
  links?: PaypalLink[];
};

export type PaypalCreatePayoutResponse = {
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

export type PaypalMoneyAmount = {
  currency_code?: string;
  currency?: string;
  value?: string;
};

export type PaypalPayoutBatchDetailsResponse = {
  batch_header?: {
    payout_batch_id?: string;
    batch_status?: string;
  };
  items?: Array<{
    payout_item_id?: string;
    transaction_status?: string;
    payout_item?: {
      sender_item_id?: string;
      amount?: PaypalMoneyAmount;
    };
  }>;
};

export type PaypalPayoutItemDetailsResponse = {
  payout_item_id?: string;
  transaction_status?: string;
  payout_item_fee?: PaypalMoneyAmount;
  payout_item?: {
    sender_item_id?: string;
    amount?: PaypalMoneyAmount;
  };
};

export type PaypalCaptureDetailsResponse = {
  id?: string;
  status?: string;
  seller_receivable_breakdown?: {
    gross_amount?: PaypalMoneyAmount;
    paypal_fee?: PaypalMoneyAmount;
    paypal_fee_in_receivable_currency?: PaypalMoneyAmount;
    net_amount?: PaypalMoneyAmount;
    receivable_amount?: PaypalMoneyAmount;
  };
};

export function isPaypalAccessTokenResponse(
  payload: PaypalAccessTokenResponse | PaypalErrorResponse | null,
): payload is PaypalAccessTokenResponse {
  return Boolean(payload && "access_token" in payload);
}

export function isPaypalCreatePayoutResponse(
  payload: PaypalCreatePayoutResponse | PaypalErrorResponse | null,
): payload is PaypalCreatePayoutResponse {
  return Boolean(payload && ("batch_header" in payload || "items" in payload));
}

export function isPaypalCaptureDetailsResponse(
  payload: PaypalCaptureDetailsResponse | PaypalErrorResponse | null,
): payload is PaypalCaptureDetailsResponse {
  return Boolean(
    payload && ("seller_receivable_breakdown" in payload || "status" in payload),
  );
}

export function isPaypalPayoutBatchDetailsResponse(
  payload: PaypalPayoutBatchDetailsResponse | PaypalErrorResponse | null,
): payload is PaypalPayoutBatchDetailsResponse {
  return Boolean(payload && ("batch_header" in payload || "items" in payload));
}

export function isPaypalPayoutItemDetailsResponse(
  payload: PaypalPayoutItemDetailsResponse | PaypalErrorResponse | null,
): payload is PaypalPayoutItemDetailsResponse {
  return Boolean(
    payload && ("payout_item_id" in payload || "transaction_status" in payload),
  );
}
