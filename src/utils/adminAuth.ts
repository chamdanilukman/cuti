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

// Transform database record to frontend type
const transformDBToFrontend = (dbRecord: AdminUserDB): AdminUser => ({
  id: dbRecord.id,
  nama: dbRecord.nama,
  username: dbRecord.username,
  role: dbRecord.role,
  permissions: dbRecord.permissions,
  created_at: dbRecord.created_at,
  updated_at: dbRecord.updated_at,
});

// CATATAN KEAMANAN:
// Verifikasi & hashing password TIDAK lagi dilakukan di sisi klien.
// Semuanya ditangani server (Postgres) lewat fungsi RPC bcrypt:
//   - admin_login(username, password)
//   - admin_get_user(id)
//   - admin_set_password(username, password)  [hanya via SQL Editor/service_role]
// Lihat: supabase/migrations/0001_secure_admin_auth.sql

// Admin authentication operations
export const adminAuth = {
  // Login admin user (verifikasi password dilakukan di server via RPC bcrypt)
  async login(credentials: LoginCredentials): Promise<{ success: boolean; user?: AdminUser; error?: string }> {
    try {
      const { data, error } = await supabase.rpc('admin_login', {
        p_username: credentials.username,
        p_password: credentials.password,
      });

      if (error) {
        console.error('Database error during login:', error);
        return { success: false, error: 'Terjadi kesalahan sistem' };
      }

      // RPC mengembalikan null bila user tidak ditemukan ATAU password salah.
      // Pesan dibuat generik untuk mencegah enumerasi username.
      if (!data) {
        return { success: false, error: 'Username atau kata sandi salah' };
      }

      const user = transformDBToFrontend(data as AdminUserDB);
      return { success: true, user };
    } catch (error) {
      console.error('Error during admin login:', error);
      return { success: false, error: 'Terjadi kesalahan sistem' };
    }
  },

  // Get admin user by ID (via RPC, password_hash tidak pernah dikirim ke klien)
  async getAdminUser(id: string): Promise<AdminUser | null> {
    try {
      const { data, error } = await supabase.rpc('admin_get_user', { p_id: id });

      if (error || !data) {
        return null;
      }

      return transformDBToFrontend(data as AdminUserDB);
    } catch (error) {
      console.error('Error fetching admin user:', error);
      return null;
    }
  },

  // Get all admin users (for admin management)
  async getAllAdminUsers(): Promise<AdminUser[]> {
    try {
      const { data, error } = await supabase
        .from('admin_users')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching admin users:', error);
        return [];
      }

      return data ? data.map(transformDBToFrontend) : [];
    } catch (error) {
      console.error('Error fetching admin users:', error);
      return [];
    }
  },

  // Create new admin user
  //
  // CATATAN: pembuatan akun admin kini harus dilakukan di sisi server
  // (Supabase SQL Editor / service_role), bukan dari klien. Tabel admin_users
  // dilindungi RLS sehingga ANON_KEY tidak boleh menulis langsung, dan hashing
  // password wajib bcrypt via admin_set_password(). Fungsi ini sengaja
  // dinonaktifkan agar tidak ada jalur pembuatan admin yang tidak aman.
  async createAdminUser(_userData: Omit<AdminUser, 'id' | 'created_at' | 'updated_at'> & { password: string }): Promise<{ success: boolean; user?: AdminUser; error?: string }> {
    console.warn('createAdminUser dinonaktifkan di klien. Buat admin lewat SQL Editor + admin_set_password().');
    return {
      success: false,
      error: 'Pembuatan admin harus dilakukan di server (SQL Editor) demi keamanan.',
    };
  },

  // Update admin user
  async updateAdminUser(id: string, updates: Partial<AdminUser>): Promise<{ success: boolean; user?: AdminUser; error?: string }> {
    try {
      const { data, error } = await supabase
        .from('admin_users')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Error updating admin user:', error);
        return { success: false, error: 'Gagal mengupdate user admin' };
      }

      const user = transformDBToFrontend(data);
      return { success: true, user };
    } catch (error) {
      console.error('Error updating admin user:', error);
      return { success: false, error: 'Terjadi kesalahan sistem' };
    }
  },

  // Check if user has permission to access leave request
  canAccessLeaveRequest(user: AdminUser, leaveRequest: any): boolean {
    // Admin Disdik can access all
    if (user.role === 'admin_disdik' && user.permissions.canAccessAll) {
      return true;
    }

    // Korwil can access TK and SD from their kecamatan
    if (user.role === 'korwil') {
      // Handle both legacy 'kecamatan' and new 'kecamatanAccess' fields
      const allowedKecamatan = user.permissions.kecamatanAccess || user.permissions.kecamatan || [];
      const hasKecamatanAccess = allowedKecamatan.includes(leaveRequest.kecamatan);
      const hasJenjangAccess = user.permissions.jenjangAccess?.includes(leaveRequest.jenjang);
      return hasKecamatanAccess && hasJenjangAccess;
    }

    // SMP Admin can access their specific schools (both SMP and SKB)
    if (user.role === 'smp_admin') {
      const hasSchoolAccess = user.permissions.schoolAccess?.includes(leaveRequest.unitKerja);
      // SKB requests have jenjang='SMP' in DB, but SKB admin has jenjangAccess=['SKB']
      // So also check 'SMP' if user is an SKB admin and the school is an SKB school
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

// Local storage utilities for auth state
export const authStorage = {
  setAuthState(authState: AuthState): void {
    localStorage.setItem('admin_auth_state', JSON.stringify(authState));
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
  }
};
