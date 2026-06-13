import React, { useState, useMemo } from 'react';
import { Download, Check, X, Eye, BarChart3, Clock, CheckCircle, FileText } from 'lucide-react';
import { LeaveRequest } from '../types';
import StatusBadge from './StatusBadge';
import RejectionModal from './RejectionModal';
import PDFPreviewModal from './PDFPreviewModal';
import LeaveRequestDetailModal from './LeaveRequestDetailModal';
import ExcelExportModal from './ExcelExportModal';
import { countEffectiveLeaveDays } from '../utils/workCalendar';
import { useWorkCalendar } from '../hooks/useWorkCalendar';
import { db } from '../utils/database';
import { LeaveRequestPageSize, usePagedLeaveRequests } from '../hooks/usePagedLeaveRequests';

interface CoordinatorPanelProps {
  leaveRequests: LeaveRequest[];
  onApprove: (id: string, role: 'coordinator' | 'admin') => void;
  onReject: (id: string, role: 'coordinator' | 'admin', reason: string) => void;
  showModal: (message: string) => void;
  userRole?: string;
  userPermissions?: any;
}

const PAGINATION_OPTIONS: { value: LeaveRequestPageSize; label: string }[] = [
  { value: 20, label: '20' },
  { value: 100, label: '100' },
  { value: 'all', label: 'Semua' },
];

const monthNames = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
const formatTanggal = (dateStr: string) => {
  if (!dateStr) return '-';
  const d = new Date(`${dateStr}T00:00:00`);
  if (isNaN(d.getTime())) return dateStr;
  return `${d.getDate()} ${monthNames[d.getMonth()]} ${d.getFullYear()}`;
};

const CoordinatorPanel: React.FC<CoordinatorPanelProps> = ({
  leaveRequests,
  onApprove,
  onReject,
  showModal,
  userRole,
  userPermissions,
}) => {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'history'>('history');
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'approved_coordinator' | 'approved_admin' | 'document_issued' | 'rejected'>('pending');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState<LeaveRequestPageSize>(10);

  const [rejectionModal, setRejectionModal] = useState<{ isOpen: boolean; requestId: string }>({ isOpen: false, requestId: '' });
  const [pdfPreview, setPdfPreview] = useState<{ isOpen: boolean; fileUrl: string; fileName: string }>({ isOpen: false, fileUrl: '', fileName: '' });
  const [detailModal, setDetailModal] = useState<{ isOpen: boolean; request: LeaveRequest | null }>({ isOpen: false, request: null });
  const detailYear = detailModal.request
    ? new Date(`${detailModal.request.tanggalMulai}T00:00:00`).getFullYear()
    : new Date().getFullYear();
  const { days: workCalendarDays } = useWorkCalendar(detailYear);
  const [exportModal, setExportModal] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const pageFilters = useMemo(() => ({
    status: filterStatus,
    searchTerm,
    userRole,
    userPermissions,
  }), [filterStatus, searchTerm, userRole, userPermissions]);

  const serverPageSize = itemsPerPage === 'all' ? 'all' : itemsPerPage;

  const {
    leaveRequests: pagedRequests,
    totalCount: totalCount,
    loading: serverLoading,
    error: serverError,
    refetch: refetchServerPage,
  } = usePagedLeaveRequests({
    enabled: true,
    page: currentPage,
    pageSize: serverPageSize,
    filters: pageFilters,
  });

  const panelRequests = pagedRequests;

  const [stats, setStats] = useState({ total: 0, pending: 0, approved: 0, finalApproved: 0, documentIssued: 0, rejected: 0 });

  // Dashboard stats — unfiltered, independent of active status filter
  const refreshStats = React.useCallback(async () => {
    try {
      const counts = await db.getLeaveRequestsCounts({ userRole, userPermissions });
      setStats({
        total: counts.total,
        pending: counts.pending,
        approved: counts.approved_coordinator,
        finalApproved: counts.approved_admin,
        documentIssued: counts.document_issued,
        rejected: counts.rejected,
      });
    } catch {
      // silently ignore
    }
  }, [userRole, userPermissions]);

  React.useEffect(() => { refreshStats(); }, [refreshStats]);

  const pendingRequests = useMemo(() => panelRequests.filter(req => req.status === 'pending'), [panelRequests]);

  const totalPages = useMemo(() => {
    const n = itemsPerPage === 'all' ? (totalCount || 1) : itemsPerPage;
    return Math.max(Math.ceil(totalCount / n), 1);
  }, [totalCount, itemsPerPage]);

  const displayStart = totalCount === 0 ? 0 : (currentPage - 1) * (itemsPerPage === 'all' ? totalCount : itemsPerPage) + 1;
  const displayEnd = itemsPerPage === 'all' ? totalCount : Math.min(currentPage * itemsPerPage, totalCount);

  React.useEffect(() => { setCurrentPage(1); }, [filterStatus, searchTerm]);

  const refreshAfterMutation = async () => {
    await refetchServerPage();
    refreshStats();
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const toggleSelectAll = () => {
    setSelectedIds(prev => prev.length === pendingRequests.length ? [] : pendingRequests.map(r => r.id));
  };

  const handleBulkApprove = async () => {
    for (const id of selectedIds) onApprove(id, 'coordinator');
    setSelectedIds([]);
    await refreshAfterMutation();
  };

  const handleBulkReject = async () => {
    for (const id of selectedIds) onReject(id, 'coordinator', 'Ditolak melalui tindakan massal');
    setSelectedIds([]);
    await refreshAfterMutation();
  };

  const handleApprove = async (id: string) => {
    onApprove(id, 'coordinator');
    await refreshAfterMutation();
  };

  const handleRejectAction = async (reason: string) => {
    onReject(rejectionModal.requestId, 'coordinator', reason);
    setRejectionModal({ isOpen: false, requestId: '' });
    await refreshAfterMutation();
  };

  const handlePreview = (fileUrl: string, fileName: string) => {
    setPdfPreview({ isOpen: true, fileUrl, fileName });
  };

  const handleShowDetail = (request: LeaveRequest) => {
    setDetailModal({ isOpen: true, request });
  };

  return (
    <div className="space-y-6">
      {/* Tab Navigation */}
      <div className="bg-white rounded-xl shadow-card">
        <div className="border-b border-slate-200">
          <nav className="flex space-x-6 px-6">
            {[
              { id: 'dashboard' as const, label: 'Dasbor', icon: BarChart3 },
              { id: 'history' as const, label: 'Semua Usulan', icon: FileText },
            ].map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm ${
                    activeTab === tab.id
                      ? 'border-amber-500 text-amber-600'
                      : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Dashboard Tab */}
      {activeTab === 'dashboard' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white rounded-xl shadow-card p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600">Total Pengajuan</p>
                  <p className="text-2xl font-bold text-slate-900">{stats.total}</p>
                </div>
                <div className="p-3 bg-indigo-100 rounded-full">
                  <FileText className="h-5 w-5 text-indigo-600" />
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl shadow-card p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600">Menunggu</p>
                  <p className="text-2xl font-bold text-amber-600">{stats.pending}</p>
                </div>
                <div className="p-3 bg-amber-100 rounded-full">
                  <Clock className="h-5 w-5 text-amber-600" />
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl shadow-card p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600">Disetujui</p>
                  <p className="text-2xl font-bold text-emerald-600">{stats.approved + stats.finalApproved + stats.documentIssued}</p>
                </div>
                <div className="p-3 bg-emerald-100 rounded-full">
                  <CheckCircle className="h-5 w-5 text-emerald-600" />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Unified Table — Filter + List */}
      {activeTab === 'history' && (
        <>
          {/* Filters */}
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <div className="flex flex-wrap items-end gap-3">
              <div className="flex-1 min-w-[130px]">
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Status</label>
                <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value as any)} className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500/20 focus:border-amber-400 outline-none">
                  <option value="all">Semua</option>
                  <option value="pending">Menunggu</option>
                  <option value="approved_coordinator">Disetujui Korwil</option>
                  <option value="approved_admin">Disetujui Dinas</option>
                  <option value="document_issued">Surat Terbit</option>
                  <option value="rejected">Ditolak</option>
                </select>
              </div>
              <div className="flex-[2] min-w-[180px]">
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Pencarian</label>
                <input type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Nama, unit, kecamatan, cuti..." className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500/20 focus:border-amber-400 outline-none" />
              </div>
              <div className="flex items-end gap-2">
                <button onClick={() => setExportModal(true)} className="flex items-center gap-2 px-4 py-2 bg-emerald-500 text-white text-sm font-semibold rounded-xl hover:bg-emerald-600 transition-colors">
                  <Download className="w-4 h-4" />Unduh Rekap Excel
                </button>
              </div>
            </div>
          </div>

          {serverError && <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 text-rose-700 text-sm">{serverError}</div>}
          {serverLoading && <div className="bg-white rounded-xl border border-slate-200 p-4 text-slate-600 text-sm">Memuat...</div>}

          {/* Bulk actions — only when filter is pending */}
          {selectedIds.length > 0 && filterStatus === 'pending' && (
            <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-3 flex items-center justify-between">
              <span className="text-sm font-medium text-indigo-900">{selectedIds.length} dipilih</span>
              <div className="flex items-center gap-2">
                <button onClick={handleBulkApprove} className="inline-flex items-center gap-1 px-3 py-1.5 bg-emerald-500 text-white text-xs font-semibold rounded-xl hover:bg-emerald-600 transition-colors">
                  <Check className="w-3.5 h-3.5" />Setujui Semua
                </button>
                <button onClick={handleBulkReject} className="inline-flex items-center gap-1 px-3 py-1.5 bg-rose-500 text-white text-xs font-semibold rounded-xl hover:bg-rose-600 transition-colors">
                  <X className="w-3.5 h-3.5" />Tolak Semua
                </button>
              </div>
            </div>
          )}

          {/* Pagination top */}
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-500">{displayStart}-{displayEnd} dari {totalCount}</span>
            <select value={itemsPerPage} onChange={(e) => { const v = e.target.value; setItemsPerPage(v === 'all' ? 'all' : Number(v) as LeaveRequestPageSize); setCurrentPage(1); }} className="px-2 py-1 border border-slate-200 rounded-xl text-xs">
              {PAGINATION_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label} per halaman</option>)}
            </select>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-slate-50">
                    {filterStatus === 'pending' && <th className="px-3 py-3 w-10">
                      <input type="checkbox" checked={selectedIds.length === pendingRequests.length && pendingRequests.length > 0} onChange={toggleSelectAll} className="rounded border-slate-300 text-amber-600 focus:ring-amber-500" />
                    </th>}
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Nama / NIP</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Unit / Jenis</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Tanggal</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {panelRequests.map((request) => {
                    const isPending = request.status === 'pending';
                    return (
                    <tr key={request.id} className="hover:bg-slate-50 transition-colors border-t border-slate-100">
                      {filterStatus === 'pending' && <td className="px-3 py-3">
                        <input type="checkbox" checked={selectedIds.includes(request.id)} onChange={() => toggleSelect(request.id)} className="rounded border-slate-300 text-amber-600 focus:ring-amber-500" />
                      </td>}
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
                        <p className="text-xs text-slate-400">{countEffectiveLeaveDays(request.tanggalMulai, request.tanggalSelesai, workCalendarDays)} Hari • Diajukan {formatTanggal(request.submissionDate)}</p>
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={request.status} />
                        {request.isRevised && <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-indigo-100 text-indigo-700 ml-1">Revisi</span>}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {request.files?.length > 0 && (
                            <button onClick={() => handlePreview(request.files[0].url, request.files[0].name)} className="p-1.5 rounded-xl text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 transition-colors" title="Lihat berkas">
                              <FileText className="w-4 h-4" />
                            </button>
                          )}
                          <button onClick={() => handleShowDetail(request)} className="p-1.5 rounded-xl text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 transition-colors" title="Detail">
                            <Eye className="w-4 h-4" />
                          </button>
                          {isPending ? (
                            <>
                              <button onClick={() => handleApprove(request.id)} className="inline-flex items-center gap-1 px-3 py-1.5 bg-emerald-500 text-white text-xs font-semibold rounded-xl hover:bg-emerald-600 transition-colors">
                                <Check className="w-3.5 h-3.5" />Setujui
                              </button>
                              <button onClick={() => setRejectionModal({ isOpen: true, requestId: request.id })} className="inline-flex items-center gap-1 px-3 py-1.5 bg-rose-500 text-white text-xs font-semibold rounded-xl hover:bg-rose-600 transition-colors">
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination bottom */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2">
              <button onClick={() => setCurrentPage(1)} disabled={currentPage === 1} className="px-3 py-1 text-sm border border-slate-200 rounded-xl hover:bg-slate-50 disabled:opacity-30">«</button>
              <button onClick={() => setCurrentPage(p => Math.max(p-1,1))} disabled={currentPage === 1} className="px-3 py-1 text-sm border border-slate-200 rounded-xl hover:bg-slate-50 disabled:opacity-30">‹</button>
              <span className="text-sm text-slate-600 px-2">{currentPage} / {totalPages}</span>
              <button onClick={() => setCurrentPage(p => Math.min(p+1,totalPages))} disabled={currentPage === totalPages} className="px-3 py-1 text-sm border border-slate-200 rounded-xl hover:bg-slate-50 disabled:opacity-30">›</button>
              <button onClick={() => setCurrentPage(totalPages)} disabled={currentPage === totalPages} className="px-3 py-1 text-sm border border-slate-200 rounded-xl hover:bg-slate-50 disabled:opacity-30">»</button>
            </div>
          )}
        </>
      )}

      {/* Modals */}
      <RejectionModal isOpen={rejectionModal.isOpen} onClose={() => setRejectionModal({ isOpen: false, requestId: '' })} onSubmit={handleRejectAction} />
      <PDFPreviewModal isOpen={pdfPreview.isOpen} onClose={() => setPdfPreview({ isOpen: false, fileUrl: '', fileName: '' })} fileUrl={pdfPreview.fileUrl} fileName={pdfPreview.fileName} />
      <LeaveRequestDetailModal isOpen={detailModal.isOpen} onClose={() => setDetailModal({ isOpen: false, request: null })} request={detailModal.request} existingRequests={leaveRequests} userRole="coordinator" onApprove={onApprove} onReject={onReject} showModal={showModal} workCalendarDays={workCalendarDays} />
      <ExcelExportModal isOpen={exportModal} onClose={() => setExportModal(false)} leaveRequests={panelRequests} userRole="coordinator" authUserRole={userRole} userPermissions={userPermissions} workCalendarDays={workCalendarDays} />
    </div>
  );
};

export default CoordinatorPanel;
