import React, { useEffect, useState, useMemo, useCallback } from 'react';
import {
  Shield, Download, Check, X, Eye, Search, Filter,
  Calendar, Clock, TrendingUp, Users, FileText,
  AlertCircle, CheckCircle, XCircle, Zap, BarChart3,
  RefreshCw, Settings, Bell, Activity, Link
} from 'lucide-react';
import { AdminUser, LeaveRequest } from '../types';
import StatusBadge from './StatusBadge';
import RejectionModal from './RejectionModal';
import PDFPreviewModal from './PDFPreviewModal';
import DocumentDownloadButton, { CompactDocumentDownloadButton, BulkDocumentDownloadButton } from './DocumentDownloadButton';
import AttachmentDownloadButton, { CompactAttachmentDownloadButton } from './AttachmentDownloadButton';
import DriveLinkModal from './DriveLinkModal';
import LeaveRequestDetailModal from './LeaveRequestDetailModal';
import ExcelExportModal from './ExcelExportModal';
import { LeaveRequestPageSize, usePagedLeaveRequests } from '../hooks/usePagedLeaveRequests';
import { db } from '../utils/database';
import { useWorkCalendar } from '../hooks/useWorkCalendar';
import { countEffectiveLeaveDays } from '../utils/workCalendar';
import WorkCalendarSettings from './WorkCalendarSettings';

interface EnhancedAdminPanelProps {
  leaveRequests: LeaveRequest[];
  onApprove: (id: string, role: 'coordinator' | 'admin') => Promise<boolean>;
  onReject: (id: string, role: 'coordinator' | 'admin', reason: string) => Promise<boolean>;
  onUpdate: (id: string, updates: Partial<LeaveRequest>) => Promise<boolean>;
  showModal: (message: string) => void;
  userRole?: string;
  userPermissions?: any;
  currentUser?: AdminUser | null;
}

type TabType = 'dashboard' | 'approval' | 'reports' | 'analytics' | 'calendar';
type FilterType = 'all' | 'pending' | 'approved_coordinator' | 'approved_admin' | 'rejected';

const monthNames = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
const formatTanggal = (dateStr: string) => {
  if (!dateStr) return '-';
  const d = new Date(`${dateStr}T00:00:00`);
  if (isNaN(d.getTime())) return dateStr;
  return `${d.getDate()} ${monthNames[d.getMonth()]} ${d.getFullYear()}`;
};

const EnhancedAdminPanel: React.FC<EnhancedAdminPanelProps> = ({
  leaveRequests,
  onApprove,
  onReject,
  onUpdate,
  showModal,
  userRole,
  userPermissions,
  currentUser
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [selectedRequests, setSelectedRequests] = useState<string[]>([]);
  const [filterStatus, setFilterStatus] = useState<FilterType>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [rejectionModal, setRejectionModal] = useState<{
    isOpen: boolean;
    requestId: string;
    isRevision: boolean;
  }>({ isOpen: false, requestId: '', isRevision: false });
  const [pdfPreview, setPdfPreview] = useState<{
    isOpen: boolean;
    fileUrl: string;
    fileName: string;
  }>({ isOpen: false, fileUrl: '', fileName: '' });
  const [driveLinkModal, setDriveLinkModal] = useState<{
    isOpen: boolean;
    request: LeaveRequest | null
  }>({ isOpen: false, request: null });
  const [detailModal, setDetailModal] = useState<{
    isOpen: boolean;
    request: LeaveRequest | null;
  }>({ isOpen: false, request: null });
  const [exportModal, setExportModal] = useState(false);
  const [updatingRequestIds, setUpdatingRequestIds] = useState<string[]>([]);
  const detailYear = detailModal.request
    ? new Date(`${detailModal.request.tanggalMulai}T00:00:00`).getFullYear()
    : new Date().getFullYear();
  const { days: workCalendarDays } = useWorkCalendar(detailYear);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState<LeaveRequestPageSize>(10);
  const isServerPaged = userRole === 'admin_disdik';
  const serverPageSize = itemsPerPage === 'all' ? 'all' : itemsPerPage;
  const normalizedDateRange = useMemo(() => {
    const lastDayOfMonth = (y: number, m: number) => new Date(y, m, 0).getDate();
    const parseStart = (v: string) => {
      if (!v) return '';
      if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return v;
      if (/^\d{4}-\d{2}$/.test(v)) return `${v}-01`;
      if (/^\d{4}$/.test(v)) return `${v}-01-01`;
      return v;
    };
    const parseEnd = (v: string) => {
      if (!v) return '';
      if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return v;
      if (/^\d{4}-\d{2}$/.test(v)) {
        const [y, m] = v.split('-').map(Number);
        return `${y}-${String(m).padStart(2, '0')}-${String(lastDayOfMonth(y, m)).padStart(2, '0')}`;
      }
      if (/^\d{4}$/.test(v)) return `${v}-12-31`;
      return v;
    };
    const rawEnd = dateRange.end || dateRange.start;
    return {
      start: dateRange.start ? parseStart(dateRange.start) : '',
      end: rawEnd ? parseEnd(rawEnd) : '',
    };
  }, [dateRange]);

  const pageFilters = useMemo(() => ({
    status: filterStatus,
    searchTerm,
    dateRange: normalizedDateRange,
    userRole,
    userPermissions,
  }), [filterStatus, searchTerm, normalizedDateRange, userRole, userPermissions]);
  const {
    leaveRequests: serverPagedRequests,
    totalCount: serverTotalCount,
    loading: serverLoading,
    error: serverError,
    refetch: refetchServerPage,
  } = usePagedLeaveRequests({
    enabled: isServerPaged,
    page: currentPage,
    pageSize: serverPageSize,
    filters: pageFilters,
  });
  const panelRequests = isServerPaged ? serverPagedRequests : leaveRequests;

  // Dashboard stats — count-only queries, independent of visible filter/pagination
  const [dashStats, setDashStats] = useState({ total: 0, pending: 0, approvedCoordinator: 0, approvedAdmin: 0, rejected: 0 });

  const refreshDashStats = useCallback(async () => {
    try {
      const counts = await db.getLeaveRequestsCounts({ userRole, userPermissions });
      setDashStats({
        total: counts.total,
        pending: counts.pending,
        approvedCoordinator: counts.approved_coordinator,
        approvedAdmin: counts.approved_admin,
        rejected: counts.rejected,
      });
    } catch { /* ignore */ }
  }, [userRole, userPermissions]);

  useEffect(() => { refreshDashStats(); }, [refreshDashStats]);

  // Keep avgProcessingTime computed from loaded data (needs dates)
  const avgProcessingTime = useMemo(() => {
    const processedRequests = panelRequests.filter(req => req.status !== 'pending');
    return processedRequests.length > 0
      ? Math.round((processedRequests.reduce((acc, req) => {
          const submitted = new Date(req.submissionDate);
          const now = new Date();
          return acc + (now.getTime() - submitted.getTime());
        }, 0) / processedRequests.length / (1000 * 60 * 60 * 24)) * 10) / 10
      : 0;
  }, [panelRequests]);

  const stats = useMemo(() => ({
    ...dashStats,
    avgProcessingTime,
    approvalRate: dashStats.total > 0 ? Math.round(((dashStats.approvedAdmin + dashStats.approvedCoordinator) / dashStats.total) * 100) : 0,
  }), [dashStats, avgProcessingTime]);

  // Filtered and searched data
  const filteredData = useMemo(() => {
    let filtered = panelRequests;

    if (isServerPaged) {
      return filtered;
    }

    // Debug log for troubleshooting
    console.log('EnhancedAdminPanel Debug:', {
      userRole,
      userPermissions,
      totalRequests: panelRequests.length,
      pendingCount: panelRequests.filter(r => r.status === 'pending').length
    });

    // Filter by user permissions first
    if (userRole && userPermissions) {
      if (userRole === 'korwil') {
        // Korwil can only see requests from their kecamatan
        const allowedKecamatan = userPermissions.kecamatan || userPermissions.kecamatanAccess || [];
        filtered = filtered.filter(req =>
          allowedKecamatan.includes(req.kecamatan)
        );
      } else if (userRole === 'smp_admin') {
        // Check if this is SKB admin or regular SMP admin
        const allowedJenjang = userPermissions.jenjangAccess || [];
        const allowedSekolah = userPermissions.schoolAccess || userPermissions.sekolah || [];

        console.log('EnhancedAdminPanel SKB Filter Debug:', {
          allowedJenjang,
          allowedSekolah,
          requestsToFilter: filtered.map(r => ({ 
            jenjang: r.jenjang, 
            unitKerja: r.unitKerja, 
            status: r.status 
          }))
        });

        if (allowedJenjang.includes('SKB') || allowedJenjang.includes('SMP')) {
          filtered = filtered.filter(req => {
            const isInSchool = allowedSekolah.includes(req.unitKerja);
            
            if (allowedJenjang.includes('SKB')) {
              const isSkbSchool = req.unitKerja.includes('SKB') || req.jenjang === 'SKB';
              if (isSkbSchool) return isInSchool;
            }
            
            if (allowedJenjang.includes('SMP')) {
              const isRegularSmp = req.jenjang === 'SMP' && !req.unitKerja.includes('SKB');
              if (isRegularSmp) return isInSchool;
            }
            
            return false;
          });
        }
      }
      // Admin dinas can see all (no additional filtering)
    }

    // Filter by status
    if (filterStatus !== 'all') {
      filtered = filtered.filter(req => req.status === filterStatus);
    }

    // Filter by search term (nama, unit kerja, jenis cuti)
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(req =>
        req.nama.toLowerCase().includes(term) ||
        req.unitKerja.toLowerCase().includes(term) ||
        req.kecamatan.toLowerCase().includes(term) ||
        req.jenisCuti.toLowerCase().includes(term)
      );
    }

    // Filter by month (dateRange.start = "YYYY-MM")
    if (dateRange.start) {
      const [y, m] = dateRange.start.split('-');
      filtered = filtered.filter(req => {
        const d = new Date(req.tanggalMulai);
        return d.getFullYear() === Number(y) && (d.getMonth() + 1) === Number(m);
      });
    }

    // Filter by year (dateRange.end = "YYYY")
    if (dateRange.end) {
      const year = Number(dateRange.end);
      filtered = filtered.filter(req => {
        const d = new Date(req.tanggalMulai);
        return d.getFullYear() === year;
      });
    }

    return filtered;
  }, [panelRequests, isServerPaged, filterStatus, searchTerm, dateRange, userRole, userPermissions]);

  // Paginated data
  const paginatedData = useMemo(() => {
    if (isServerPaged) {
      return filteredData;
    }

    const numericPageSize = itemsPerPage === 'all' ? filteredData.length || 1 : itemsPerPage;
    const startIndex = (currentPage - 1) * numericPageSize;
    const endIndex = startIndex + numericPageSize;
    return filteredData.slice(startIndex, endIndex);
  }, [filteredData, currentPage, itemsPerPage, isServerPaged]);

  // Total pages
  const totalPages = useMemo(() => {
    const totalItems = isServerPaged ? serverTotalCount : filteredData.length;
    const numericPageSize = itemsPerPage === 'all' ? totalItems || 1 : itemsPerPage;
    return Math.max(Math.ceil(totalItems / numericPageSize), 1);
  }, [filteredData.length, itemsPerPage, isServerPaged, serverTotalCount]);
  const totalDisplayCount = isServerPaged ? serverTotalCount : filteredData.length;
  const numericItemsPerPage = itemsPerPage === 'all' ? totalDisplayCount || 1 : itemsPerPage;
  const displayStart = totalDisplayCount === 0 ? 0 : (currentPage - 1) * numericItemsPerPage + 1;
  const displayEnd = itemsPerPage === 'all'
    ? totalDisplayCount
    : Math.min(currentPage * numericItemsPerPage, totalDisplayCount);

  // Reset to page 1 when filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [filterStatus, searchTerm, dateRange]);

  // Urgent notifications
  const urgentRequests = useMemo(() => {
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
    
    return panelRequests.filter(req => {
      const submissionDate = new Date(req.submissionDate);
      return req.status === 'approved_coordinator' && submissionDate <= threeDaysAgo;
    });
  }, [panelRequests]);

  // Recent activity
  const recentActivity = useMemo(() => {
    return panelRequests
      .filter(req => req.status !== 'pending')
      .sort((a, b) => new Date(b.submissionDate).getTime() - new Date(a.submissionDate).getTime())
      .slice(0, 5);
  }, [panelRequests]);

  const handleSelectAll = () => {
    if (selectedRequests.length === filteredData.length) {
      setSelectedRequests([]);
    } else {
      setSelectedRequests(filteredData.map(req => req.id));
    }
  };

  const handleSelectRequest = (id: string) => {
    setSelectedRequests(prev => 
      prev.includes(id) 
        ? prev.filter(reqId => reqId !== id)
        : [...prev, id]
    );
  };

  const refreshServerPageAfterMutation = async () => {
    if (isServerPaged) {
      await refetchServerPage();
    }
    refreshDashStats();
  };

  const runRequestAction = async (
    requestId: string,
    action: () => Promise<boolean>
  ): Promise<boolean> => {
    setUpdatingRequestIds(prev => prev.includes(requestId) ? prev : [...prev, requestId]);

    try {
      const success = await action();
      if (success) {
        await refreshServerPageAfterMutation();
      }
      return success;
    } finally {
      setUpdatingRequestIds(prev => prev.filter(id => id !== requestId));
    }
  };

  const handleApproveRequest = async (requestId: string) => {
    await runRequestAction(requestId, async () => {
      return await onApprove(requestId, 'admin');
    });
  };

  const handleModalApprove = async (requestId: string, role: 'coordinator' | 'admin') => {
    await runRequestAction(requestId, async () => {
      return await onApprove(requestId, role);
    });
  };

  const handleModalReject = async (requestId: string, role: 'coordinator' | 'admin', reason: string) => {
    await runRequestAction(requestId, async () => {
      return await onReject(requestId, role, reason);
    });
  };

  const handleBulkApprove = async () => {
    if (selectedRequests.length === 0) return;
    
    const approvalTargets = selectedRequests.filter(id => {
      const request = panelRequests.find(req => req.id === id);
      return request && request.status === 'approved_coordinator';
    });

    setUpdatingRequestIds(prev => Array.from(new Set([...prev, ...approvalTargets])));
    await Promise.all(approvalTargets.map(id => onApprove(id, 'admin')));
    await refreshServerPageAfterMutation();
    setUpdatingRequestIds(prev => prev.filter(id => !approvalTargets.includes(id)));
    
    setSelectedRequests([]);
    showModal(`${approvalTargets.length} pengajuan berhasil disetujui.`);
  };

  const handleBulkReject = async () => {
    if (selectedRequests.length === 0) return;
    
    const rejectionTargets = selectedRequests.filter(id => {
      const request = panelRequests.find(req => req.id === id);
      return request && request.status === 'approved_coordinator';
    });

    setUpdatingRequestIds(prev => Array.from(new Set([...prev, ...rejectionTargets])));
    await Promise.all(rejectionTargets.map(id => onReject(id, 'admin', 'Ditolak melalui tindakan massal')));
    await refreshServerPageAfterMutation();
    setUpdatingRequestIds(prev => prev.filter(id => !rejectionTargets.includes(id)));
    
    setSelectedRequests([]);
    showModal(`${rejectionTargets.length} pengajuan berhasil ditolak.`);
  };

  const exportToExcel = () => {
    // Create CSV content (Excel compatible)
    const headers = [
      'No', 'Tanggal Pengajuan', 'Nama', 'Unit Kerja', 'Kecamatan', 'Jenjang',
      'Jenis Cuti', 'Tanggal Mulai', 'Tanggal Selesai', 'Status', 'Diperbaiki', 'Alasan Penolakan'
    ];

    const csvData = filteredData.map((request, index) => [
      index + 1,
      new Date(request.submissionDate).toLocaleDateString('id-ID'),
      request.nama,
      request.unitKerja,
      request.kecamatan,
      request.jenjang,
      request.jenisCuti,
      request.tanggalMulai,
      request.tanggalSelesai,
      request.status === 'pending' ? 'Menunggu Persetujuan' :
      request.status === 'approved_coordinator' ? 'Disetujui Koordinator Wilayah' :
      request.status === 'approved_admin' ? 'Disetujui Dinas Pendidikan' :
      request.status === 'document_issued' ? 'Surat Cuti Terbit' : 'Ditolak',
      request.isRevised ? 'Ya' : 'Tidak',
      request.rejectionReason || '-'
    ]);

    const csvContent = [headers, ...csvData]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `laporan-cuti-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePreview = (fileUrl: string, fileName: string) => {
    setPdfPreview({ isOpen: true, fileUrl, fileName });
  };

  const handleReject = (requestId: string) => {
    setRejectionModal({ isOpen: true, requestId, isRevision: false });
  };

  const handleRevision = (requestId: string) => {
    setRejectionModal({ isOpen: true, requestId, isRevision: true });
  };

  const handleRejectConfirm = async (reason: string) => {
    if (rejectionModal.isRevision) {
      // Revisi approval yang sudah diberikan - ubah status dari approved_admin ke rejected
      await runRequestAction(rejectionModal.requestId, async () => {
        return await onReject(rejectionModal.requestId, 'admin', `REVISI PERSETUJUAN: ${reason}`);
      });
      setRejectionModal({ isOpen: false, requestId: '', isRevision: false });
      showModal('Persetujuan berhasil direvisi dan pengajuan ditolak.');
    } else {
      // Penolakan biasa
      await runRequestAction(rejectionModal.requestId, async () => {
        return await onReject(rejectionModal.requestId, 'admin', reason);
      });
      setRejectionModal({ isOpen: false, requestId: '', isRevision: false });
    }
  };

  const handleDriveLink = (request: LeaveRequest) => {
    setDriveLinkModal({ isOpen: true, request });
  };

  const handleShowDetail = (request: LeaveRequest) => {
    setDetailModal({ isOpen: true, request });
  };

  const handleCloseDetail = () => {
    setDetailModal({ isOpen: false, request: null });
  };

  const handleDriveLinkSave = async (requestId: string, driveLink: string): Promise<boolean> => {
    try {
      console.log('Saving drive link for request:', requestId, 'Link:', driveLink);

      // Find the current request to check its status
      const currentRequest = panelRequests.find(req => req.id === requestId);
      const isAlreadyIssued = currentRequest?.status === 'document_issued';

      // Update the request with drive link and conditionally change status
      const updateData: any = { driveLink };

      // Only change status to document_issued if it's not already issued
      if (!isAlreadyIssued) {
        updateData.status = 'document_issued';
      }

      const success = await onUpdate(requestId, updateData);

      if (success) {
        if (isAlreadyIssued) {
          console.log('Drive link updated successfully for document_issued request');
          showModal('Tautan Google Drive berhasil diperbarui.');
        } else {
          console.log('Drive link saved successfully and status changed to document_issued');
          showModal('Tautan Google Drive berhasil disimpan. Status cuti berubah menjadi "Surat Cuti Terbit".');
        }
        setDriveLinkModal({ isOpen: false, request: null });
        await refreshServerPageAfterMutation();
        return true;
      } else {
        console.error('Update returned false');
        return false;
      }
    } catch (error) {
      console.error('Error saving drive link:', error);
      // Re-throw the error so DriveLinkModal can handle it
      throw error;
    }
  };

  const handleFinalLetterUpload = async (requestId: string, fileUrl: string): Promise<boolean> => {
    try {
      console.log('Saving final letter URL for request:', requestId, 'URL:', fileUrl);

      // Find the current request to check its status
      const currentRequest = panelRequests.find(req => req.id === requestId);
      const isAlreadyIssued = currentRequest?.status === 'document_issued';

      // Update the request with final letter URL and conditionally change status
      const updateData: any = { finalLetterUrl: fileUrl };

      // Only change status to document_issued if it's not already issued
      if (!isAlreadyIssued) {
        updateData.status = 'document_issued';
      }

      const success = await onUpdate(requestId, updateData);

      if (success) {
        if (isAlreadyIssued) {
          console.log('Final letter URL updated successfully for document_issued request');
          showModal('Surat final berhasil diperbarui.');
        } else {
          console.log('Final letter URL saved successfully and status changed to document_issued');
          showModal('Surat final berhasil diunggah. Status cuti berubah menjadi "Surat Cuti Terbit".');
        }
        await refreshServerPageAfterMutation();
        return true;
      } else {
        console.error('Update returned false');
        return false;
      }
    } catch (error) {
      console.error('Error saving final letter URL:', error);
      throw error;
    }
  };

  const renderDashboard = () => (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-indigo-50 rounded-xl p-6 border border-indigo-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-indigo-700">Total Pengajuan</p>
              <p className="text-3xl font-bold text-indigo-900">{stats.total}</p>
              <p className="text-xs text-indigo-600 mt-1">Semua waktu</p>
            </div>
            <FileText className="w-8 h-8 text-indigo-500" />
          </div>
        </div>

        <div className="bg-amber-50 rounded-xl p-6 border border-amber-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-amber-700">Menunggu Persetujuan</p>
              <p className="text-3xl font-bold text-amber-900">{stats.approvedCoordinator}</p>
              <p className="text-xs text-amber-600 mt-1">Perlu tindakan</p>
            </div>
            <Clock className="w-8 h-8 text-amber-500" />
          </div>
        </div>

        <div className="bg-emerald-50 rounded-xl p-6 border border-emerald-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-emerald-700">Tingkat Persetujuan</p>
              <p className="text-3xl font-bold text-green-900">{stats.approvalRate}%</p>
              <p className="text-xs text-emerald-600 mt-1">Dari total pengajuan</p>
            </div>
            <TrendingUp className="w-8 h-8 text-emerald-500" />
          </div>
        </div>

        <div className="bg-violet-50 rounded-xl p-6 border border-violet-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-violet-700">Rata-rata Waktu Proses</p>
              <p className="text-3xl font-bold text-violet-900">{stats.avgProcessingTime}</p>
              <p className="text-xs text-violet-600 mt-1">Hari</p>
            </div>
            <BarChart3 className="w-8 h-8 text-violet-500" />
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-slate-900">Tindakan Cepat</h3>
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => setExportModal(true)}
            className="flex items-center space-x-2 px-4 py-2 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-colors"
          >
            <Download className="w-4 h-4" />
            <span>Unduh Rekap Excel</span>
          </button>
          <button
            onClick={() => setActiveTab('approval')}
            className="flex items-center space-x-2 px-4 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors"
          >
            <Check className="w-4 h-4" />
            <span>Proses Persetujuan</span>
          </button>
          <button
            onClick={() => setActiveTab('analytics')}
            className="flex items-center space-x-2 px-4 py-2 bg-violet-600 text-white rounded-xl hover:bg-violet-700 transition-colors"
          >
            <BarChart3 className="w-4 h-4" />
            <span>Tampilkan Analitik</span>
          </button>
        </div>
      </div>

      {/* Quick Actions & Notifications */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Urgent Notifications */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <div className="flex items-center space-x-3 mb-4">
            <Bell className="w-5 h-5 text-rose-500" />
            <h3 className="text-lg font-semibold text-slate-900">Notifikasi Mendesak</h3>
            {urgentRequests.length > 0 && (
              <span className="bg-rose-100 text-rose-800 text-xs font-medium px-2.5 py-0.5 rounded-full">
                {urgentRequests.length}
              </span>
            )}
          </div>
          
          {urgentRequests.length === 0 ? (
            <p className="text-slate-500 text-sm">Tidak ada pengajuan mendesak</p>
          ) : (
            <div className="space-y-3">
              {urgentRequests.slice(0, 3).map(request => (
                <div key={request.id} className="flex items-center justify-between p-3 bg-rose-50 rounded-xl border border-rose-200">
                  <div>
                    <p className="font-medium text-red-900">{request.nama}</p>
                    <p className="text-sm text-rose-700">{request.unitKerja}</p>
                    <p className="text-xs text-rose-600">
                      Diajukan {Math.ceil((new Date().getTime() - new Date(request.submissionDate).getTime()) / (1000 * 60 * 60 * 24))} hari yang lalu
                    </p>
                  </div>
                  <AlertCircle className="w-5 h-5 text-rose-500" />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Activity */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <div className="flex items-center space-x-3 mb-4">
            <Activity className="w-5 h-5 text-indigo-500" />
            <h3 className="text-lg font-semibold text-slate-900">Aktivitas Terbaru</h3>
          </div>
          
          <div className="space-y-3">
            {recentActivity.map(request => (
              <div key={request.id} className="flex items-center space-x-3 p-3 bg-slate-50 rounded-xl">
                <div className="flex-shrink-0">
                  {request.status === 'approved_admin' ? (
                    <CheckCircle className="w-5 h-5 text-emerald-500" />
                  ) : request.status === 'rejected' ? (
                    <XCircle className="w-5 h-5 text-rose-500" />
                  ) : (
                    <Clock className="w-5 h-5 text-amber-500" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-900 truncate">{request.nama}</p>
                  <p className="text-xs text-slate-500">{request.unitKerja}</p>
                </div>
                <div className="text-xs text-slate-400">
                  {new Date(request.submissionDate).toLocaleDateString('id-ID')}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Document Downloads */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <div className="flex items-center space-x-3 mb-4">
            <FileText className="w-5 h-5 text-emerald-500" />
            <h3 className="text-lg font-semibold text-slate-900">Dokumen Siap Unduh</h3>
            {panelRequests.filter(req => req.status === 'approved_admin' || req.status === 'document_issued').length > 0 && (
              <span className="bg-emerald-100 text-emerald-800 text-xs font-medium px-2.5 py-0.5 rounded-full">
                {panelRequests.filter(req => req.status === 'approved_admin' || req.status === 'document_issued').length}
              </span>
            )}
          </div>

          {panelRequests.filter(req => req.status === 'approved_admin' || req.status === 'document_issued').length === 0 ? (
            <p className="text-slate-500 text-sm">Belum ada dokumen yang siap diunduh</p>
          ) : (
            <div className="space-y-3">
              {panelRequests.filter(req => req.status === 'approved_admin' || req.status === 'document_issued').slice(0, 3).map(request => (
                <div key={request.id} className="flex items-center justify-between p-3 bg-emerald-50 rounded-xl border border-emerald-200">
                  <div className="flex-1">
                    <p className="font-medium text-green-900">{request.nama}</p>
                    <p className="text-sm text-emerald-700">{request.jenisCuti}</p>
                    <p className="text-xs text-emerald-600">{request.unitKerja}</p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <DocumentDownloadButton
                      request={request}
                      onSuccess={showModal}
                      onError={showModal}
                      variant="outline"
                      size="sm"
                      workCalendarDays={workCalendarDays}
                    />
                    <AttachmentDownloadButton
                      request={request}
                      onSuccess={showModal}
                      onError={showModal}
                      variant="outline"
                      size="sm"
                    />
                  </div>
                </div>
              ))}
              {panelRequests.filter(req => req.status === 'approved_admin').length > 3 && (
                <div className="text-center pt-2">
                  <BulkDocumentDownloadButton
                    requests={panelRequests.filter(req => req.status === 'approved_admin')}
                    onSuccess={showModal}
                    onError={showModal}
                    workCalendarDays={workCalendarDays}
                  />
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const renderApprovalTab = () => (
    <div className="space-y-6">
      {/* Advanced Filters */}
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <div className="flex flex-wrap items-center gap-3 mb-4">
          <div className="flex-1 min-w-[140px]">
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Status</label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as FilterType)}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 outline-none transition-all"
            >
              <option value="all">Semua Status</option>
              <option value="pending">Menunggu</option>
              <option value="approved_coordinator">Disetujui Korwil</option>
              <option value="approved_admin">Disetujui Dinas</option>
              <option value="document_issued">Surat Terbit</option>
              <option value="rejected">Ditolak</option>
            </select>
          </div>
          <div className="flex-1 min-w-[140px]">
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Jenis Cuti</label>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Cuti Tahunan, Sakit..."
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 outline-none transition-all"
            />
          </div>
          <div className="flex-1 min-w-[120px]">
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Bulan</label>
            <select
              value={dateRange.start}
              onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 outline-none transition-all"
            >
              <option value="">Semua Bulan</option>
              {['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'].map((m, i) => (
                <option key={i} value={`${new Date().getFullYear()}-${String(i+1).padStart(2,'0')}`}>{m}</option>
              ))}
            </select>
          </div>
          <div className="flex-1 min-w-[100px]">
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Tahun</label>
            <select
              value={dateRange.end || ''}
              onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 outline-none transition-all"
            >
              <option value="">Semua Tahun</option>
              {Array.from({length:5},(_,i)=>new Date().getFullYear()-2+i).map(y=>(
                <option key={y} value={String(y)}>{y}</option>
              ))}
            </select>
          </div>
          <div className="min-w-[100px] flex items-end gap-2">
            <button
              onClick={exportToExcel}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-500 text-white text-sm font-semibold rounded-xl hover:bg-emerald-600 transition-colors"
            >
              <Download className="w-4 h-4" />
              Unduh Rekap Excel
            </button>
          </div>
        </div>
        <div className="text-xs text-slate-500">
          Menampilkan {displayStart}-{displayEnd} dari {totalDisplayCount} pengajuan
        </div>
      </div>

      {/* Bulk Actions */}
      {selectedRequests.length > 0 && (
        <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <span className="text-sm font-medium text-indigo-900">
                {selectedRequests.length} pengajuan dipilih
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={handleBulkApprove}
                className="flex items-center space-x-2 px-4 py-2 bg-emerald-500 text-white rounded-xl hover:bg-emerald-600 transition-colors duration-200"
              >
                <Check className="w-4 h-4" />
                <span>Setujui Semua</span>
              </button>
              <button
                onClick={handleBulkReject}
                className="flex items-center space-x-2 px-4 py-2 bg-rose-500 text-white rounded-xl hover:bg-rose-600 transition-colors duration-200"
              >
                <X className="w-4 h-4" />
                <span>Tolak Semua</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Data Table */}
      {serverError && (
        <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 text-rose-700">
          {serverError}
        </div>
      )}

      {serverLoading && (
        <div className="bg-white rounded-xl border border-slate-200 p-4 text-slate-600">
          Memuat data pengajuan...
        </div>
      )}

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        {filteredData.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-sm text-slate-500">Tidak ada data sesuai filter</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-slate-50">
                  <th className="px-4 py-3 w-10">
                    <input
                      type="checkbox"
                      checked={selectedRequests.length === filteredData.length}
                      onChange={handleSelectAll}
                      className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                    />
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Nama / NIP</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Unit / Jenis</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Tanggal</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {paginatedData.map((request, index) => (
                  <tr key={request.id} className="hover:bg-slate-50 transition-colors border-t border-slate-100">
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selectedRequests.includes(request.id)}
                        onChange={() => handleSelectRequest(request.id)}
                        className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-sm font-semibold text-slate-800">{request.nama}</p>
                      <p className="text-xs text-slate-500">{request.nip}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-sm text-slate-700">{request.unitKerja}</p>
                      <p className="text-xs text-slate-500">{request.jenjang} • {request.kecamatan} • {request.jenisCuti}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-sm text-slate-700 whitespace-nowrap">{formatTanggal(request.tanggalMulai)} → {formatTanggal(request.tanggalSelesai)}</p>
                      <p className="text-xs text-slate-400">
                        {countEffectiveLeaveDays(request.tanggalMulai, request.tanggalSelesai, workCalendarDays)} Hari • Diajukan {formatTanggal(request.submissionDate)}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <div className="space-y-1">
                        <StatusBadge status={request.status} />
                        {request.isRevised && (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-indigo-100 text-indigo-700">
                            Diperbaiki
                          </span>
                        )}
                      </div>
                      {request.isRevised && request.originalRejectionReason && (
                        <p className="mt-1 text-[10px] text-slate-500 max-w-[180px] truncate">
                          Alasan: {request.originalRejectionReason}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => handleShowDetail(request)}
                          className="p-1.5 rounded-xl text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                          title="Detail"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        {request.files?.length > 0 && (
                          <button
                            onClick={() => handlePreview(request.files[0].url, request.files[0].name)}
                            className="p-1.5 rounded-xl text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                            title="Lihat lampiran"
                          >
                            <FileText className="w-4 h-4" />
                          </button>
                        )}
                        {request.status === 'approved_coordinator' && (
                          <>
                            <button
                              onClick={() => handleApproveRequest(request.id)}
                              disabled={updatingRequestIds.includes(request.id)}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-emerald-500 text-white text-xs font-semibold rounded-xl hover:bg-emerald-600 disabled:opacity-50 transition-colors"
                            >
                              <Check className="w-3.5 h-3.5" />
                              Setujui
                            </button>
                            <button
                              onClick={() => handleReject(request.id)}
                              disabled={updatingRequestIds.includes(request.id)}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-rose-500 text-white text-xs font-semibold rounded-xl hover:bg-rose-600 disabled:opacity-50 transition-colors"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}
                        {(request.status === 'approved_admin' || request.status === 'document_issued') && (
                          <>
                            <button
                              onClick={() => handleDriveLink(request)}
                              className="p-1.5 rounded-xl text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                              title="Tautan Drive"
                            >
                              <Link className="w-4 h-4" />
                            </button>
                            {request.status === 'approved_admin' && (
                              <button
                                onClick={() => handleRevision(request.id)}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-amber-500 text-white text-xs font-semibold rounded-xl hover:bg-amber-600 transition-colors"
                              >
                                <X className="w-3.5 h-3.5" />
                                Revisi
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {filteredData.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center space-x-4">
              <span className="text-sm text-slate-600">
                Menampilkan {displayStart} - {displayEnd} dari {totalDisplayCount} data
              </span>
              <select
                value={itemsPerPage}
                onChange={(e) => {
                  const value = e.target.value;
                  if (value === 'all') {
                    setItemsPerPage('all');
                  } else {
                    setItemsPerPage(Number(value) as LeaveRequestPageSize);
                  }
                  setCurrentPage(1);
                }}
                className="px-3 py-1 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-violet-500 focus:border-transparent"
              >
                <option value={25}>25 per halaman</option>
                <option value={50}>50 per halaman</option>
                <option value={100}>100 per halaman</option>
                <option value={500}>500 per halaman</option>
                <option value="all">Semua</option>
              </select>
            </div>
            
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setCurrentPage(1)}
                disabled={currentPage === 1}
                className="px-3 py-1 text-sm border border-slate-300 rounded-xl hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                &laquo; Awal
              </button>
              <button
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="px-3 py-1 text-sm border border-slate-300 rounded-xl hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                &lsaquo; Sebelumnya
              </button>
              
              <div className="flex items-center space-x-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (currentPage <= 3) {
                    pageNum = i + 1;
                  } else if (currentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = currentPage - 2 + i;
                  }
                  return (
                    <button
                      key={pageNum}
                      onClick={() => setCurrentPage(pageNum)}
                      className={`px-3 py-1 text-sm border rounded-xl ${
                        currentPage === pageNum
                          ? 'bg-violet-600 text-white border-violet-600'
                          : 'border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
              </div>
              
              <button
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="px-3 py-1 text-sm border border-slate-300 rounded-xl hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Selanjutnya &rsaquo;
              </button>
              <button
                onClick={() => setCurrentPage(totalPages)}
                disabled={currentPage === totalPages}
                className="px-3 py-1 text-sm border border-slate-300 rounded-xl hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Akhir &raquo;
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  const renderReportsTab = () => (
    <div className="space-y-6">
      {/* Report Header */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <FileText className="w-5 h-5 text-slate-600" />
            <h4 className="text-lg font-semibold text-slate-900">Laporan & Analisis Data</h4>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={exportToExcel}
              className="flex items-center space-x-2 px-4 py-2 bg-indigo-500 text-white rounded-xl hover:bg-indigo-600 transition-colors duration-200"
            >
              <Download className="w-4 h-4" />
              <span>Ekspor Laporan</span>
            </button>
            <button className="flex items-center space-x-2 px-4 py-2 bg-slate-500 text-white rounded-xl hover:bg-slate-600 transition-colors duration-200">
              <RefreshCw className="w-4 h-4" />
              <span>Muat Ulang</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-indigo-50 rounded-xl p-4 border border-indigo-200">
            <h5 className="font-semibold text-indigo-900 mb-2">Laporan Harian</h5>
            <p className="text-sm text-indigo-700">Pengajuan hari ini: {panelRequests.filter(req => {
              const today = new Date().toDateString();
              return new Date(req.submissionDate).toDateString() === today;
            }).length}</p>
          </div>

          <div className="bg-emerald-50 rounded-xl p-4 border border-emerald-200">
            <h5 className="font-semibold text-green-900 mb-2">Laporan Mingguan</h5>
            <p className="text-sm text-emerald-700">Pengajuan minggu ini: {panelRequests.filter(req => {
              const weekAgo = new Date();
              weekAgo.setDate(weekAgo.getDate() - 7);
              return new Date(req.submissionDate) >= weekAgo;
            }).length}</p>
          </div>

          <div className="bg-violet-50 rounded-xl p-4 border border-violet-200">
            <h5 className="font-semibold text-violet-900 mb-2">Laporan Bulanan</h5>
            <p className="text-sm text-violet-700">Pengajuan bulan ini: {panelRequests.filter(req => {
              const thisMonth = new Date().getMonth();
              const thisYear = new Date().getFullYear();
              const reqDate = new Date(req.submissionDate);
              return reqDate.getMonth() === thisMonth && reqDate.getFullYear() === thisYear;
            }).length}</p>
          </div>
        </div>
      </div>

      {/* Processing Time Analysis */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h4 className="text-lg font-semibold text-slate-900 mb-4">Analisis Waktu Pemrosesan</h4>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-slate-50">
                <th className="px-4 py-3 text-left text-sm font-semibold text-slate-900">Nama</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-slate-900">Unit Kerja</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-slate-900">Tanggal Pengajuan</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-slate-900">Tanggal Persetujuan Korwil</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-slate-900">Tanggal Persetujuan Dinas</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-slate-900">Total Waktu</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-slate-900">Status</th>
              </tr>
            </thead>
            <tbody>
              {panelRequests.filter(req => req.status !== 'pending').slice(0, 10).map((request) => {
                const submissionDate = new Date(request.submissionDate);
                const now = new Date();
                const totalDays = Math.ceil((now.getTime() - submissionDate.getTime()) / (1000 * 60 * 60 * 24));

                return (
                  <tr key={request.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 text-sm text-slate-900 font-medium">{request.nama}</td>
                    <td className="px-4 py-3 text-sm text-slate-900">{request.unitKerja}</td>
                    <td className="px-4 py-3 text-sm text-slate-900">
                      {submissionDate.toLocaleDateString('id-ID')}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-900">
                      {request.status !== 'pending' ? submissionDate.toLocaleDateString('id-ID') : '-'}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-900">
                      {request.status === 'approved_admin' ? now.toLocaleDateString('id-ID') : '-'}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-900">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        totalDays <= 3 ? 'bg-emerald-100 text-emerald-800' :
                        totalDays <= 7 ? 'bg-amber-100 text-amber-800' :
                        'bg-rose-100 text-rose-800'
                      }`}>
                        {totalDays} hari
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center space-x-2">
                        <StatusBadge status={request.status} />
                        {request.isRevised && (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
                            Diperbaiki
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Summary Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h4 className="text-lg font-semibold text-slate-900 mb-4">Statistik per Jenjang</h4>
          <div className="space-y-3">
            {['TK', 'SD', 'SMP', 'SKB'].map(jenjang => {
              const count = panelRequests.filter(req => req.jenjang === jenjang).length;
              const percentage = panelRequests.length > 0 ? (count / panelRequests.length * 100).toFixed(1) : 0;

              return (
                <div key={jenjang} className="flex items-center justify-between">
                  <span className="text-sm font-medium text-slate-700">{jenjang}</span>
                  <div className="flex items-center space-x-2">
                    <div className="w-24 bg-slate-200 rounded-full h-2">
                      <div
                        className="bg-indigo-500 h-2 rounded-full"
                        style={{ width: `${percentage}%` }}
                      ></div>
                    </div>
                    <span className="text-sm text-slate-600">{count} ({percentage}%)</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h4 className="text-lg font-semibold text-slate-900 mb-4">Statistik per Jenis Cuti</h4>
          <div className="space-y-3">
            {['Cuti Tahunan', 'Cuti Sakit', 'Cuti Melahirkan', 'Cuti Besar'].map(jenis => {
              const count = panelRequests.filter(req => req.jenisCuti === jenis).length;
              const percentage = panelRequests.length > 0 ? (count / panelRequests.length * 100).toFixed(1) : 0;

              return (
                <div key={jenis} className="flex items-center justify-between">
                  <span className="text-sm font-medium text-slate-700">{jenis}</span>
                  <div className="flex items-center space-x-2">
                    <div className="w-24 bg-slate-200 rounded-full h-2">
                      <div
                        className="bg-emerald-500 h-2 rounded-full"
                        style={{ width: `${percentage}%` }}
                      ></div>
                    </div>
                    <span className="text-sm text-slate-600">{count} ({percentage}%)</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );

  const renderAnalyticsTab = () => (
    <div className="space-y-6">
      {/* Analytics Header */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <div className="flex items-center space-x-3 mb-4">
          <TrendingUp className="w-5 h-5 text-slate-600" />
          <h4 className="text-lg font-semibold text-slate-900">Analitik & Wawasan</h4>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-indigo-600">{stats.total}</div>
            <div className="text-sm text-slate-600">Total Pengajuan</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-amber-600">{stats.pending + stats.approvedCoordinator}</div>
            <div className="text-sm text-slate-600">Dalam Proses</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-emerald-600">{stats.approvedAdmin}</div>
            <div className="text-sm text-slate-600">Disetujui</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-rose-600">{stats.rejected}</div>
            <div className="text-sm text-slate-600">Ditolak</div>
          </div>
        </div>
      </div>

      {/* Performance Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h4 className="text-lg font-semibold text-slate-900 mb-4">Metrik Performa</h4>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-slate-700">Tingkat Persetujuan</span>
              <span className="text-lg font-bold text-emerald-600">{stats.approvalRate}%</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-slate-700">Rata-rata Waktu Proses</span>
              <span className="text-lg font-bold text-indigo-600">{stats.avgProcessingTime} hari</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-slate-700">Pengajuan Mendesak</span>
              <span className="text-lg font-bold text-rose-600">{urgentRequests.length}</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h4 className="text-lg font-semibold text-slate-900 mb-4">Tren Bulanan</h4>
          <div className="space-y-3">
            {Array.from({ length: 6 }, (_, i) => {
              const date = new Date();
              date.setMonth(date.getMonth() - i);
              const monthName = date.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
              const count = panelRequests.filter(req => {
                const reqDate = new Date(req.submissionDate);
                return reqDate.getMonth() === date.getMonth() && reqDate.getFullYear() === date.getFullYear();
              }).length;

              return (
                <div key={i} className="flex items-center justify-between">
                  <span className="text-sm text-slate-700">{monthName}</span>
                  <div className="flex items-center space-x-2">
                    <div className="w-20 bg-slate-200 rounded-full h-2">
                      <div
                        className="bg-violet-500 h-2 rounded-full"
                        style={{ width: `${Math.min(count * 10, 100)}%` }}
                      ></div>
                    </div>
                    <span className="text-sm font-medium text-slate-900">{count}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Detailed Analytics */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h4 className="text-lg font-semibold text-slate-900 mb-4">Analisis Mendalam</h4>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <h5 className="font-medium text-slate-900 mb-3">Top 5 Unit Kerja</h5>
            <div className="space-y-2">
              {Object.entries(
                panelRequests.reduce((acc, req) => {
                  acc[req.unitKerja] = (acc[req.unitKerja] || 0) + 1;
                  return acc;
                }, {} as Record<string, number>)
              )
                .sort(([,a], [,b]) => b - a)
                .slice(0, 5)
                .map(([unit, count]) => (
                  <div key={unit} className="flex items-center justify-between text-sm">
                    <span className="text-slate-700 truncate">{unit}</span>
                    <span className="font-medium text-slate-900">{count}</span>
                  </div>
                ))}
            </div>
          </div>

          <div>
            <h5 className="font-medium text-slate-900 mb-3">Top 5 Kecamatan</h5>
            <div className="space-y-2">
              {Object.entries(
                panelRequests.reduce((acc, req) => {
                  acc[req.kecamatan] = (acc[req.kecamatan] || 0) + 1;
                  return acc;
                }, {} as Record<string, number>)
              )
                .sort(([,a], [,b]) => b - a)
                .slice(0, 5)
                .map(([kecamatan, count]) => (
                  <div key={kecamatan} className="flex items-center justify-between text-sm">
                    <span className="text-slate-700">{kecamatan}</span>
                    <span className="font-medium text-slate-900">{count}</span>
                  </div>
                ))}
            </div>
          </div>

          <div>
            <h5 className="font-medium text-slate-900 mb-3">Waktu Respons</h5>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-700">≤ 3 hari</span>
                <span className="font-medium text-emerald-600">
                  {panelRequests.filter(req => {
                    if (req.status === 'pending') return false;
                    const days = Math.ceil((new Date().getTime() - new Date(req.submissionDate).getTime()) / (1000 * 60 * 60 * 24));
                    return days <= 3;
                  }).length}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-700">4-7 hari</span>
                <span className="font-medium text-amber-600">
                  {panelRequests.filter(req => {
                    if (req.status === 'pending') return false;
                    const days = Math.ceil((new Date().getTime() - new Date(req.submissionDate).getTime()) / (1000 * 60 * 60 * 24));
                    return days > 3 && days <= 7;
                  }).length}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-700">&gt; 7 hari</span>
                <span className="font-medium text-rose-600">
                  {panelRequests.filter(req => {
                    if (req.status === 'pending') return false;
                    const days = Math.ceil((new Date().getTime() - new Date(req.submissionDate).getTime()) / (1000 * 60 * 60 * 24));
                    return days > 7;
                  }).length}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Tab Navigation */}
      <div className="bg-white rounded-xl border border-slate-200 p-1">
        <div className="flex space-x-1">
          {[
            { id: 'dashboard', label: 'Dasbor', icon: BarChart3 },
            { id: 'approval', label: 'Persetujuan', icon: Check },
            { id: 'reports', label: 'Laporan', icon: FileText },
            { id: 'analytics', label: 'Analitik', icon: TrendingUp },
            ...(userRole === 'admin_disdik' ? [{ id: 'calendar', label: 'Kalender', icon: Calendar }] : [])
          ].map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as TabType)}
                className={`flex items-center space-x-2 px-4 py-2 text-sm font-medium rounded-xl transition-all duration-200 ${
                  activeTab === tab.id
                    ? 'bg-violet-500 text-white shadow-soft'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'dashboard' && renderDashboard()}
      {activeTab === 'approval' && renderApprovalTab()}
      {activeTab === 'reports' && renderReportsTab()}
      {activeTab === 'analytics' && renderAnalyticsTab()}
      {activeTab === 'calendar' && userRole === 'admin_disdik' && currentUser && (
        <WorkCalendarSettings user={currentUser} showModal={showModal} />
      )}
      
      {/* Modals */}
      <RejectionModal
        isOpen={rejectionModal.isOpen}
        onClose={() => setRejectionModal({ isOpen: false, requestId: '', isRevision: false })}
        onSubmit={handleRejectConfirm}
        isRevision={rejectionModal.isRevision}
      />

      {pdfPreview.isOpen && (
        <PDFPreviewModal
          isOpen={pdfPreview.isOpen}
          fileUrl={pdfPreview.fileUrl}
          fileName={pdfPreview.fileName}
          onClose={() => setPdfPreview({ isOpen: false, fileUrl: '', fileName: '' })}
        />
      )}

      {/* Drive Link Modal */}
      {driveLinkModal.request && (
        <DriveLinkModal
          isOpen={driveLinkModal.isOpen}
          request={driveLinkModal.request}
          onClose={() => setDriveLinkModal({ isOpen: false, request: null })}
          onSave={handleDriveLinkSave}
        />
      )}

      {/* Detail Modal */}
      <LeaveRequestDetailModal
        isOpen={detailModal.isOpen}
        request={detailModal.request}
        onClose={handleCloseDetail}
        existingRequests={panelRequests}
        userRole="admin"
        onApprove={handleModalApprove}
        onReject={handleModalReject}
        onFinalLetterUpload={handleFinalLetterUpload}
        showModal={showModal}
        workCalendarDays={workCalendarDays}
      />

      {/* Excel Export Modal */}
      <ExcelExportModal
        isOpen={exportModal}
        onClose={() => setExportModal(false)}
        leaveRequests={panelRequests}
        userRole="disdik"
        authUserRole={userRole}
        userPermissions={userPermissions}
        workCalendarDays={workCalendarDays}
      />
    </div>
  );
};

export default EnhancedAdminPanel;
