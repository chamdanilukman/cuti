# Cuti Tahunan Kalender Efektif Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Memperbaiki hitung cuti tahunan agar memakai hari efektif guru, menggabungkan kuota Cuti Tahunan dan Cuti Gol. IV Tahunan, mengakumulasi sisa satu tahun sebelumnya, dan menambahkan pengaturan kalender libur/cuti bersama untuk Admin Dinas.

**Architecture:** Pindahkan aturan tanggal ke modul kalender kerja yang terpisah dari form, lalu buat modul kuota tahunan yang menjadi satu sumber kebenaran untuk pratinjau, validasi, dan detail pengajuan. Kalender memakai data bawaan 2024-2026 sebagai fallback, ditambah tabel Supabase `work_calendar_days` agar tahun berikutnya bisa dikelola dari menu Admin Dinas.

**Tech Stack:** React 18, TypeScript, Vite, Supabase, Node built-in test runner, Tailwind CSS, lucide-react.

---

## Business Rules

- Hari efektif guru adalah Senin sampai Sabtu.
- Hari Minggu tidak mengurangi kuota.
- Libur nasional dan cuti bersama tidak mengurangi kuota.
- Cuti bersama ASN tidak mengurangi hak cuti tahunan.
- Jenis cuti yang memakai kuota tahunan: `Cuti Tahunan` dan `Cuti Gol. IV Tahunan`.
- Semua status selain `rejected` menahan kuota, termasuk `pending`, `approved_coordinator`, `approved_admin`, dan `document_issued`.
- Kuota tahun target adalah `12 + min(sisa tahun target - 1, 6)`.
- Jika tidak ada pengajuan cuti tahunan pada tahun sebelumnya, sisa tahun itu dianggap 12 dan carry-over yang masuk adalah 6.
- Carry-over hanya satu tahun sebelumnya. Tahun yang lebih lama tidak dihitung.
- Pengajuan lintas tahun dihitung per hari dan dibebankan ke tahun masing-masing.
- Rentang cuti tahunan yang tidak memiliki hari efektif harus ditolak dengan pesan jelas.
- Pratinjau form dan validasi akhir harus memakai fungsi hitung yang sama.

## Official Calendar Sources

- 2026: SKB libur nasional dan cuti bersama 2026, serta Keppres cuti bersama ASN 2026. Sumber penting: Setneg menyebut cuti bersama ASN 2026 tidak mengurangi hak cuti tahunan dan menambahkan 24 Desember 2026 sebagai cuti bersama Natal.
- 2025: SKB 3 Menteri 2025 dan perubahan cuti bersama 18 Agustus 2025.
- 2024: SKB 3 Menteri 2024.

## File Structure

- Create: `src/utils/workCalendar.ts`
  - Satu sumber untuk data kalender bawaan, normalisasi tanggal, dan hitung hari efektif.
- Create: `src/utils/annualLeaveQuota.ts`
  - Satu sumber untuk jenis cuti tahunan, status yang menahan kuota, pemakaian per tahun, carry-over, dan validasi kuota.
- Modify: `src/utils/leaveValidation.ts`
  - Delegasikan validasi kuota ke `annualLeaveQuota.ts` dan hapus hitungan manual yang berbeda.
- Modify: `src/components/LeaveForm.tsx`
  - Ganti pratinjau kuota agar memakai tahun dari tanggal cuti dan fungsi kuota baru.
- Modify: `src/components/LeaveRequestDetailModal.tsx`
  - Tampilkan kuota berdasarkan fungsi baru, termasuk `document_issued`.
- Create: `src/hooks/useWorkCalendar.ts`
  - Ambil kalender dari Supabase dan fallback ke kalender bawaan saat jaringan gagal.
- Modify: `src/utils/database.ts`
  - Tambahkan operasi baca/tambah/ubah/hapus kalender kerja.
- Create: `src/components/WorkCalendarSettings.tsx`
  - Tab Admin Dinas untuk melihat, menambah, mengubah, menghapus, dan menyalin data kalender per tahun.
- Modify: `src/components/EnhancedAdminPanel.tsx`
  - Tambahkan tab `Kalender` khusus `admin_disdik`.
- Create: `supabase/migrations/0003_work_calendar_days.sql`
  - Tabel kalender kerja untuk data yang dikelola Admin Dinas. Kalender bawaan 2024-2026 tetap berada di `src/utils/workCalendar.ts` sebagai fallback.
- Create: `tests/helpers/loadTsModule.mjs`
  - Helper test untuk menjalankan modul TypeScript dengan `node:test`.
- Create: `tests/work-calendar.test.mjs`
  - Tes hari efektif, libur nasional, cuti bersama, Minggu, dan lintas tahun.
- Create: `tests/annual-leave-quota.test.mjs`
  - Tes kuota 12 + carry-over, status, Gol. IV Tahunan, rejected, document issued, dan lintas tahun.
- Modify: `tests/form-egress.test.mjs`
  - Tes statis agar form tidak kembali memakai hitungan tanggal manual.
- Modify: `package.json`
  - Tambahkan script `test`.

---

### Task 1: Test Harness for TypeScript Utility Modules

**Files:**
- Create: `tests/helpers/loadTsModule.mjs`
- Modify: `package.json`

- [ ] **Step 1: Create the TypeScript module loader**

Create `tests/helpers/loadTsModule.mjs`:

```js
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

const requireFromTest = createRequire(import.meta.url);
const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const cache = new Map();

const toFilePath = (request, parentPath) => {
  if (!request.startsWith('.')) return request;
  const base = resolve(dirname(parentPath), request);
  return base.endsWith('.ts') || base.endsWith('.tsx') ? base : `${base}.ts`;
};

export const loadTsModule = (relativePath) => {
  const absolutePath = resolve(rootDir, relativePath);

  if (cache.has(absolutePath)) {
    return cache.get(absolutePath).exports;
  }

  const module = { exports: {} };
  cache.set(absolutePath, module);

  const source = readFileSync(absolutePath, 'utf8');
  const output = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      jsx: ts.JsxEmit.ReactJSX,
      esModuleInterop: true
    }
  }).outputText;

  const localRequire = (request) => {
    const target = toFilePath(request, absolutePath);
    if (target.endsWith('.ts') || target.endsWith('.tsx')) {
      return loadTsModule(resolve(target).replace(`${rootDir}\\`, '').replaceAll('\\', '/'));
    }
    return requireFromTest(request);
  };

  vm.runInNewContext(output, {
    exports: module.exports,
    module,
    require: localRequire,
    console,
    Date,
    Math,
    Set,
    Map,
    Intl
  }, { filename: absolutePath });

  return module.exports;
};
```

- [ ] **Step 2: Add the test script**

Modify `package.json` scripts:

```json
{
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "lint": "eslint .",
    "preview": "vite preview",
    "test": "node --test tests/*.test.mjs"
  }
}
```

- [ ] **Step 3: Run existing tests**

Run: `npm test`

Expected: existing tests pass before the new failing tests are added.

- [ ] **Step 4: Commit**

Run:

```bash
git add package.json tests/helpers/loadTsModule.mjs
git commit -m "test: add TypeScript utility test harness"
```

If the workspace is not a git repository, record the changed files in the final handoff instead of committing.

---

### Task 2: Work Calendar Module

**Files:**
- Create: `src/utils/workCalendar.ts`
- Test: `tests/work-calendar.test.mjs`

- [ ] **Step 1: Write failing tests for effective days**

Create `tests/work-calendar.test.mjs`:

```js
import assert from 'node:assert/strict';
import test from 'node:test';
import { loadTsModule } from './helpers/loadTsModule.mjs';

const {
  countEffectiveLeaveDays,
  expandCalendarDateRange,
  getDefaultCalendarDays,
  isEffectiveWorkday
} = loadTsModule('src/utils/workCalendar.ts');

test('counts Monday through Saturday and excludes Sunday', () => {
  assert.equal(countEffectiveLeaveDays('2026-06-08', '2026-06-14'), 6);
});

test('excludes national holidays and joint leave days from annual leave usage', () => {
  assert.equal(countEffectiveLeaveDays('2026-03-18', '2026-03-24'), 0);
});

test('keeps ordinary Saturday as an effective workday', () => {
  assert.equal(isEffectiveWorkday('2026-06-13'), true);
});

test('excludes the added ASN joint leave day on 24 December 2026', () => {
  assert.equal(countEffectiveLeaveDays('2026-12-24', '2026-12-26'), 1);
});

test('expands date ranges inclusively', () => {
  assert.deepEqual(expandCalendarDateRange('2026-03-21', '2026-03-22'), [
    '2026-03-21',
    '2026-03-22'
  ]);
});

test('default calendar contains seed data for 2024, 2025, and 2026', () => {
  const years = new Set(getDefaultCalendarDays().map((day) => day.date.slice(0, 4)));
  assert.deepEqual([...years].sort(), ['2024', '2025', '2026']);
});
```

- [ ] **Step 2: Run the new test and verify it fails**

Run: `npm test -- tests/work-calendar.test.mjs`

Expected: FAIL because `src/utils/workCalendar.ts` does not exist.

- [ ] **Step 3: Implement the work calendar module**

Create `src/utils/workCalendar.ts`:

```ts
export type CalendarDayType = 'national_holiday' | 'joint_leave';

export interface WorkCalendarDay {
  date: string;
  type: CalendarDayType;
  description: string;
}

export interface EffectiveLeaveDayBreakdown {
  totalCalendarDays: number;
  effectiveDays: number;
  excludedDates: WorkCalendarDay[];
}

const DEFAULT_CALENDAR_DAYS: WorkCalendarDay[] = [
  { date: '2024-01-01', type: 'national_holiday', description: 'Tahun Baru 2024 Masehi' },
  { date: '2024-02-08', type: 'national_holiday', description: 'Isra Mikraj Nabi Muhammad SAW' },
  { date: '2024-02-09', type: 'joint_leave', description: 'Cuti Bersama Tahun Baru Imlek 2575 Kongzili' },
  { date: '2024-02-10', type: 'national_holiday', description: 'Tahun Baru Imlek 2575 Kongzili' },
  { date: '2024-03-11', type: 'national_holiday', description: 'Hari Suci Nyepi Tahun Baru Saka 1946' },
  { date: '2024-03-12', type: 'joint_leave', description: 'Cuti Bersama Hari Suci Nyepi Tahun Baru Saka 1946' },
  { date: '2024-03-29', type: 'national_holiday', description: 'Wafat Isa Almasih' },
  { date: '2024-03-31', type: 'national_holiday', description: 'Hari Paskah' },
  { date: '2024-04-08', type: 'joint_leave', description: 'Cuti Bersama Hari Raya Idulfitri 1445 Hijriah' },
  { date: '2024-04-09', type: 'joint_leave', description: 'Cuti Bersama Hari Raya Idulfitri 1445 Hijriah' },
  { date: '2024-04-10', type: 'national_holiday', description: 'Hari Raya Idulfitri 1445 Hijriah' },
  { date: '2024-04-11', type: 'national_holiday', description: 'Hari Raya Idulfitri 1445 Hijriah' },
  { date: '2024-04-12', type: 'joint_leave', description: 'Cuti Bersama Hari Raya Idulfitri 1445 Hijriah' },
  { date: '2024-04-15', type: 'joint_leave', description: 'Cuti Bersama Hari Raya Idulfitri 1445 Hijriah' },
  { date: '2024-05-01', type: 'national_holiday', description: 'Hari Buruh Internasional' },
  { date: '2024-05-09', type: 'national_holiday', description: 'Kenaikan Isa Almasih' },
  { date: '2024-05-10', type: 'joint_leave', description: 'Cuti Bersama Kenaikan Isa Almasih' },
  { date: '2024-05-23', type: 'national_holiday', description: 'Hari Raya Waisak 2568 BE' },
  { date: '2024-05-24', type: 'joint_leave', description: 'Cuti Bersama Hari Raya Waisak' },
  { date: '2024-06-01', type: 'national_holiday', description: 'Hari Lahir Pancasila' },
  { date: '2024-06-17', type: 'national_holiday', description: 'Hari Raya Iduladha 1445 Hijriah' },
  { date: '2024-06-18', type: 'joint_leave', description: 'Cuti Bersama Hari Raya Iduladha 1445 Hijriah' },
  { date: '2024-07-07', type: 'national_holiday', description: 'Tahun Baru Islam 1446 Hijriah' },
  { date: '2024-08-17', type: 'national_holiday', description: 'Hari Kemerdekaan Republik Indonesia' },
  { date: '2024-09-16', type: 'national_holiday', description: 'Maulid Nabi Muhammad SAW' },
  { date: '2024-12-25', type: 'national_holiday', description: 'Hari Raya Natal' },
  { date: '2024-12-26', type: 'joint_leave', description: 'Cuti Bersama Hari Raya Natal' },

  { date: '2025-01-01', type: 'national_holiday', description: 'Tahun Baru 2025 Masehi' },
  { date: '2025-01-27', type: 'national_holiday', description: 'Isra Mikraj Nabi Muhammad SAW' },
  { date: '2025-01-28', type: 'joint_leave', description: 'Cuti Bersama Tahun Baru Imlek 2576 Kongzili' },
  { date: '2025-01-29', type: 'national_holiday', description: 'Tahun Baru Imlek 2576 Kongzili' },
  { date: '2025-03-28', type: 'joint_leave', description: 'Cuti Bersama Hari Suci Nyepi Tahun Baru Saka 1947' },
  { date: '2025-03-29', type: 'national_holiday', description: 'Hari Suci Nyepi Tahun Baru Saka 1947' },
  { date: '2025-03-31', type: 'national_holiday', description: 'Hari Raya Idulfitri 1446 Hijriah' },
  { date: '2025-04-01', type: 'national_holiday', description: 'Hari Raya Idulfitri 1446 Hijriah' },
  { date: '2025-04-02', type: 'joint_leave', description: 'Cuti Bersama Hari Raya Idulfitri 1446 Hijriah' },
  { date: '2025-04-03', type: 'joint_leave', description: 'Cuti Bersama Hari Raya Idulfitri 1446 Hijriah' },
  { date: '2025-04-04', type: 'joint_leave', description: 'Cuti Bersama Hari Raya Idulfitri 1446 Hijriah' },
  { date: '2025-04-07', type: 'joint_leave', description: 'Cuti Bersama Hari Raya Idulfitri 1446 Hijriah' },
  { date: '2025-04-18', type: 'national_holiday', description: 'Wafat Yesus Kristus' },
  { date: '2025-04-20', type: 'national_holiday', description: 'Kebangkitan Yesus Kristus' },
  { date: '2025-05-01', type: 'national_holiday', description: 'Hari Buruh Internasional' },
  { date: '2025-05-12', type: 'national_holiday', description: 'Hari Raya Waisak 2569 BE' },
  { date: '2025-05-13', type: 'joint_leave', description: 'Cuti Bersama Hari Raya Waisak' },
  { date: '2025-05-29', type: 'national_holiday', description: 'Kenaikan Yesus Kristus' },
  { date: '2025-05-30', type: 'joint_leave', description: 'Cuti Bersama Kenaikan Yesus Kristus' },
  { date: '2025-06-01', type: 'national_holiday', description: 'Hari Lahir Pancasila' },
  { date: '2025-06-06', type: 'national_holiday', description: 'Hari Raya Iduladha 1446 Hijriah' },
  { date: '2025-06-09', type: 'joint_leave', description: 'Cuti Bersama Hari Raya Iduladha 1446 Hijriah' },
  { date: '2025-06-27', type: 'national_holiday', description: 'Tahun Baru Islam 1447 Hijriah' },
  { date: '2025-08-17', type: 'national_holiday', description: 'Hari Kemerdekaan Republik Indonesia' },
  { date: '2025-08-18', type: 'joint_leave', description: 'Cuti Bersama Hari Kemerdekaan Republik Indonesia' },
  { date: '2025-09-05', type: 'national_holiday', description: 'Maulid Nabi Muhammad SAW' },
  { date: '2025-12-25', type: 'national_holiday', description: 'Hari Raya Natal' },
  { date: '2025-12-26', type: 'joint_leave', description: 'Cuti Bersama Hari Raya Natal' },

  { date: '2026-01-01', type: 'national_holiday', description: 'Tahun Baru 2026 Masehi' },
  { date: '2026-01-16', type: 'national_holiday', description: 'Isra Mikraj Nabi Muhammad SAW' },
  { date: '2026-02-16', type: 'joint_leave', description: 'Cuti Bersama Tahun Baru Imlek 2577 Kongzili' },
  { date: '2026-02-17', type: 'national_holiday', description: 'Tahun Baru Imlek 2577 Kongzili' },
  { date: '2026-03-18', type: 'joint_leave', description: 'Cuti Bersama Hari Suci Nyepi Tahun Baru Saka 1948' },
  { date: '2026-03-19', type: 'national_holiday', description: 'Hari Suci Nyepi Tahun Baru Saka 1948' },
  { date: '2026-03-20', type: 'joint_leave', description: 'Cuti Bersama Hari Raya Idulfitri 1447 Hijriah' },
  { date: '2026-03-21', type: 'national_holiday', description: 'Hari Raya Idulfitri 1447 Hijriah' },
  { date: '2026-03-22', type: 'national_holiday', description: 'Hari Raya Idulfitri 1447 Hijriah' },
  { date: '2026-03-23', type: 'joint_leave', description: 'Cuti Bersama Hari Raya Idulfitri 1447 Hijriah' },
  { date: '2026-03-24', type: 'joint_leave', description: 'Cuti Bersama Hari Raya Idulfitri 1447 Hijriah' },
  { date: '2026-04-03', type: 'national_holiday', description: 'Wafat Yesus Kristus' },
  { date: '2026-04-05', type: 'national_holiday', description: 'Kebangkitan Yesus Kristus' },
  { date: '2026-05-01', type: 'national_holiday', description: 'Hari Buruh Internasional' },
  { date: '2026-05-14', type: 'national_holiday', description: 'Kenaikan Yesus Kristus' },
  { date: '2026-05-15', type: 'joint_leave', description: 'Cuti Bersama Kenaikan Yesus Kristus' },
  { date: '2026-05-27', type: 'national_holiday', description: 'Hari Raya Iduladha 1447 Hijriah' },
  { date: '2026-05-28', type: 'joint_leave', description: 'Cuti Bersama Hari Raya Iduladha 1447 Hijriah' },
  { date: '2026-05-31', type: 'national_holiday', description: 'Hari Raya Waisak 2570 BE' },
  { date: '2026-06-01', type: 'national_holiday', description: 'Hari Lahir Pancasila' },
  { date: '2026-06-16', type: 'national_holiday', description: 'Tahun Baru Islam 1448 Hijriah' },
  { date: '2026-08-17', type: 'national_holiday', description: 'Hari Kemerdekaan Republik Indonesia' },
  { date: '2026-08-25', type: 'national_holiday', description: 'Maulid Nabi Muhammad SAW' },
  { date: '2026-12-24', type: 'joint_leave', description: 'Cuti Bersama Hari Raya Natal' },
  { date: '2026-12-25', type: 'national_holiday', description: 'Hari Raya Natal' }
];

export const normalizeDateString = (value: string): string => {
  const match = value.match(/^\d{4}-\d{2}-\d{2}/);
  if (!match) return value;
  return match[0];
};

export const parseLocalDate = (value: string): Date => {
  const [year, month, day] = normalizeDateString(value).split('-').map(Number);
  return new Date(year, month - 1, day);
};

export const toDateString = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const expandCalendarDateRange = (startDate: string, endDate: string): string[] => {
  const start = parseLocalDate(startDate);
  const end = parseLocalDate(endDate);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) {
    return [];
  }

  const dates: string[] = [];
  const cursor = new Date(start);
  while (cursor <= end) {
    dates.push(toDateString(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  return dates;
};

export const getDefaultCalendarDays = (): WorkCalendarDay[] => [...DEFAULT_CALENDAR_DAYS];

export const mergeCalendarDays = (customDays: WorkCalendarDay[] = []): WorkCalendarDay[] => {
  const byDate = new Map<string, WorkCalendarDay>();
  for (const day of DEFAULT_CALENDAR_DAYS) byDate.set(day.date, day);
  for (const day of customDays) byDate.set(normalizeDateString(day.date), {
    date: normalizeDateString(day.date),
    type: day.type,
    description: day.description
  });
  return [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date));
};

export const getCalendarDayMap = (calendarDays: WorkCalendarDay[] = []): Map<string, WorkCalendarDay> => {
  return new Map(mergeCalendarDays(calendarDays).map((day) => [day.date, day]));
};

export const isSunday = (dateString: string): boolean => parseLocalDate(dateString).getDay() === 0;

export const isEffectiveWorkday = (dateString: string, calendarDays: WorkCalendarDay[] = []): boolean => {
  const normalized = normalizeDateString(dateString);
  if (isSunday(normalized)) return false;
  return !getCalendarDayMap(calendarDays).has(normalized);
};

export const getEffectiveLeaveDayBreakdown = (
  startDate: string,
  endDate: string,
  calendarDays: WorkCalendarDay[] = []
): EffectiveLeaveDayBreakdown => {
  const calendarMap = getCalendarDayMap(calendarDays);
  const dates = expandCalendarDateRange(startDate, endDate);
  const excludedDates: WorkCalendarDay[] = [];
  let effectiveDays = 0;

  for (const date of dates) {
    const configuredHoliday = calendarMap.get(date);
    if (configuredHoliday) {
      excludedDates.push(configuredHoliday);
      continue;
    }

    if (isSunday(date)) {
      excludedDates.push({ date, type: 'national_holiday', description: 'Hari Minggu' });
      continue;
    }

    effectiveDays += 1;
  }

  return {
    totalCalendarDays: dates.length,
    effectiveDays,
    excludedDates
  };
};

export const countEffectiveLeaveDays = (
  startDate: string,
  endDate: string,
  calendarDays: WorkCalendarDay[] = []
): number => getEffectiveLeaveDayBreakdown(startDate, endDate, calendarDays).effectiveDays;
```

- [ ] **Step 4: Run the work calendar tests**

Run: `npm test -- tests/work-calendar.test.mjs`

Expected: PASS.

- [ ] **Step 5: Commit**

Run:

```bash
git add src/utils/workCalendar.ts tests/work-calendar.test.mjs
git commit -m "feat: add effective work calendar"
```

---

### Task 3: Annual Leave Quota Module

**Files:**
- Create: `src/utils/annualLeaveQuota.ts`
- Test: `tests/annual-leave-quota.test.mjs`

- [ ] **Step 1: Write failing quota tests**

Create `tests/annual-leave-quota.test.mjs`:

```js
import assert from 'node:assert/strict';
import test from 'node:test';
import { loadTsModule } from './helpers/loadTsModule.mjs';

const {
  ANNUAL_LEAVE_TYPES,
  calculateAnnualLeaveQuota,
  getAnnualLeaveUsageByYear,
  isAnnualLeaveType,
  shouldHoldAnnualLeaveQuota
} = loadTsModule('src/utils/annualLeaveQuota.ts');

const base = {
  id: 'req',
  nama: 'Pegawai',
  nip: '198810052020121006',
  pangkatGolongan: '-',
  jabatan: '-',
  kecamatan: '-',
  jenjang: 'SD',
  unitKerja: '-',
  jenisCuti: 'Cuti Tahunan',
  alasanCuti: '-',
  files: [],
  rejectionReason: '',
  submissionDate: '2026-01-01'
};

const request = (overrides) => ({ ...base, ...overrides });

test('treats regular annual leave and Gol. IV annual leave as the same quota type', () => {
  assert.equal(isAnnualLeaveType('Cuti Tahunan'), true);
  assert.equal(isAnnualLeaveType('Cuti Gol. IV Tahunan'), true);
  assert.deepEqual(ANNUAL_LEAVE_TYPES, ['Cuti Tahunan', 'Cuti Gol. IV Tahunan']);
});

test('holds quota for every status except rejected', () => {
  assert.equal(shouldHoldAnnualLeaveQuota('pending'), true);
  assert.equal(shouldHoldAnnualLeaveQuota('approved_coordinator'), true);
  assert.equal(shouldHoldAnnualLeaveQuota('approved_admin'), true);
  assert.equal(shouldHoldAnnualLeaveQuota('document_issued'), true);
  assert.equal(shouldHoldAnnualLeaveQuota('rejected'), false);
});

test('calculates current quota as 12 plus capped carry-over from the previous year only', () => {
  const requests = [
    request({ id: '2024-a', tanggalMulai: '2024-06-03', tanggalSelesai: '2024-06-05', status: 'approved_admin' }),
    request({ id: '2025-a', tanggalMulai: '2025-07-01', tanggalSelesai: '2025-07-11', status: 'approved_admin' })
  ];

  const quota = calculateAnnualLeaveQuota(base.nip, 2026, requests);

  assert.equal(quota.baseQuota, 12);
  assert.deepEqual(quota.carryOver, [
    { year: 2025, remainingBeforeCap: 2, carriedDays: 2 }
  ]);
  assert.equal(quota.availableQuota, 14);
  assert.equal(quota.usedDays, 0);
  assert.equal(quota.remainingQuota, 14);
});

test('counts document issued requests and ignores rejected requests', () => {
  const requests = [
    request({ id: 'issued', tanggalMulai: '2026-06-08', tanggalSelesai: '2026-06-13', status: 'document_issued' }),
    request({ id: 'rejected', tanggalMulai: '2026-07-01', tanggalSelesai: '2026-07-06', status: 'rejected' })
  ];

  const quota = calculateAnnualLeaveQuota(base.nip, 2026, requests);

  assert.equal(quota.usedDays, 6);
  assert.equal(quota.remainingQuota, 18);
});

test('counts Gol. IV annual leave usage', () => {
  const requests = [
    request({
      id: 'gol4',
      jenisCuti: 'Cuti Gol. IV Tahunan',
      tanggalMulai: '2026-06-08',
      tanggalSelesai: '2026-06-13',
      status: 'pending'
    })
  ];

  const quota = calculateAnnualLeaveQuota(base.nip, 2026, requests);

  assert.equal(quota.usedDays, 6);
});

test('splits usage across year boundaries', () => {
  const requests = [
    request({ id: 'cross-year', tanggalMulai: '2025-12-29', tanggalSelesai: '2026-01-03', status: 'approved_admin' })
  ];

  assert.deepEqual(getAnnualLeaveUsageByYear(base.nip, requests), {
    2025: 3,
    2026: 2
  });
});
```

- [ ] **Step 2: Run the quota test and verify it fails**

Run: `npm test -- tests/annual-leave-quota.test.mjs`

Expected: FAIL because `src/utils/annualLeaveQuota.ts` does not exist.

- [ ] **Step 3: Implement the quota module**

Create `src/utils/annualLeaveQuota.ts`:

```ts
import { LeaveRequest } from '../types';
import {
  WorkCalendarDay,
  countEffectiveLeaveDays,
  expandCalendarDateRange,
  toDateString,
  parseLocalDate
} from './workCalendar';

export const ANNUAL_LEAVE_TYPES = ['Cuti Tahunan', 'Cuti Gol. IV Tahunan'] as const;
export const BASE_ANNUAL_QUOTA = 12;
export const MAX_CARRY_OVER_PER_YEAR = 6;

type AnnualLeaveType = typeof ANNUAL_LEAVE_TYPES[number];

export interface AnnualLeaveCarryOver {
  year: number;
  remainingBeforeCap: number;
  carriedDays: number;
}

export interface AnnualLeaveQuotaStats {
  year: number;
  baseQuota: number;
  availableQuota: number;
  usedDays: number;
  remainingQuota: number;
  carryOver: AnnualLeaveCarryOver[];
  totalRequests: number;
  rejectedRequests: number;
}

export const isAnnualLeaveType = (leaveType?: string): leaveType is AnnualLeaveType => {
  return ANNUAL_LEAVE_TYPES.includes(leaveType as AnnualLeaveType);
};

export const shouldHoldAnnualLeaveQuota = (status: LeaveRequest['status']): boolean => status !== 'rejected';

const getYear = (dateString: string): number => parseLocalDate(dateString).getFullYear();

const countRequestDaysForYear = (
  request: Pick<LeaveRequest, 'tanggalMulai' | 'tanggalSelesai'>,
  year: number,
  calendarDays: WorkCalendarDay[] = []
): number => {
  const datesInYear = expandCalendarDateRange(request.tanggalMulai, request.tanggalSelesai)
    .filter((date) => getYear(date) === year);

  if (datesInYear.length === 0) return 0;

  return countEffectiveLeaveDays(datesInYear[0], datesInYear[datesInYear.length - 1], calendarDays);
};

export const getAnnualLeaveUsageByYear = (
  nip: string,
  requests: LeaveRequest[],
  calendarDays: WorkCalendarDay[] = []
): Record<number, number> => {
  const usageByYear: Record<number, number> = {};

  for (const request of requests) {
    if (
      request.nip !== nip ||
      !isAnnualLeaveType(request.jenisCuti) ||
      !shouldHoldAnnualLeaveQuota(request.status)
    ) {
      continue;
    }

    const years = new Set(
      expandCalendarDateRange(request.tanggalMulai, request.tanggalSelesai).map(getYear)
    );

    for (const year of years) {
      usageByYear[year] = (usageByYear[year] || 0) + countRequestDaysForYear(request, year, calendarDays);
    }
  }

  return usageByYear;
};

export const calculateAnnualLeaveQuota = (
  nip: string,
  year: number,
  requests: LeaveRequest[],
  calendarDays: WorkCalendarDay[] = []
): AnnualLeaveQuotaStats => {
  const usageByYear = getAnnualLeaveUsageByYear(nip, requests, calendarDays);
  const carryOverYears = [year - 1];
  const carryOver = carryOverYears.map((carryYear) => {
    const used = usageByYear[carryYear] || 0;
    const remainingBeforeCap = Math.max(0, BASE_ANNUAL_QUOTA - used);
    return {
      year: carryYear,
      remainingBeforeCap,
      carriedDays: Math.min(remainingBeforeCap, MAX_CARRY_OVER_PER_YEAR)
    };
  });

  const usedDays = usageByYear[year] || 0;
  const availableQuota = BASE_ANNUAL_QUOTA + carryOver.reduce((total, item) => total + item.carriedDays, 0);
  const annualRequestsForYear = requests.filter((request) => {
    if (request.nip !== nip || !isAnnualLeaveType(request.jenisCuti)) return false;
    return expandCalendarDateRange(request.tanggalMulai, request.tanggalSelesai).some((date) => getYear(date) === year);
  });

  return {
    year,
    baseQuota: BASE_ANNUAL_QUOTA,
    availableQuota,
    usedDays,
    remainingQuota: Math.max(0, availableQuota - usedDays),
    carryOver,
    totalRequests: annualRequestsForYear.length,
    rejectedRequests: annualRequestsForYear.filter((request) => request.status === 'rejected').length
  };
};

export const validateAnnualLeaveQuota = (
  newRequest: Pick<LeaveRequest, 'nip' | 'jenisCuti' | 'tanggalMulai' | 'tanggalSelesai'>,
  existingRequests: LeaveRequest[],
  calendarDays: WorkCalendarDay[] = []
) => {
  if (!isAnnualLeaveType(newRequest.jenisCuti)) {
    return { isValid: true };
  }

  const requestYears = [...new Set(
    expandCalendarDateRange(newRequest.tanggalMulai, newRequest.tanggalSelesai).map(getYear)
  )];

  const effectiveDays = countEffectiveLeaveDays(newRequest.tanggalMulai, newRequest.tanggalSelesai, calendarDays);
  if (effectiveDays === 0) {
    return {
      isValid: false,
      message: 'Rentang cuti tahunan tidak memiliki hari efektif. Pilih tanggal Senin-Sabtu yang bukan libur nasional atau cuti bersama.'
    };
  }

  for (const year of requestYears) {
    const requestDaysForYear = countRequestDaysForYear(newRequest, year, calendarDays);
    if (requestDaysForYear === 0) continue;

    const stats = calculateAnnualLeaveQuota(newRequest.nip, year, existingRequests, calendarDays);
    if (stats.usedDays + requestDaysForYear > stats.availableQuota) {
      return {
        isValid: false,
        message: `Pengajuan cuti tahunan gagal. Total hari cuti untuk tahun ${year} menjadi ${stats.usedDays + requestDaysForYear} hari, melebihi kuota ${stats.availableQuota} hari. Sisa kuota saat ini: ${stats.remainingQuota} hari.`
      };
    }
  }

  const firstYear = requestYears[0];
  const stats = calculateAnnualLeaveQuota(newRequest.nip, firstYear, existingRequests, calendarDays);
  return {
    isValid: true,
    message: `Pengajuan cuti tahunan valid. Sisa kuota tahun ${firstYear}: ${stats.remainingQuota} hari sebelum pengajuan ini.`
  };
};
```

- [ ] **Step 4: Run quota tests**

Run: `npm test -- tests/annual-leave-quota.test.mjs`

Expected: PASS.

- [ ] **Step 5: Commit**

Run:

```bash
git add src/utils/annualLeaveQuota.ts tests/annual-leave-quota.test.mjs
git commit -m "feat: calculate annual leave quota with carry over"
```

---

### Task 4: Wire Quota Logic into Validation

**Files:**
- Modify: `src/utils/leaveValidation.ts`
- Test: `tests/annual-leave-quota.test.mjs`

- [ ] **Step 1: Add failing validation tests**

Append to `tests/annual-leave-quota.test.mjs`:

```js
const { validateLeaveRequest } = loadTsModule('src/utils/leaveValidation.ts');

test('validateLeaveRequest rejects annual leave that only contains non-effective days', () => {
  const result = validateLeaveRequest(
    request({
      tanggalMulai: '2026-03-20',
      tanggalSelesai: '2026-03-24',
      status: 'pending'
    }),
    []
  );

  assert.equal(result.isValid, false);
  assert.match(result.message, /tidak memiliki hari efektif/);
});

test('validateLeaveRequest includes Gol. IV annual leave in quota limit', () => {
  const existing = [
    request({
      jenisCuti: 'Cuti Tahunan',
      tanggalMulai: '2026-06-08',
      tanggalSelesai: '2026-06-20',
      status: 'approved_admin'
    })
  ];

  const result = validateLeaveRequest(
    request({
      jenisCuti: 'Cuti Gol. IV Tahunan',
      tanggalMulai: '2026-06-22',
      tanggalSelesai: '2026-06-27',
      status: 'pending'
    }),
    existing
  );

  assert.equal(result.isValid, true);
});
```

- [ ] **Step 2: Run validation tests and verify the first one fails**

Run: `npm test -- tests/annual-leave-quota.test.mjs`

Expected: FAIL because `leaveValidation.ts` still uses the old `calculateLeaveDays`.

- [ ] **Step 3: Replace old annual quota logic**

Modify `src/utils/leaveValidation.ts`:

```ts
import { LeaveRequest } from '../types';
import { WorkCalendarDay } from './workCalendar';
import {
  isAnnualLeaveType,
  validateAnnualLeaveQuota
} from './annualLeaveQuota';
```

Replace `validateAnnualLeaveLimit` with:

```ts
export const validateAnnualLeaveLimit = (
  newRequest: Omit<LeaveRequest, 'id' | 'submissionDate'>,
  existingRequests: LeaveRequest[],
  calendarDays: WorkCalendarDay[] = []
): ValidationResult => validateAnnualLeaveQuota(newRequest, existingRequests, calendarDays);
```

Remove the local `calculateLeaveDays` function from `leaveValidation.ts`.

Update `validateLeaveRequest` signature:

```ts
export const validateLeaveRequest = (
  newRequest: Omit<LeaveRequest, 'id' | 'submissionDate'>,
  existingRequests: LeaveRequest[],
  calendarDays: WorkCalendarDay[] = []
): ValidationResult => {
```

Update the annual validation call:

```ts
  const annualLeaveValidation = validateAnnualLeaveLimit(newRequest, existingRequests, calendarDays);
```

Update `getLeaveTypeDescription` only if needed; do not change labels.

- [ ] **Step 4: Keep regular date validation intact**

In `validateLeaveDates`, keep the existing 30-day past limit and duration checks. Do not add quota rules there. Quota rules stay in `validateAnnualLeaveLimit`.

- [ ] **Step 5: Run validation tests**

Run: `npm test -- tests/annual-leave-quota.test.mjs`

Expected: PASS.

- [ ] **Step 6: Commit**

Run:

```bash
git add src/utils/leaveValidation.ts tests/annual-leave-quota.test.mjs
git commit -m "fix: validate annual leave quota with effective days"
```

---

### Task 5: Form Preview Uses the Same Quota Logic

**Files:**
- Modify: `src/components/LeaveForm.tsx`
- Modify: `tests/form-egress.test.mjs`

- [ ] **Step 1: Add failing static regression tests**

Append to `tests/form-egress.test.mjs`:

```js
test('leave form does not manually count calendar days for annual quota preview', () => {
  assert.doesNotMatch(formSource, /diffTime\s*=\s*endDate\.getTime\(\)\s*-\s*startDate\.getTime\(\)/);
  assert.doesNotMatch(formSource, /Math\.ceil\(diffTime/);
});

test('leave form uses annual quota helper for preview and validation', () => {
  assert.match(formSource, /calculateAnnualLeaveQuota/);
  assert.match(formSource, /countEffectiveLeaveDays/);
  assert.match(formSource, /isAnnualLeaveType/);
});
```

- [ ] **Step 2: Run form tests and verify they fail**

Run: `npm test -- tests/form-egress.test.mjs`

Expected: FAIL because `LeaveForm.tsx` still manually calculates calendar days.

- [ ] **Step 3: Update imports**

Modify `src/components/LeaveForm.tsx`:

```ts
import { validateLeaveRequest, validateNIP, validateLeaveDates, isSickLeaveType, isMaternityLeave } from '../utils/leaveValidation';
import { calculateAnnualLeaveQuota, isAnnualLeaveType } from '../utils/annualLeaveQuota';
import { countEffectiveLeaveDays } from '../utils/workCalendar';
```

- [ ] **Step 4: Replace annual type checks**

Replace every `newData.jenisCuti === 'Cuti Tahunan'` condition with:

```ts
isAnnualLeaveType(newData.jenisCuti)
```

Replace every `value !== 'Cuti Tahunan'` branch that clears annual quota messages with:

```ts
!isAnnualLeaveType(value)
```

- [ ] **Step 5: Use selected leave year instead of current year**

Inside quota preview blocks, compute:

```ts
const quotaYear = newData.tanggalMulai
  ? new Date(`${newData.tanggalMulai}T00:00:00`).getFullYear()
  : new Date().getFullYear();
const stats = calculateAnnualLeaveQuota(newData.nip, quotaYear, validationRequests);
```

- [ ] **Step 6: Replace manual new request day calculation**

Replace the `startDate`, `endDate`, `diffTime`, and `newRequestDays` block with:

```ts
const newRequestDays = countEffectiveLeaveDays(newData.tanggalMulai, newData.tanggalSelesai);
```

Keep the existing modal wording, but use `stats.availableQuota` instead of hard-coded `12` when checking annual quota:

```ts
if (stats.usedDays + newRequestDays > stats.availableQuota) {
  setValidationMessage({
    type: 'error',
    message: `Pengajuan cuti tahunan gagal! Total hari cuti yang akan digunakan (${stats.usedDays + newRequestDays} hari) melebihi kuota ${stats.availableQuota} hari untuk tahun ${quotaYear}. Hari yang sudah digunakan: ${stats.usedDays} hari.`
  });
}
```

- [ ] **Step 7: Pass the new validation argument**

Change:

```ts
const validationResult = validateLeaveRequest(requestData, validationRequests, true);
```

to:

```ts
const validationResult = validateLeaveRequest(requestData, validationRequests);
```

- [ ] **Step 8: Update annual leave info text**

Add this line in the annual leave info area:

```tsx
{isAnnualLeaveType(formData.jenisCuti) && (
  <p>• <strong>Cuti tahunan:</strong> Minggu, libur nasional, dan cuti bersama tidak mengurangi kuota</p>
)}
```

- [ ] **Step 9: Run form tests**

Run: `npm test -- tests/form-egress.test.mjs`

Expected: PASS.

- [ ] **Step 10: Commit**

Run:

```bash
git add src/components/LeaveForm.tsx tests/form-egress.test.mjs
git commit -m "fix: align annual leave preview with quota validation"
```

---

### Task 6: Detail Modal Uses New Quota Stats

**Files:**
- Modify: `src/components/LeaveRequestDetailModal.tsx`

- [ ] **Step 1: Update imports**

Change:

```ts
import { getAnnualLeaveStats } from '../utils/leaveValidation';
```

to:

```ts
import { calculateAnnualLeaveQuota, isAnnualLeaveType } from '../utils/annualLeaveQuota';
```

- [ ] **Step 2: Use the request year**

Replace the `currentYear` calculation for quota display with:

```ts
const quotaYear = request ? new Date(`${request.tanggalMulai}T00:00:00`).getFullYear() : new Date().getFullYear();
const annualLeaveStats = request
  ? calculateAnnualLeaveQuota(request.nip, quotaYear, existingRequests)
  : null;
```

- [ ] **Step 3: Render annual quota for both annual leave labels**

Replace:

```tsx
{request.jenisCuti === 'Cuti Tahunan' && (
```

with:

```tsx
{isAnnualLeaveType(request.jenisCuti) && annualLeaveStats && (
```

- [ ] **Step 4: Update labels**

Replace hard-coded `/12` with:

```tsx
{annualLeaveStats.remainingQuota}/{annualLeaveStats.availableQuota}
```

Add a short carry-over line:

```tsx
<p className="text-xs text-gray-600 mt-2">
  Termasuk akumulasi: {annualLeaveStats.carryOver.map(item => `${item.year}: ${item.carriedDays} hari`).join(', ')}
</p>
```

- [ ] **Step 5: Run build**

Run: `npm run build`

Expected: PASS.

- [ ] **Step 6: Commit**

Run:

```bash
git add src/components/LeaveRequestDetailModal.tsx
git commit -m "fix: show accumulated annual leave quota in details"
```

---

### Task 7: Supabase Calendar Storage

**Files:**
- Create: `supabase/migrations/0003_work_calendar_days.sql`
- Modify: `src/utils/database.ts`

- [ ] **Step 1: Create the migration**

Create `supabase/migrations/0003_work_calendar_days.sql`:

```sql
-- =====================================================================
-- Migration: Work calendar days for annual leave quota calculation
-- Tujuan: menyimpan libur nasional dan cuti bersama agar Admin Dinas
--         dapat mengelola kalender tahun berikutnya tanpa rilis aplikasi.
-- =====================================================================

create table if not exists public.work_calendar_days (
  id uuid primary key default gen_random_uuid(),
  calendar_date date not null unique,
  type text not null check (type in ('national_holiday', 'joint_leave')),
  description text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.work_calendar_days enable row level security;

create or replace function public.touch_work_calendar_days_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_touch_work_calendar_days_updated_at on public.work_calendar_days;
create trigger trg_touch_work_calendar_days_updated_at
before update on public.work_calendar_days
for each row execute function public.touch_work_calendar_days_updated_at();

create or replace function public.get_work_calendar_days(p_start date, p_end date)
returns table (
  id uuid,
  calendar_date date,
  type text,
  description text,
  created_at timestamptz,
  updated_at timestamptz
)
language sql
security definer
set search_path = public
as $$
  select id, calendar_date, type, description, created_at, updated_at
  from public.work_calendar_days
  where calendar_date between p_start and p_end
  order by calendar_date asc;
$$;

create or replace function public.upsert_work_calendar_day(
  p_admin_user_id text,
  p_calendar_date date,
  p_type text,
  p_description text
)
returns public.work_calendar_days
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role text;
  v_row public.work_calendar_days;
begin
  select role into v_role
  from public.admin_users
  where id::text = p_admin_user_id
    and is_active = true;

  if v_role is distinct from 'admin_disdik' then
    raise exception 'Hanya Admin Dinas yang dapat mengubah kalender kerja.';
  end if;

  insert into public.work_calendar_days(calendar_date, type, description)
  values (p_calendar_date, p_type, p_description)
  on conflict (calendar_date)
  do update set type = excluded.type, description = excluded.description
  returning * into v_row;

  return v_row;
end;
$$;

create or replace function public.delete_work_calendar_day(
  p_admin_user_id text,
  p_calendar_date date
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role text;
begin
  select role into v_role
  from public.admin_users
  where id::text = p_admin_user_id
    and is_active = true;

  if v_role is distinct from 'admin_disdik' then
    raise exception 'Hanya Admin Dinas yang dapat menghapus kalender kerja.';
  end if;

  delete from public.work_calendar_days
  where calendar_date = p_calendar_date;
end;
$$;

revoke all on public.work_calendar_days from anon;
revoke all on public.work_calendar_days from authenticated;
revoke all on function public.get_work_calendar_days(date, date) from public;
revoke all on function public.upsert_work_calendar_day(text, date, text, text) from public;
revoke all on function public.delete_work_calendar_day(text, date) from public;

grant execute on function public.get_work_calendar_days(date, date) to anon;
grant execute on function public.upsert_work_calendar_day(text, date, text, text) to anon;
grant execute on function public.delete_work_calendar_day(text, date) to anon;
```

- [ ] **Step 2: Add database types**

Add to `src/utils/database.ts`:

```ts
export interface WorkCalendarDayDB {
  id: string;
  calendar_date: string;
  type: 'national_holiday' | 'joint_leave';
  description: string;
  created_at: string;
  updated_at: string;
}
```

- [ ] **Step 3: Add database functions**

Add inside `db` in `src/utils/database.ts`:

```ts
  async getWorkCalendarDays(startDate: string, endDate: string): Promise<WorkCalendarDayDB[]> {
    const { data, error } = await supabase.rpc('get_work_calendar_days', {
      p_start: startDate,
      p_end: endDate
    });

    if (error) {
      console.error('Supabase error in getWorkCalendarDays:', error);
      throw new Error(`Database error: ${error.message}`);
    }

    return data || [];
  },

  async upsertWorkCalendarDay(params: {
    adminUserId: string;
    date: string;
    type: WorkCalendarDayDB['type'];
    description: string;
  }): Promise<WorkCalendarDayDB | null> {
    const { data, error } = await supabase.rpc('upsert_work_calendar_day', {
      p_admin_user_id: params.adminUserId,
      p_calendar_date: params.date,
      p_type: params.type,
      p_description: params.description
    });

    if (error) {
      console.error('Supabase error in upsertWorkCalendarDay:', error);
      throw new Error(`Database error: ${error.message}`);
    }

    return data;
  },

  async deleteWorkCalendarDay(adminUserId: string, date: string): Promise<boolean> {
    const { error } = await supabase.rpc('delete_work_calendar_day', {
      p_admin_user_id: adminUserId,
      p_calendar_date: date
    });

    if (error) {
      console.error('Supabase error in deleteWorkCalendarDay:', error);
      throw new Error(`Database error: ${error.message}`);
    }

    return true;
  },
```

- [ ] **Step 4: Run build**

Run: `npm run build`

Expected: PASS.

- [ ] **Step 5: Commit**

Run:

```bash
git add supabase/migrations/0003_work_calendar_days.sql src/utils/database.ts
git commit -m "feat: add editable work calendar storage"
```

---

### Task 8: Calendar Hook and Admin Settings UI

**Files:**
- Create: `src/hooks/useWorkCalendar.ts`
- Create: `src/components/WorkCalendarSettings.tsx`
- Modify: `src/components/EnhancedAdminPanel.tsx`

- [ ] **Step 1: Create calendar hook**

Create `src/hooks/useWorkCalendar.ts`:

```ts
import { useCallback, useEffect, useMemo, useState } from 'react';
import { WorkCalendarDay, getDefaultCalendarDays, mergeCalendarDays } from '../utils/workCalendar';
import { db } from '../utils/database';

const yearRange = (year: number) => ({
  start: `${year}-01-01`,
  end: `${year}-12-31`
});

export const useWorkCalendar = (year: number) => {
  const [customDays, setCustomDays] = useState<WorkCalendarDay[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadCalendar = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const range = yearRange(year);
      const rows = await db.getWorkCalendarDays(range.start, range.end);
      setCustomDays(rows.map((row) => ({
        date: row.calendar_date,
        type: row.type,
        description: row.description
      })));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Gagal memuat kalender kerja';
      setError(message);
      setCustomDays([]);
    } finally {
      setLoading(false);
    }
  }, [year]);

  useEffect(() => {
    loadCalendar();
  }, [loadCalendar]);

  const days = useMemo(() => {
    return mergeCalendarDays(customDays).filter((day) => day.date.startsWith(`${year}-`));
  }, [customDays, year]);

  return {
    days,
    loading,
    error,
    reload: loadCalendar
  };
};
```

- [ ] **Step 2: Create Admin Dinas calendar settings component**

Create `src/components/WorkCalendarSettings.tsx`:

```tsx
import React, { useMemo, useState } from 'react';
import { Calendar, Plus, RefreshCw, Save, Trash2 } from 'lucide-react';
import { AdminUser } from '../types';
import { db } from '../utils/database';
import { CalendarDayType, WorkCalendarDay, getDefaultCalendarDays } from '../utils/workCalendar';
import { useWorkCalendar } from '../hooks/useWorkCalendar';

interface WorkCalendarSettingsProps {
  user: AdminUser;
  showModal: (message: string) => void;
}

const currentYear = new Date().getFullYear();

const WorkCalendarSettings: React.FC<WorkCalendarSettingsProps> = ({ user, showModal }) => {
  const [year, setYear] = useState(currentYear);
  const [date, setDate] = useState(`${currentYear}-01-01`);
  const [type, setType] = useState<CalendarDayType>('national_holiday');
  const [description, setDescription] = useState('');
  const { days, loading, error, reload } = useWorkCalendar(year);

  const sortedDays = useMemo(
    () => [...days].sort((a, b) => a.date.localeCompare(b.date)),
    [days]
  );

  const handleSave = async () => {
    if (!date || !description.trim()) {
      showModal('Tanggal dan keterangan kalender wajib diisi.');
      return;
    }

    await db.upsertWorkCalendarDay({
      adminUserId: user.id,
      date,
      type,
      description: description.trim()
    });
    setDescription('');
    await reload();
    showModal('Kalender kerja berhasil disimpan.');
  };

  const handleDelete = async (day: WorkCalendarDay) => {
    await db.deleteWorkCalendarDay(user.id, day.date);
    await reload();
    showModal('Tanggal kalender kerja berhasil dihapus.');
  };

  const handleCopyDefaultYear = async () => {
    const defaults = getDefaultCalendarDays().filter((day) => day.date.startsWith(`${year}-`));
    await Promise.all(defaults.map((day) => db.upsertWorkCalendarDay({
      adminUserId: user.id,
      date: day.date,
      type: day.type,
      description: day.description
    })));
    await reload();
    showModal(`Kalender bawaan tahun ${year} berhasil disalin ke database.`);
  };

  return (
    <div className="space-y-6">
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <Calendar className="w-6 h-6 text-purple-600" />
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Pengaturan Kalender Kerja</h3>
              <p className="text-sm text-gray-600">Kelola libur nasional dan cuti bersama yang tidak mengurangi kuota cuti tahunan.</p>
            </div>
          </div>
          <button
            onClick={reload}
            className="flex items-center space-x-2 px-3 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Muat Ulang</span>
          </button>
        </div>

        {error && (
          <div className="mb-4 rounded-lg border border-yellow-200 bg-yellow-50 p-3 text-sm text-yellow-800">
            {error}. Aplikasi tetap memakai kalender bawaan jika data database belum tersedia.
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Tahun</label>
            <input
              type="number"
              value={year}
              onChange={(event) => setYear(Number(event.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              min="2024"
              max="2100"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Tanggal</label>
            <input
              type="date"
              value={date}
              onChange={(event) => setDate(event.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Jenis</label>
            <select
              value={type}
              onChange={(event) => setType(event.target.value as CalendarDayType)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            >
              <option value="national_holiday">Libur Nasional</option>
              <option value="joint_leave">Cuti Bersama</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Keterangan</label>
            <input
              type="text"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              placeholder="Contoh: Hari Raya Natal"
            />
          </div>
          <div className="flex items-end gap-2">
            <button
              onClick={handleSave}
              className="flex items-center space-x-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
            >
              <Save className="w-4 h-4" />
              <span>Simpan</span>
            </button>
          </div>
        </div>

        <button
          onClick={handleCopyDefaultYear}
          className="mt-4 flex items-center space-x-2 px-4 py-2 border border-purple-200 text-purple-700 rounded-lg hover:bg-purple-50"
        >
          <Plus className="w-4 h-4" />
          <span>Salin Kalender Bawaan Tahun Ini</span>
        </button>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h4 className="font-semibold text-gray-900">Daftar Kalender Tahun {year}</h4>
        </div>
        {loading ? (
          <div className="p-6 text-gray-600">Memuat kalender kerja...</div>
        ) : sortedDays.length === 0 ? (
          <div className="p-6 text-gray-600">Belum ada data kalender untuk tahun ini.</div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Tanggal</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Jenis</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Keterangan</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {sortedDays.map((day) => (
                <tr key={day.date} className="border-t border-gray-100">
                  <td className="px-4 py-3 text-sm text-gray-900">{day.date}</td>
                  <td className="px-4 py-3 text-sm text-gray-900">
                    {day.type === 'national_holiday' ? 'Libur Nasional' : 'Cuti Bersama'}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900">{day.description}</td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => handleDelete(day)}
                      className="p-1 text-red-600 hover:text-red-800"
                      title="Hapus"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default WorkCalendarSettings;
```

- [ ] **Step 3: Add calendar tab to EnhancedAdminPanel**

Modify imports in `src/components/EnhancedAdminPanel.tsx`:

```ts
import WorkCalendarSettings from './WorkCalendarSettings';
```

Change tab type:

```ts
type TabType = 'dashboard' | 'approval' | 'reports' | 'analytics' | 'calendar';
```

Replace tab list:

```tsx
{[
  { id: 'dashboard', label: 'Dasbor', icon: BarChart3 },
  { id: 'approval', label: 'Persetujuan', icon: Check },
  { id: 'reports', label: 'Laporan', icon: FileText },
  { id: 'analytics', label: 'Analitik', icon: TrendingUp },
  ...(userRole === 'admin_disdik' ? [{ id: 'calendar', label: 'Kalender', icon: Calendar }] : [])
].map((tab) => {
```

Add render block:

```tsx
{activeTab === 'calendar' && userRole === 'admin_disdik' && (
  <WorkCalendarSettings
    user={{ id: String(userPermissions?.userId || ''), nama: 'Admin Dinas', username: '', role: 'admin_disdik', permissions: userPermissions, created_at: '', updated_at: '' }}
    showModal={showModal}
  />
)}
```

If `EnhancedAdminPanel` does not receive `user.id`, update its props to include `currentUser?: AdminUser` and pass `user` from `RolePage`. Prefer this exact prop change:

```ts
currentUser?: AdminUser;
```

Then render:

```tsx
{activeTab === 'calendar' && userRole === 'admin_disdik' && currentUser && (
  <WorkCalendarSettings user={currentUser} showModal={showModal} />
)}
```

- [ ] **Step 4: Pass current user from RolePage**

Modify `src/components/RolePage.tsx` when rendering `EnhancedAdminPanel`:

```tsx
<EnhancedAdminPanel
  leaveRequests={filteredLeaveRequests}
  onApprove={onApprove}
  onReject={onReject}
  onUpdate={onUpdate}
  showModal={showModal}
  userRole={user?.role}
  userPermissions={user?.permissions}
  currentUser={user}
/>
```

- [ ] **Step 5: Run build**

Run: `npm run build`

Expected: PASS.

- [ ] **Step 6: Commit**

Run:

```bash
git add src/hooks/useWorkCalendar.ts src/components/WorkCalendarSettings.tsx src/components/EnhancedAdminPanel.tsx src/components/RolePage.tsx
git commit -m "feat: add admin work calendar settings"
```

---

### Task 9: Use Editable Calendar in Form and Validation

**Files:**
- Modify: `src/components/LeaveForm.tsx`
- Modify: `src/components/LeaveRequestDetailModal.tsx`
- Modify: `src/components/StatusPage.tsx`
- Modify: `src/App.tsx`

- [ ] **Step 1: Load calendar days around selected leave years**

In `LeaveForm.tsx`, import:

```ts
import { useWorkCalendar } from '../hooks/useWorkCalendar';
```

Compute selected year:

```ts
const selectedQuotaYear = formData.tanggalMulai
  ? new Date(`${formData.tanggalMulai}T00:00:00`).getFullYear()
  : new Date().getFullYear();
const { days: workCalendarDays } = useWorkCalendar(selectedQuotaYear);
```

- [ ] **Step 2: Pass calendar days into quota calls**

Update all quota calls:

```ts
const stats = calculateAnnualLeaveQuota(newData.nip, quotaYear, validationRequests, workCalendarDays);
const newRequestDays = countEffectiveLeaveDays(newData.tanggalMulai, newData.tanggalSelesai, workCalendarDays);
const validationResult = validateLeaveRequest(requestData, validationRequests, workCalendarDays);
```

- [ ] **Step 3: Pass calendar days into detail modal**

Add prop to `LeaveRequestDetailModal`:

```ts
workCalendarDays?: WorkCalendarDay[];
```

Use it:

```ts
calculateAnnualLeaveQuota(request.nip, quotaYear, existingRequests, workCalendarDays || [])
```

- [ ] **Step 4: Load and pass calendar in StatusPage**

In `StatusPage.tsx`, load by selected request year when detail modal opens:

```ts
const detailYear = detailModal.request
  ? new Date(`${detailModal.request.tanggalMulai}T00:00:00`).getFullYear()
  : new Date().getFullYear();
const { days: workCalendarDays } = useWorkCalendar(detailYear);
```

Pass:

```tsx
<LeaveRequestDetailModal
  ...
  workCalendarDays={workCalendarDays}
/>
```

- [ ] **Step 5: Run tests and build**

Run:

```bash
npm test
npm run build
```

Expected: PASS.

- [ ] **Step 6: Commit**

Run:

```bash
git add src/components/LeaveForm.tsx src/components/LeaveRequestDetailModal.tsx src/components/StatusPage.tsx src/App.tsx
git commit -m "feat: use editable calendar in leave quota calculation"
```

---

### Task 10: Final Verification

**Files:**
- No new files.

- [ ] **Step 1: Run unit and regression tests**

Run:

```bash
npm test
```

Expected: all tests pass.

- [ ] **Step 2: Run lint**

Run:

```bash
npm run lint
```

Expected: PASS or only pre-existing lint findings documented with exact filenames.

- [ ] **Step 3: Run production build**

Run:

```bash
npm run build
```

Expected: PASS.

- [ ] **Step 4: Manual browser checks**

Run the app locally and verify:

- Cuti 8-14 Juni 2026 counts 6 days because Sunday is excluded.
- Cuti 18-24 Maret 2026 counts 0 effective days and is rejected for annual leave.
- Cuti 24-26 Desember 2026 counts 1 day because 24 December is cuti bersama, 25 December is libur nasional, and 26 December is Saturday.
- Cuti Gol. IV Tahunan uses the same annual quota.
- A `document_issued` request still reduces quota.
- A rejected request no longer reduces quota.
- Example data 2025 used 10 days gives 2026 available quota 14 days.
- A year with no annual leave usage gives the next year a maximum available quota of 18 days.
- Admin Dinas can open the `Kalender` tab, add a future year date, reload, and see that the date no longer reduces annual leave quota.

- [ ] **Step 5: Handoff summary**

Summarize changed files, commands run, and any Supabase migration step the operator must run in production.
