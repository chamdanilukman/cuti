import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const appSource = readFileSync(new URL('../src/AppV1.tsx', import.meta.url), 'utf8');
const formSource = readFileSync(new URL('../src/components/LeaveForm.tsx', import.meta.url), 'utf8');
const databaseSource = readFileSync(new URL('../src/utils/database.ts', import.meta.url), 'utf8');

test('opening the form does not auto-load the full leave request archive', () => {
  assert.doesNotMatch(appSource, /activeSection === 'form'/);
  assert.match(appSource, /currentRole === 'coordinator'/);
});

test('leave form loads validation history by NIP instead of requiring all existing requests', () => {
  assert.match(formSource, /getLeaveRequestsByNIP/);
  assert.match(formSource, /validationRequests/);
  assert.doesNotMatch(formSource, /existingRequests\s*=\s*\[\]/);
});

test('database keeps the NIP-specific query for form validation', () => {
  assert.match(databaseSource, /getLeaveRequestsByNIP/);
  assert.match(databaseSource, /\.eq\('nip', nip\)/);
});

test('leave form does not manually count calendar days for annual quota preview', () => {
  assert.doesNotMatch(formSource, /diffTime\s*=\s*endDate\.getTime\(\)\s*-\s*startDate\.getTime\(\)/);
  assert.doesNotMatch(formSource, /Math\.ceil\(diffTime/);
});

test('leave form uses annual quota helper for preview and validation', () => {
  assert.match(formSource, /calculateAnnualLeaveQuota/);
  assert.match(formSource, /countEffectiveLeaveDays/);
  assert.match(formSource, /isAnnualLeaveType/);
});
