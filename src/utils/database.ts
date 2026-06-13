import { createClient } from '@supabase/supabase-js';

// Database utility functions for leave requests and admin users
export interface LeaveRequestDB {
  id: string;
  nama: string;
  nip: string;
  pangkat_golongan: string;
  jabatan: string;
  koordinator_wilayah: string;
  jenjang: string;
  sekolah: string;
  jenis_cuti: string;
  tanggal_mulai: string;
  tanggal_selesai: string;
  alasan_cuti: string;
  files: string; // JSON string
  status: 'pending' | 'approved_coordinator' | 'approved_admin' | 'rejected' | 'document_issued';
  rejection_reason: string;
  submission_date: string;
  drive_link?: string; // Google Drive link for approved documents (deprecated - use final_letter_url)
  final_letter_url?: string; // cPanel hosted final letter PDF URL
  coordinator_approval_date?: string; // Date when coordinator approved
  admin_approval_date?: string; // Date when admin approved
  is_revised?: boolean; // Flag to indicate if this is a revised/corrected request
  original_rejection_reason?: string; // Original rejection reason before revision
  created_at: string;
  updated_at: string;
}

export type LeaveRequestPageSize = 25 | 50 | 100 | 500 | 'all';

export interface LeaveRequestPageFilters {
  status?: 'all' | LeaveRequestDB['status'];
  searchTerm?: string;
  dateRange?: {
    start?: string;
    end?: string;
  };
  userRole?: string;
  userPermissions?: any;
}

export interface LeaveRequestsPageResult {
  data: LeaveRequestDB[];
  count: number;
}

export interface DashboardSummaryRow {
  status: LeaveRequestDB['status'];
  jenis_cuti: string;
  tanggal_mulai: string;
  koordinator_wilayah: string;
  jenjang: string;
}

export interface RecentActivityRow {
  nama: string;
  jenis_cuti: string;
  status: string;
  created_at: string;
}

export interface WorkCalendarDayDB {
  id: string;
  calendar_date: string;
  type: 'national_holiday' | 'joint_leave';
  description: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// Initialize Supabase client
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY');
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Export supabase client for use in other modules
export { supabase };

// Database operations
export const db = {
  async getDashboardSummaryRows(year?: number): Promise<DashboardSummaryRow[]> {
    try {
      const pageSize = 1000;
      const columns = 'status, jenis_cuti, tanggal_mulai, koordinator_wilayah, jenjang';

      let baseQuery = supabase
        .from('leave_requests')
        .select(columns, { count: 'exact' });

      if (year) {
        baseQuery = baseQuery
          .gte('tanggal_mulai', `${year}-01-01`)
          .lte('tanggal_mulai', `${year}-12-31`);
      }

      const firstPage = await baseQuery.range(0, pageSize - 1);

      if (firstPage.error) {
        console.error('Supabase error in getDashboardSummaryRows:', firstPage.error);
        throw new Error(`Database error: ${firstPage.error.message}`);
      }

      const totalCount = firstPage.count ?? firstPage.data?.length ?? 0;
      const totalPages = Math.ceil(totalCount / pageSize);
      const remainingPageRequests = Array.from({ length: Math.max(totalPages - 1, 0) }, (_, index) => {
        const page = index + 1;
        const from = page * pageSize;

        let query = supabase
          .from('leave_requests')
          .select(columns);

        if (year) {
          query = query
            .gte('tanggal_mulai', `${year}-01-01`)
            .lte('tanggal_mulai', `${year}-12-31`);
        }

        return query.range(from, from + pageSize - 1);
      });

      const remainingPages = await Promise.all(remainingPageRequests);

      for (const page of remainingPages) {
        if (page.error) {
          console.error('Supabase error in getDashboardSummaryRows:', page.error);
          throw new Error(`Database error: ${page.error.message}`);
        }
      }

      return [
        ...(firstPage.data || []),
        ...remainingPages.flatMap(page => page.data || []),
      ];
    } catch (error) {
      console.error('Error fetching dashboard summary rows:', error);
      throw error;
    }
  },

  async getRecentActivity(limit = 5): Promise<RecentActivityRow[]> {
    try {
      const { data, error } = await supabase
        .from('leave_requests')
        .select('nama, jenis_cuti, status, created_at')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('Supabase error in getRecentActivity:', error);
        throw new Error(`Database error: ${error.message}`);
      }

      return data || [];
    } catch (error) {
      console.error('Error fetching recent activity:', error);
      throw error;
    }
  },

  async getLeaveRequestsPage(params: {
    page: number;
    pageSize: LeaveRequestPageSize;
    filters?: LeaveRequestPageFilters;
  }): Promise<LeaveRequestsPageResult> {
    try {
      const { page, pageSize, filters } = params;
      const columns = 'id, nama, nip, pangkat_golongan, jabatan, koordinator_wilayah, jenjang, sekolah, jenis_cuti, tanggal_mulai, tanggal_selesai, alasan_cuti, files, status, rejection_reason, submission_date, coordinator_approval_date, admin_approval_date, is_revised, original_rejection_reason, created_at, updated_at';
      let query = supabase
        .from('leave_requests')
        .select(columns, { count: 'estimated' })
        .order('created_at', { ascending: false });

      if (filters?.userRole === 'korwil' && filters.userPermissions) {
        const allowedKecamatan = filters.userPermissions.kecamatanAccess || filters.userPermissions.kecamatan || [];
        const allowedJenjang = filters.userPermissions.jenjangAccess || [];

        if (allowedKecamatan.length > 0) {
          query = query.in('koordinator_wilayah', allowedKecamatan);
        }

        if (allowedJenjang.length > 0) {
          query = query.in('jenjang', allowedJenjang);
        }
      }

      if (filters?.userRole === 'smp_admin' && filters.userPermissions) {
        const allowedSekolah = filters.userPermissions.schoolAccess || filters.userPermissions.sekolah || [];
        let allowedJenjang = filters.userPermissions.jenjangAccess || [];

        // SKB requests are stored with jenjang='SMP' in the database,
        // but SKB admins have jenjangAccess=['SKB']. Add 'SMP' so they match.
        if (allowedJenjang.includes('SKB') && !allowedJenjang.includes('SMP')) {
          allowedJenjang = [...allowedJenjang, 'SMP'];
        }

        if (allowedSekolah.length > 0) {
          query = query.in('sekolah', allowedSekolah);
        }

        if (allowedJenjang.length > 0) {
          query = query.in('jenjang', allowedJenjang);
        }
      }

      if (filters?.status && filters.status !== 'all') {
        query = query.eq('status', filters.status);
      }

      if (filters?.searchTerm?.trim()) {
        const term = filters.searchTerm.trim().replace(/[%_,]/g, '');
        query = query.or(
          `nama.ilike.%${term}%,sekolah.ilike.%${term}%,koordinator_wilayah.ilike.%${term}%,jenis_cuti.ilike.%${term}%`
        );
      }

      if (filters?.dateRange?.start && filters?.dateRange?.end) {
        query = query
          .gte('submission_date', filters.dateRange.start)
          .lte('submission_date', filters.dateRange.end);
      }

      if (pageSize !== 'all') {
        const from = (page - 1) * pageSize;
        const to = from + pageSize - 1;
        query = query.range(from, to);
      }

      const { data, error, count } = await query;

      if (error) {
        console.error('Supabase error in getLeaveRequestsPage:', error);
        throw new Error(`Database error: ${error.message}`);
      }

      return {
        data: data || [],
        count: count ?? 0,
      };
    } catch (error) {
      console.error('Error fetching leave request page:', error);
      throw error;
    }
  },

  // Get counts by status — used for dashboard stats that should be independent of visible filter
  async getLeaveRequestsCounts(filters?: LeaveRequestPageFilters): Promise<Record<string, number>> {
    try {
      const buildBase = () => {
        let q = supabase.from('leave_requests').select('*', { count: 'exact', head: true });

        if (filters?.userRole === 'korwil' && filters.userPermissions) {
          const allowedKecamatan = filters.userPermissions.kecamatanAccess || filters.userPermissions.kecamatan || [];
          const allowedJenjang = filters.userPermissions.jenjangAccess || [];
          if (allowedKecamatan.length > 0) q = q.in('koordinator_wilayah', allowedKecamatan);
          if (allowedJenjang.length > 0) q = q.in('jenjang', allowedJenjang);
        }
        if (filters?.userRole === 'smp_admin' && filters.userPermissions) {
          const allowedSekolah = filters.userPermissions.schoolAccess || filters.userPermissions.sekolah || [];
          let allowedJenjang = filters.userPermissions.jenjangAccess || [];
          if (allowedJenjang.includes('SKB') && !allowedJenjang.includes('SMP')) {
            allowedJenjang = [...allowedJenjang, 'SMP'];
          }
          if (allowedSekolah.length > 0) q = q.in('sekolah', allowedSekolah);
          if (allowedJenjang.length > 0) q = q.in('jenjang', allowedJenjang);
        }
        return q;
      };

      const { count: total } = await buildBase();

      const statuses = ['pending', 'approved_coordinator', 'approved_admin', 'document_issued', 'rejected'] as const;
      const counts = await Promise.all(
        statuses.map(s => buildBase().eq('status', s).then(r => r.count))
      );

      return {
        total: total ?? 0,
        pending: counts[0] ?? 0,
        approved_coordinator: counts[1] ?? 0,
        approved_admin: counts[2] ?? 0,
        document_issued: counts[3] ?? 0,
        rejected: counts[4] ?? 0,
      };
    } catch (error) {
      console.error('Error fetching leave request counts:', error);
      return { total: 0, pending: 0, approved_coordinator: 0, approved_admin: 0, document_issued: 0, rejected: 0 };
    }
  },

  // Get all leave requests with pagination to bypass Supabase 1000 row limit
  async getAllLeaveRequests(): Promise<LeaveRequestDB[]> {
    try {
      let allData: LeaveRequestDB[] = [];
      let from = 0;
      const pageSize = 1000;
      let hasMore = true;

      while (hasMore) {
        const columns = 'id, nama, nip, pangkat_golongan, jabatan, koordinator_wilayah, jenjang, sekolah, jenis_cuti, tanggal_mulai, tanggal_selesai, alasan_cuti, files, status, rejection_reason, submission_date, coordinator_approval_date, admin_approval_date, is_revised, original_rejection_reason, created_at, updated_at';
        const { data, error } = await supabase
          .from('leave_requests')
          .select(columns)
          .order('created_at', { ascending: false })
          .range(from, from + pageSize - 1);

        if (error) {
          console.error('Supabase error in getAllLeaveRequests:', error);
          throw new Error(`Database error: ${error.message}`);
        }

        if (data && data.length > 0) {
          allData = [...allData, ...data];
          from += pageSize;
          hasMore = data.length === pageSize;
        } else {
          hasMore = false;
        }
      }
      return allData;
    } catch (error) {
      console.error('Error fetching leave requests:', error);
      throw error;
    }
  },

  // Create new leave request
  async createLeaveRequest(request: Omit<LeaveRequestDB, 'id' | 'created_at' | 'updated_at'>): Promise<LeaveRequestDB | null> {
    try {
      // Generate a unique ID
      const id = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      const requestWithId = {
        ...request,
        id
      };

      const { data, error } = await supabase
        .from('leave_requests')
        .insert([requestWithId])
        .select()
        .single();

      if (error) {
        console.error('Supabase error in createLeaveRequest:', error);
        throw new Error(`Database error: ${error.message}`);
      }

      return data;
    } catch (error) {
      console.error('Error creating leave request:', error);
      throw error;
    }
  },

  // Update leave request
  async updateLeaveRequest(id: string, updates: Partial<LeaveRequestDB>): Promise<LeaveRequestDB | null> {
    try {
      // First check if the record exists
      const { data: existingRecord, error: checkError } = await supabase
        .from('leave_requests')
        .select('id')
        .eq('id', id)
        .single();

      if (checkError) {
        console.error('Record not found:', checkError);
        throw new Error(`Record with id ${id} not found`);
      }

      // Now update the record
      const { data, error } = await supabase
        .from('leave_requests')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Supabase error in updateLeaveRequest:', error);
        throw new Error(`Database error: ${error.message}`);
      }

      return data;
    } catch (error) {
      console.error('Error updating leave request:', error);
      throw error;
    }
  },

  // Get leave requests by NIP
  async getLeaveRequestsByNIP(nip: string): Promise<LeaveRequestDB[]> {
    try {
      const { data, error } = await supabase
        .from('leave_requests')
        .select('*')
        .eq('nip', nip)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Supabase error in getLeaveRequestsByNIP:', error);
        throw new Error(`Database error: ${error.message}`);
      }

      return data || [];
    } catch (error) {
      console.error('Error fetching leave requests by NIP:', error);
      throw error;
    }
  },

  async getWorkCalendarDays(startDate: string, endDate: string): Promise<WorkCalendarDayDB[]> {
    try {
      const { data, error } = await supabase.rpc('get_work_calendar_days', {
        p_start: startDate,
        p_end: endDate
      });

      if (error) {
        console.error('Supabase error in getWorkCalendarDays:', error);
        throw new Error(`Database error: ${error.message}`);
      }

      return data || [];
    } catch (error) {
      console.error('Error fetching work calendar days:', error);
      throw error;
    }
  },

  async upsertWorkCalendarDay(params: {
    adminUserId: string;
    date: string;
    type: WorkCalendarDayDB['type'];
    description: string;
  }): Promise<WorkCalendarDayDB | null> {
    try {
      const { data, error } = await supabase.rpc('upsert_work_calendar_day', {
        p_admin_user_id: params.adminUserId,
        p_calendar_date: params.date,
        p_type: params.type,
        p_description: params.description
      });

      if (error) {
        console.error('Supabase error in upsertWorkCalendarDay:', error);
        throw new Error(`Database error: ${error.message}`);
      }

      return data;
    } catch (error) {
      console.error('Error saving work calendar day:', error);
      throw error;
    }
  },

  async deleteWorkCalendarDay(adminUserId: string, date: string): Promise<boolean> {
    try {
      const { error } = await supabase.rpc('delete_work_calendar_day', {
        p_admin_user_id: adminUserId,
        p_calendar_date: date
      });

      if (error) {
        console.error('Supabase error in deleteWorkCalendarDay:', error);
        throw new Error(`Database error: ${error.message}`);
      }

      return true;
    } catch (error) {
      console.error('Error deleting work calendar day:', error);
      throw error;
    }
  },

  // Delete leave request (if needed)
  async deleteLeaveRequest(id: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('leave_requests')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Supabase error in deleteLeaveRequest:', error);
        throw new Error(`Database error: ${error.message}`);
      }

      return true;
    } catch (error) {
      console.error('Error deleting leave request:', error);
      throw error;
    }
  }
};
