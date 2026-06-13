# UI V2 Foundation and Public Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the first safe UI v2 increment: keep v1 available, add a real v1/v2 selector, isolate v2 styling, and ship a responsive v2 public dashboard preview.

**Architecture:** Preserve the current application as `AppV1`, then make `src/App.tsx` a small version selector that lazy-loads `AppV1` or `AppV2`. `AppV2` uses shared data hooks and utilities, but renders new v2 shell, header, footer, dashboard cards, and charts under a `.ui-v2` root with scoped CSS.

**Tech Stack:** React 18, TypeScript, Vite, Tailwind CSS, Node test runner, lucide-react.

---

## Scope

This plan implements only the first testable redesign slice. It does not replace the full admin panel yet. Admin Dinas, Korwil, SMP, SKB, forms, status page, and modals remain functionally available through v1 and will be migrated in later increments.

## Files

- Create: `src/AppV1.tsx`
- Modify: `src/App.tsx`
- Create: `src/AppV2.tsx`
- Create: `src/components/v2/V2Header.tsx`
- Create: `src/components/v2/V2Footer.tsx`
- Create: `src/components/v2/V2PageShell.tsx`
- Create: `src/components/v2/V2StatCard.tsx`
- Create: `src/components/v2/V2Dashboard.tsx`
- Create: `src/styles/v2.css`
- Modify: `src/main.tsx`
- Create: `tests/ui-v2-egress.test.mjs`
- Modify: `tests/dashboard-egress.test.mjs`
- Modify: `tests/form-egress.test.mjs`
- Modify: `tests/admin-pagination-egress.test.mjs`
- Modify: `CHANGELOG.md`

## Task 1: Write UI Version Selector Tests

**Files:**
- Create: `tests/ui-v2-egress.test.mjs`
- Modify: `tests/dashboard-egress.test.mjs`
- Modify: `tests/form-egress.test.mjs`
- Modify: `tests/admin-pagination-egress.test.mjs`

- [ ] **Step 1: Add failing v2 selector tests**

Create `tests/ui-v2-egress.test.mjs`:

```js
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const appSource = readFileSync(new URL('../src/App.tsx', import.meta.url), 'utf8');
const appV1Source = readFileSync(new URL('../src/AppV1.tsx', import.meta.url), 'utf8');
const appV2Source = readFileSync(new URL('../src/AppV2.tsx', import.meta.url), 'utf8');
const v2CssSource = readFileSync(new URL('../src/styles/v2.css', import.meta.url), 'utf8');
const v2DashboardSource = readFileSync(new URL('../src/components/v2/V2Dashboard.tsx', import.meta.url), 'utf8');

test('app lazily selects v1 or v2 without loading both versions eagerly', () => {
  assert.match(appSource, /React\.lazy\(\(\) => import\('\.\/AppV1'\)\)/);
  assert.match(appSource, /React\.lazy\(\(\) => import\('\.\/AppV2'\)\)/);
  assert.match(appSource, /VITE_DEFAULT_UI_VERSION/);
  assert.match(appSource, /searchParams\.get\('ui'\)/);
  assert.match(appSource, /uiVersion === 'v2' \? <AppV2 \/> : <AppV1 \/>/);
  assert.doesNotMatch(appSource, /useLeaveRequests/);
});

test('v1 keeps existing leave request loading guard', () => {
  assert.match(appV1Source, /shouldLoadFullLeaveRequests/);
  assert.match(appV1Source, /useLeaveRequests\(\{\s*autoLoad:\s*shouldLoadFullLeaveRequests\s*\}\)/);
  assert.match(appV1Source, /currentRole === 'coordinator'/);
  assert.doesNotMatch(appV1Source, /currentRole === 'admin'/);
});

test('v2 is scoped and keeps business data access in shared hooks', () => {
  assert.match(appV2Source, /className="ui-v2/);
  assert.match(appV2Source, /V2Dashboard/);
  assert.doesNotMatch(appV2Source, /createClient/);
  assert.match(v2DashboardSource, /useDashboardStats/);
  assert.doesNotMatch(v2DashboardSource, /useLeaveRequests/);
});

test('v2 styles are scoped and avoid transition-all', () => {
  assert.match(v2CssSource, /\.ui-v2/);
  assert.match(v2CssSource, /prefers-reduced-motion/);
  assert.match(v2CssSource, /overflow-x:\s*hidden/);
  assert.doesNotMatch(v2CssSource, /transition:\s*all/);
});

test('v2 dashboard prevents page-level mobile overflow for monthly chart', () => {
  assert.match(v2DashboardSource, /overflow-x-auto/);
  assert.match(v2DashboardSource, /min-w-\[640px\]/);
  assert.match(v2DashboardSource, /aria-label="Tren pengajuan bulanan"/);
});
```

- [ ] **Step 2: Update existing static tests to read AppV1**

In `tests/dashboard-egress.test.mjs`, `tests/form-egress.test.mjs`, and `tests/admin-pagination-egress.test.mjs`, change:

```js
const appSource = readFileSync(new URL('../src/App.tsx', import.meta.url), 'utf8');
```

to:

```js
const appSource = readFileSync(new URL('../src/AppV1.tsx', import.meta.url), 'utf8');
```

- [ ] **Step 3: Verify tests fail for missing v2 files**

Run:

```bash
npm test -- tests/ui-v2-egress.test.mjs
```

Expected: FAIL because `src/AppV1.tsx`, `src/AppV2.tsx`, `src/styles/v2.css`, and v2 components do not exist yet.

## Task 2: Add AppV1 and Version Selector

**Files:**
- Create: `src/AppV1.tsx`
- Modify: `src/App.tsx`
- Modify: `src/main.tsx`

- [ ] **Step 1: Move current app implementation into AppV1**

Copy the current full contents of `src/App.tsx` into `src/AppV1.tsx`, then rename the component:

```tsx
function AppV1() {
  // keep the current App body unchanged
}

export default AppV1;
```

- [ ] **Step 2: Replace App.tsx with a lazy version selector**

Replace `src/App.tsx` with:

```tsx
import React, { Suspense } from 'react';

const AppV1 = React.lazy(() => import('./AppV1'));
const AppV2 = React.lazy(() => import('./AppV2'));

type UiVersion = 'v1' | 'v2';

const getConfiguredUiVersion = (): UiVersion => {
  const defaultVersion = import.meta.env.VITE_DEFAULT_UI_VERSION;
  return defaultVersion === 'v2' ? 'v2' : 'v1';
};

const getRequestedUiVersion = (): UiVersion => {
  if (typeof window === 'undefined') return getConfiguredUiVersion();

  const searchParams = new URLSearchParams(window.location.search);
  const requested = searchParams.get('ui');

  if (requested === 'v1' || requested === 'v2') {
    return requested;
  }

  return getConfiguredUiVersion();
};

const App: React.FC = () => {
  const uiVersion = getRequestedUiVersion();

  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-50 flex items-center justify-center text-slate-600">
          Memuat aplikasi...
        </div>
      }
    >
      {uiVersion === 'v2' ? <AppV2 /> : <AppV1 />}
    </Suspense>
  );
};

export default App;
```

- [ ] **Step 3: Keep main.tsx importing App**

Verify `src/main.tsx` still imports `./App`:

```tsx
import App from './App';
```

- [ ] **Step 4: Run selector tests**

Run:

```bash
npm test -- tests/ui-v2-egress.test.mjs
```

Expected: still FAIL because `AppV2` and v2 UI files do not exist yet.

## Task 3: Add Scoped V2 Shell and Design Primitives

**Files:**
- Create: `src/AppV2.tsx`
- Create: `src/components/v2/V2Header.tsx`
- Create: `src/components/v2/V2Footer.tsx`
- Create: `src/components/v2/V2PageShell.tsx`
- Create: `src/components/v2/V2StatCard.tsx`
- Create: `src/styles/v2.css`

- [ ] **Step 1: Create scoped CSS**

Create `src/styles/v2.css`:

```css
.ui-v2 {
  min-height: 100vh;
  overflow-x: hidden;
  background:
    radial-gradient(circle at top left, rgba(79, 70, 229, 0.08), transparent 34rem),
    #f8fafc;
  color: #0f172a;
  -webkit-tap-highlight-color: rgba(79, 70, 229, 0.16);
}

.ui-v2 * {
  box-sizing: border-box;
}

.ui-v2 :focus-visible {
  outline: 3px solid rgba(79, 70, 229, 0.35);
  outline-offset: 2px;
}

.ui-v2 .v2-scrollbar {
  scrollbar-width: thin;
  scrollbar-color: #cbd5e1 #f8fafc;
}

.ui-v2 .v2-scrollbar::-webkit-scrollbar {
  height: 8px;
  width: 8px;
}

.ui-v2 .v2-scrollbar::-webkit-scrollbar-track {
  background: #f8fafc;
}

.ui-v2 .v2-scrollbar::-webkit-scrollbar-thumb {
  background: #cbd5e1;
  border-radius: 999px;
}

@media (prefers-reduced-motion: reduce) {
  .ui-v2 *,
  .ui-v2 *::before,
  .ui-v2 *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    scroll-behavior: auto !important;
    transition-duration: 0.01ms !important;
  }
}
```

- [ ] **Step 2: Create V2PageShell**

Create `src/components/v2/V2PageShell.tsx`:

```tsx
import React from 'react';

interface V2PageShellProps {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
}

const V2PageShell: React.FC<V2PageShellProps> = ({
  eyebrow,
  title,
  description,
  actions,
  children
}) => (
  <main id="main-content" className="flex-1 py-6 sm:py-8">
    <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
      <section className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-3xl">
          {eyebrow && (
            <p className="mb-2 text-sm font-semibold uppercase tracking-[0.18em] text-indigo-600">
              {eyebrow}
            </p>
          )}
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-950 text-balance sm:text-4xl">
            {title}
          </h1>
          {description && (
            <p className="mt-3 text-base leading-7 text-slate-600 sm:text-lg">
              {description}
            </p>
          )}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </section>
      {children}
    </div>
  </main>
);

export default V2PageShell;
```

- [ ] **Step 3: Create V2StatCard**

Create `src/components/v2/V2StatCard.tsx`:

```tsx
import React from 'react';
import { LucideIcon } from 'lucide-react';

interface V2StatCardProps {
  title: string;
  value: number | string;
  helper: string;
  icon: LucideIcon;
  tone: 'blue' | 'amber' | 'orange' | 'emerald' | 'rose' | 'slate';
}

const toneClasses = {
  blue: 'bg-blue-50 text-blue-700 ring-blue-100',
  amber: 'bg-amber-50 text-amber-700 ring-amber-100',
  orange: 'bg-orange-50 text-orange-700 ring-orange-100',
  emerald: 'bg-emerald-50 text-emerald-700 ring-emerald-100',
  rose: 'bg-rose-50 text-rose-700 ring-rose-100',
  slate: 'bg-slate-100 text-slate-700 ring-slate-200'
};

const V2StatCard: React.FC<V2StatCardProps> = ({ title, value, helper, icon: Icon, tone }) => (
  <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-shadow duration-200 hover:shadow-md">
    <div className="flex items-start justify-between gap-4">
      <div className="min-w-0">
        <p className="text-sm font-medium text-slate-500">{title}</p>
        <p className="mt-2 text-3xl font-black tabular-nums tracking-tight text-slate-950">
          {value}
        </p>
      </div>
      <div className={`rounded-xl p-2.5 ring-1 ${toneClasses[tone]}`}>
        <Icon className="h-5 w-5" aria-hidden="true" />
      </div>
    </div>
    <p className="mt-3 text-sm leading-6 text-slate-500">{helper}</p>
  </article>
);

export default V2StatCard;
```

- [ ] **Step 4: Create V2Header and V2Footer**

Create `src/components/v2/V2Header.tsx` and `src/components/v2/V2Footer.tsx` using semantic header/footer, a skip link, and navigation labels. The header initially supports dashboard-only v2 plus links to v1 pages by changing `?ui=v1`.

`V2Header.tsx`:

```tsx
import React from 'react';
import { BarChart3, FileText, GraduationCap, Home, Info, Users } from 'lucide-react';

const v1Href = (section: string) => `?ui=v1&section=${section}`;

const navItems = [
  { label: 'Beranda V2', href: '?ui=v2', icon: Home, active: true },
  { label: 'Pengajuan Cuti', href: v1Href('form'), icon: FileText, active: false },
  { label: 'Status Pengajuan', href: v1Href('status'), icon: BarChart3, active: false },
  { label: 'Administrator', href: v1Href('role'), icon: Users, active: false },
  { label: 'Tata Cara', href: v1Href('about'), icon: Info, active: false }
];

const V2Header: React.FC = () => (
  <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur">
    <a
      href="#main-content"
      className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-indigo-600 focus:px-4 focus:py-2 focus:text-white"
    >
      Lewati ke konten utama
    </a>
    <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-sm">
          <GraduationCap className="h-5 w-5" aria-hidden="true" />
        </div>
        <div className="min-w-0">
          <p className="truncate text-lg font-black tracking-tight text-slate-950">Si CERDAS</p>
          <p className="hidden truncate text-xs font-medium text-slate-500 sm:block">
            Dinas Pendidikan Grobogan
          </p>
        </div>
      </div>

      <nav className="hidden items-center gap-1 md:flex" aria-label="Navigasi utama">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <a
              key={item.label}
              href={item.href}
              aria-current={item.active ? 'page' : undefined}
              className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold transition-colors duration-200 ${
                item.active
                  ? 'bg-indigo-50 text-indigo-700'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-950'
              }`}
            >
              <Icon className="h-4 w-4" aria-hidden="true" />
              {item.label}
            </a>
          );
        })}
      </nav>

      <a
        href="?ui=v1"
        className="inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm transition-colors duration-200 hover:bg-slate-50"
      >
        UI v1
      </a>
    </div>
  </header>
);

export default V2Header;
```

`V2Footer.tsx`:

```tsx
import React from 'react';

const V2Footer: React.FC = () => (
  <footer className="border-t border-slate-200 bg-white">
    <div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 py-5 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
      <p>© 2026 Dinas Pendidikan Kabupaten Grobogan</p>
      <p className="font-medium text-slate-600">UI v2 preview</p>
    </div>
  </footer>
);

export default V2Footer;
```

- [ ] **Step 5: Create AppV2 shell**

Create `src/AppV2.tsx`:

```tsx
import React from 'react';
import './styles/v2.css';
import V2Footer from './components/v2/V2Footer';
import V2Header from './components/v2/V2Header';
import V2Dashboard from './components/v2/V2Dashboard';

const AppV2: React.FC = () => (
  <div className="ui-v2 flex min-h-screen flex-col">
    <V2Header />
    <V2Dashboard />
    <V2Footer />
  </div>
);

export default AppV2;
```

## Task 4: Add Responsive V2 Dashboard

**Files:**
- Create: `src/components/v2/V2Dashboard.tsx`

- [ ] **Step 1: Implement dashboard using shared stats hook**

Create `src/components/v2/V2Dashboard.tsx`:

```tsx
import React from 'react';
import { Award, CheckCircle2, Clock, FileText, PieChart, TrendingUp } from 'lucide-react';
import { useDashboardStats } from '../../hooks/useDashboardStats';
import V2PageShell from './V2PageShell';
import V2StatCard from './V2StatCard';

const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

const V2Dashboard: React.FC = () => {
  const { stats, loading, error } = useDashboardStats();
  const summaryStats = stats ?? {
    pending: 0,
    approvedCoordinator: 0,
    approvedAdmin: 0,
    documentIssued: 0,
    monthlyData: Array.from({ length: 12 }, (_, index) => ({
      month: index + 1,
      approved: 0,
      pending: 0,
      total: 0,
    })),
    leaveTypeData: { annual: 0, others: 0 },
  };

  const maxMonthly = Math.max(...summaryStats.monthlyData.map((item) => item.total), 1);
  const totalRequests = summaryStats.monthlyData.reduce((sum, item) => sum + item.total, 0);
  const totalApproved = summaryStats.approvedAdmin + summaryStats.documentIssued;
  const leaveTypeTotal = summaryStats.leaveTypeData.annual + summaryStats.leaveTypeData.others;
  const annualPercent = leaveTypeTotal > 0
    ? Math.round((summaryStats.leaveTypeData.annual / leaveTypeTotal) * 100)
    : 0;

  return (
    <V2PageShell
      eyebrow="Dashboard"
      title="Selamat Datang di Si CERDAS"
      description="Sistem Cuti Elektronik Dinas Pendidikan Kabupaten Grobogan dengan tampilan v2 yang lebih rapi dan responsif."
      actions={
        <a
          href="?ui=v1"
          className="inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition-colors duration-200 hover:bg-slate-50"
        >
          Buka Tampilan Lama
        </a>
      }
    >
      <div aria-live="polite">
        {loading && (
          <div className="mb-5 rounded-2xl border border-blue-100 bg-blue-50 p-4 text-sm font-medium text-blue-700">
            Memuat statistik dashboard…
          </div>
        )}
        {error && (
          <div className="mb-5 rounded-2xl border border-rose-100 bg-rose-50 p-4 text-sm font-medium text-rose-700">
            {error}
          </div>
        )}
      </div>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <V2StatCard title="Pengajuan Baru" value={summaryStats.pending} helper="Masuk dan menunggu proses awal." icon={FileText} tone="blue" />
        <V2StatCard title="Menunggu Persetujuan" value={summaryStats.pending} helper="Perlu dicek oleh petugas terkait." icon={Clock} tone="amber" />
        <V2StatCard title="Disetujui Korwil/SMP/SKB" value={summaryStats.approvedCoordinator} helper="Siap untuk keputusan Admin Dinas." icon={CheckCircle2} tone="orange" />
        <V2StatCard title="Disetujui Dinas" value={totalApproved} helper="Termasuk surat cuti yang sudah terbit." icon={Award} tone="emerald" />
      </section>

      <section className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:col-span-2">
          <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-950">Tren Pengajuan Bulanan</h2>
              <p className="text-sm text-slate-500">Grafik responsif dengan scroll di dalam kartu pada layar kecil.</p>
            </div>
            <div className="inline-flex items-center gap-2 rounded-full bg-indigo-50 px-3 py-1 text-sm font-semibold text-indigo-700">
              <TrendingUp className="h-4 w-4" aria-hidden="true" />
              {totalRequests} pengajuan
            </div>
          </div>

          <div className="v2-scrollbar overflow-x-auto pb-2" aria-label="Tren pengajuan bulanan">
            <div className="min-w-[640px]">
              <div className="flex h-64 items-end gap-3 border-b border-l border-slate-200 pl-4">
                {summaryStats.monthlyData.map((item, index) => {
                  const height = Math.max((item.total / maxMonthly) * 100, item.total > 0 ? 8 : 2);
                  return (
                    <div key={item.month} className="flex flex-1 flex-col items-center justify-end gap-2">
                      <span className="text-xs font-bold tabular-nums text-slate-600">{item.total || ''}</span>
                      <div className="flex h-44 w-full items-end justify-center">
                        <div
                          className="w-8 rounded-t-xl bg-gradient-to-t from-indigo-600 to-blue-400 transition-[height,background-color] duration-300"
                          style={{ height: `${height}%` }}
                          title={`${monthNames[index]}: ${item.total} pengajuan`}
                        />
                      </div>
                      <span className="text-xs font-semibold text-slate-500">{monthNames[index]}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </article>

        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-5 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-slate-950">Jenis Cuti</h2>
              <p className="text-sm text-slate-500">Perbandingan cuti tahunan dan lainnya.</p>
            </div>
            <div className="rounded-xl bg-violet-50 p-2 text-violet-700 ring-1 ring-violet-100">
              <PieChart className="h-5 w-5" aria-hidden="true" />
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <div className="mb-2 flex items-center justify-between text-sm">
                <span className="font-semibold text-slate-700">Cuti Tahunan</span>
                <span className="font-bold tabular-nums text-indigo-700">{annualPercent}%</span>
              </div>
              <div className="h-3 rounded-full bg-slate-100">
                <div className="h-3 rounded-full bg-indigo-600" style={{ width: `${annualPercent}%` }} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-slate-50 p-4">
                <p className="text-sm text-slate-500">Tahunan</p>
                <p className="mt-1 text-2xl font-black tabular-nums text-slate-950">{summaryStats.leaveTypeData.annual}</p>
              </div>
              <div className="rounded-xl bg-slate-50 p-4">
                <p className="text-sm text-slate-500">Lainnya</p>
                <p className="mt-1 text-2xl font-black tabular-nums text-slate-950">{summaryStats.leaveTypeData.others}</p>
              </div>
            </div>
          </div>
        </article>
      </section>
    </V2PageShell>
  );
};

export default V2Dashboard;
```

- [ ] **Step 2: Run v2 tests**

Run:

```bash
npm test -- tests/ui-v2-egress.test.mjs
```

Expected: PASS.

## Task 5: Verify Integration and Document Increment

**Files:**
- Modify: `CHANGELOG.md`

- [ ] **Step 1: Update changelog**

Add under `[Unreleased] - 2026-06-11`:

```markdown
- Menambahkan fondasi UI v2 yang dapat dibuka lewat `?ui=v2` tanpa menghapus UI v1.
- Menambahkan fallback eksplisit `?ui=v1`.
- Menambahkan dashboard publik v2 dengan grafik bulanan responsif agar tidak menyebabkan horizontal overflow halaman pada ponsel.
```

- [ ] **Step 2: Run full verification**

Run:

```bash
npm test
npm run build
npm run lint
```

Expected:

- `npm test`: all tests pass.
- `npm run build`: production build succeeds.
- `npm run lint`: no errors. Existing warnings may remain at 30 unless implementation removes some warnings.

- [ ] **Step 3: Browser verification**

With the dev server running at `http://127.0.0.1:5173/`:

- Open `http://127.0.0.1:5173/?ui=v1` and verify the old app loads.
- Open `http://127.0.0.1:5173/?ui=v2` and verify the v2 dashboard loads.
- At viewport `390 x 844`, verify `document.documentElement.scrollWidth <= window.innerWidth` on `?ui=v2`.
- At viewport `1280 x 720`, verify v2 desktop header navigation is visible.

## Self-Review Checklist

- Spec coverage: covers v2 strategy, safe fallback, scoped CSS, dynamic import, public dashboard, mobile overflow baseline, and verification.
- Scope control: admin panels are not migrated in this increment; they remain available through v1.
- Type consistency: `UiVersion` is consistently `'v1' | 'v2'`.
- No business duplication: v2 dashboard uses `useDashboardStats`.
- No Supabase duplication: v2 files do not import `createClient`.
