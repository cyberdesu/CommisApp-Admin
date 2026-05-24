# Admin Refund Operations

Panduan operator untuk handle refund di admin panel. Companion ke [ADMIN_FINANCE_LEDGER.md](./ADMIN_FINANCE_LEDGER.md) yang fokus ke fee accounting.

Backend reference: `CommisApp/docs/REFUND_SYSTEM.md` + `CommisApp/docs/FRONTEND_REFUND_INTEGRATION.md`.

## Daftar Isi

- [Overview](#overview)
- [Endpoints Yang Dipanggil dari Admin Panel](#endpoints-yang-dipanggil-dari-admin-panel)
- [Normal Flow — Decide on Escalated Refund](#normal-flow--decide-on-escalated-refund)
- [Force-Create — Escape Hatch](#force-create--escape-hatch)
- [Manual Reconciliation — Webhook Stuck](#manual-reconciliation--webhook-stuck)
- [Status Display Mapping](#status-display-mapping)
- [Breaking Changes](#breaking-changes)
- [Required Env](#required-env)

---

## Overview

Admin punya tiga jalur action di flow refund:

1. **Decide on ESCALATED** — refund yang di-deny artist masuk ke admin queue
2. **Decide on FAILED** — retry refund yang gagal di PayPal (recover from crash)
3. **Force-create** — escape hatch untuk case di luar policy normal (window expired, balance insufficient, dll)

Setiap action di-attribute ke `adminId` dari session admin panel + audit log di `OrderEvent.metadata`.

---

## Endpoints Yang Dipanggil dari Admin Panel

Admin panel (Next.js) berkomunikasi ke backend Nest via `/api/internal/*` routes, masing-masing punya wrapper di:

```
CommisApp-Admin/src/app/api/refunds/[id]/decide/route.ts   → decision
CommisApp-Admin/src/app/api/refunds/[id]/route.ts          → GET detail
CommisApp-Admin/src/app/api/refunds/route.ts               → GET list
```

Wrapper di sisi admin panel ini meneruskan request ke backend Nest dengan:
- Header `x-internal-secret: <ADMIN_HOOK_SECRET>` (env shared dengan backend)
- Header `idempotency-key: <generated>` (mencegah double-action dari double-click)
- Body include `adminId` dari `getSessionAdmin(req)`

### Backend Routes (`CommisApp` side)

| Method | Path | Wrapper di Admin Panel | Purpose |
|--------|------|------------------------|---------|
| `POST` | `/internal/refunds/:refundId/decision` | `api/refunds/[id]/decide` | Approve / deny escalated refund |
| `POST` | `/internal/refunds/force-create` | (belum di-wrap, TODO) | Force-create new refund |

---

## Normal Flow — Decide on Escalated Refund

### Trigger

Refund masuk ke status `ESCALATED` saat artist deny. Backend auto-create dispute ticket (status OPEN, priority HIGH) yang akan muncul di admin panel queue.

### Steps

1. Admin buka **Refunds** page → filter status `ESCALATED`
2. Klik refund row → buka detail panel
3. Review:
   - `reason` dari client
   - `artistResponse` dari artist (denial reason)
   - Order detail + payment history
   - Linked dispute `ticketId` (kalau dibuat oleh `denyByArtist`)
4. Tulis `adminNote` minimal 5 karakter (akan dikirim ke notifikasi client + artist)
5. Pilih **Approve** atau **Deny**
6. Submit

### Approve Response Handling

Response dari backend bisa dua varian (lihat [Breaking Changes](#breaking-changes)):

| `data.status` | Meaning | UI Action |
|---------------|---------|-----------|
| `REFUNDED` | PayPal selesai sync, refund final | Toast success, refetch list |
| `PENDING_PROVIDER` | PayPal accept async, status di DB tetap `APPROVED_BY_ADMIN` sampai webhook | Toast info "Refund accepted, awaiting PayPal settlement", refetch list |

### Deny Response

```json
{ "message": "Refund denied by admin.", "data": { "refundId": "...", "status": "DENIED_BY_ADMIN" } }
```

Refund jadi final-state `DENIED_BY_ADMIN`. Client + artist dapat notifikasi "Refund Denied" dengan `adminNote` sebagai body.

### Retry FAILED Refund

Kalau refund stuck di status `FAILED` (PayPal crash mid-call), admin bisa retry via endpoint yang sama dengan `approve: true`. Backend allow source statuses `[REQUESTED, ESCALATED, FAILED, APPROVED_BY_ARTIST, APPROVED_BY_ADMIN]` di approve path.

Idempotency key PayPal (`refund-${refundId}`) menjamin retry tidak double-charge.

---

## Force-Create — Escape Hatch

### When to Use

- Refund window 14 hari sudah lewat tapi customer service deal goodwill
- Order `COMPLETED` + artist balance kurang → normal flow block dengan error `Artist balance is insufficient...`
- Artist non-responsif dan belum ada refund request dari client
- Manual goodwill refund di luar policy

### When NOT to Use

- Refund yang sudah ada (gunakan `decision` endpoint)
- Refund partial yang artist setuju (artist bisa approve directly)
- Refund untuk order yang belum dibayar (tidak ada uang untuk di-refund)

### Required Inputs

```ts
POST /internal/refunds/force-create

{
  "orderId": "<UUID>",
  "adminId": <number>,
  "adminNote": "<min 10 chars — justify override, akan jadi audit trail>",
  "amountOverride": "20.00",  // optional, decimal string, max = payment.amount
  "ticketId": "<optional>"
}
```

### Operational Rules

1. **Hourly cap:** default 10 force-create per admin per jam (env `ADMIN_FORCE_REFUND_HOURLY_CAP`). Hit cap → 400 + suggest escalate ke platform owner.
2. **Audit log:** setiap call menghasilkan WARN log:
   ```
   ADMIN_FORCE_REFUND: admin=<id> order=<id> refund=<id> amount=<X.XX> <CCY> note_len=<N>
   ```
   Set alert di log aggregator untuk anomaly detection.
3. **Bypass:** force-create skip refund window check + balance check. Admin assume risk (platform absorb loss jika artist balance negatif).
4. **Idempotency:** per-order advisory lock + `existingActive` check tetap aktif → tidak bisa double-create pada same order.

### Recommended UI Flow

Belum di-wrap di admin panel. Untuk implement:

1. Add tombol "Force Create Refund" di order detail page (admin orders/[id])
2. Modal dengan field:
   - Amount override (optional, default = full)
   - Admin note (required, min 10 chars, textarea)
   - Ticket ID (optional, autocomplete from open dispute tickets)
3. Confirmation dialog warning: "Akan bypass refund window + balance check. Platform tanggung loss jika balance negatif."
4. Submit → POST ke `/api/refunds/force-create` (TODO: buat wrapper Next.js)
5. Handle response same as normal approve (REFUNDED vs PENDING_PROVIDER)

---

## Manual Reconciliation — Webhook Stuck

### Symptom

Refund stuck di status `APPROVED_BY_ARTIST` atau `APPROVED_BY_ADMIN` lebih dari ~24 jam, dengan `paypalRefundId` non-null.

### Cause

PayPal sudah selesaikan refund (PENDING → COMPLETED) tapi webhook gagal di-deliver atau di-process. Bisa karena:

- Backend down saat webhook arrive (PayPal retry expired)
- Webhook signature verification fail
- Webhook route 500 berulang
- `PAYPAL_WEBHOOK_ID` env salah

### Diagnostic

```bash
# 1. Cari refund stuck
psql artwish <<'EOF'
SELECT id, paypal_refund_id, status, updated_at
FROM refund_requests
WHERE status IN ('APPROVED_BY_ARTIST', 'APPROVED_BY_ADMIN')
  AND paypal_refund_id IS NOT NULL
  AND updated_at < NOW() - INTERVAL '4 hours'
ORDER BY updated_at;
EOF
```

```bash
# 2. Cek log backend
grep "REFUND_PENDING_ORPHAN\|REFUND_PENDING_DRIFT" /var/log/backend.log

# 3. Cek webhook controller log
grep "/webhooks/paypal" /var/log/backend.log | tail -50
```

### Recovery — Manual SQL

```sql
BEGIN;

-- Verifikasi state PayPal dulu (cek dashboard PayPal manually)
-- Pastikan paypal_refund_id ada di PayPal dashboard dengan status COMPLETED

UPDATE refund_requests
SET status = 'REFUNDED',
    refunded_at = NOW(),
    failure_reason = NULL
WHERE id = '<refundId>'
  AND status IN ('APPROVED_BY_ARTIST', 'APPROVED_BY_ADMIN', 'FAILED');

UPDATE payments
SET status = 'REFUNDED',
    refunded_at = NOW()
WHERE id = '<paymentId>'
  AND status != 'REFUNDED';

UPDATE orders
SET status = 'REFUNDED'
WHERE id = '<orderId>'
  AND status != 'REFUNDED';

-- Decrement service slot kalau applicable
UPDATE services
SET slots_used = slots_used - 1
WHERE id = (SELECT service_id FROM orders WHERE id = '<orderId>')
  AND slots_enabled = true
  AND slots_used > 0;

-- Audit event
INSERT INTO order_events (id, order_id, type, description, metadata, created_at)
VALUES (
  gen_random_uuid(),
  '<orderId>',
  'REFUND_COMPLETED',
  'Manual reconciliation by admin',
  '{"refundId":"<refundId>","manual":true,"reason":"webhook_failed"}',
  NOW()
);

COMMIT;
```

Setelah commit, manual trigger notifier (atau biarkan — client/artist akan lihat status terupdate di refresh berikutnya).

---

## Status Display Mapping

Refund statuses di-translate ke UI labels. Pakai mapping berikut konsisten di admin panel:

| DB Status | Admin UI Label (EN) | Badge Color |
|-----------|---------------------|-------------|
| `REQUESTED` | Awaiting artist | yellow |
| `APPROVED_BY_ARTIST` | Processing (artist approved) | blue |
| `ESCALATED` | Needs admin review | orange (alert) |
| `APPROVED_BY_ADMIN` | Processing (admin approved) | blue |
| `DENIED_BY_ADMIN` | Denied | red |
| `REFUNDED` | Completed | green |
| `WITHDRAWN` | Withdrawn by client | gray |
| `FAILED` | Failed — retry available | red (alert) |
| `DENIED_BY_ARTIST` | *(unused in live flow, treat as Escalated)* | orange |

Sentinel `PENDING_PROVIDER` (dari response body) → tampilkan toast info saja, jangan disimpan di state. Setelah refetch, status DB akan jadi `APPROVED_*` (yang label-nya "Processing").

---

## Breaking Changes

Catatan untuk admin panel developer setelah refund hardening update:

### 1. Approve response shape

```ts
// Before
{ data: { status: 'REFUNDED' } }

// After (varies)
{ data: { status: 'REFUNDED' } }
// OR
{ data: { status: 'PENDING_PROVIDER', paypalRefundId: '...' } }
```

Wrapper di `api/refunds/[id]/decide/route.ts` sudah forward response payload as-is, jadi UI yang konsumsi langsung response harus update branching.

### 2. New endpoint `force-create`

Belum di-wrap di admin panel. Action items:
- Bikin route `app/api/refunds/force-create/route.ts` yang forward ke backend `POST /internal/refunds/force-create`
- Bikin UI tombol + modal di order detail atau refund detail page
- Validasi `adminNote` min 10 chars di client (mirror backend rule)

### 3. Error message untuk balance block berubah

```
Old: "Funds have already been paid out to the artist. Refund must be processed via support."
New: "Artist balance is insufficient to cover this refund. Contact support for manual processing."
```

Update string matching kalau ada.

### 4. Webhook reconciliation needed

Refund status bisa update **tanpa admin action** karena webhook PayPal. Admin panel harus:
- Refetch list saat tab focus
- (Optional) realtime stream untuk admin queue updates

---

## Required Env

`CommisApp` (backend):

```env
ADMIN_HOOK_SECRET=<min 16 chars, shared dengan admin panel>
ADMIN_FORCE_REFUND_HOURLY_CAP=10
PAYPAL_WEBHOOK_ID=<dari PayPal dashboard Apps → Webhooks>
REFUND_WINDOW_DAYS=14
REFUND_MAX_OPEN_PER_CLIENT=3
```

`CommisApp-Admin`:

```env
ADMIN_HOOK_SECRET=<same value as backend>
BACKEND_API_URL=https://api.artwish.io  # atau dev
```

---

## References

- [REFUND_SYSTEM.md](../../CommisApp/docs/REFUND_SYSTEM.md) — backend full reference (lifecycle, security)
- [FRONTEND_REFUND_INTEGRATION.md](../../CommisApp/docs/FRONTEND_REFUND_INTEGRATION.md) — client/artist frontend guide
- [ADMIN_FINANCE_LEDGER.md](./ADMIN_FINANCE_LEDGER.md) — fee accounting (refund fee tidak dihitung di ledger; refund mengurangi platformFees)
