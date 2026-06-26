import { createClient } from "@supabase/supabase-js";
import { authStorage } from "./adminAuth";

// Database utility functions for leave requests and admin users
export interface DashboardSummaryRow {
  status: LeaveRequestDB["status"];
  jenis_cuti: string;
  tanggal_mulai: string;
  koordinator_wilayah: string;
  jenjang: string;
}

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
  status:
    | "pending"
    | "approved_coordinator"
    | "approved_admin"
    | "rejected"
    | "document_issued";
  rejection_reason: string;
  submission_date: string;
  drive_link?: string;
  final_letter_url?: string;
  coordinator_approval_date?: string;
  admin_approval_date?: string;
  is_revised?: boolean;
  original_rejection_reason?: string;
  created_at: string;
  updated_at: string;
}

export type LeaveRequestPageSize = 25 | 50 | 100 | 500 | "all";

export interface LeaveRequestPageFilters {
  status?: "all" | LeaveRequestDB["status"];
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

export interface RecentActivityRow {
  nama: string;
  jenis_cuti: string;
  status: string;
  created_at: string;
}

export interface WorkCalendarDayDB {
  id: string;
  calendar_date: string;
  type: "national_holiday" | "joint_leave";
  description: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// Initialize Supabase client
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "Missing Supabase environment variables. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY",
  );
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Export supabase client for use in other modules
export { supabase };

// CATATAN KEAMANAN:
// Semua operasi leave_requests via RPC security definer (migration 0005).
// Tidak ada akses langsung ke tabel dari client — ANON_KEY tidak bisa
// SELECT/INSERT/UPDATE/DELETE langsung ke leave_requests.

// Database operations
export const db = {
  // ===== PUBLIC (no session needed) =====

  // Submit leave request from public form — INSERT only, status forced 'pending'
  async createLeaveRequest(
    request: Omit<LeaveRequestDB, "id" | "created_at" | "updated_at">,
  ): Promise<LeaveRequestDB | null> {
    try {
      const { data, error } = await supabase.rpc("submit_leave_request", {
        p_data: {
          nama: request.nama,
          nip: request.nip,
          pangkat_golongan: request.pangkat_golongan,
          jabatan: request.jabatan,
          koordinator_wilayah: request.koordinator_wilayah,
          jenjang: request.jenjang,
          sekolah: request.sekolah,
          jenis_cuti: request.jenis_cuti,
          tanggal_mulai: request.tanggal_mulai,
          tanggal_selesai: request.tanggal_selesai,
          alasan_cuti: request.alasan_cuti,
          files: (() => {
            try {
              return typeof request.files === "string"
                ? JSON.parse(request.files)
                : request.files;
            } catch {
              return [];
            }
          })(),
          submission_date: request.submission_date,
        },
      });

      if (error) {
        console.error("Supabase error in createLeaveRequest:", error);
        throw new Error(`Database error: ${error.message}`);
      }

      return data as LeaveRequestDB;
    } catch (error) {
      console.error("Error creating leave request:", error);
      throw error;
    }
  },

  // ===== ADMIN (need session token) =====

  // Get leave requests page with role-based filtering (server-side)
  async getLeaveRequestsPage(params: {
    page: number;
    pageSize: LeaveRequestPageSize;
    filters?: LeaveRequestPageFilters;
  }): Promise<LeaveRequestsPageResult> {
    try {
      const sessionToken = authStorage.getSessionToken();
      if (!sessionToken)
        throw new Error("Session tidak ditemukan, silakan login ulang");

      const { page, pageSize, filters } = params;

      const { data, error } = await supabase.rpc("get_leave_requests_page", {
        p_session_token: sessionToken,
        p_page: page,
        p_page_size: pageSize === "all" ? 10000 : pageSize,
        p_status:
          filters?.status && filters.status !== "all" ? filters.status : "all",
        p_search_term: filters?.searchTerm?.trim() || null,
        p_date_start: filters?.dateRange?.start || null,
        p_date_end: filters?.dateRange?.end || null,
      });

      if (error) {
        console.error("Supabase error in getLeaveRequestsPage:", error);
        throw new Error(`Database error: ${error.message}`);
      }

      const result = data as { data: LeaveRequestDB[]; count: number };
      return {
        data: result?.data || [],
        count: result?.count ?? 0,
      };
    } catch (error) {
      console.error("Error fetching leave request page:", error);
      throw error;
    }
  },

  // Get counts by status — server-side filtered by role
  async getLeaveRequestsCounts(): Promise<Record<string, number>> {
    try {
      const sessionToken = authStorage.getSessionToken();
      if (!sessionToken) throw new Error("Session tidak ditemukan");

      const { data, error } = await supabase.rpc("get_leave_requests_counts", {
        p_session_token: sessionToken,
      });

      if (error) {
        console.error("Supabase error in getLeaveRequestsCounts:", error);
        throw new Error(`Database error: ${error.message}`);
      }

      const result = data as Record<string, number>;
      return (
        result || {
          total: 0,
          pending: 0,
          approved_coordinator: 0,
          approved_admin: 0,
          document_issued: 0,
          rejected: 0,
        }
      );
    } catch (error) {
      console.error("Error fetching leave request counts:", error);
      return {
        total: 0,
        pending: 0,
        approved_coordinator: 0,
        approved_admin: 0,
        document_issued: 0,
        rejected: 0,
      };
    }
  },

  // Get all leave requests (for export) — uses RPC with role filter
  async getAllLeaveRequests(): Promise<LeaveRequestDB[]> {
    try {
      const result = await this.getLeaveRequestsPage({
        page: 1,
        pageSize: "all",
      });
      return result.data;
    } catch (error) {
      console.error("Error fetching all leave requests:", error);
      throw error;
    }
  },

  // Update leave request status (approval flow validated server-side)
  async updateLeaveRequest(
    id: string,
    updates: Partial<LeaveRequestDB>,
  ): Promise<LeaveRequestDB | null> {
    try {
      const sessionToken = authStorage.getSessionToken();
      if (!sessionToken) throw new Error("Session tidak ditemukan");

      // Only status changes go through the status RPC
      if (updates.status) {
        const { data, error } = await supabase.rpc(
          "update_leave_request_status",
          {
            p_session_token: sessionToken,
            p_request_id: id,
            p_new_status: updates.status,
            p_rejection_reason: updates.rejection_reason || null,
          },
        );

        if (error) {
          console.error("Supabase error in updateLeaveRequest:", error);
          throw new Error(`Database error: ${error.message}`);
        }

        return data as LeaveRequestDB;
      }

      // For non-status updates (e.g., files, notes), we still need an RPC
      // but for now these are handled via the status RPC or ignored
      console.warn(
        "Non-status updates are not yet supported via RPC:",
        updates,
      );
      return null;
    } catch (error) {
      console.error("Error updating leave request:", error);
      throw error;
    }
  },

  // Get leave requests by NIP
  // Public: check leave request status by NIP (without session token)
  async checkLeaveStatusByNIP(nip: string): Promise<LeaveRequestDB[]> {
    try {
      const { data, error } = await supabase.rpc("public_check_leave_status", {
        p_nip: nip,
      });

      if (error) {
        console.error("Supabase error in checkLeaveStatusByNIP:", error);
        throw new Error(`Database error: ${error.message}`);
      }

      return (data as LeaveRequestDB[]) || [];
    } catch (error) {
      console.error("Error fetching leave status by NIP:", error);
      throw error;
    }
  },

  // Admin: get leave requests by NIP (requires session token)
  async getLeaveRequestsByNIP(nip: string): Promise<LeaveRequestDB[]> {
    try {
      const sessionToken = authStorage.getSessionToken();
      if (!sessionToken) throw new Error("Session tidak ditemukan");

      const { data, error } = await supabase.rpc("get_leave_requests_by_nip", {
        p_session_token: sessionToken,
        p_nip: nip,
      });

      if (error) {
        console.error("Supabase error in getLeaveRequestsByNIP:", error);
        throw new Error(`Database error: ${error.message}`);
      }

      return (data as LeaveRequestDB[]) || [];
    } catch (error) {
      console.error("Error fetching leave requests by NIP:", error);
      throw error;
    }
  },

  // Get recent activity
  async getRecentActivity(limit = 5): Promise<RecentActivityRow[]> {
    try {
      const sessionToken = authStorage.getSessionToken();
      if (!sessionToken) throw new Error("Session tidak ditemukan");

      const { data, error } = await supabase.rpc("get_recent_activity", {
        p_session_token: sessionToken,
        p_limit: limit,
      });

      if (error) {
        console.error("Supabase error in getRecentActivity:", error);
        throw new Error(`Database error: ${error.message}`);
      }

      return (data as RecentActivityRow[]) || [];
    } catch (error) {
      console.error("Error fetching recent activity:", error);
      throw error;
    }
  },

  // Delete leave request (admin_disdik only, validated server-side)
  async deleteLeaveRequest(id: string): Promise<boolean> {
    try {
      const sessionToken = authStorage.getSessionToken();
      if (!sessionToken) throw new Error("Session tidak ditemukan");

      const { error } = await supabase.rpc("delete_leave_request", {
        p_session_token: sessionToken,
        p_request_id: id,
      });

      if (error) {
        console.error("Supabase error in deleteLeaveRequest:", error);
        throw new Error(`Database error: ${error.message}`);
      }

      return true;
    } catch (error) {
      console.error("Error deleting leave request:", error);
      throw error;
    }
  },

  // ===== WORK CALENDAR (already via RPC, no changes needed) =====

  async getWorkCalendarDays(
    startDate: string,
    endDate: string,
  ): Promise<WorkCalendarDayDB[]> {
    try {
      const { data, error } = await supabase.rpc("get_work_calendar_days", {
        p_start: startDate,
        p_end: endDate,
      });

      if (error) {
        console.error("Supabase error in getWorkCalendarDays:", error);
        throw new Error(`Database error: ${error.message}`);
      }

      return data || [];
    } catch (error) {
      console.error("Error fetching work calendar days:", error);
      throw error;
    }
  },

  async upsertWorkCalendarDay(params: {
    adminUserId: string;
    date: string;
    type: WorkCalendarDayDB["type"];
    description: string;
  }): Promise<WorkCalendarDayDB | null> {
    try {
      const { data, error } = await supabase.rpc("upsert_work_calendar_day", {
        p_admin_user_id: params.adminUserId,
        p_calendar_date: params.date,
        p_type: params.type,
        p_description: params.description,
      });

      if (error) {
        console.error("Supabase error in upsertWorkCalendarDay:", error);
        throw new Error(`Database error: ${error.message}`);
      }

      return data;
    } catch (error) {
      console.error("Error saving work calendar day:", error);
      throw error;
    }
  },

  async deleteWorkCalendarDay(
    adminUserId: string,
    date: string,
  ): Promise<boolean> {
    try {
      const { error } = await supabase.rpc("delete_work_calendar_day", {
        p_admin_user_id: adminUserId,
        p_calendar_date: date,
      });

      if (error) {
        console.error("Supabase error in deleteWorkCalendarDay:", error);
        throw new Error(`Database error: ${error.message}`);
      }

      return true;
    } catch (error) {
      console.error("Error deleting work calendar day:", error);
      throw error;
    }
  },
};
