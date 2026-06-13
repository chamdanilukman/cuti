import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const appSource = readFileSync(new URL('../src/AppV1.tsx', import.meta.url), 'utf8');
const rolePageSource = readFileSync(new URL('../src/components/RolePage.tsx', import.meta.url), 'utf8');
const adminPanelSource = readFileSync(new URL('../src/components/EnhancedAdminPanel.tsx', import.meta.url), 'utf8');
const databaseSource = readFileSync(new URL('../src/utils/database.ts', import.meta.url), 'utf8');
const authHookSource = readFileSync(new URL('../src/hooks/useAdminAuth.ts', import.meta.url), 'utf8');
const pagedHookSource = readFileSync(new URL('../src/hooks/usePagedLeaveRequests.ts', import.meta.url), 'utf8');

test('role page does not auto-load the full leave request archive', () => {
  assert.match(appSource, /currentRole === 'coordinator'/);
  assert.doesNotMatch(appSource, /currentRole === 'admin'/);
  assert.doesNotMatch(appSource, /activeSection === 'form'/);
});

test('restored admin sessions mark the parent role page as logged in', () => {
  assert.match(rolePageSource, /Sync role after refresh based on authenticated user/);
  assert.match(rolePageSource, /if\s*\(\s*isAuthenticated\s*&&\s*user\s*\)\s*\{[\s\S]*setIsAdminLoggedIn\(true\)/);
});

test('admin auth permission summary callback only depends on the active user object', () => {
  const summaryCallback = authHookSource.match(/const getPermissionsSummary = useCallback\(\(\): string => \{[\s\S]*?\n\s{2}\}, \[authState\.user\]\);/)?.[0] || '';

  assert.match(summaryCallback, /const user = authState\.user;/);
  assert.doesNotMatch(summaryCallback, /const \{ user \} = authState;/);
});

test('paged leave request filters are memoized from explicit filter fields', () => {
  assert.match(pagedHookSource, /const stableFilters = useMemo\(\(\) => \(\{/);
  assert.doesNotMatch(pagedHookSource, /const stableFilters = useMemo\(\(\) => filters,/);
});

test('admin dinas panel uses server-side pagination data', () => {
  assert.match(adminPanelSource, /usePagedLeaveRequests/);
  assert.match(adminPanelSource, /isServerPaged/);
  assert.match(adminPanelSource, /serverTotalCount/);
  assert.match(adminPanelSource, /itemsPerPage === 'all'/);
});

test('admin page size options are 25, 50, 100, 500, and all', () => {
  assert.match(adminPanelSource, /<option value=\{25\}>25 per halaman<\/option>/);
  assert.match(adminPanelSource, /<option value=\{50\}>50 per halaman<\/option>/);
  assert.match(adminPanelSource, /<option value=\{100\}>100 per halaman<\/option>/);
  assert.match(adminPanelSource, /<option value=\{500\}>500 per halaman<\/option>/);
  assert.match(adminPanelSource, /<option value="all">Semua<\/option>/);
  assert.doesNotMatch(adminPanelSource, /<option value=\{200\}>200 per halaman<\/option>/);
});

test('database exposes a paged leave request query with count and range', () => {
  assert.match(databaseSource, /getLeaveRequestsPage/);
  assert.match(databaseSource, /select\('\*', \{ count: 'exact'/);
  assert.match(databaseSource, /\.range\(from, to\)/);
});

test('admin dinas refetches the current server page after approval actions', () => {
  assert.match(adminPanelSource, /handleApproveRequest/);
  assert.match(adminPanelSource, /await onApprove\(requestId, 'admin'\)/);
  assert.match(adminPanelSource, /await refetchServerPage\(\)/);
  assert.doesNotMatch(adminPanelSource, /onClick=\{\(\) => onApprove\(request\.id, 'admin'\)\}/);
});

test('admin dinas refetches the current server page after rejection actions', () => {
  assert.match(adminPanelSource, /handleRejectConfirm/);
  assert.match(adminPanelSource, /await onReject\(rejectionModal\.requestId, 'admin', reason\)/);
  assert.match(adminPanelSource, /await refetchServerPage\(\)/);
});
