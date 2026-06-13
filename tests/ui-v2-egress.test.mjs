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
  assert.match(v2DashboardSource, /V2MonthlyTrendChart/);
  assert.match(v2DashboardSource, /monthlyData=\{/);
  assert.doesNotMatch(v2DashboardSource, /min-w-\[640px\]/);
});
