import React, { useState, useEffect } from 'react';
import { X, Download, Calendar, Building, Filter } from 'lucide-react';
import { LeaveRequest } from '../types';
import { exportAllLeaveRequests, exportLeaveRequestsByUnit, exportLeaveRequestsByStatus } from '../utils/excelExport';
import { WorkCalendarDay } from '../utils/workCalendar';

interface ExcelExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  leaveRequests: LeaveRequest[];
  userRole?: 'admin' | 'coordinator' | 'disdik';
  userUnitKerja?: string;
  authUserRole?: string;
  userPermissions?: any;
  workCalendarDays?: WorkCalendarDay[];
}

const ExcelExportModal: React.FC<ExcelExportModalProps> = ({
  isOpen,
  onClose,
  leaveRequests,
  userRole = 'admin',
  userUnitKerja,
  authUserRole,
  userPermissions,
  workCalendarDays = [],
}) => {
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [selectedUnit, setSelectedUnit] = useState<string>(userUnitKerja || '');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [isExporting, setIsExporting] = useState(false);
  const [fullData, setFullData] = useState<LeaveRequest[] | null>(null);
  const [isLoadingFull, setIsLoadingFull] = useState(false);

  // Load ALL data from DB so export is complete regardless of client-side pagination.
  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;

    const load = async () => {
      setIsLoadingFull(true);
      try {
        const { db } = await import('../utils/database');
        const { transformDBToFrontend } = await import('../hooks/useLeaveRequests');

        if (userRole === 'disdik') {
          const allRecords = await db.getAllLeaveRequests();
          if (!cancelled) setFullData(allRecords.map(transformDBToFrontend));
        } else {
          // For coordinator / SMP-SKB: load all records the panel would show
          const { data } = await db.getLeaveRequestsPage({
            page: 1,
            pageSize: 'all',
            filters: {
              status: 'all',
            },
          });
          if (!cancelled) setFullData(data.map(transformDBToFrontend));
        }
      } catch {
        if (!cancelled) setFullData(leaveRequests);
      } finally {
        if (!cancelled) setIsLoadingFull(false);
      }
    };

    load();
    return () => { cancelled = true; };
  }, [isOpen, userRole, authUserRole, userPermissions, leaveRequests]);

  const effectiveData = fullData ?? leaveRequests;

  if (!isOpen) return null;

  const months = [
    { value: 1, label: 'Januari' },
    { value: 2, label: 'Februari' },
    { value: 3, label: 'Maret' },
    { value: 4, label: 'April' },
    { value: 5, label: 'Mei' },
    { value: 6, label: 'Juni' },
    { value: 7, label: 'Juli' },
    { value: 8, label: 'Agustus' },
    { value: 9, label: 'September' },
    { value: 10, label: 'Oktober' },
    { value: 11, label: 'November' },
    { value: 12, label: 'Desember' }
  ];

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i);

  const uniqueUnits = Array.from(new Set(effectiveData.map(req => req.unitKerja))).sort();

  const statusOptions = [
    { value: 'all', label: 'Semua Status' },
    { value: 'pending', label: 'Menunggu Persetujuan' },
    { value: 'approved_coordinator', label: 'Disetujui Koordinator Wilayah' },
    { value: 'approved_admin', label: 'Disetujui Dinas Pendidikan' },
    { value: 'rejected', label: 'Ditolak' }
  ];

  const handleExport = async () => {
    setIsExporting(true);
    
    try {
      let result;

      if (selectedStatus !== 'all') {
        result = exportLeaveRequestsByStatus(
          effectiveData,
          selectedMonth,
          selectedYear,
          selectedStatus,
          userRole === 'disdik' ? selectedUnit : userUnitKerja,
          workCalendarDays
        );
      } else if (userRole === 'disdik' && selectedUnit) {
        result = exportLeaveRequestsByUnit(effectiveData, selectedMonth, selectedYear, selectedUnit, workCalendarDays);
      } else if (userRole === 'disdik') {
        result = exportAllLeaveRequests(effectiveData, selectedMonth, selectedYear, workCalendarDays);
      } else {
        result = exportLeaveRequestsByUnit(effectiveData, selectedMonth, selectedYear, userUnitKerja || '', workCalendarDays);
      }

      if (result.success) {
        alert(`✅ ${result.message}\nBerkas: ${result.filename}\nTotal: ${result.totalRecords} data`);
        onClose();
      }
    } catch (error) {
      console.error('Export error:', error);
      alert('❌ Gagal mengekspor data. Silakan coba kembali.');
    } finally {
      setIsExporting(false);
    }
  };

  const getPreviewCount = () => {
    let filtered = effectiveData.filter(request => {
      const startDate = new Date(request.tanggalMulai);
      return startDate.getMonth() + 1 === selectedMonth && startDate.getFullYear() === selectedYear;
    });

    if (selectedStatus !== 'all') {
      if (selectedStatus === 'approved_admin') {
        filtered = filtered.filter(req =>
          req.status === 'approved_admin' || req.status === 'document_issued'
        );
      } else {
        filtered = filtered.filter(req => req.status === selectedStatus);
      }
    }

    if (userRole !== 'disdik' && userUnitKerja) {
      filtered = filtered.filter(req => req.unitKerja.toLowerCase().includes(userUnitKerja.toLowerCase()));
    } else if (userRole === 'disdik' && selectedUnit) {
      filtered = filtered.filter(req => req.unitKerja.toLowerCase().includes(selectedUnit.toLowerCase()));
    }

    return filtered.length;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-slate-200 flex-shrink-0">
          <div className="flex items-center space-x-2">
            <Download className="w-5 h-5 text-emerald-600" />
            <h3 className="text-lg font-semibold text-slate-900">Unduh Rekap Cuti</h3>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4 overflow-y-auto flex-1">
          {/* Month Selection */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              <Calendar className="w-4 h-4 inline mr-1" />
              Bulan
            </label>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(Number(e.target.value))}
              className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            >
              {months.map(month => (
                <option key={month.value} value={month.value}>
                  {month.label}
                </option>
              ))}
            </select>
          </div>

          {/* Year Selection */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Tahun
            </label>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            >
              {years.map(year => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          </div>

          {/* Status Selection */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              <Filter className="w-4 h-4 inline mr-1" />
              Status Cuti
            </label>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            >
              {statusOptions.map(status => (
                <option key={status.value} value={status.value}>
                  {status.label}
                </option>
              ))}
            </select>
          </div>

          {/* Unit Kerja Selection (for disdik admin) */}
          {userRole === 'disdik' && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                <Building className="w-4 h-4 inline mr-1" />
                Unit Kerja (Opsional)
              </label>
              <select
                value={selectedUnit}
                onChange={(e) => setSelectedUnit(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              >
                <option value="">Semua Unit Kerja</option>
                {uniqueUnits.map(unit => (
                  <option key={unit} value={unit}>
                    {unit}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Preview Info */}
          <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-3">
            {isLoadingFull ? (
              <p className="text-sm text-indigo-800">Memuat data...</p>
            ) : (
              <>
                <p className="text-sm text-indigo-800">
                  <strong>Pratinjau:</strong> {getPreviewCount()} pengajuan cuti akan diekspor
                </p>
                <p className="text-xs text-indigo-600 mt-1">
                  Periode: {months.find(m => m.value === selectedMonth)?.label} {selectedYear}
                  {selectedStatus !== 'all' && ` - ${statusOptions.find(s => s.value === selectedStatus)?.label}`}
                  {userRole === 'disdik' && selectedUnit && ` - ${selectedUnit}`}
                  {userRole !== 'disdik' && userUnitKerja && ` - ${userUnitKerja}`}
                </p>
              </>
            )}
          </div>

          {/* Export Info */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
            <p className="text-sm text-slate-700 font-medium mb-1">Format Ekspor:</p>
            <ul className="text-xs text-slate-600 space-y-1">
              <li>• File Excel (.xlsx)</li>
              <li>• Data lengkap termasuk tautan dokumen</li>
              <li>• Ringkasan statistik di akhir</li>
              <li>• Format siap cetak</li>
            </ul>
          </div>
        </div>

        <div className="flex justify-end space-x-3 p-6 border-t border-slate-200 flex-shrink-0 bg-white">
          <button
            onClick={onClose}
            disabled={isExporting}
            className="px-4 py-2 text-slate-700 bg-slate-100 rounded-xl hover:bg-slate-200 transition-colors disabled:opacity-50"
          >
            Batal
          </button>
          <button
            onClick={handleExport}
            disabled={isExporting || getPreviewCount() === 0 || isLoadingFull}
            className="px-6 py-2 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
          >
            {isExporting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                <span>Mengekspor...</span>
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                <span>Unduh Excel</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ExcelExportModal;
