import React, { useState } from 'react';
import { Search, RefreshCw, Edit, Eye, Download, FileText, Calendar, Building2 } from 'lucide-react';
import LeaveRequestDetailModal from './LeaveRequestDetailModal';
import { LeaveRequest } from '../types';
import StatusBadge from './StatusBadge';
import { useWorkCalendar } from '../hooks/useWorkCalendar';
import { countEffectiveLeaveDays } from '../utils/workCalendar';

const dayNames = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
const monthNames = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

const formatTanggal = (dateStr: string) => {
  const d = new Date(`${dateStr}T00:00:00`);
  if (isNaN(d.getTime())) return dateStr;
  return `${dayNames[d.getDay()]}, ${d.getDate()} ${monthNames[d.getMonth()]} ${d.getFullYear()}`;
};

interface StatusPageProps {
  leaveRequests: LeaveRequest[];
  nipFilter: string;
  setNipFilter: (filter: string) => void;
  onEditRequest: (request: LeaveRequest) => void;
  checkLeaveStatusByNIP: (nip: string) => Promise<LeaveRequest[]>;
}

const statusLabel: Record<string, string> = {
  pending: 'Menunggu',
  approved_coordinator: 'Disetujui Korwil',
  approved_admin: 'Disetujui Dinas',
  document_issued: 'Surat Terbit',
  rejected: 'Ditolak',
};

const StatusPage: React.FC<StatusPageProps> = ({
  leaveRequests,
  nipFilter,
  setNipFilter,
  onEditRequest,
  checkLeaveStatusByNIP,
}) => {
  const [filteredRequests, setFilteredRequests] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [detailModal, setDetailModal] = useState<{
    isOpen: boolean;
    request: LeaveRequest | null;
  }>({ isOpen: false, request: null });
  const detailYear = detailModal.request
    ? new Date(`${detailModal.request.tanggalMulai}T00:00:00`).getFullYear()
    : new Date().getFullYear();
  const { days: workCalendarDays } = useWorkCalendar(detailYear);

  const searchedNip = filteredRequests.length > 0 ? filteredRequests[0].nip : nipFilter;
  const searchedNama = filteredRequests.length > 0 ? filteredRequests[0].nama : '';

  const handleSearch = async () => {
    if (!nipFilter.trim()) {
      setFilteredRequests([]);
      setSearched(false);
      return;
    }
    setLoading(true);
    try {
      const requests = await checkLeaveStatusByNIP(nipFilter.trim());
      setFilteredRequests(requests);
      setSearched(true);
    } catch {
      setFilteredRequests([]);
      setSearched(true);
    } finally {
      setLoading(false);
    }
  };

  const handleClear = () => {
    setNipFilter('');
    setFilteredRequests([]);
    setSearched(false);
  };

  const handleShowDetail = (request: LeaveRequest) => {
    setDetailModal({ isOpen: true, request });
  };

  const handleCloseDetail = () => {
    setDetailModal({ isOpen: false, request: null });
  };

  return (
    <div className="space-y-6">
      {/* Search card */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-soft">
        <div className="flex flex-col sm:flex-row gap-3 sm:items-end">
          <div className="flex-1">
            <label htmlFor="nipFilter" className="block text-sm font-semibold text-slate-700 mb-1.5">
              Cari berdasarkan NIP
            </label>
            <input
              type="text"
              id="nipFilter"
              value={nipFilter}
              onChange={(e) => setNipFilter(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="Masukkan NIP (18 digit)"
              className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleSearch}
              disabled={loading}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-indigo-700 disabled:opacity-50 transition-colors"
            >
              <Search className="w-4 h-4" />
              {loading ? 'Mencari...' : 'Cari'}
            </button>
            <button
              onClick={handleClear}
              className="inline-flex items-center gap-2 px-4 py-2.5 border border-slate-200 text-sm font-semibold text-slate-600 rounded-xl hover:bg-slate-50 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              Atur Ulang
            </button>
          </div>
        </div>
      </div>

      {/* Empty state */}
      {!searched && (
        <div className="rounded-xl border border-slate-200 bg-white p-12 text-center shadow-soft">
          <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Search className="w-7 h-7 text-slate-400" />
          </div>
          <p className="text-slate-500">Masukkan NIP untuk melihat status pengajuan cuti Anda.</p>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="rounded-xl border border-slate-200 bg-white p-12 text-center shadow-soft">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-500 mx-auto mb-4" />
          <p className="text-slate-500">Mencari pengajuan...</p>
        </div>
      )}

      {/* Empty results */}
      {searched && !loading && filteredRequests.length === 0 && (
        <div className="rounded-xl border border-slate-200 bg-white p-12 text-center shadow-soft">
          <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Search className="w-7 h-7 text-slate-400" />
          </div>
          <p className="text-slate-500">Tidak ada pengajuan cuti untuk NIP ini.</p>
        </div>
      )}

      {/* Results */}
      {searched && !loading && filteredRequests.length > 0 && (
        <>
          {/* User info banner */}
          <div className="rounded-xl border border-indigo-100 bg-indigo-50/50 p-4 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-6">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-indigo-500 flex items-center justify-center text-white text-sm font-bold">
                {searchedNama.charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-800">{searchedNama}</p>
                <p className="text-xs text-slate-500">NIP: {searchedNip}</p>
              </div>
            </div>
            <div className="text-xs text-slate-500 sm:ml-auto">
              {filteredRequests.length} pengajuan ditemukan
            </div>
          </div>

          {/* Desktop table — hidden on mobile */}
          <div className="hidden md:block rounded-xl border border-slate-200 bg-white shadow-soft overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-slate-50">
                    <th className="px-5 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">No</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Jenis Cuti</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Tanggal</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Status</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRequests.map((request, index) => (
                    <tr key={request.id} className="hover:bg-slate-50 transition-colors border-t border-slate-100">
                      <td className="px-5 py-3.5 text-sm text-slate-600">{index + 1}</td>
                      <td className="px-5 py-3.5">
                        <div>
                          <p className="text-sm font-medium text-slate-800">{request.jenisCuti}</p>
                          <p className="text-xs text-slate-500">{request.unitKerja} — {request.kecamatan}</p>
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        <p className="text-sm text-slate-700 font-medium">
                          {formatTanggal(request.tanggalMulai)} → {formatTanggal(request.tanggalSelesai)}
                        </p>
                        <p className="text-xs text-slate-400 mt-0.5">
                          {countEffectiveLeaveDays(request.tanggalMulai, request.tanggalSelesai, workCalendarDays)} Hari — Diajukan {formatTanggal(request.submissionDate)}
                        </p>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="space-y-1">
                          <StatusBadge status={request.status} />
                          {request.isRevised && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-700">
                              Diperbaiki
                            </span>
                          )}
                        </div>
                        {request.status === 'rejected' && request.rejectionReason && (
                          <p className="mt-1 text-xs text-rose-600 max-w-[200px] truncate">
                            {request.rejectionReason}
                          </p>
                        )}
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2">
                          {request.status === 'rejected' ? (
                            <button
                              onClick={() => onEditRequest(request)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 text-white text-xs font-semibold rounded-xl hover:bg-amber-600 transition-colors"
                            >
                              <Edit className="w-3.5 h-3.5" />
                              Perbaiki
                            </button>
                          ) : (
                            <button
                              onClick={() => handleShowDetail(request)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-500 text-white text-xs font-semibold rounded-xl hover:bg-indigo-600 transition-colors"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              Detail
                            </button>
                          )}
                          {(request.status === 'approved_admin' || request.status === 'document_issued') && request.driveLink && (
                            <a
                              href={request.driveLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500 text-white text-xs font-semibold rounded-xl hover:bg-emerald-600 transition-colors"
                            >
                              <Download className="w-3.5 h-3.5" />
                              Surat
                            </a>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile cards — hidden on desktop */}
          <div className="md:hidden space-y-3">
            {filteredRequests.map((request, index) => (
              <div key={request.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-soft">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-800 truncate">
                      {request.jenisCuti}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <StatusBadge status={request.status} />
                      {request.isRevised && (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-indigo-100 text-indigo-700">
                          Revisi
                        </span>
                      )}
                    </div>
                  </div>
                  <span className="text-xs font-medium text-slate-400 shrink-0">#{index + 1}</span>
                </div>

                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2 text-slate-600">
                    <Calendar className="w-3.5 h-3.5 shrink-0" />
                    <span className="text-xs">{formatTanggal(request.tanggalMulai)} → {formatTanggal(request.tanggalSelesai)}</span>
                    <span className="text-[10px] font-semibold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded-full">{countEffectiveLeaveDays(request.tanggalMulai, request.tanggalSelesai, workCalendarDays)} Hari</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-600">
                    <Building2 className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">{request.unitKerja}</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-600">
                    <FileText className="w-3.5 h-3.5 shrink-0" />
                    <span>{request.jenjang} — {request.kecamatan}</span>
                  </div>
                </div>

                {request.status === 'rejected' && request.rejectionReason && (
                  <div className="mt-3 p-2.5 rounded-xl bg-rose-50 border border-rose-100">
                    <p className="text-xs text-rose-700 font-medium">Alasan penolakan:</p>
                    <p className="text-xs text-rose-600 mt-0.5">{request.rejectionReason}</p>
                  </div>
                )}

                <div className="flex items-center gap-2 mt-3 pt-3 border-t border-slate-100">
                  <p className="text-[11px] text-slate-400 mr-auto">
                    Diajukan {formatTanggal(request.submissionDate)}
                  </p>
                  {request.status === 'rejected' ? (
                    <button
                      onClick={() => onEditRequest(request)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 text-white text-xs font-semibold rounded-xl hover:bg-amber-600 transition-colors"
                    >
                      <Edit className="w-3.5 h-3.5" />
                      Perbaiki
                    </button>
                  ) : (
                    <button
                      onClick={() => handleShowDetail(request)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-500 text-white text-xs font-semibold rounded-xl hover:bg-indigo-600 transition-colors"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      Detail
                    </button>
                  )}
                  {(request.status === 'approved_admin' || request.status === 'document_issued') && request.driveLink && (
                    <a
                      href={request.driveLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500 text-white text-xs font-semibold rounded-xl hover:bg-emerald-600 transition-colors"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      <LeaveRequestDetailModal
        isOpen={detailModal.isOpen}
        request={detailModal.request}
        onClose={handleCloseDetail}
        existingRequests={filteredRequests.length > 0 ? filteredRequests : leaveRequests}
        userRole="user"
        workCalendarDays={workCalendarDays}
      />
    </div>
  );
};

export default StatusPage;
