import React, { useState } from 'react';
import Header from './components/Header';
import Dashboard from './components/Dashboard';
import LeaveForm from './components/LeaveForm';
import StatusPage from './components/StatusPage';
import RolePage from './components/RolePage';
import AboutPage from './components/AboutPage';
import Footer from './components/Footer';
import Modal from './components/Modal';
import { LeaveRequest, UserRole } from './types';
import { useLeaveRequests } from './hooks/useLeaveRequests';

type ActiveSection = 'dashboard' | 'form' | 'status' | 'role' | 'about';

const isActiveSection = (section: string | null): section is ActiveSection => {
  return section === 'dashboard' || section === 'form' || section === 'status' || section === 'role' || section === 'about';
};

const getInitialSection = (): ActiveSection => {
  if (typeof window === 'undefined') return 'dashboard';

  const searchParams = new URLSearchParams(window.location.search);
  const requestedSection = searchParams.get('section');
  return isActiveSection(requestedSection) ? requestedSection : 'dashboard';
};

function AppV1() {
  const [activeSection, setActiveSection] = useState<ActiveSection>(getInitialSection);
  const [currentRole, setCurrentRole] = useState<UserRole>('user');
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(false);
  const [modal, setModal] = useState<{ isOpen: boolean; message: string }>({
    isOpen: false,
    message: ''
  });
  const [nipFilter, setNipFilter] = useState('');
  const [editingRequest, setEditingRequest] = useState<LeaveRequest | null>(null);
  const shouldLoadFullLeaveRequests =
    (activeSection === 'role' && isAdminLoggedIn && currentRole === 'coordinator');

  const {
    leaveRequests,
    loading,
    error,
    createLeaveRequest,
    updateLeaveRequest,
    getLeaveRequestsByNIP,
  } = useLeaveRequests({ autoLoad: shouldLoadFullLeaveRequests });

  const showModal = (message: string) => {
    setModal({ isOpen: true, message });
  };

  const closeModal = () => {
    setModal({ isOpen: false, message: '' });
  };

  const addLeaveRequest = async (request: Omit<LeaveRequest, 'id' | 'status' | 'rejectionReason' | 'submissionDate'>) => {
    if (editingRequest) {
      // Update existing request (perbaikan cuti)
      const success = await handleUpdateLeaveRequest(editingRequest.id, {
        ...request,
        status: 'pending', // Reset status to pending when resubmitting
        rejectionReason: '', // Clear rejection reason
        isRevised: true, // Mark as revised request
        originalRejectionReason: editingRequest.rejectionReason, // Keep original rejection reason for reference
        // Clear previous approval dates since this is a new submission
        coordinatorApprovalDate: undefined,
        adminApprovalDate: undefined
      });

      if (success) {
        showModal('Pengajuan cuti telah diperbaiki dan diajukan kembali. Pengajuan akan diproses secara berjenjang.');
        setEditingRequest(null);
        setActiveSection('status');
      } else {
        showModal('Gagal memperbaiki pengajuan cuti. Silakan coba kembali.');
      }
    } else {
      // Create new request
      const newRequest = await createLeaveRequest(request);
      if (newRequest) {
        showModal('Pengajuan cuti telah disimpan. Pengajuan akan diproses secara berjenjang.');
        setActiveSection('status');
      } else {
        showModal('Gagal menyimpan pengajuan cuti. Silakan coba kembali.');
      }
    }
  };

  const handleUpdateLeaveRequest = async (id: string, updates: Partial<LeaveRequest>) => {
    const updatedRequest = await updateLeaveRequest(id, updates);
    return updatedRequest !== null;
  };

  const approveRequest = async (id: string, role: 'coordinator' | 'admin') => {
    const request = leaveRequests.find(req => req.id === id);

    const newStatus = role === 'coordinator' ? 'approved_coordinator' : 'approved_admin';
    const success = await handleUpdateLeaveRequest(id, { status: newStatus });
    
    if (success) {
      const roleText = role === 'coordinator' ? 'Koordinator Wilayah' : 'Dinas Pendidikan';
      showModal(request
        ? `Pengajuan cuti dari ${request.nama} telah disetujui oleh ${roleText}.`
        : `Pengajuan cuti telah disetujui oleh ${roleText}.`
      );
      return true;
    } else {
      showModal('Gagal menyetujui pengajuan. Silakan coba kembali.');
      return false;
    }
  };

  const rejectRequest = async (id: string, role: 'coordinator' | 'admin', reason: string) => {
    const request = leaveRequests.find(req => req.id === id);

    const success = await handleUpdateLeaveRequest(id, { 
      status: 'rejected', 
      rejectionReason: reason 
    });
    
    if (success) {
      const roleText = role === 'coordinator' ? 'Koordinator Wilayah' : 'Admin Dinas';
      showModal(request
        ? `Pengajuan cuti dari ${request.nama} telah ditolak oleh ${roleText} dengan alasan: "${reason}"`
        : `Pengajuan cuti telah ditolak oleh ${roleText} dengan alasan: "${reason}"`
      );
      return true;
    } else {
      showModal('Gagal menolak pengajuan. Silakan coba kembali.');
      return false;
    }
  };

  const editRejectedRequest = (request: LeaveRequest) => {
    setEditingRequest(request);
    setActiveSection('form');
  };

  const renderActiveSection = () => {
    if (loading) {
      return (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
          <span className="ml-3 text-gray-600">Memuat data...</span>
        </div>
      );
    }

    if (error) {
      return (
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <p className="text-red-700">{error}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="mt-4 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors duration-200"
          >
            Muat Ulang
          </button>
        </div>
      );
    }

    switch (activeSection) {
      case 'dashboard':
        return <Dashboard />;
      case 'form':
        return (
          <LeaveForm
            onSubmit={addLeaveRequest}
            showModal={showModal}
            editingRequest={editingRequest}
            getLeaveRequestsByNIP={getLeaveRequestsByNIP}
          />
        );
      case 'status':
        return (
          <StatusPage 
            leaveRequests={leaveRequests}
            nipFilter={nipFilter}
            setNipFilter={setNipFilter}
            onEditRequest={editRejectedRequest}
            getLeaveRequestsByNIP={getLeaveRequestsByNIP}
          />
        );
      case 'role':
        return (
          <RolePage
            leaveRequests={leaveRequests}
            currentRole={currentRole}
            setCurrentRole={setCurrentRole}
            isAdminLoggedIn={isAdminLoggedIn}
            setIsAdminLoggedIn={setIsAdminLoggedIn}
            onApprove={approveRequest}
            onReject={rejectRequest}
            onUpdate={handleUpdateLeaveRequest}
            showModal={showModal}
          />
        );
      case 'about':
        return <AboutPage />;
      default:
        return <Dashboard />;
    }
  };

  const handleSectionChange = (section: ActiveSection) => {
    // Clear editing state when navigating away from form
    if (section !== 'form') {
      setEditingRequest(null);
    }
    setActiveSection(section);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header activeSection={activeSection} setActiveSection={handleSectionChange} />
      
      <main className="flex-1 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {renderActiveSection()}
        </div>
      </main>

      <Footer />

      <Modal 
        isOpen={modal.isOpen}
        onClose={closeModal}
        message={modal.message}
      />
    </div>
  );
}

export default AppV1;
