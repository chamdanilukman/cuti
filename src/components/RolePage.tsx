import React, { useState, useEffect } from 'react';
import { Users, Shield, UserCheck, Lock, X, LogOut } from 'lucide-react';
import { LeaveRequest, UserRole } from '../types';
import CoordinatorPanel from './CoordinatorPanel';
import AdminPanel from './AdminPanel';
import DataRecapPanel from './DataRecapPanel';
import EnhancedAdminPanel from './EnhancedAdminPanel';
import AdminLogin from './AdminLogin';
import { useAdminAuth } from '../hooks/useAdminAuth';

interface RolePageProps {
  leaveRequests: LeaveRequest[];
  currentRole: UserRole;
  setCurrentRole: (role: UserRole) => void;
  isAdminLoggedIn: boolean;
  setIsAdminLoggedIn: (loggedIn: boolean) => void;
  onApprove: (id: string, role: 'coordinator' | 'admin') => Promise<boolean>;
  onReject: (id: string, role: 'coordinator' | 'admin', reason: string) => Promise<boolean>;
  onUpdate: (id: string, updates: Partial<LeaveRequest>) => Promise<boolean>;
  showModal: (message: string) => void;
}

const RolePage: React.FC<RolePageProps> = ({
  leaveRequests,
  currentRole,
  setCurrentRole,
  isAdminLoggedIn,
  setIsAdminLoggedIn,
  onApprove,
  onReject,
  onUpdate,
  showModal
}) => {
  const [activeTab, setActiveTab] = useState<'approval' | 'recap'>('approval');
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [selectedAdminType, setSelectedAdminType] = useState<'admin' | 'coordinator' | null>(null);

  // Use the new admin authentication hook
  const {
    isAuthenticated,
    user,
    login,
    logout,
    loading,
    error,
    getFilteredLeaveRequests,
    getRoleDisplayName,
    getPermissionsSummary,
    canApproveAtLevel
  } = useAdminAuth();

  const adminTypes = [
    {
      type: 'admin' as const,
      label: 'Admin Dinas',
      icon: Shield,
      className: 'from-indigo-500 to-violet-600',
      description: 'Persetujuan final & rekap',
    },
    {
      type: 'coordinator' as const,
      label: 'Korwil / SMP-SKB',
      icon: UserCheck,
      className: 'from-amber-500 to-orange-600',
      description: 'Persetujuan jenjang pertama',
    },
  ];

  const handleAdminClick = (type: 'admin' | 'coordinator') => {
    setSelectedAdminType(type);
    setShowLoginModal(true);
  };

  const handleLoginSuccess = (loggedInUser: any) => {
    setShowLoginModal(false);
    setSelectedAdminType(null);

    // Set the appropriate role based on user type
    if (loggedInUser.role === 'admin_disdik') {
      setCurrentRole('admin');
    } else {
      // Both korwil and smp_admin (including SKB) use coordinator panel for first-level approval
      setCurrentRole('coordinator');
    }

    setIsAdminLoggedIn(true);
    showModal(`Masuk berhasil sebagai ${getRoleDisplayName(loggedInUser.role)}.`);
  };

  const handleLogout = () => {
    logout();
    setIsAdminLoggedIn(false);
    setCurrentRole('user');
    setActiveTab('approval');
    showModal('Keluar berhasil.');
  };

  // Sync role after refresh based on authenticated user
  useEffect(() => {
    if (isAuthenticated && user) {
      setIsAdminLoggedIn(true);

      // Map backend role to UI role
      if (user.role === 'admin_disdik') {
        setCurrentRole('admin');
      } else {
        // Both korwil and smp_admin (including SKB) use coordinator panel for first-level approval
        setCurrentRole('coordinator');
      }
    }
  }, [isAuthenticated, user, setCurrentRole, setIsAdminLoggedIn]);

  const handleLoginCancel = () => {
    setShowLoginModal(false);
    setSelectedAdminType(null);
  };

  // Get filtered leave requests based on user permissions
  const filteredLeaveRequests = isAuthenticated && user ? getFilteredLeaveRequests(leaveRequests) : leaveRequests;

  const renderRolePanel = () => {
    if (!isAuthenticated || !user) return null;

    console.log('RolePage Debug:', { currentRole, userRole: user.role, isAuthenticated, user });

    switch (currentRole) {
      case 'admin':
      case 'admin_disdik':
        return (
          <EnhancedAdminPanel
            leaveRequests={filteredLeaveRequests}
            onApprove={onApprove}
            onReject={onReject}
            onUpdate={onUpdate}
            showModal={showModal}
            userRole={user?.role}
            userPermissions={user?.permissions}
            currentUser={user}
          />
        );
      case 'coordinator':
        return (
          <CoordinatorPanel
            leaveRequests={filteredLeaveRequests}
            onApprove={onApprove}
            onReject={onReject}
            showModal={showModal}
            userRole={user?.role}
            userPermissions={user?.permissions}
          />
        );
      default:
        return (
          <div className="text-center py-8">
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-amber-800 mb-2">Peran Tidak Dikenali</h3>
              <p className="text-amber-700 mb-4">
                Peran "{currentRole}" tidak dikenali dalam sistem.
              </p>
              <p className="text-sm text-amber-600">
                Silakan hubungi administrator sistem untuk bantuan.
              </p>
              <button
                onClick={handleLogout}
                className="mt-4 px-4 py-2 bg-amber-600 text-white rounded-xl hover:bg-amber-700 transition-colors"
              >
                Keluar dan Coba Kembali
              </button>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="space-y-6">
        {!isAuthenticated ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {adminTypes.map((admin, index) => {
              const Icon = admin.icon;
              return (
                <button
                  key={index}
                  onClick={() => handleAdminClick(admin.type)}
                  className={`flex flex-col items-center gap-4 p-8 text-white rounded-2xl bg-gradient-to-br ${admin.className} shadow-card hover:shadow-lg hover:scale-[1.02] transition-all duration-300`}
                >
                  <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center backdrop-blur">
                    <Icon className="w-7 h-7" />
                  </div>
                  <div>
                    <p className="text-lg font-bold">{admin.label}</p>
                    <p className="text-sm text-white/80 mt-1">{admin.description}</p>
                  </div>
                </button>
              );
            })}
          </div>
        ) : (
          renderRolePanel()
        )}

      {/* Login Modal */}
      {showLoginModal && (
        <AdminLogin
          onLogin={async (credentials) => {
            const result = await login(credentials);
            if (result.success && result.user) {
              handleLoginSuccess(result.user);
            }
            return result;
          }}
          onCancel={handleLoginCancel}
          loading={loading}
        />
      )}
    </div>
  );
};

export default RolePage;
