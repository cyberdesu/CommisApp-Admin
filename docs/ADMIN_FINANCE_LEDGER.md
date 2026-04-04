# Admin Finance Ledger

Dokumen ini menjelaskan cara kerja angka finance admin setelah sistem menghitung:

- fee PayPal saat client bayar
- fee PayPal saat admin kirim payout ke artist
- net profit admin yang benar-benar bersih

## Ringkasan

Sekarang ada dua sumber fee PayPal yang berbeda:

1. `Payment` fee
   - terjadi saat client membayar order
   - disimpan di tabel `Payment`
   - field penting:
     - `paypalFee`
     - `paypalFeeCurrency`
     - `paypalNetAmount`
     - `paypalNetCurrency`
     - `paypalFeeSyncedAt`

2. `Payout` fee
   - terjadi saat admin mengirim payout ke artist
   - disimpan di tabel `Payout`
   - field penting:
     - `paypalBatchId`
     - `paypalItemId`
     - `paypalBatchStatus`
     - `paypalItemStatus`
     - `paypalFee`
     - `paypalFeeCurrency`
     - `paypalFeeSyncedAt`

## Rumus Finance

`grossVolume`
- total pembayaran client

`platformFees`
- total fee platform internal 10%

`paymentPaypalFees`
- total fee PayPal incoming saat client bayar

`payoutPaypalFees`
- total fee PayPal outgoing saat admin kirim payout ke artist

`adminNetProfit`
- rumus final:
- `platformFees - paymentPaypalFees - payoutPaypalFees`

Catatan:
- nilai ini bisa negatif untuk currency tertentu kalau fee PayPal lebih besar dari revenue platform di bucket currency tersebut
- ini normal dan sengaja tidak di-clamp ke `0`

## Flow Payment Fee

### Payment baru

Saat client approve pembayaran:

1. backend utama `CommisApp` capture order PayPal
2. response capture dibaca langsung
3. `seller_receivable_breakdown` diparse
4. field `paypalFee`, `paypalNetAmount`, dan `paypalFeeSyncedAt` langsung disimpan ke `Payment`

File utama:
- `CommisApp/src/payments/payments.service.ts`
- `CommisApp/src/orders/orders.service.ts`

### Payment lama

Untuk payment lama yang sudah `COMPLETED` tapi belum punya fee detail:

1. admin klik `Sync Payment Fees`
2. route admin ambil `paypalCaptureId`
3. admin backend fetch detail capture dari PayPal
4. field fee di `Payment` diisi

Route admin:
- `src/app/api/finance/paypal-fees/sync/route.ts`

## Flow Payout Fee

### Saat approve payout

Saat admin approve payout:

1. admin backend create payout ke PayPal
2. sistem simpan metadata provider ke tabel `Payout`
   - `paypalBatchId`
   - `paypalItemId` jika sudah ada
   - `paypalBatchStatus`
   - `paypalItemStatus`
3. status payout internal berubah ke `SENT`

Penting:
- fee payout sering belum final saat payout baru dibuat
- karena artist bisa menumpuk saldo dulu baru withdraw, fee payout memang baru diketahui saat payout batch/item diproses oleh PayPal

Route admin:
- `src/app/api/payouts/[id]/route.ts`

### Sync payout fee

Kalau fee payout belum tersedia saat approve:

1. admin klik `Sync Payout Fees`
2. backend ambil `paypalBatchId` dan `paypalItemId`
3. kalau `paypalItemId` belum ada, backend fetch batch details dulu
4. backend fetch payout item details dari PayPal
5. kalau fee sudah tersedia, sistem isi:
   - `paypalFee`
   - `paypalFeeCurrency`
   - `paypalFeeSyncedAt`

Route admin:
- `src/app/api/finance/paypal-payout-fees/sync/route.ts`

Helper PayPal:
- `src/lib/paypal.ts`

## Kenapa Pending Sync Bisa Muncul

### Pending payment sync

Artinya payment sudah `COMPLETED` dan punya `paypalCaptureId`, tapi `paypalFeeSyncedAt` masih `null`.

### Pending payout sync

Artinya payout sudah `SENT` dan punya `paypalBatchId`, tapi fee outgoing belum berhasil disimpan karena:

- item ID belum muncul dari PayPal
- payout item belum diproses cukup jauh untuk expose fee
- atau sync sebelumnya gagal

## Kenapa Payout Fee Tidak Bisa Diketahui dari Awal

Karena payout fee bukan melekat ke tiap order/payment. Fee itu melekat ke aksi payout ke artist.

Contoh:

- client A bayar `$40`
- client B bayar `$60`
- artist belum withdraw
- artist nanti request payout `$100`

Fee payout baru ada saat admin benar-benar mengirim `$100` itu ke PayPal. Jadi fee payout:

- tidak bisa diatribusi akurat ke payment A atau B dari awal
- harus dicatat sebagai outgoing platform cost saat payout terjadi

Itu sebabnya ledger admin memisahkan:

- incoming payment fees
- outgoing payout fees

## Halaman Admin

Halaman utama analytics:

- `src/app/(admin)/analytics/page.tsx`

Yang ditampilkan sekarang:

- gross volume
- platform fees
- artist payouts
- payment fees
- payout fees
- net admin profit
- tombol sync payment fee
- tombol sync payout fee

## Realtime

Setelah sync payment fee atau payout fee berhasil, backend broadcast topic `finance` agar admin panel auto-refresh.

File:
- `src/lib/admin-realtime.ts`

## Catatan Operasional

- transaksi baru di backend utama akan otomatis menyimpan payment fee
- payout fee tetap bisa butuh sync belakangan karena PayPal tidak selalu memberikan fee final di saat create payout
- data lama sebelum implementasi ini perlu backfill satu kali lewat tombol sync di admin
