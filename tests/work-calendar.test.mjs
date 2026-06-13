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
  assert.deepEqual([...expandCalendarDateRange('2026-03-21', '2026-03-22')], [
    '2026-03-21',
    '2026-03-22'
  ]);
});

test('default calendar contains seed data for 2024, 2025, and 2026', () => {
  const years = new Set(getDefaultCalendarDays().map((day) => day.date.slice(0, 4)));
  assert.deepEqual([...years].sort(), ['2024', '2025', '2026']);
});
