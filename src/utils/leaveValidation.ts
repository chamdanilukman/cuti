import { LeaveRequest } from '../types';
import { WorkCalendarDay } from './workCalendar';
import { calculateAnnualLeaveQuota, validateAnnualLeaveQuota } from './annualLeaveQuota';

// Validation result interface
export interface ValidationResult {
  isValid: boolean;
  message?: string;
}

// Check if user has exceeded annual leave limit (12 days per year)
export const validateAnnualLeaveLimit = (
  newRequest: Omit<LeaveRequest, 'id' | 'submissionDate'>,
  existingRequests: LeaveRequest[],
  calendarDays: WorkCalendarDay[] = []
): ValidationResult => {
  return validateAnnualLeaveQuota(newRequest, existingRequests, calendarDays);
};

// Validate NIP format (18 digits, numbers only, NO spaces)
export const validateNIP = (nip: string): ValidationResult => {
  // Reject if contains any whitespace
  if (/\s/.test(nip)) {
    return {
      isValid: false,
      message: 'NIP tidak boleh mengandung spasi. Contoh yang benar: 198810052020121006'
    };
  }

  // Must be exactly 18 digits, numbers only
  if (!/^\d{18}$/.test(nip)) {
    return {
      isValid: false,
      message: 'NIP harus terdiri dari tepat 18 angka tanpa spasi. Contoh: 198810052020121006'
    };
  }

  return { isValid: true };
};

// Get annual leave statistics for a user
export const getAnnualLeaveStats = (
  nip: string,
  year: number,
  existingRequests: LeaveRequest[],
  calendarDays: WorkCalendarDay[] = []
): {
  totalRequests: number;
  totalDaysUsed: number;
  approvedDaysUsed: number;
  pendingDaysUsed: number;
  rejectedRequests: number;
  remainingQuota: number;
} => {
  const stats = calculateAnnualLeaveQuota(nip, year, existingRequests, calendarDays);

  return {
    totalRequests: stats.totalRequests,
    totalDaysUsed: stats.usedDays,
    approvedDaysUsed: stats.usedDays,
    pendingDaysUsed: 0,
    rejectedRequests: stats.rejectedRequests,
    remainingQuota: stats.remainingQuota
  };
};

// Helper function to check if leave type is sick leave (for special documentation requirements)
export const isSickLeaveType = (leaveType?: string): boolean => {
  return leaveType === 'Cuti Sakit' || leaveType === 'Sakit Lebih 14 Hari';
};

// Helper function to check if leave type is maternity leave (for special duration limits)
export const isMaternityLeave = (leaveType?: string): boolean => {
  return leaveType === 'Cuti Melahirkan';
};

// Validate leave request dates
export const validateLeaveDates = (
  startDate: string,
  endDate: string,
  leaveType?: string
): ValidationResult => {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const today = new Date();

  // Remove time component for date comparison
  today.setHours(0, 0, 0, 0);
  start.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);

  // NEW POLICY: Allow all leave types to be submitted for past dates
  // with reasonable limit (max 30 days ago) to prevent abuse
  const thirtyDaysAgo = new Date(today);
  thirtyDaysAgo.setDate(today.getDate() - 30);

  if (start < thirtyDaysAgo) {
    return {
      isValid: false,
      message: 'Pengajuan cuti tidak dapat diajukan untuk tanggal lebih dari 30 hari yang lalu.'
    };
  }

  // Check if end date is before start date
  if (end < start) {
    return {
      isValid: false,
      message: 'Tanggal selesai cuti tidak boleh sebelum tanggal mulai.'
    };
  }

  // Check if leave duration is reasonable with special rules for different leave types
  const duration = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;

  if (leaveType === 'Cuti Melahirkan' || leaveType === 'Cuti Haji') {
    // Maternity & Hajj leave: maximum 3 months (90 days)
    if (duration > 90) {
      return {
        isValid: false,
        message: leaveType === 'Cuti Haji'
          ? `Cuti haji maksimal 3 bulan (90 hari). Durasi yang dipilih: ${duration} hari.`
          : `Cuti melahirkan maksimal 3 bulan (90 hari). Durasi yang dipilih: ${duration} hari.`
      };
    }
  } else {
    // Other leave types: maximum 30 days
    if (duration > 30) {
      return {
        isValid: false,
        message: 'Durasi cuti tidak boleh lebih dari 30 hari.'
      };
    }
  }

  return { isValid: true };
};

// Validate leave request overlap for the same user
export const validateLeaveOverlap = (
  newRequest: Omit<LeaveRequest, 'id' | 'submissionDate'>,
  existingRequests: LeaveRequest[]
): ValidationResult => {
  const newStart = new Date(newRequest.tanggalMulai);
  const newEnd = new Date(newRequest.tanggalSelesai);

  // Check for overlapping leave requests for the same NIP
  const overlappingRequest = existingRequests.find(request => {
    if (request.nip !== newRequest.nip || request.status === 'rejected') {
      return false;
    }

    const existingStart = new Date(request.tanggalMulai);
    const existingEnd = new Date(request.tanggalSelesai);

    // Check if dates overlap
    return (
      (newStart >= existingStart && newStart <= existingEnd) ||
      (newEnd >= existingStart && newEnd <= existingEnd) ||
      (newStart <= existingStart && newEnd >= existingEnd)
    );
  });

  if (overlappingRequest) {
    return {
      isValid: false,
      message: `Tanggal cuti bertabrakan dengan pengajuan cuti lain (${overlappingRequest.jenisCuti}) pada periode ${new Date(overlappingRequest.tanggalMulai).toLocaleDateString('id-ID')} - ${new Date(overlappingRequest.tanggalSelesai).toLocaleDateString('id-ID')}.`
    };
  }

  return { isValid: true };
};

// Comprehensive leave request validation
export const validateLeaveRequest = (
  newRequest: Omit<LeaveRequest, 'id' | 'submissionDate'>,
  existingRequests: LeaveRequest[],
  calendarDays: WorkCalendarDay[] = []
): ValidationResult => {
  // Validate NIP format
  const nipValidation = validateNIP(newRequest.nip);
  if (!nipValidation.isValid) {
    return nipValidation;
  }

  // Validate dates (pass leave type for special handling)
  const dateValidation = validateLeaveDates(newRequest.tanggalMulai, newRequest.tanggalSelesai, newRequest.jenisCuti);
  if (!dateValidation.isValid) {
    return dateValidation;
  }

  // Validate overlap
  const overlapValidation = validateLeaveOverlap(newRequest, existingRequests);
  if (!overlapValidation.isValid) {
    return overlapValidation;
  }

  // Validate annual leave limit
  const annualLeaveValidation = validateAnnualLeaveLimit(newRequest, existingRequests, calendarDays);
  if (!annualLeaveValidation.isValid) {
    return annualLeaveValidation;
  }

  return {
    isValid: true,
    message: annualLeaveValidation.message || 'Pengajuan cuti valid.'
  };
};

// Get leave type description for validation messages
export const getLeaveTypeDescription = (leaveType: string): string => {
  const descriptions = {
    'Cuti Tahunan': 'Cuti Tahunan',
    'Cuti Sakit': 'Cuti Sakit',
    'Cuti Alasan Penting': 'Cuti Alasan Penting',
    'Cuti Gol. IV Tahunan': 'Cuti Golongan IV Tahunan',
    'Cuti Gol. IV Alasan Penting': 'Cuti Golongan IV Alasan Penting',
    'Cuti Gol. IV Sakit': 'Cuti Golongan IV Sakit',
    'Cuti Melahirkan': 'Cuti Melahirkan',
    'Cuti Umroh': 'Cuti Umroh',
    'Cuti Haji': 'Cuti Haji',
    'Sakit Lebih 14 Hari': 'Sakit Lebih 14 Hari'
  };

  return descriptions[leaveType] || leaveType;
};
