import { LeaveRequest } from '../types';
import {
  WorkCalendarDay,
  countEffectiveLeaveDays,
  expandCalendarDateRange,
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

type LeaveQuotaStatus = LeaveRequest['status'];

export const isAnnualLeaveType = (leaveType?: string): leaveType is AnnualLeaveType => {
  return ANNUAL_LEAVE_TYPES.includes(leaveType as AnnualLeaveType);
};

export const shouldHoldAnnualLeaveQuota = (status: LeaveQuotaStatus): boolean => status !== 'rejected';

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
  const carryOver = [year - 1].map((carryYear) => {
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

  const firstYear = requestYears[0] ?? getYear(newRequest.tanggalMulai);
  const stats = calculateAnnualLeaveQuota(newRequest.nip, firstYear, existingRequests, calendarDays);
  return {
    isValid: true,
    message: `Pengajuan cuti tahunan valid. Sisa kuota tahun ${firstYear}: ${stats.remainingQuota} hari sebelum pengajuan ini.`
  };
};
