# Debug: Perbaikan Cuti Tidak Masuk di Usulan Korwil

## Temuan

Saya trace flow perbaikan cuti dari awal sampai akhir. Ada **dua masalah**:

### Masalah 1: Field `isRevised` & `originalRejectionReason` tidak tersimpan

**File:** `src/hooks/useLeaveRequests.ts` — function `updateLeaveRequest`

```tsx
// Field yang DIKIRIM oleh addLeaveRequest saat revisi:
{ isRevised: true, originalRejectionReason: "alasan lama" }

// Tapi di updateLeaveRequest, dua field ini TIDAK PERNAH dipetakan ke DB:
// ❌ Tidak ada: if (updates.isRevised !== undefined) dbUpdates.is_revised = updates.isRevised;
// ❌ Tidak ada: if (updates.originalRejectionReason !== undefined) dbUpdates.original_rejection_reason = updates.originalRejectionReason;
```

Akibatnya: flag "Diperbaiki" tidak muncul di panel admin/korwil, dan alasan penolakan asli hilang.

### Masalah 2: `coordinatorApprovalDate` & `adminApprovalDate` tidak di-reset

```tsx
// addLeaveRequest mengirim:
{ coordinatorApprovalDate: undefined, adminApprovalDate: undefined }

// Tapi di updateLeaveRequest:
if (updates.coordinatorApprovalDate !== undefined) dbUpdates.coordinator_approval_date = updates.coordinatorApprovalDate;
// undefined !== undefined → FALSE → field TIDAK di-reset!
```

Akibatnya: tanggal persetujuan dari round sebelumnya tetap tersimpan di DB setelah revisi.

### Kenapa revisi tetap masuk usulan?

Record revisi **tetap muncul** di approval list korwil karena field yang difilter (`koordinator_wilayah`, `jenjang`, `sekolah`, `status`) semuanya **benar ter-set** oleh `updateLeaveRequest`. Hanya field `isRevised`, `originalRejectionReason`, dan reset tanggal approval yang gagal.

Tapi ada **edge case**: jika user mengubah kecamatan/jenjang di form revisi ke nilai di luar akses korwil, record akan hilang dari list korwil tersebut.

## Fix yang diperlukan

Tambahkan mapping field yang hilang di `updateLeaveRequest` dan handle reset approval date dengan benar.
