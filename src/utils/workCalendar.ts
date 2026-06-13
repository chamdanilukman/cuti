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
  return match ? match[0] : value;
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
  for (const day of DEFAULT_CALENDAR_DAYS) {
    byDate.set(day.date, day);
  }
  for (const day of customDays) {
    const date = normalizeDateString(day.date);
    byDate.set(date, { date, type: day.type, description: day.description });
  }
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
