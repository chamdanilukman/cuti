import React, { useState, useMemo } from 'react';
import { Calendar, Download, Filter, BarChart3, FileText, ArrowUpDown } from 'lucide-react';
import { LeaveRequest } from '../types';
import StatusBadge from './StatusBadge';

interface DataRecapPanelProps {
  leaveRequests: LeaveRequest[];
}

type FilterType = 'day' | 'week' | 'month' | 'year' | 'range';
type StatusFilter = 'all' | 'pending' | 'approved_coordinator' | 'approved_admin' | 'rejected' | 'approved' | 'not_approved' | 'document_issued';
type SortField = 'submissionDate' | 'nama' | 'status' | 'tanggalMulai';
type SortOrder = 'asc' | 'desc';

const DataRecapPanel: React.FC<DataRecapPanelProps> = ({ leaveRequests }) => {
  const [filterType, setFilterType] = useState<FilterType>('month');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [sortField, setSortField] = useState<SortField>('submissionDate');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  // Filter dan sort data
  const filteredAndSortedData = useMemo(() => {
    const selected = new Date(selectedDate);

    // Filter berdasarkan tanggal
    let filtered = leaveRequests.filter(request => {
      const submissionDate = new Date(request.submissionDate);

      switch (filterType) {
        case 'day':
          return submissionDate.toDateString() === selected.toDateString();

        case 'week': {
          const weekStart = new Date(selected);
          weekStart.setDate(selected.getDate() - selected.getDay());
          const weekEnd = new Date(weekStart);
          weekEnd.setDate(weekStart.getDate() + 6);
          return submissionDate >= weekStart && submissionDate <= weekEnd;
        }

        case 'month':
          return submissionDate.getMonth() === selected.getMonth() &&
                 submissionDate.getFullYear() === selected.getFullYear();

        case 'year':
          return submissionDate.getFullYear() === selected.getFullYear();

        case 'range': {
          if (!startDate || !endDate) return true;
          const start = new Date(startDate);
          const end = new Date(endDate);
          return submissionDate >= start && submissionDate <= end;
        }

        default:
          return true;
      }
    });

    // Filter berdasarkan status
    if (statusFilter !== 'all') {
      filtered = filtered.filter(request => {
        switch (statusFilter) {
          case 'approved':
            return request.status === 'approved_coordinator' || request.status === 'approved_admin' || request.status === 'document_issued';
          case 'not_approved':
            return request.status === 'pending' || request.status === 'rejected';
          default:
            return request.status === statusFilter;
        }
      });
    }

    // Sort data
    return filtered.sort((a, b) => {
      let aValue: any, bValue: any;

      switch (sortField) {
        case 'submissionDate':
          aValue = new Date(a.submissionDate);
          bValue = new Date(b.submissionDate);
          break;
        case 'nama':
          aValue = a.nama.toLowerCase();
          bValue = b.nama.toLowerCase();
          break;
        case 'status': {
          // Custom sort order for status
          const statusOrder = { 'pending': 1, 'approved_coordinator': 2, 'approved_admin': 3, 'rejected': 4 };
          aValue = statusOrder[a.status] || 5;
          bValue = statusOrder[b.status] || 5;
          break;
        }
        case 'tanggalMulai':
          aValue = new Date(a.tanggalMulai);
          bValue = new Date(b.tanggalMulai);
          break;
        default:
          return 0;
      }

      if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });
  }, [leaveRequests, filterType, selectedDate, startDate, endDate, statusFilter, sortField, sortOrder]);

  // Statistik data
  const stats = useMemo(() => {
    const total = filteredAndSortedData.length;
    const pending = filteredAndSortedData.filter(req => req.status === 'pending').length;
    const approvedCoordinator = filteredAndSortedData.filter(req => req.status === 'approved_coordinator').length;
    const approvedAdmin = filteredAndSortedData.filter(req => req.status === 'approved_admin').length;
    const rejected = filteredAndSortedData.filter(req => req.status === 'rejected').length;

    return { total, pending, approvedCoordinator, approvedAdmin, rejected };
  }, [filteredAndSortedData]);

  // Handle sorting
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  // Export data ke CSV
  const exportToCSV = () => {
    const headers = [
      'No',
      'Tanggal Pengajuan',
      'Nama',
      'NIP',
      'Pangkat/Golongan',
      'Jabatan',
      'Kecamatan',
      'Jenjang',
      'Unit Kerja',
      'Jenis Cuti',
      'Tanggal Mulai',
      'Tanggal Selesai',
      'Alasan Cuti',
      'Status',
      'Alasan Penolakan'
    ];

    const csvData = filteredAndSortedData.map((request, index) => [
      index + 1,
      new Date(request.submissionDate).toLocaleDateString('id-ID'),
      request.nama,
      request.nip,
      request.pangkatGolongan,
      request.jabatan,
      request.kecamatan,
      request.jenjang,
      request.unitKerja,
      request.jenisCuti,
      request.tanggalMulai,
      request.tanggalSelesai,
      request.alasanCuti,
      request.status === 'pending' ? 'Menunggu Persetujuan' :
      request.status === 'approved_coordinator' ? 'Disetujui Koordinator Wilayah' :
      request.status === 'approved_admin' ? 'Disetujui Dinas Pendidikan' : 'Ditolak',
      request.rejectionReason || '-'
    ]);

    const csvContent = [headers, ...csvData]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `rekap-cuti-${filterType}-${selectedDate}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getFilterLabel = () => {
    switch (filterType) {
      case 'day': return 'Harian';
      case 'week': return 'Mingguan';
      case 'month': return 'Bulanan';
      case 'year': return 'Tahunan';
      case 'range': return 'Rentang Tanggal';
      default: return '';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-violet-50 border border-violet-200 rounded-xl p-6">
        <div className="flex items-center space-x-3 mb-4">
          <BarChart3 className="w-6 h-6 text-violet-600" />
          <h3 className="text-lg font-semibold text-violet-900">Rekap Data Cuti</h3>
        </div>
        <p className="text-violet-700">
          Lihat dan analisis data pengajuan cuti dengan berbagai filter waktu serta ekspor ke CSV.
        </p>
      </div>

      {/* Filter Controls */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <div className="flex items-center space-x-3 mb-4">
          <Filter className="w-5 h-5 text-slate-600" />
          <h4 className="text-lg font-semibold text-slate-900">Filter Data</h4>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-6 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Jenis Filter
            </label>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as FilterType)}
              className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-violet-500 focus:border-transparent"
            >
              <option value="day">Harian</option>
              <option value="week">Mingguan</option>
              <option value="month">Bulanan</option>
              <option value="year">Tahunan</option>
              <option value="range">Rentang Tanggal</option>
            </select>
          </div>

          {filterType !== 'range' && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Tanggal Referensi
              </label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-violet-500 focus:border-transparent"
              />
            </div>
          )}

          {filterType === 'range' && (
            <>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Tanggal Mulai
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Tanggal Selesai
                </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                />
              </div>
            </>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Filter Status
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
              className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-violet-500 focus:border-transparent"
            >
              <option value="all">Semua Status</option>
              <option value="pending">Menunggu Persetujuan</option>
              <option value="approved_coordinator">Disetujui Koordinator Wilayah</option>
              <option value="approved_admin">Disetujui Dinas Pendidikan</option>
              <option value="document_issued">Surat Cuti Terbit</option>
              <option value="approved">Disetujui</option>
              <option value="not_approved">Menunggu atau Ditolak</option>
              <option value="rejected">Ditolak</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Urutkan Berdasarkan
            </label>
            <select
              value={sortField}
              onChange={(e) => setSortField(e.target.value as SortField)}
              className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-violet-500 focus:border-transparent"
            >
              <option value="submissionDate">Tanggal Pengajuan</option>
              <option value="nama">Nama</option>
              <option value="status">Status</option>
              <option value="tanggalMulai">Tanggal Mulai Cuti</option>
            </select>
          </div>

          <div className="flex items-end">
            <button
              onClick={exportToCSV}
              className="w-full px-4 py-2 bg-emerald-500 text-white font-medium rounded-xl hover:bg-emerald-600 transition-all duration-200 flex items-center justify-center space-x-2"
            >
              <Download className="w-4 h-4" />
              <span>Ekspor CSV</span>
            </button>
          </div>
        </div>

        <div className="text-sm text-slate-600">
          Menampilkan data <strong>{getFilterLabel()}</strong> •
          Total: <strong>{filteredAndSortedData.length}</strong> pengajuan •
          Diurutkan berdasarkan <strong>{
            sortField === 'submissionDate' ? 'Tanggal Pengajuan' :
            sortField === 'nama' ? 'Nama' :
            sortField === 'status' ? 'Status' : 'Tanggal Mulai Cuti'
          }</strong> ({sortOrder === 'asc' ? 'A-Z' : 'Z-A'})
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div className="bg-indigo-50 rounded-xl p-4 border border-indigo-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-indigo-700">Total</p>
              <p className="text-2xl font-bold text-indigo-900">{stats.total}</p>
            </div>
            <FileText className="w-8 h-8 text-indigo-500" />
          </div>
        </div>

        <div className="bg-amber-50 rounded-xl p-4 border border-amber-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-amber-700">Menunggu Persetujuan</p>
              <p className="text-2xl font-bold text-amber-900">{stats.pending}</p>
            </div>
            <Calendar className="w-8 h-8 text-amber-500" />
          </div>
        </div>

        <div className="bg-amber-50 rounded-xl p-4 border border-amber-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-amber-700">Disetujui Koordinator Wilayah</p>
              <p className="text-2xl font-bold text-amber-900">{stats.approvedCoordinator}</p>
            </div>
            <Calendar className="w-8 h-8 text-amber-500" />
          </div>
        </div>

        <div className="bg-emerald-50 rounded-xl p-4 border border-emerald-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-emerald-700">Disetujui Dinas Pendidikan</p>
              <p className="text-2xl font-bold text-green-900">{stats.approvedAdmin}</p>
            </div>
            <Calendar className="w-8 h-8 text-emerald-500" />
          </div>
        </div>

        <div className="bg-rose-50 rounded-xl p-4 border border-rose-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-rose-700">Ditolak</p>
              <p className="text-2xl font-bold text-red-900">{stats.rejected}</p>
            </div>
            <Calendar className="w-8 h-8 text-rose-500" />
          </div>
        </div>
      </div>

      {/* Data Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        {filteredAndSortedData.length === 0 ? (
          <div className="text-center py-12">
            <BarChart3 className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500 text-lg">
              Tidak ada data pengajuan cuti untuk filter yang dipilih.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-slate-50">
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-900 border-b">No</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-900 border-b">
                    <button
                      onClick={() => handleSort('submissionDate')}
                      className="flex items-center space-x-1 hover:text-violet-600 transition-colors"
                    >
                      <span>Tanggal</span>
                      <ArrowUpDown className="w-3 h-3" />
                    </button>
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-900 border-b">
                    <button
                      onClick={() => handleSort('nama')}
                      className="flex items-center space-x-1 hover:text-violet-600 transition-colors"
                    >
                      <span>Nama</span>
                      <ArrowUpDown className="w-3 h-3" />
                    </button>
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-900 border-b">NIP</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-900 border-b">Unit Kerja</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-900 border-b">Jenjang</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-900 border-b">Kecamatan</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-900 border-b">Jenis Cuti</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-900 border-b">
                    <button
                      onClick={() => handleSort('tanggalMulai')}
                      className="flex items-center space-x-1 hover:text-violet-600 transition-colors"
                    >
                      <span>Periode Cuti</span>
                      <ArrowUpDown className="w-3 h-3" />
                    </button>
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-900 border-b">
                    <button
                      onClick={() => handleSort('status')}
                      className="flex items-center space-x-1 hover:text-violet-600 transition-colors"
                    >
                      <span>Status</span>
                      <ArrowUpDown className="w-3 h-3" />
                    </button>
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredAndSortedData.map((request, index) => (
                  <tr key={request.id} className="hover:bg-slate-50 transition-colors duration-150">
                    <td className="px-4 py-3 text-sm text-slate-900 border-b">{index + 1}</td>
                    <td className="px-4 py-3 text-sm text-slate-900 border-b">
                      {new Date(request.submissionDate).toLocaleDateString('id-ID')}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-900 border-b font-medium">{request.nama}</td>
                    <td className="px-4 py-3 text-sm text-slate-900 border-b">{request.nip}</td>
                    <td className="px-4 py-3 text-sm text-slate-900 border-b">{request.unitKerja}</td>
                    <td className="px-4 py-3 text-sm text-slate-900 border-b">{request.jenjang}</td>
                    <td className="px-4 py-3 text-sm text-slate-900 border-b">{request.kecamatan}</td>
                    <td className="px-4 py-3 text-sm text-slate-900 border-b">{request.jenisCuti}</td>
                    <td className="px-4 py-3 text-sm text-slate-900 border-b">
                      {request.tanggalMulai} s/d {request.tanggalSelesai}
                    </td>
                    <td className="px-4 py-3 border-b">
                      <StatusBadge status={request.status} />
                      {request.status === 'rejected' && request.rejectionReason && (
                        <div className="mt-1 text-xs text-rose-600">
                          {request.rejectionReason}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default DataRecapPanel;
