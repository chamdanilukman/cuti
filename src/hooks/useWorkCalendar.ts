import { useState, useEffect, useCallback, useMemo } from 'react';
import { WorkCalendarDay, getDefaultCalendarDays, mergeCalendarDays } from '../utils/workCalendar';
import { db } from '../utils/database';

type WorkCalendarOverride = WorkCalendarDay & {
  isActive: boolean;
};

const CALENDAR_CACHE_PREFIX = 'work_calendar_cache_';
const CALENDAR_CACHE_TTL_MS = 24 * 60 * 60 * 1000;

interface CalendarCache {
  cachedAt: number;
  days: WorkCalendarOverride[];
}

const getCachedCalendar = (year: number): WorkCalendarOverride[] | null => {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(`${CALENDAR_CACHE_PREFIX}${year}`);
    if (!raw) return null;
    const cache = JSON.parse(raw) as CalendarCache;
    if (Date.now() - cache.cachedAt > CALENDAR_CACHE_TTL_MS) {
      localStorage.removeItem(`${CALENDAR_CACHE_PREFIX}${year}`);
      return null;
    }
    return cache.days;
  } catch { return null; }
};

const setCachedCalendar = (year: number, days: WorkCalendarOverride[]) => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(`${CALENDAR_CACHE_PREFIX}${year}`, JSON.stringify({ cachedAt: Date.now(), days }));
  } catch { /* quota exceeded, ignore */ }
};

const getYearRange = (year: number) => ({
  start: `${year}-01-01`,
  end: `${year}-12-31`,
});

export const useWorkCalendar = (year: number) => {
  const [customDays, setCustomDays] = useState<WorkCalendarOverride[]>(() => getCachedCalendar(year) || []);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadCalendar = useCallback(async () => {
    const cached = getCachedCalendar(year);
    if (cached && cached.length > 0) {
      setCustomDays(cached);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const range = getYearRange(year);
      const rows = await db.getWorkCalendarDays(range.start, range.end);
      const mapped = rows.map((row) => ({
        date: row.calendar_date,
        type: row.type,
        description: row.description,
        isActive: row.is_active,
      }));
      setCachedCalendar(year, mapped);
      setCustomDays(mapped);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Gagal memuat kalender kerja';
      setError(message);
      setCustomDays([]);
    } finally {
      setLoading(false);
    }
  }, [year]);

  useEffect(() => {
    loadCalendar();
  }, [loadCalendar]);

  const days = useMemo(() => {
    const inactiveDates = new Set(customDays.filter((day) => !day.isActive).map((day) => day.date));
    const fallbackDays = getDefaultCalendarDays()
      .filter((day) => day.date.startsWith(`${year}-`) && !inactiveDates.has(day.date));
    const activeCustomDays = customDays
      .filter((day) => day.isActive)
      .map(({ isActive: _isActive, ...day }) => day);

    return mergeCalendarDays([...fallbackDays, ...activeCustomDays])
      .filter((day) => day.date.startsWith(`${year}-`));
  }, [customDays, year]);

  return {
    days,
    loading,
    error,
    reload: loadCalendar,
  };
};
