export interface LeaveRequest {
  id: string;
  nama: string;
  nip: string;
  pangkatGolongan: string;
  jabatan: string;
  kecamatan: string;
  jenjang: string;
  unitKerja: string;
  jenisCuti: string;
  tanggalMulai: string;
  tanggalSelesai: string;
  alasanCuti: string;
  files: FileInfo[];
  status: 'pending' | 'approved_coordinator' | 'approved_admin' | 'rejected' | 'document_issued';
  rejectionReason: string;
  submissionDate: string;
  driveLink?: string; // Google Drive link for approved documents (deprecated - use finalLetterUrl)
  finalLetterUrl?: string; // cPanel hosted final letter PDF URL
  coordinatorApprovalDate?: string; // Date when coordinator approved
  adminApprovalDate?: string; // Date when admin approved
  isRevised?: boolean; // Flag to indicate if this is a revised/corrected request
  originalRejectionReason?: string; // Original rejection reason before revision
}

export interface FileInfo {
  name: string;
  url: string;
  size?: number;
}

export type UserRole = 'user' | 'coordinator' | 'admin';

export interface DashboardStats {
  new: number;
  pending: number;
  approvedCoordinator: number;
  approvedAdmin: number;
}

// Enhanced user management types
export interface AdminUser {
  id: string;
  nama: string;
  username: string;
  role: 'admin_disdik' | 'korwil' | 'smp_admin';
  permissions: AdminPermissions;
  created_at: string;
  updated_at: string;
}

export interface AdminPermissions {
  // For admin_disdik - can access all
  canAccessAll?: boolean;

  // For korwil - specific kecamatan access (legacy field also exists)
  kecamatan?: string[];
  kecamatanAccess?: string[];

  // For smp_admin - specific school access
  schoolAccess?: string[];

  // Jenjang access (for korwil and smp_admin)
  jenjangAccess?: ('TK' | 'SD' | 'SMP' | 'SKB')[];
}

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface AuthState {
  isAuthenticated: boolean;
  user: AdminUser | null;
  token: string | null;
}