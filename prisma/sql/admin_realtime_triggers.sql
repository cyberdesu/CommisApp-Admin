-- =============================================================================
-- Admin realtime pg_notify triggers
-- Run via: pnpm apply-realtime-triggers
-- Manual:  psql "$DATABASE_URL" -f prisma/sql/admin_realtime_triggers.sql
-- Rollback: see admin_realtime_triggers_rollback.sql
-- =============================================================================

CREATE OR REPLACE FUNCTION notify_admin_realtime() RETURNS trigger AS $$
BEGIN
  PERFORM pg_notify('admin_realtime', TG_ARGV[0]);
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Orders
DROP TRIGGER IF EXISTS tr_admin_realtime_orders ON "Order";
CREATE TRIGGER tr_admin_realtime_orders
  AFTER INSERT OR UPDATE OR DELETE ON "Order"
  FOR EACH STATEMENT
  EXECUTE FUNCTION notify_admin_realtime('orders');

-- Finance (payments + payouts)
DROP TRIGGER IF EXISTS tr_admin_realtime_payments ON payments;
CREATE TRIGGER tr_admin_realtime_payments
  AFTER INSERT OR UPDATE OR DELETE ON payments
  FOR EACH STATEMENT
  EXECUTE FUNCTION notify_admin_realtime('finance');

DROP TRIGGER IF EXISTS tr_admin_realtime_payouts ON payouts;
CREATE TRIGGER tr_admin_realtime_payouts
  AFTER INSERT OR UPDATE OR DELETE ON payouts
  FOR EACH STATEMENT
  EXECUTE FUNCTION notify_admin_realtime('finance');

-- Chats (conversations + messages)
DROP TRIGGER IF EXISTS tr_admin_realtime_conversations ON conversations;
CREATE TRIGGER tr_admin_realtime_conversations
  AFTER INSERT OR UPDATE OR DELETE ON conversations
  FOR EACH STATEMENT
  EXECUTE FUNCTION notify_admin_realtime('chats');

DROP TRIGGER IF EXISTS tr_admin_realtime_messages ON messages;
CREATE TRIGGER tr_admin_realtime_messages
  AFTER INSERT OR UPDATE OR DELETE ON messages
  FOR EACH STATEMENT
  EXECUTE FUNCTION notify_admin_realtime('chats');
