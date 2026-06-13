import { useCallback, useEffect, useMemo, useState } from 'react';
import { LeaveRequest } from '../types';
import { db, LeaveRequestPageFilters, LeaveRequestPageSize } from '../utils/database';
import { transformDBToFrontend } from './useLeaveRequests';

interface UsePagedLeaveRequestsOptions {
  enabled: boolean;
  page: number;
  pageSize: LeaveRequestPageSize;
  filters: LeaveRequestPageFilters;
}

export const usePagedLeaveRequests = ({
  enabled,
  page,
  pageSize,
  filters,
}: UsePagedLeaveRequestsOptions) => {
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { status, searchTerm, dateRange, userRole, userPermissions } = filters;
  const dateRangeStart = dateRange?.start;
  const dateRangeEnd = dateRange?.end;

  const stableFilters = useMemo(() => ({
    status,
    searchTerm,
    dateRange: dateRangeStart || dateRangeEnd
      ? {
          start: dateRangeStart,
          end: dateRangeEnd,
        }
      : undefined,
    userRole,
    userPermissions,
  }), [
    status,
    searchTerm,
    dateRangeStart,
    dateRangeEnd,
    userRole,
    userPermissions,
  ]);

  const loadPage = useCallback(async () => {
    if (!enabled) {
      setLeaveRequests([]);
      setTotalCount(0);
      setLoading(false);
      setError(null);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const result = await db.getLeaveRequestsPage({
        page,
        pageSize,
        filters: stableFilters,
      });

      setLeaveRequests(result.data.map(transformDBToFrontend));
      setTotalCount(result.count);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memuat data pengajuan');
    } finally {
      setLoading(false);
    }
  }, [enabled, page, pageSize, stableFilters]);

  useEffect(() => {
    loadPage();
  }, [loadPage]);

  return {
    leaveRequests,
    totalCount,
    loading,
    error,
    refetch: loadPage,
  };
};

export type { LeaveRequestPageSize };
