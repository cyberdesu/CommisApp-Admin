import "server-only";

import { Prisma } from "@/prisma/generated/client";
import prisma from "@/lib/prisma";
import type {
  AdminTransactionEntryType,
  AdminTransactionFeeSyncStatus,
  AdminTransactionLogEntry,
  AdminTransactionStats,
  AdminTransactionStatus,
} from "@/lib/transaction-log.types";

type TransactionTypeFilter = "ALL" | AdminTransactionEntryType;
type TransactionStatusFilter = "ALL" | AdminTransactionStatus;
type TransactionSyncFilter =
  | "ALL"
  | "SYNCED"
  | "PENDING_SYNC"
  | "NOT_REQUIRED";

type GetAdminTransactionsOptions = {
  page: number;
  limit: number;
  search: string;
  type: TransactionTypeFilter;
  status: TransactionStatusFilter;
  feeSync: TransactionSyncFilter;
};

type RawTransactionRow = {
  id: string;
  entry_type: AdminTransactionEntryType;
  status: AdminTransactionStatus;
  currency: string;
  gross_amount: string;
  platform_fee: string | null;
  paypal_fee: string;
  paypal_fee_currency: string | null;
  artist_amount: string | null;
  transfer_amount: string | null;
  admin_impact: string;
  occurred_at: Date;
  settled_at: Date | null;
  fee_sync_status: AdminTransactionFeeSyncStatus;
  order_id: string | null;
  order_title: string | null;
  paypal_order_id: string | null;
  paypal_capture_id: string | null;
  paypal_batch_id: string | null;
  paypal_item_id: string | null;
  paypal_batch_status: string | null;
  paypal_item_status: string | null;
  artist_id: number;
  artist_username: string;
  artist_email: string;
  artist_name: string | null;
  client_id: number | null;
  client_username: string | null;
  client_email: string | null;
  client_name: string | null;
  sort_date: Date;
};

function buildWhereClause(conditions: Prisma.Sql[]) {
  if (conditions.length === 0) {
    return Prisma.empty;
  }

  return Prisma.sql`WHERE ${Prisma.join(conditions, " AND ")}`;
}

function buildPaymentConditions(options: GetAdminTransactionsOptions) {
  const conditions: Prisma.Sql[] = [];

  if (options.type === "PAYOUT") {
    conditions.push(Prisma.sql`1 = 0`);
    return conditions;
  }

  if (options.status !== "ALL") {
    if (
      options.status === "PENDING" ||
      options.status === "COMPLETED" ||
      options.status === "FAILED" ||
      options.status === "REFUNDED"
    ) {
      conditions.push(Prisma.sql`p.status = ${options.status}`);
    } else {
      conditions.push(Prisma.sql`1 = 0`);
    }
  }

  if (options.feeSync === "SYNCED") {
    conditions.push(Prisma.sql`p."paypalFeeSyncedAt" IS NOT NULL`);
  } else if (options.feeSync === "PENDING_SYNC") {
    conditions.push(
      Prisma.sql`p."paypalCaptureId" IS NOT NULL AND p."paypalFeeSyncedAt" IS NULL`,
    );
  } else if (options.feeSync === "NOT_REQUIRED") {
    conditions.push(Prisma.sql`p."paypalCaptureId" IS NULL`);
  }

  if (options.search) {
    const search = `%${options.search}%`;
    conditions.push(
      Prisma.sql`(
        p.id ILIKE ${search}
        OR COALESCE(p."paypalOrderId", '') ILIKE ${search}
        OR COALESCE(p."paypalCaptureId", '') ILIKE ${search}
        OR o.id ILIKE ${search}
        OR COALESCE(o."titleSnapshot", '') ILIKE ${search}
        OR artist.username ILIKE ${search}
        OR artist.email ILIKE ${search}
        OR COALESCE(artist.name, '') ILIKE ${search}
        OR COALESCE(client.username, '') ILIKE ${search}
        OR COALESCE(client.email, '') ILIKE ${search}
        OR COALESCE(client.name, '') ILIKE ${search}
      )`,
    );
  }

  return conditions;
}

function buildPayoutConditions(options: GetAdminTransactionsOptions) {
  const conditions: Prisma.Sql[] = [];

  if (options.type === "PAYMENT") {
    conditions.push(Prisma.sql`1 = 0`);
    return conditions;
  }

  if (options.status !== "ALL") {
    if (
      options.status === "PENDING" ||
      options.status === "SENT" ||
      options.status === "FRAUD"
    ) {
      conditions.push(Prisma.sql`po.status = ${options.status}`);
    } else {
      conditions.push(Prisma.sql`1 = 0`);
    }
  }

  if (options.feeSync === "SYNCED") {
    conditions.push(Prisma.sql`po."paypalFeeSyncedAt" IS NOT NULL`);
  } else if (options.feeSync === "PENDING_SYNC") {
    conditions.push(
      Prisma.sql`po."paypalBatchId" IS NOT NULL AND po."paypalFeeSyncedAt" IS NULL`,
    );
  } else if (options.feeSync === "NOT_REQUIRED") {
    conditions.push(Prisma.sql`po."paypalBatchId" IS NULL`);
  }

  if (options.search) {
    const search = `%${options.search}%`;
    conditions.push(
      Prisma.sql`(
        po.id ILIKE ${search}
        OR COALESCE(po."paypalEmail", '') ILIKE ${search}
        OR COALESCE(po."paypalBatchId", '') ILIKE ${search}
        OR COALESCE(po."paypalItemId", '') ILIKE ${search}
        OR artist.username ILIKE ${search}
        OR artist.email ILIKE ${search}
        OR COALESCE(artist.name, '') ILIKE ${search}
      )`,
    );
  }

  return conditions;
}

function mapRow(row: RawTransactionRow): AdminTransactionLogEntry {
  return {
    id: row.id,
    entryType: row.entry_type,
    status: row.status,
    currency: row.currency,
    grossAmount: row.gross_amount,
    platformFee: row.platform_fee,
    paypalFee: row.paypal_fee,
    paypalFeeCurrency: row.paypal_fee_currency,
    artistAmount: row.artist_amount,
    transferAmount: row.transfer_amount,
    adminImpact: row.admin_impact,
    occurredAt: row.occurred_at.toISOString(),
    settledAt: row.settled_at?.toISOString() ?? null,
    feeSyncStatus: row.fee_sync_status,
    orderId: row.order_id,
    orderTitle: row.order_title,
    paypalOrderId: row.paypal_order_id,
    paypalCaptureId: row.paypal_capture_id,
    paypalBatchId: row.paypal_batch_id,
    paypalItemId: row.paypal_item_id,
    paypalBatchStatus: row.paypal_batch_status,
    paypalItemStatus: row.paypal_item_status,
    artist: {
      id: row.artist_id,
      username: row.artist_username,
      email: row.artist_email,
      name: row.artist_name,
    },
    client: row.client_id
      ? {
          id: row.client_id,
          username: row.client_username,
          email: row.client_email,
          name: row.client_name,
        }
      : null,
  };
}

async function getTransactionCounts(options: GetAdminTransactionsOptions) {
  const paymentWhere = buildWhereClause(buildPaymentConditions(options));
  const payoutWhere = buildWhereClause(buildPayoutConditions(options));

  const [paymentStatsRows, payoutStatsRows] = await Promise.all([
    prisma.$queryRaw<
      Array<{
        total: number;
        pending: number;
        synced: number;
        pending_sync: number;
      }>
    >(
      Prisma.sql`
        SELECT
          COUNT(*)::int AS total,
          COUNT(*) FILTER (WHERE p.status = 'PENDING')::int AS pending,
          COUNT(*) FILTER (WHERE p."paypalFeeSyncedAt" IS NOT NULL)::int AS synced,
          COUNT(*) FILTER (
            WHERE p."paypalCaptureId" IS NOT NULL
              AND p."paypalFeeSyncedAt" IS NULL
          )::int AS pending_sync
        FROM payments p
        INNER JOIN "Order" o ON o.id = p."orderId"
        INNER JOIN "User" artist ON artist.id = o."artistId"
        LEFT JOIN "User" client ON client.id = o."clientId"
        ${paymentWhere}
      `,
    ),
    prisma.$queryRaw<
      Array<{
        total: number;
        pending: number;
        synced: number;
        pending_sync: number;
      }>
    >(
      Prisma.sql`
        SELECT
          COUNT(*)::int AS total,
          COUNT(*) FILTER (WHERE po.status = 'PENDING')::int AS pending,
          COUNT(*) FILTER (WHERE po."paypalFeeSyncedAt" IS NOT NULL)::int AS synced,
          COUNT(*) FILTER (
            WHERE po."paypalBatchId" IS NOT NULL
              AND po."paypalFeeSyncedAt" IS NULL
          )::int AS pending_sync
        FROM payouts po
        INNER JOIN "User" artist ON artist.id = po."artistId"
        ${payoutWhere}
      `,
    ),
  ]);

  const paymentStats = paymentStatsRows[0] ?? {
    total: 0,
    pending: 0,
    synced: 0,
    pending_sync: 0,
  };
  const payoutStats = payoutStatsRows[0] ?? {
    total: 0,
    pending: 0,
    synced: 0,
    pending_sync: 0,
  };

  return {
    paymentTransactions: paymentStats.total,
    payoutTransactions: payoutStats.total,
    totalTransactions: paymentStats.total + payoutStats.total,
    pendingTransactions: paymentStats.pending + payoutStats.pending,
    syncedFeeRows: paymentStats.synced + payoutStats.synced,
    pendingFeeSyncRows: paymentStats.pending_sync + payoutStats.pending_sync,
  } satisfies AdminTransactionStats;
}

export async function getAdminTransactionStats(
  options: Omit<GetAdminTransactionsOptions, "page" | "limit">,
) {
  return getTransactionCounts({
    ...options,
    page: 1,
    limit: 1,
  });
}

export async function getAdminTransactionsList(
  options: GetAdminTransactionsOptions,
) {
  const paymentWhere = buildWhereClause(buildPaymentConditions(options));
  const payoutWhere = buildWhereClause(buildPayoutConditions(options));
  const offset = (options.page - 1) * options.limit;

  const [rows, stats] = await Promise.all([
    prisma.$queryRaw<RawTransactionRow[]>(
      Prisma.sql`
        WITH payment_rows AS (
          SELECT
            p.id,
            'PAYMENT'::text AS entry_type,
            p.status::text AS status,
            p.currency,
            p.amount::text AS gross_amount,
            p."platformFee"::text AS platform_fee,
            p."paypalFee"::text AS paypal_fee,
            p."paypalFeeCurrency" AS paypal_fee_currency,
            p."artistNet"::text AS artist_amount,
            NULL::text AS transfer_amount,
            (p."platformFee" - p."paypalFee")::text AS admin_impact,
            p."createdAt" AS occurred_at,
            p."paidAt" AS settled_at,
            CASE
              WHEN p."paypalCaptureId" IS NULL THEN 'NOT_REQUIRED'
              WHEN p."paypalFeeSyncedAt" IS NULL THEN 'PENDING_SYNC'
              ELSE 'SYNCED'
            END::text AS fee_sync_status,
            o.id AS order_id,
            o."titleSnapshot" AS order_title,
            p."paypalOrderId" AS paypal_order_id,
            p."paypalCaptureId" AS paypal_capture_id,
            NULL::text AS paypal_batch_id,
            NULL::text AS paypal_item_id,
            NULL::text AS paypal_batch_status,
            NULL::text AS paypal_item_status,
            artist.id AS artist_id,
            artist.username AS artist_username,
            artist.email AS artist_email,
            artist.name AS artist_name,
            client.id AS client_id,
            client.username AS client_username,
            client.email AS client_email,
            client.name AS client_name,
            COALESCE(p."paidAt", p."createdAt") AS sort_date
          FROM payments p
          INNER JOIN "Order" o ON o.id = p."orderId"
          INNER JOIN "User" artist ON artist.id = o."artistId"
          LEFT JOIN "User" client ON client.id = o."clientId"
          ${paymentWhere}
        ),
        payout_rows AS (
          SELECT
            po.id,
            'PAYOUT'::text AS entry_type,
            po.status::text AS status,
            po.currency,
            po.amount::text AS gross_amount,
            NULL::text AS platform_fee,
            po."paypalFee"::text AS paypal_fee,
            po."paypalFeeCurrency" AS paypal_fee_currency,
            NULL::text AS artist_amount,
            po.amount::text AS transfer_amount,
            (po."paypalFee" * -1)::text AS admin_impact,
            po."createdAt" AS occurred_at,
            po."reviewedAt" AS settled_at,
            CASE
              WHEN po."paypalBatchId" IS NULL THEN 'NOT_REQUIRED'
              WHEN po."paypalFeeSyncedAt" IS NULL THEN 'PENDING_SYNC'
              ELSE 'SYNCED'
            END::text AS fee_sync_status,
            NULL::text AS order_id,
            NULL::text AS order_title,
            NULL::text AS paypal_order_id,
            NULL::text AS paypal_capture_id,
            po."paypalBatchId" AS paypal_batch_id,
            po."paypalItemId" AS paypal_item_id,
            po."paypalBatchStatus" AS paypal_batch_status,
            po."paypalItemStatus" AS paypal_item_status,
            artist.id AS artist_id,
            artist.username AS artist_username,
            artist.email AS artist_email,
            artist.name AS artist_name,
            NULL::int AS client_id,
            NULL::text AS client_username,
            NULL::text AS client_email,
            NULL::text AS client_name,
            COALESCE(po."reviewedAt", po."createdAt") AS sort_date
          FROM payouts po
          INNER JOIN "User" artist ON artist.id = po."artistId"
          ${payoutWhere}
        )
        SELECT *
        FROM (
          SELECT * FROM payment_rows
          UNION ALL
          SELECT * FROM payout_rows
        ) AS combined
        ORDER BY sort_date DESC, entry_type ASC, id DESC
        LIMIT ${options.limit}
        OFFSET ${offset}
      `,
    ),
    getTransactionCounts(options),
  ]);

  const totalPages = Math.max(1, Math.ceil(stats.totalTransactions / options.limit));

  return {
    data: rows.map(mapRow),
    meta: {
      page: options.page,
      limit: options.limit,
      total: stats.totalTransactions,
      totalPages,
      hasNextPage: options.page < totalPages,
      hasPreviousPage: options.page > 1,
    },
    stats,
  };
}
