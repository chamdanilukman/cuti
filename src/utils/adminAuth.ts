import { createClient } from '@supabase/supabase-js';
import { AdminUser, LoginCredentials, AuthState, AdminPermissions } from '../types';

// Database interface for admin users
export interface AdminUserDB {
  id: string;
  nama: string;
  username: string;
  password_hash: string;
  role: 'admin_disdik' | 'korwil' | 'smp_admin';
  permissions: AdminPermissions;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// Initialize Supabase client
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables for admin auth');
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

// CATATAN KEAMANAN:
// Semua operasi admin via RPC security definer + session token.
// Tidak ada akses langsung ke tabel leave_requests / user_nips.
// Lihat: supabase/migrations/0005_rpc_leave_requests.sql

// Transform database record to frontend type
const transformDBToFrontend = (dbRecord: any): AdminUser => ({
  id: dbRecord.id,
  nama: dbRecord.nama,
  username: dbRecord.username,
  role: dbRecord.role,
  permissions: dbRecord.permissions,
  created_at: dbRecord.created_at,
  updated_at: dbRecord.updated_at,
});

// Admin authentication operations
export const adminAuth = {
  // Login — mengembalikan session_token + user dari server
  async login(credentials: LoginCredentials): Promise<{ success: boolean; user?: AdminUser; sessionToken?: string; passwordMustChange?: boolean; error?: string }> {
    try {
      const { data, error } = await supabase.rpc('admin_login', {
        p_username: credentials.username,
        p_password: credentials.password,
      });

      if (error) {
        console.error('Database error during login:', error);
        return { success: false, error: 'Terjadi kesalahan sistem' };
      }

      if (!data || !data.session_token) {
        return { success: false, error: 'Username atau kata sandi salah' };
      }

      const user = transformDBToFrontend(data.user);
      return {
        success: true,
        user,
        sessionToken: data.session_token,
        passwordMustChange: data.password_must_change === true
      };
    } catch (error) {
      console.error('Error during admin login:', error);
      return { success: false, error: 'Terjadi kesalahan sistem' };
    }
  },

  // Logout — hapus session di server
  async logout(sessionToken: string): Promise<void> {
    try {
      await supabase.rpc('admin_logout', { p_session_token: sessionToken });
    } catch (err) {
      console.error('Logout RPC error (non-fatal):', err);
    }
  },

  // Refresh user data via session token
  async refreshUser(sessionToken: string): Promise<AdminUser | null> {
    try {
      const { data, error } = await supabase.rpc('admin_get_user', {
        p_session_token: sessionToken,
      });

      if (error || !data) return null;
      return transformDBToFrontend(data);
    } catch (error) {
      console.error('Error refreshing admin user:', error);
      return null;
    }
  },

  // Client-side permission hint (validasi utama tetap di server via RPC)
  canAccessLeaveRequest(user: AdminUser, leaveRequest: any): boolean {
    if (user.role === 'admin_disdik' && user.permissions.canAccessAll) {
      return true;
    }

    if (user.role === 'korwil') {
      const allowedKecamatan = user.permissions.kecamatanAccess || user.permissions.kecamatan || [];
      const hasKecamatanAccess = allowedKecamatan.includes(leaveRequest.kecamatan);
      const hasJenjangAccess = user.permissions.jenjangAccess?.includes(leaveRequest.jenjang);
      return hasKecamatanAccess && hasJenjangAccess;
    }

    if (user.role === 'smp_admin') {
      const hasSchoolAccess = user.permissions.schoolAccess?.includes(leaveRequest.unitKerja);
      let hasJenjangAccess = user.permissions.jenjangAccess?.includes(leaveRequest.jenjang);
      if (!hasJenjangAccess && leaveRequest.jenjang === 'SMP') {
        const jenjangAccess = user.permissions.jenjangAccess || [];
        const isSkbAdmin = jenjangAccess.includes('SKB');
        const isSkbSchool = leaveRequest.unitKerja?.includes('SKB');
        hasJenjangAccess = isSkbAdmin && isSkbSchool;
      }
      return hasSchoolAccess && hasJenjangAccess;
    }

    return false;
  }
};

// Custom event name for cross-component auth sync
export const AUTH_CHANGED_EVENT = 'admin-auth-changed';

// Session token management di localStorage
export const authStorage = {
  setAuthState(authState: AuthState): void {
    localStorage.setItem('admin_auth_state', JSON.stringify(authState));
    // Dispatch custom event so other useAdminAuth instances update immediately
    window.dispatchEvent(new CustomEvent(AUTH_CHANGED_EVENT, { detail: authState }));
  },

  getAuthState(): AuthState | null {
    try {
      const stored = localStorage.getItem('admin_auth_state');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  },

  clearAuthState(): void {
    localStorage.removeItem('admin_auth_state');
    // Dispatch custom event so other useAdminAuth instances update immediately
    window.dispatchEvent(new CustomEvent(AUTH_CHANGED_EVENT, { detail: null }));
  },

  getSessionToken(): string | null {
    try {
      const stored = localStorage.getItem('admin_auth_state');
      if (!stored) return null;
      const state = JSON.parse(stored) as AuthState;
      return state.sessionToken;
    } catch {
      return null;
    }
  }
};
