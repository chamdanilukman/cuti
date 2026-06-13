# Egress Emergency Plan — Supabase 84% in <1 Bulan

**Kondisi:** Egress 84% belum sebulan. Target: turunkan 90%.

---

## 🚨 Phase 1: Stop the Bleeding (hari ini, implementasi cepat)

### 1. Dashboard cache → localStorage, TTL 2 jam
Setiap visitor query sekali per 2 jam, bukan per refresh.

**File:** `src/hooks/useDashboardStats.ts`
- Ganti `sessionStorage` → `localStorage` di semua fungsi cache
- Ganti TTL: `15 * 60 * 1000` → `120 * 60 * 1000`

### 2. Admin page size default 10
Kurangi data per load 60%.

**File:** `src/components/EnhancedAdminPanel.tsx` — `useState(25)` → `(10)`
**File:** `src/components/CoordinatorPanel.tsx` — `useState(20)` → `(10)`

### 3. COUNT exact → estimated
Hemat 30% per paged query.

**File:** `src/utils/database.ts` — `getLeaveRequestsPage`: `{ count: 'exact' }` → `{ count: 'estimated' }`

---

## 🟡 Phase 2: Smart Caching

### 4. Paged query cache 5 menit
Korwil/SMP admin bolak-balik tab tanpa refetch.
**File:** `src/hooks/usePagedLeaveRequests.ts`

### 5. Debounce search 500ms
Tidak fetch tiap karakter diketik.
**File:** `EnhancedAdminPanel.tsx`, `CoordinatorPanel.tsx`

## 📊 Estimasi

| Optimasi | Hemat |
|---|---|
| Dashboard cache 2 jam | ~80% |
| Page size 10 | ~60% |
| COUNT estimated | ~30% |
| Debounce search | ~50% |
| **Total** | **~85-90%** |
