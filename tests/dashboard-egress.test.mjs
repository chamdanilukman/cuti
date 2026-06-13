import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const appSource = readFileSync(new URL('../src/AppV1.tsx', import.meta.url), 'utf8');
const dashboardSource = readFileSync(new URL('../src/components/Dashboard.tsx', import.meta.url), 'utf8');
const hookSource = readFileSync(new URL('../src/hooks/useLeaveRequests.ts', import.meta.url), 'utf8');
const dashboardStatsSource = readFileSync(new URL('../src/hooks/useDashboardStats.ts', import.meta.url), 'utf8');
const databaseSource = readFileSync(new URL('../src/utils/database.ts', import.meta.url), 'utf8');

test('dashboard uses a lightweight stats hook instead of full leave request records', () => {
  assert.match(dashboardSource, /useDashboardStats/);
  assert.doesNotMatch(dashboardSource, /interface DashboardProps[\s\S]*leaveRequests/);
});

test('app does not auto-load the full leave request archive on the dashboard route', () => {
  assert.match(appSource, /shouldLoadFullLeaveRequests/);
  assert.match(appSource, /useLeaveRequests\(\{\s*autoLoad:\s*shouldLoadFullLeaveRequests\s*\}\)/);
  assert.doesNotMatch(appSource, /<Dashboard\s+leaveRequests=\{leaveRequests\}/);
});

test('full leave request loading is explicitly opt-in', () => {
  assert.match(hookSource, /autoLoad\s*=\s*false/);
  assert.match(hookSource, /if\s*\(\s*autoLoad\s*\)/);
});

test('dashboard stats use compact summary rows instead of dozens of count requests', () => {
  assert.match(dashboardStatsSource, /getDashboardSummaryRows/);
  assert.match(dashboardStatsSource, /DASHBOARD_STATS_CACHE_PREFIX/);
  assert.doesNotMatch(dashboardStatsSource, /countLeaveRequests/);
  assert.match(databaseSource, /getDashboardSummaryRows/);
  assert.match(databaseSource, /koordinator_wilayah, jenjang/);
});

test('leave request mutations invalidate cached dashboard stats', () => {
  assert.match(dashboardStatsSource, /export const invalidateDashboardStatsCache/);
  assert.match(hookSource, /invalidateDashboardStatsCache/);
});
