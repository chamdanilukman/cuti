# Fix: Perbaikan Cuti Tidak Muncul di Usulan Korwil

## Root Cause - Dua Masalah

### 1. Field `isRevised` & `originalRejectionReason` tidak tersimpan

**File:** `src/hooks/useLeaveRequests.ts` — function `updateLeaveRequest`

`AppV2.addLeaveRequest()` mengirim `{ isRevised: true, originalRejectionReason: "..." }` saat revisi, tapi `updateLeaveRequest` **tidak pernah memetakan dua field ini ke kolom DB**. Akibatnya: flag "Diperbaiki" tidak muncul di panel admin/korwil, dan alasan penolakan asli hilang.

### 2. Tanggal persetujuan tidak di-reset saat revisi

Saat revisi, status kembali ke `pending`, tapi `coordinator_approval_date` dan `admin_approval_date` tidak pernah di-clear. Nilai `undefined` yang dikirim tidak memicu update karena check `!== undefined` gagal.

## Fix Applied

**File: `src/hooks/useLeaveRequests.ts`**

1. Tambah mapping:
```tsx
if (updates.isRevised !== undefined) dbUpdates.is_revised = updates.isRevised;
if (updates.originalRejectionReason !== undefined) dbUpdates.original_rejection_reason = updates.originalRejectionReason;
```

2. Reset approval dates saat status → `pending`:
```tsx
} else if (updates.status === 'pending') {
  dbUpdates.coordinator_approval_date = null as any;
  dbUpdates.admin_approval_date = null as any;
}
```

## Build Status
✅ Build sukses — `npm run build` — no errors
