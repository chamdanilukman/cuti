import { useState, useEffect, useCallback } from 'react';
import { AdminUser, LoginCredentials, AuthState } from '../types';
import { adminAuth, authStorage } from '../utils/adminAuth';

export const useAdminAuth = () => {
  const [authState, setAuthState] = useState<AuthState>({
    isAuthenticated: false,
    user: null,
    token: null
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Initialize auth state from localStorage
  useEffect(() => {
    const initializeAuth = () => {
      try {
        const storedAuth = authStorage.getAuthState();
        if (storedAuth && storedAuth.user) {
          setAuthState(storedAuth);
        }
      } catch (err) {
        console.error('Error initializing auth state:', err);
        authStorage.clearAuthState();
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();
  }, []);

  // Login function
  const login = useCallback(async (credentials: LoginCredentials) => {
    setLoading(true);
    setError(null);

    try {
      const result = await adminAuth.login(credentials);
      
      if (result.success && result.user) {
        const newAuthState: AuthState = {
          isAuthenticated: true,
          user: result.user,
          token: `demo_token_${result.user.id}` // Demo token
        };
        
        setAuthState(newAuthState);
        authStorage.setAuthState(newAuthState);
        
        return { success: true, user: result.user };
      } else {
        setError(result.error || 'Login gagal');
        return { success: false, error: result.error };
      }
    } catch (err) {
      const errorMessage = 'Terjadi kesalahan sistem';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  }, []);

  // Logout function
  const logout = useCallback(() => {
    setAuthState({
      isAuthenticated: false,
      user: null,
      token: null
    });
    authStorage.clearAuthState();
    setError(null);
  }, []);

  // Check if user has permission to access leave request
  const canAccessLeaveRequest = useCallback((leaveRequest: any): boolean => {
    if (!authState.user) return false;
    return adminAuth.canAccessLeaveRequest(authState.user, leaveRequest);
  }, [authState.user]);

  // Get filtered leave requests based on user permissions
  const getFilteredLeaveRequests = useCallback((allRequests: any[]): any[] => {
    if (!authState.user) return [];
    
    // Admin Disdik can see all
    if (authState.user.role === 'admin_disdik' && authState.user.permissions.canAccessAll) {
      return allRequests;
    }

    // Filter based on user permissions
    return allRequests.filter(request => canAccessLeaveRequest(request));
  }, [authState.user, canAccessLeaveRequest]);

  // Get user role display name
  const getRoleDisplayName = useCallback((role?: string): string => {
    switch (role || authState.user?.role) {
      case 'admin_disdik':
        return 'Admin Dinas Pendidikan';
      case 'korwil':
        return 'Admin Korwil';
      case 'smp_admin':
        return 'Admin SMP/SKB';
      default:
        return 'Admin';
    }
  }, [authState.user?.role]);

  // Get user permissions summary
  const getPermissionsSummary = useCallback((): string => {
    const user = authState.user;
    if (!user) return '';

    const { permissions } = user;

    switch (user.role) {
      case 'admin_disdik':
        return 'Akses penuh ke semua data';
      
      case 'korwil': {
        const kecamatan = permissions.kecamatanAccess?.join(', ') || permissions.kecamatan?.join(', ') || '';
        const jenjangKorwil = permissions.jenjangAccess?.join(', ') || '';
        return `Kecamatan: ${kecamatan} | Jenjang: ${jenjangKorwil}`;
      }
      
      case 'smp_admin': {
        const schools = permissions.schoolAccess?.join(', ') || '';
        const jenjangSMP = permissions.jenjangAccess?.join(', ') || '';
        return `Sekolah: ${schools} | Jenjang: ${jenjangSMP}`;
      }
      
      default:
        return '';
    }
  }, [authState.user]);

  // Check if user can approve at specific level
  const canApproveAtLevel = useCallback((level: 'coordinator' | 'admin'): boolean => {
    if (!authState.user) return false;

    switch (level) {
      case 'coordinator':
        return authState.user.role === 'korwil' || authState.user.role === 'smp_admin';
      case 'admin':
        return authState.user.role === 'admin_disdik';
      default:
        return false;
    }
  }, [authState.user]);

  // Refresh user data
  const refreshUser = useCallback(async () => {
    if (!authState.user) return;

    try {
      const updatedUser = await adminAuth.getAdminUser(authState.user.id);
      if (updatedUser) {
        const newAuthState: AuthState = {
          ...authState,
          user: updatedUser
        };
        setAuthState(newAuthState);
        authStorage.setAuthState(newAuthState);
      }
    } catch (err) {
      console.error('Error refreshing user data:', err);
    }
  }, [authState]);

  return {
    // Auth state
    authState,
    isAuthenticated: authState.isAuthenticated,
    user: authState.user,
    loading,
    error,

    // Auth actions
    login,
    logout,
    refreshUser,

    // Permission checks
    canAccessLeaveRequest,
    canApproveAtLevel,
    getFilteredLeaveRequests,

    // Utility functions
    getRoleDisplayName,
    getPermissionsSummary,

    // Clear error
    clearError: () => setError(null)
  };
};
