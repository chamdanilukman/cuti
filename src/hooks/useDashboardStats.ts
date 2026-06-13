import { useEffect, useState } from 'react';
import { db, DashboardSummaryRow } from '../utils/database';
import { supabase } from '../utils/database';

export interface MonthlyDashboardStat {
  month: number;
  approved: number;
  pending: number;
  total: number;
}

export interface LeaveTypeDashboardStat {
  annual: number;
  others: number;
}

export interface DistrictStat {
  district: string;
  count: number;
}

export interface JenjangStat {
  jenjang: string;
  count: number;
}

export interface DetailedLeaveType {
  type: string;
  count: number;
}

export interface DashboardStats {
  pending: number;
  approvedCoordinator: number;
  approvedAdmin: number;
  documentIssued: number;
  rejected: number;
  monthlyData: MonthlyDashboardStat[];
  leaveTypeData: LeaveTypeDashboardStat;
  districtData: DistrictStat[];
  jenjangData: JenjangStat[];
  detailedLeaveTypes: DetailedLeaveType[];
}

export interface RecentActivityItem {
  nama: string;
  jenisCuti: string;
  status: string;
  createdAt: string;
}

const DASHBOARD_STATS_CACHE_PREFIX = 'dashboard_stats_cache_v2';
const DASHBOARD_STATS_CACHE_TTL_MS = 120 * 60 * 1000;
const RECENT_ACTIVITY_CACHE_KEY = 'recent_activity_cache_v1';

interface DashboardStatsCache {
  cachedAt: number;
  year: number;
  stats: DashboardStats;
}

interface RecentActivityCache {
  cachedAt: number;
  activities: RecentActivityItem[];
}

const isAnnualLeave = (leaveType: string) => {
  const normalized = leaveType.toLowerCase();
  return (
    normalized.includes('tahunan') ||
    normalized.includes('annual') ||
    normalized.includes('libur') ||
    normalized.includes('cuti regular')
  );
};

const classifyLeaveTypeDetail = (leaveType: string): string => {
  const normalized = leaveType.toLowerCase();
  if (normalized.includes('tahunan') || normalized.includes('annual')) return 'Cuti Tahunan';
  if (normalized.includes('sakit')) return 'Cuti Sakit';
  if (normalized.includes('alasan penting')) return 'Cuti Alasan Penting';
  if (normalized.includes('melahirkan') || normalized.includes('bersalin')) return 'Cuti Melahirkan';
  if (normalized.includes('besar')) return 'Cuti Besar';
  if (normalized.includes('haji')) return 'Cuti Haji';
  if (normalized.includes('umroh') || normalized.includes('umrah')) return 'Cuti Umroh';
  return 'Lainnya';
};

const getCacheKey = (year: number) => `${DASHBOARD_STATS_CACHE_PREFIX}_${year}`;

const getCachedDashboardStats = (year: number): DashboardStats | null => {
  if (typeof window === 'undefined') return null;

  const cachedValue = window.localStorage.getItem(getCacheKey(year));
  if (!cachedValue) return null;

  try {
    const cache = JSON.parse(cachedValue) as DashboardStatsCache;
    if (Date.now() - cache.cachedAt > DASHBOARD_STATS_CACHE_TTL_MS) {
      window.localStorage.removeItem(getCacheKey(year));
      return null;
    }
    return cache.stats;
  } catch {
    window.localStorage.removeItem(getCacheKey(year));
    return null;
  }
};

const setCachedDashboardStats = (year: number, stats: DashboardStats) => {
  if (typeof window === 'undefined') return;
  const cache: DashboardStatsCache = { cachedAt: Date.now(), year, stats };
  window.localStorage.setItem(getCacheKey(year), JSON.stringify(cache));
};

const getCachedRecentActivity = (): RecentActivityItem[] | null => {
  if (typeof window === 'undefined') return null;

  const cachedValue = window.localStorage.getItem(RECENT_ACTIVITY_CACHE_KEY);
  if (!cachedValue) return null;

  try {
    const cache = JSON.parse(cachedValue) as RecentActivityCache;
    if (Date.now() - cache.cachedAt > DASHBOARD_STATS_CACHE_TTL_MS) {
      window.localStorage.removeItem(RECENT_ACTIVITY_CACHE_KEY);
      return null;
    }
    return cache.activities;
  } catch {
    window.localStorage.removeItem(RECENT_ACTIVITY_CACHE_KEY);
    return null;
  }
};

const setCachedRecentActivity = (activities: RecentActivityItem[]) => {
  if (typeof window === 'undefined') return;
  const cache: RecentActivityCache = { cachedAt: Date.now(), activities };
  window.localStorage.setItem(RECENT_ACTIVITY_CACHE_KEY, JSON.stringify(cache));
};

export const invalidateDashboardStatsCache = () => {
  if (typeof window === 'undefined') return;
  for (let i = 0; i < window.localStorage.length; i++) {
    const key = window.localStorage.key(i);
    if (key?.startsWith(DASHBOARD_STATS_CACHE_PREFIX)) {
      window.localStorage.removeItem(key);
    }
  }
  window.sessionStorage.removeItem(RECENT_ACTIVITY_CACHE_KEY);
};

const buildDashboardStats = (rows: DashboardSummaryRow[], year: number): DashboardStats => {
  const monthlyData: MonthlyDashboardStat[] = Array.from({ length: 12 }, (_, index) => ({
    month: index + 1,
    approved: 0,
    pending: 0,
    total: 0,
  }));

  const districtMap = new Map<string, number>();
  const jenjangMap = new Map<string, number>();
  const leaveTypeDetailMap = new Map<string, number>();

  const stats: DashboardStats = {
    pending: 0,
    approvedCoordinator: 0,
    approvedAdmin: 0,
    documentIssued: 0,
    rejected: 0,
    monthlyData,
    leaveTypeData: { annual: 0, others: 0 },
    districtData: [],
    jenjangData: [],
    detailedLeaveTypes: [],
  };

  rows.forEach(row => {
    if (row.status === 'pending') {
      stats.pending += 1;
    } else if (row.status === 'approved_coordinator') {
      stats.approvedCoordinator += 1;
    } else if (row.status === 'approved_admin') {
      stats.approvedAdmin += 1;
    } else if (row.status === 'document_issued') {
      stats.documentIssued += 1;
    } else if (row.status === 'rejected') {
      stats.rejected += 1;
    }

    if (isAnnualLeave(row.jenis_cuti || '')) {
      stats.leaveTypeData.annual += 1;
    } else {
      stats.leaveTypeData.others += 1;
    }

    const detailType = classifyLeaveTypeDetail(row.jenis_cuti || '');
    leaveTypeDetailMap.set(detailType, (leaveTypeDetailMap.get(detailType) || 0) + 1);

    const district = row.koordinator_wilayah?.trim();
    if (district) {
      districtMap.set(district, (districtMap.get(district) || 0) + 1);
    }

    const jenjang = row.jenjang?.trim();
    if (jenjang) {
      jenjangMap.set(jenjang, (jenjangMap.get(jenjang) || 0) + 1);
    }

    if (!row.tanggal_mulai) return;

    const startDate = new Date(`${row.tanggal_mulai}T00:00:00`);
    if (Number.isNaN(startDate.getTime()) || startDate.getFullYear() !== year) return;

    const monthStat = monthlyData[startDate.getMonth()];
    monthStat.total += 1;

    if (row.status === 'pending') {
      monthStat.pending += 1;
    } else if (row.status === 'approved_admin' || row.status === 'approved_coordinator') {
      monthStat.approved += 1;
    }
  });

  stats.districtData = Array.from(districtMap.entries())
    .map(([district, count]) => ({ district, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);

  const jenjangOrder = ['TK', 'SD', 'SMP', 'SKB'];
  stats.jenjangData = jenjangOrder
    .map(j => ({ jenjang: j, count: jenjangMap.get(j) || 0 }))
    .filter(j => j.count > 0 || jenjangOrder.includes(j.jenjang));

  const leaveTypeOrder = [
    'Cuti Tahunan', 'Cuti Sakit', 'Cuti Alasan Penting',
    'Cuti Melahirkan', 'Cuti Besar', 'Cuti Haji', 'Cuti Umroh', 'Lainnya',
  ];
  stats.detailedLeaveTypes = leaveTypeOrder
    .map(type => ({ type, count: leaveTypeDetailMap.get(type) || 0 }))
    .filter(lt => lt.count > 0);

  return stats;
};

const loadDashboardStats = async (year: number): Promise<DashboardStats> => {
  const cachedStats = getCachedDashboardStats(year);
  if (cachedStats) return cachedStats;

  try {
    const { data, error } = await supabase.rpc('get_dashboard_stats', { p_year: year });
    if (error) throw new Error(`RPC error: ${error.message}`);

    const r = data as any;
    const monthlyRaw: Array<{month: number; approved: number; pending: number; total: number}> = r.monthly_data || [];
    const monthlyData: MonthlyDashboardStat[] = Array.from({ length: 12 }, (_, i) => {
      const found = monthlyRaw.find((m: any) => m.month === i + 1);
      return found ? { ...found } : { month: i + 1, approved: 0, pending: 0, total: 0 };
    });

    const stats: DashboardStats = {
      pending: r.pending || 0,
      approvedCoordinator: r.approved_coordinator || 0,
      approvedAdmin: r.approved_admin || 0,
      documentIssued: r.document_issued || 0,
      rejected: r.rejected || 0,
      monthlyData,
      leaveTypeData: { annual: 0, others: 0 },
      districtData: (r.district_data || []).map((d: any) => ({ district: d.district, count: d.count })),
      jenjangData: (r.jenjang_data || []).map((j: any) => ({ jenjang: j.jenjang, count: j.count })),
      detailedLeaveTypes: (r.detailed_leave_types || []).map((t: any) => ({ type: t.type, count: t.count })),
    };

    setCachedDashboardStats(year, stats);
    return stats;
  } catch {
    // Fallback to client-side aggregation if RPC not deployed yet
    const rows = await db.getDashboardSummaryRows(year);
    const stats = buildDashboardStats(rows, year);
    setCachedDashboardStats(year, stats);
    return stats;
  }
};

const loadRecentActivity = async (): Promise<RecentActivityItem[]> => {
  const cached = getCachedRecentActivity();
  if (cached) return cached;

  const rows = await db.getRecentActivity(5);
  const activities: RecentActivityItem[] = rows.map(row => ({
    nama: row.nama,
    jenisCuti: row.jenis_cuti,
    status: row.status,
    createdAt: row.created_at,
  }));

  setCachedRecentActivity(activities);
  return activities;
};

export const useDashboardStats = (year?: number) => {
  const selectedYear = year ?? new Date().getFullYear();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentActivity, setRecentActivity] = useState<RecentActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const load = async () => {
      try {
        setLoading(true);
        setError(null);

        const [dashboardStats, activity] = await Promise.all([
          loadDashboardStats(selectedYear),
          loadRecentActivity(),
        ]);

        if (isMounted) {
          setStats(dashboardStats);
          setRecentActivity(activity);
        }
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : 'Gagal memuat statistik dashboard');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    load();

    return () => {
      isMounted = false;
    };
  }, [selectedYear]);

  return { stats, recentActivity, loading, error };
};
