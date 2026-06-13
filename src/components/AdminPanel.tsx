import React, { useState } from 'react';
import { Shield, Download, Check, X, Eye } from 'lucide-react';
import { LeaveRequest } from '../types';
import StatusBadge from './StatusBadge';
import RejectionModal from './RejectionModal';
import PDFPreviewModal from './PDFPreviewModal';
import ExcelExportModal from './ExcelExportModal';

interface AdminPanelProps {
  leaveRequests: LeaveRequest[];
  onApprove: (id: string, role: 'coordinator' | 'admin') => void;
  onReject: (id: string, role: 'coordinator' | 'admin', reason: string) => void;
  showModal: (message: string) => void;
}

const AdminPanel: React.FC<AdminPanelProps> = ({
  leaveRequests,
  onApprove,
  onReject,
  showModal
}) => {
  const [rejectionModal, setRejectionModal] = useState<{
    isOpen: boolean;
    requestId: string;
  }>({ isOpen: false, requestId: '' });
  const [pdfPreview, setPdfPreview] = useState<{
    isOpen: boolean;
    fileUrl: string;
    fileName: string;
  }>({ isOpen: false, fileUrl: '', fileName: '' });
  const [exportModal, setExportModal] = useState(false);

  const adminRequests = leaveRequests.filter(req => req.status === 'approved_coordinator');

  const handleDownload = (fileUrl: string, fileName: string) => {
    // Open file in new tab for download
    window.open(fileUrl, '_blank');
  };

  const handlePreview = (fileUrl: string, fileName: string) => {
    setPdfPreview({ isOpen: true, fileUrl, fileName });
  };

  const handleReject = (requestId: string) => {
    setRejectionModal({ isOpen: true, requestId });
  };

  const submitRejection = (reason: string) => {
    onReject(rejectionModal.requestId, 'admin', reason);
    setRejectionModal({ isOpen: false, requestId: '' });
  };

  return (
    <div className="space-y-6">
      <div className="bg-violet-50 border border-violet-200 rounded-xl p-6">
        <div className="flex items-center space-x-3 mb-4">
          <Shield className="w-6 h-6 text-violet-600" />
          <h3 className="text-lg font-semibold text-violet-900">Panel Administrator Jenjang Kedua (Dinas Pendidikan)</h3>
        </div>
        <p className="text-violet-700 mb-4">Sebagai administrator jenjang kedua (Dinas Pendidikan), Anda dapat:</p>
        <ul className="space-y-2 text-violet-700">
          <li className="flex items-start space-x-2">
            <div className="w-2 h-2 bg-violet-500 rounded-full mt-2"></div>
            <span>Melihat pengajuan cuti yang sudah disetujui jenjang pertama</span>
          </li>
          <li className="flex items-start space-x-2">
            <div className="w-2 h-2 bg-violet-500 rounded-full mt-2"></div>
            <span>Memberikan persetujuan final atau menolak pengajuan cuti</span>
          </li>
          <li className="flex items-start space-x-2">
            <div className="w-2 h-2 bg-violet-500 rounded-full mt-2"></div>
            <span>Mengakses rekap data cuti dengan berbagai filter waktu</span>
          </li>
        </ul>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center">
          <h3 className="text-lg font-semibold text-slate-900">
            Pengajuan Cuti Menunggu Persetujuan Final ({adminRequests.length})
          </h3>
          <button
            onClick={() => setExportModal(true)}
            className="flex items-center space-x-2 px-4 py-2 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-colors"
          >
            <Download className="w-4 h-4" />
            <span>Unduh Rekap</span>
          </button>
        </div>

        {adminRequests.length === 0 ? (
          <div className="text-center py-12">
            <Shield className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500 text-lg">
              Tidak ada pengajuan cuti yang menunggu persetujuan final dari dinas.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-slate-50">
                  <th className="px-6 py-4 text-left text-sm font-semibold text-slate-900 border-b">No</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-slate-900 border-b">Nama Guru</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-slate-900 border-b">NIP</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-slate-900 border-b">Unit Kerja</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-slate-900 border-b">Jenjang</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-slate-900 border-b">Kecamatan</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-slate-900 border-b">Jenis Cuti</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-slate-900 border-b">Tanggal Cuti</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-slate-900 border-b">Status Koordinator</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-slate-900 border-b">Berkas</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-slate-900 border-b">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {adminRequests.map((request, index) => (
                  <tr key={request.id} className="hover:bg-slate-50 transition-colors duration-150">
                    <td className="px-6 py-4 text-sm text-slate-900 border-b">{index + 1}</td>
                    <td className="px-6 py-4 text-sm text-slate-900 border-b font-medium">{request.nama}</td>
                    <td className="px-6 py-4 text-sm text-slate-900 border-b">{request.nip}</td>
                    <td className="px-6 py-4 text-sm text-slate-900 border-b">{request.unitKerja}</td>
                    <td className="px-6 py-4 text-sm text-slate-900 border-b">{request.jenjang}</td>
                    <td className="px-6 py-4 text-sm text-slate-900 border-b">{request.kecamatan}</td>
                    <td className="px-6 py-4 text-sm text-slate-900 border-b">{request.jenisCuti}</td>
                    <td className="px-6 py-4 text-sm text-slate-900 border-b">
                      {request.tanggalMulai} s/d {request.tanggalSelesai}
                    </td>
                    <td className="px-6 py-4 border-b">
                      <StatusBadge status={request.status} />
                    </td>
                    <td className="px-6 py-4 border-b">
                      {request.files && request.files.length > 0 ? (
                        <div className="space-y-1">
                          {request.files.map((file, fileIndex) => (
                            <div key={fileIndex} className="flex space-x-1">
                              <button
                                onClick={() => handlePreview(file.url, file.name)}
                                className="inline-flex items-center space-x-1 px-2 py-1 bg-emerald-100 text-emerald-700 text-xs rounded hover:bg-emerald-200 transition-colors duration-200"
                              >
                                <Eye className="w-3 h-3" />
                                <span>Pratinjau</span>
                              </button>
                              <button
                                onClick={() => handleDownload(file.url, file.name)}
                                className="inline-flex items-center space-x-1 px-2 py-1 bg-indigo-100 text-indigo-700 text-xs rounded hover:bg-indigo-200 transition-colors duration-200"
                              >
                                <Download className="w-3 h-3" />
                                <span>Unduh</span>
                              </button>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <span className="text-slate-500 text-sm">Tidak ada</span>
                      )}
                    </td>
                    <td className="px-6 py-4 border-b">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => onApprove(request.id, 'admin')}
                          className="inline-flex items-center space-x-1 px-3 py-2 bg-violet-500 text-white text-sm font-medium rounded-xl hover:bg-violet-600 transition-all duration-200"
                        >
                          <Check className="w-4 h-4" />
                          <span>Setujui (Dinas)</span>
                        </button>
                        <button
                          onClick={() => handleReject(request.id)}
                          className="inline-flex items-center space-x-1 px-3 py-2 bg-rose-500 text-white text-sm font-medium rounded-xl hover:bg-rose-600 transition-all duration-200"
                        >
                          <X className="w-4 h-4" />
                          <span>Tolak</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <RejectionModal
        isOpen={rejectionModal.isOpen}
        onClose={() => setRejectionModal({ isOpen: false, requestId: '' })}
        onSubmit={submitRejection}
      />

      <PDFPreviewModal
        isOpen={pdfPreview.isOpen}
        onClose={() => setPdfPreview({ isOpen: false, fileUrl: '', fileName: '' })}
        fileUrl={pdfPreview.fileUrl}
        fileName={pdfPreview.fileName}
      />

      <ExcelExportModal
        isOpen={exportModal}
        onClose={() => setExportModal(false)}
        leaveRequests={leaveRequests}
        userRole="admin"
      />
    </div>
  );
};

export default AdminPanel;
