import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { Client } from "pg";
import * as dotenv from "dotenv";

import { requireDatabaseUrl } from "../src/lib/env/database-url-core";

dotenv.config();

const ROLLBACK_FLAG = "--rollback";
const STATUS_FLAG = "--status";

const FORWARD_FILE = resolve(
  __dirname,
  "../prisma/sql/admin_realtime_triggers.sql",
);
const ROLLBACK_FILE = resolve(
  __dirname,
  "../prisma/sql/admin_realtime_triggers_rollback.sql",
);

const TRIGGER_NAMES = [
  "tr_admin_realtime_orders",
  "tr_admin_realtime_payments",
  "tr_admin_realtime_payouts",
  "tr_admin_realtime_conversations",
  "tr_admin_realtime_messages",
];

async function showStatus(client: Client) {
  const result = await client.query<{
    tgname: string;
    tgrelid: string;
    enabled: string;
  }>(
    `SELECT tgname, tgrelid::regclass::text AS tgrelid,
            CASE WHEN tgenabled = 'D' THEN 'disabled' ELSE 'enabled' END AS enabled
       FROM pg_trigger
      WHERE tgname = ANY($1::text[])
      ORDER BY tgname`,
    [TRIGGER_NAMES],
  );

  const fnExists = await client.query<{ exists: boolean }>(
    `SELECT EXISTS (
       SELECT 1 FROM pg_proc WHERE proname = 'notify_admin_realtime'
     ) AS exists`,
  );

  console.log("notify_admin_realtime() function:", fnExists.rows[0].exists ? "✓ installed" : "✗ missing");
  console.log("Triggers installed:", result.rowCount, "/", TRIGGER_NAMES.length);
  for (const row of result.rows) {
    console.log(`  • ${row.tgname} on ${row.tgrelid} (${row.enabled})`);
  }
  const missing = TRIGGER_NAMES.filter(
    (name) => !result.rows.find((r) => r.tgname === name),
  );
  if (missing.length > 0) {
    console.log("Missing triggers:");
    for (const name of missing) {
      console.log(`  • ${name}`);
    }
  }
}

async function main() {
  const args = new Set(process.argv.slice(2));
  const rollback = args.has(ROLLBACK_FLAG);
  const statusOnly = args.has(STATUS_FLAG);

  const databaseUrl = requireDatabaseUrl("apply-realtime-triggers");
  const client = new Client({ connectionString: databaseUrl });
  await client.connect();

  try {
    if (statusOnly) {
      await showStatus(client);
      return;
    }

    const file = rollback ? ROLLBACK_FILE : FORWARD_FILE;
    const sql = readFileSync(file, "utf8");

    console.log(`Applying ${rollback ? "rollback" : "forward"} SQL: ${file}`);
    await client.query(sql);
    console.log(`✓ ${rollback ? "Rollback" : "Forward"} applied successfully.`);

    console.log("\nCurrent status:");
    await showStatus(client);
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error("apply-realtime-triggers failed:", err);
  process.exit(1);
});
