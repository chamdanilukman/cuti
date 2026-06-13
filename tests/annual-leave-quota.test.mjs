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

const { validateLeaveRequest } = loadTsModule('src/utils/leaveValidation.ts');

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
  assert.deepEqual([...ANNUAL_LEAVE_TYPES], ['Cuti Tahunan', 'Cuti Gol. IV Tahunan']);
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
  assert.deepEqual(Array.from(quota.carryOver, (item) => ({ ...item })), [
    { year: 2025, remainingBeforeCap: 2, carriedDays: 2 }
  ]);
  assert.equal(quota.availableQuota, 14);
  assert.equal(quota.usedDays, 0);
  assert.equal(quota.remainingQuota, 14);
});

test('caps maximum annual leave quota at 18 days', () => {
  const quota = calculateAnnualLeaveQuota(base.nip, 2026, []);

  assert.deepEqual(Array.from(quota.carryOver, (item) => ({ ...item })), [
    { year: 2025, remainingBeforeCap: 12, carriedDays: 6 }
  ]);
  assert.equal(quota.availableQuota, 18);
});

test('counts document issued requests and ignores rejected requests', () => {
  const requests = [
    request({ id: 'issued', tanggalMulai: '2026-06-08', tanggalSelesai: '2026-06-13', status: 'document_issued' }),
    request({ id: 'rejected', tanggalMulai: '2026-07-01', tanggalSelesai: '2026-07-06', status: 'rejected' })
  ];

  const quota = calculateAnnualLeaveQuota(base.nip, 2026, requests);

  assert.equal(quota.usedDays, 6);
  assert.equal(quota.remainingQuota, 12);
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

  assert.deepEqual({ ...getAnnualLeaveUsageByYear(base.nip, requests) }, {
    2025: 3,
    2026: 2
  });
});

test('validateLeaveRequest rejects annual leave that only contains non-effective days', () => {
  const result = validateLeaveRequest(
    request({
      tanggalMulai: '2026-12-24',
      tanggalSelesai: '2026-12-25',
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
