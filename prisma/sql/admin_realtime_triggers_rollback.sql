-- Rollback admin realtime triggers
-- Run via: pnpm apply-realtime-triggers -- --rollback
-- Manual:  psql "$DATABASE_URL" -f prisma/sql/admin_realtime_triggers_rollback.sql

DROP TRIGGER IF EXISTS tr_admin_realtime_orders ON "Order";
DROP TRIGGER IF EXISTS tr_admin_realtime_payments ON payments;
DROP TRIGGER IF EXISTS tr_admin_realtime_payouts ON payouts;
DROP TRIGGER IF EXISTS tr_admin_realtime_conversations ON conversations;
DROP TRIGGER IF EXISTS tr_admin_realtime_messages ON messages;

DROP FUNCTION IF EXISTS notify_admin_realtime();
