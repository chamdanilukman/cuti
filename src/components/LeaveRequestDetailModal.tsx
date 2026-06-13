import React, { useState } from 'react';
import {
  X, User, Building, Calendar, Clock, FileText,
  Download, ExternalLink, CheckCircle, AlertCircle,
  XCircle, Loader, MapPin, GraduationCap, Briefcase,
  Phone, Mail, Eye, FileCheck, Check, File, Upload
} from 'lucide-react';
import { LeaveRequest } from '../types';
import { calculateAnnualLeaveQuota, isAnnualLeaveType } from '../utils/annualLeaveQuota';
import { WorkCalendarDay, countEffectiveLeaveDays } from '../utils/workCalendar';
import RejectionModal from './RejectionModal';
import PDFPreviewModal from './PDFPreviewModal';
import FinalLetterUploadModal from './FinalLetterUploadModal';

// Lazy load document generator
const loadDocumentGenerator = async () => {
  const module = await import('../utils/documentGenerator');
  return module;
};

interface LeaveRequestDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  request: LeaveRequest | null;
  existingRequests?: LeaveRequest[];
  // Admin action props (optional - only for admin view)
  userRole?: 'admin' | 'coordinator' | 'user';
  onApprove?: (id: string, role: 'coordinator' | 'admin') => void;
  onReject?: (id: string, role: 'coordinator' | 'admin', reason: string) => void;
  onFinalLetterUpload?: (requestId: string, fileUrl: string) => Promise<boolean>;
  showModal?: (message: string) => void;
  workCalendarDays?: WorkCalendarDay[];
}

const LeaveRequestDetailModal: React.FC<LeaveRequestDetailModalProps> = ({
  isOpen,
  onClose,
  request,
  existingRequests = [],
  userRole,
  onApprove,
  onReject,
  onFinalLetterUpload,
  showModal,
  workCalendarDays = []
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
  const [finalLetterUploadModal, setFinalLetterUploadModal] = useState(false);
  const [isDownloadingDocument, setIsDownloadingDocument] = useState(false);

  if (!isOpen || !request) return null;

  // Determine if user can perform admin actions
  const canApprove = userRole === 'admin' && request.status === 'approved_coordinator' && onApprove;
  const canReject = (userRole === 'admin' || userRole === 'coordinator') &&
                    ['pending', 'approved_coordinator'].includes(request.status) && onReject;
  const canDownloadDraft = userRole === 'admin' && request.status === 'approved_admin';
  const canUploadFinalLetter = userRole === 'admin' &&
                                ['approved_admin', 'document_issued'].includes(request.status) &&
                                onFinalLetterUpload;

  // Get annual leave statistics for the request year.
  const quotaYear = new Date(`${request.tanggalMulai}T00:00:00`).getFullYear();
  const annualLeaveStats = calculateAnnualLeaveQuota(request.nip, quotaYear, existingRequests, workCalendarDays);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="w-5 h-5 text-amber-500" />;
      case 'approved_coordinator':
        return <CheckCircle className="w-5 h-5 text-indigo-500" />;
      case 'approved_admin':
        return <CheckCircle className="w-5 h-5 text-emerald-500" />;
      case 'rejected':
        return <XCircle className="w-5 h-5 text-rose-500" />;
      case 'document_issued':
        return <FileCheck className="w-5 h-5 text-violet-500" />;
      default:
        return <AlertCircle className="w-5 h-5 text-slate-500" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending':
        return 'Menunggu Persetujuan';
      case 'approved_coordinator':
        return 'Disetujui Koordinator Wilayah';
      case 'approved_admin':
        return 'Disetujui Dinas Pendidikan';
      case 'rejected':
        return 'Ditolak';
      case 'document_issued':
        return 'Surat Cuti Terbit';
      default:
        return 'Status Tidak Diketahui';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'approved_coordinator':
        return 'bg-indigo-100 text-indigo-800 border-indigo-200';
      case 'approved_admin':
        return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'rejected':
        return 'bg-rose-100 text-rose-800 border-rose-200';
      case 'document_issued':
        return 'bg-violet-100 text-violet-800 border-violet-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  const calculateDuration = () => countEffectiveLeaveDays(request.tanggalMulai, request.tanggalSelesai, workCalendarDays);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('id-ID', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const handleFilePreview = (file: any) => {
    if (file.url) {
      setPdfPreview({ isOpen: true, fileUrl: file.url, fileName: file.name });
    }
  };

  const handleFileDownload = (file: any) => {
    if (file.url) {
      window.open(file.url, '_blank');
    }
  };

  const handleApprove = () => {
    if (onApprove && request) {
      const role = userRole === 'admin' ? 'admin' : 'coordinator';
      onApprove(request.id, role);
      onClose();
    }
  };

  const handleRejectClick = () => {
    if (request) {
      setRejectionModal({ isOpen: true, requestId: request.id });
    }
  };

  const submitRejection = (reason: string) => {
    if (onReject && request) {
      const role = userRole === 'admin' ? 'admin' : 'coordinator';
      onReject(request.id, role, reason);
      setRejectionModal({ isOpen: false, requestId: '' });
      onClose();
    }
  };

  const handleDownloadDraft = async () => {
    if (!request) return;

    setIsDownloadingDocument(true);
    try {
      const { generateAndDownloadDocument } = await loadDocumentGenerator();
      await generateAndDownloadDocument(request, workCalendarDays);
      if (showModal) {
        showModal('Draf surat cuti berhasil diunduh.');
      }
    } catch (error) {
      console.error('Error downloading document:', error);
      if (showModal) {
        showModal('Gagal mengunduh draf surat cuti.');
      }
    } finally {
      setIsDownloadingDocument(false);
    }
  };

  const handleUploadFinalLetter = () => {
    setFinalLetterUploadModal(true);
  };

  const handleFinalLetterUploadSave = async (requestId: string, fileUrl: string) => {
    if (onFinalLetterUpload) {
      const success = await onFinalLetterUpload(requestId, fileUrl);
      if (success && showModal) {
        showModal('Surat final berhasil diunggah.');
      }
      return success;
    }
    return false;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-indigo-700 text-white p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-white bg-opacity-20 rounded-xl flex items-center justify-center">
                <FileText className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-2xl font-bold">Detail Pengajuan Cuti</h2>
                <p className="text-indigo-100">Informasi lengkap pengajuan cuti</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:text-indigo-200 transition-colors p-2 hover:bg-white hover:bg-opacity-10 rounded-xl"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Left Column - Main Info */}
            <div className="lg:col-span-2 space-y-6">
              
              {/* Personal Information */}
              <div className="bg-slate-50 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center">
                  <User className="w-5 h-5 mr-2 text-indigo-600" />
                  Informasi Pemohon
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-slate-600">Nama Lengkap</label>
                    <p className="text-slate-900 font-medium">{request.nama}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-600">NIP</label>
                    <p className="text-slate-900 font-mono">{request.nip}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-600">Pangkat/Golongan</label>
                    <p className="text-slate-900">{request.pangkatGolongan}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-600">Jabatan</label>
                    <p className="text-slate-900">{request.jabatan}</p>
                  </div>
                </div>
              </div>

              {/* Work Unit Information */}
              <div className="bg-slate-50 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center">
                  <Building className="w-5 h-5 mr-2 text-emerald-600" />
                  Unit Kerja
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-slate-600">Sekolah/Unit</label>
                    <p className="text-slate-900">{request.unitKerja}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-600">Kecamatan</label>
                    <p className="text-slate-900 flex items-center">
                      <MapPin className="w-4 h-4 mr-1 text-slate-500" />
                      {request.kecamatan}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-600">Jenjang</label>
                    <p className="text-slate-900 flex items-center">
                      <GraduationCap className="w-4 h-4 mr-1 text-slate-500" />
                      {request.jenjang}
                    </p>
                  </div>
                </div>
              </div>

              {/* Leave Details */}
              <div className="bg-slate-50 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center">
                  <Calendar className="w-5 h-5 mr-2 text-violet-600" />
                  Detail Cuti
                </h3>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-slate-600">Jenis Cuti</label>
                      <p className="text-slate-900 font-medium">{request.jenisCuti}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-slate-600">Durasi</label>
                      <p className="text-slate-900 font-medium">{calculateDuration()} Hari</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-slate-600">Tanggal Mulai</label>
                      <p className="text-slate-900">{formatDate(request.tanggalMulai)}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-slate-600">Tanggal Selesai</label>
                      <p className="text-slate-900">{formatDate(request.tanggalSelesai)}</p>
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-600">Alasan Cuti</label>
                    <p className="text-slate-900 bg-white p-3 rounded border">{request.alasanCuti}</p>
                  </div>
                </div>
              </div>

              {/* Attachments */}
              {request.files && request.files.length > 0 && (
                <div className="bg-slate-50 rounded-xl p-6">
                  <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center">
                    <FileText className="w-5 h-5 mr-2 text-amber-600" />
                    Lampiran ({request.files.length})
                  </h3>
                  <div className="space-y-3">
                    {request.files.map((file, index) => (
                      <div key={index} className="bg-white border border-slate-200 rounded-xl p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center">
                              <FileText className="w-5 h-5 text-amber-600" />
                            </div>
                            <div>
                              <p className="font-medium text-slate-900">{file.name}</p>
                              <p className="text-sm text-slate-500">
                                {file.size ? `${Math.round(file.size / 1024)} KB` : 'File'}
                              </p>
                            </div>
                          </div>
                          <div className="flex space-x-2">
                            <button
                              onClick={() => handleFilePreview(file)}
                              className="p-2 text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 rounded-xl transition-colors"
                              title="Pratinjau"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleFileDownload(file)}
                              className="p-2 text-emerald-600 hover:text-emerald-800 hover:bg-emerald-50 rounded-xl transition-colors"
                              title="Unduh"
                            >
                              <Download className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Right Column - Status & Actions */}
            <div className="space-y-6">
              
              {/* Status Timeline */}
              <div className="bg-white border border-slate-200 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-slate-900 mb-4">Status Pengajuan</h3>
                
                <div className={`inline-flex items-center px-3 py-2 rounded-xl border ${getStatusColor(request.status)} mb-4`}>
                  {getStatusIcon(request.status)}
                  <span className="ml-2 font-medium">{getStatusText(request.status)}</span>
                </div>

                <div className="space-y-4">
                  {/* Timeline */}
                  <div className="relative">
                    <div className="absolute left-4 top-8 bottom-0 w-0.5 bg-slate-200"></div>
                    
                    {/* Submitted */}
                    <div className="relative flex items-start space-x-3 pb-4">
                      <div className="w-8 h-8 bg-indigo-500 rounded-full flex items-center justify-center">
                        <FileText className="w-4 h-4 text-white" />
                      </div>
                      <div>
                        <p className="font-medium text-slate-900">Pengajuan Disubmit</p>
                        <p className="text-sm text-slate-500">{formatDate(request.submissionDate)}</p>
                      </div>
                    </div>

                    {/* Coordinator Review */}
                    <div className="relative flex items-start space-x-3 pb-4">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        ['approved_coordinator', 'approved_admin'].includes(request.status)
                          ? 'bg-indigo-500'
                          : request.status === 'rejected'
                            ? 'bg-rose-500'
                            : 'bg-slate-300'
                      }`}>
                        {['approved_coordinator', 'approved_admin'].includes(request.status) ? (
                          <CheckCircle className="w-4 h-4 text-white" />
                        ) : request.status === 'rejected' ? (
                          <XCircle className="w-4 h-4 text-white" />
                        ) : (
                          <Clock className="w-4 h-4 text-slate-600" />
                        )}
                      </div>
                      <div>
                        <p className="font-medium text-slate-900">Review Koordinator Wilayah</p>
                        <p className="text-sm text-slate-500">
                          {['approved_coordinator', 'approved_admin'].includes(request.status)
                            ? `Disetujui${request.coordinatorApprovalDate ? ` - ${formatDate(request.coordinatorApprovalDate)}` : ''}`
                            : request.status === 'rejected'
                              ? 'Ditolak'
                              : 'Menunggu review'}
                        </p>
                      </div>
                    </div>

                    {/* Admin Review */}
                    <div className="relative flex items-start space-x-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        request.status === 'approved_admin'
                          ? 'bg-emerald-500'
                          : request.status === 'rejected'
                            ? 'bg-rose-500'
                            : 'bg-slate-300'
                      }`}>
                        {request.status === 'approved_admin' ? (
                          <CheckCircle className="w-4 h-4 text-white" />
                        ) : request.status === 'rejected' ? (
                          <XCircle className="w-4 h-4 text-white" />
                        ) : (
                          <Clock className="w-4 h-4 text-slate-600" />
                        )}
                      </div>
                      <div>
                        <p className="font-medium text-slate-900">Review Dinas Pendidikan</p>
                        <p className="text-sm text-slate-500">
                          {request.status === 'approved_admin'
                            ? `Disetujui${request.adminApprovalDate ? ` - ${formatDate(request.adminApprovalDate)}` : ''}`
                            : request.status === 'rejected'
                              ? 'Ditolak'
                              : 'Menunggu review'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Rejection Reason */}
                {request.status === 'rejected' && request.rejectionReason && (
                  <div className="mt-4 p-3 bg-rose-50 border border-rose-200 rounded-xl">
                    <p className="text-sm font-medium text-rose-800">Alasan Penolakan:</p>
                    <p className="text-sm text-rose-700 mt-1">{request.rejectionReason}</p>
                  </div>
                )}
              </div>

              {/* Annual Leave Quota */}
              {isAnnualLeaveType(request.jenisCuti) && (
                <div className="bg-white border border-slate-200 rounded-xl p-6">
                  <h3 className="text-lg font-semibold text-slate-900 mb-4">Kuota Cuti Tahunan {quotaYear}</h3>
                  <div className="space-y-3">
                    <div className="bg-indigo-50 p-4 rounded-xl">
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-slate-600">Total Pengajuan</p>
                          <p className="font-semibold text-slate-900">{annualLeaveStats.totalRequests}</p>
                        </div>
                        <div>
                          <p className="text-slate-600">Kuota Tersedia</p>
                          <p className="font-semibold text-emerald-600">{annualLeaveStats.availableQuota}</p>
                        </div>
                        <div>
                          <p className="text-slate-600">Hari Terpakai/Tertahan</p>
                          <p className="font-semibold text-amber-600">{annualLeaveStats.usedDays}</p>
                        </div>
                        <div>
                          <p className="text-slate-600">Ditolak</p>
                          <p className="font-semibold text-rose-600">{annualLeaveStats.rejectedRequests}</p>
                        </div>
                      </div>
                      <div className="mt-4 pt-4 border-t border-indigo-200">
                        <div className="flex justify-between items-center">
                          <span className="text-slate-600">Sisa Kuota:</span>
                          <span className={`font-bold text-lg ${
                            annualLeaveStats.remainingQuota <= 0
                              ? 'text-rose-600'
                              : annualLeaveStats.remainingQuota <= 2
                                ? 'text-amber-600'
                                : 'text-emerald-600'
                          }`}>
                            {annualLeaveStats.remainingQuota}/{annualLeaveStats.availableQuota}
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 mt-2">
                          Termasuk akumulasi: {annualLeaveStats.carryOver.map(item => `${item.year}: ${item.carriedDays} hari`).join(', ')}
                        </p>
                        <div className="w-full bg-slate-200 rounded-full h-2 mt-2">
                          <div
                            className={`h-2 rounded-full ${
                              annualLeaveStats.remainingQuota <= 0
                                ? 'bg-rose-500'
                                : annualLeaveStats.remainingQuota <= 2
                                  ? 'bg-amber-500'
                                  : 'bg-emerald-500'
                            }`}
                            style={{
                              width: `${Math.max(0, (annualLeaveStats.remainingQuota / annualLeaveStats.availableQuota) * 100)}%`
                            }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Quick Actions */}
              <div className="bg-white border border-slate-200 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-slate-900 mb-4">Aksi Cepat</h3>
                <div className="space-y-3">

                  {/* Admin Actions - Approve/Reject */}
                  {canApprove && (
                    <button
                      onClick={handleApprove}
                      className="w-full inline-flex items-center justify-center px-4 py-3 bg-violet-600 text-white rounded-xl hover:bg-violet-700 transition-colors font-medium"
                    >
                      <Check className="w-5 h-5 mr-2" />
                      Setujui Dinas
                    </button>
                  )}

                  {canReject && (
                    <button
                      onClick={handleRejectClick}
                      className="w-full inline-flex items-center justify-center px-4 py-3 bg-rose-600 text-white rounded-xl hover:bg-rose-700 transition-colors font-medium"
                    >
                      <X className="w-5 h-5 mr-2" />
                      Tolak Pengajuan
                    </button>
                  )}

                  {/* Upload Surat Final */}
                  {canUploadFinalLetter && (
                    <button
                      onClick={handleUploadFinalLetter}
                      className="w-full inline-flex items-center justify-center px-4 py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors font-medium"
                    >
                      <Upload className="w-5 h-5 mr-2" />
                      {request.finalLetterUrl ? 'Perbarui Surat Final' : 'Unggah Surat Final'}
                    </button>
                  )}

                  {/* Download Draft Surat Cuti (.docx) */}
                  {canDownloadDraft && (
                    <button
                      onClick={handleDownloadDraft}
                      disabled={isDownloadingDocument}
                      className="w-full inline-flex items-center justify-center px-4 py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors font-medium disabled:bg-indigo-400 disabled:cursor-not-allowed"
                    >
                      {isDownloadingDocument ? (
                        <>
                          <Loader className="w-5 h-5 mr-2 animate-spin" />
                          Mengunduh...
                        </>
                      ) : (
                        <>
                          <File className="w-5 h-5 mr-2" />
                          Unduh Draft Surat Cuti (.docx)
                        </>
                      )}
                    </button>
                  )}

                  {/* Download Final Letter from cPanel */}
                  {['approved_admin', 'document_issued'].includes(request.status) && request.finalLetterUrl && (
                    <a
                      href={request.finalLetterUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full inline-flex items-center justify-center px-4 py-3 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-colors"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Unduh Surat Usulan Final (PDF)
                    </a>
                  )}

                  {/* Download Official Letter (Legacy Google Drive) */}
                  {['approved_admin', 'document_issued'].includes(request.status) && request.driveLink && !request.finalLetterUrl && (
                    <a
                      href={request.driveLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full inline-flex items-center justify-center px-4 py-3 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-colors"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Unduh Surat Usulan (Google Drive)
                    </a>
                  )}

                  {/* Download All Attachments */}
                  {request.files && request.files.length > 0 && (
                    <div className="border-t border-slate-200 pt-3">
                      <p className="text-sm font-medium text-slate-700 mb-2">Lampiran Cuti ({request.files.length})</p>
                      <div className="space-y-2">
                        {request.files.map((file, index) => (
                          <div key={index} className="flex space-x-2">
                            <button
                              onClick={() => handleFilePreview(file)}
                              className="flex-1 inline-flex items-center justify-center px-3 py-2 bg-indigo-50 text-indigo-700 text-sm rounded-xl hover:bg-indigo-100 transition-colors"
                            >
                              <Eye className="w-4 h-4 mr-2" />
                              Pratinjau {index + 1}
                            </button>
                            <button
                              onClick={() => handleFileDownload(file)}
                              className="flex-1 inline-flex items-center justify-center px-3 py-2 bg-emerald-50 text-emerald-700 text-sm rounded-xl hover:bg-emerald-100 transition-colors"
                            >
                              <Download className="w-4 h-4 mr-2" />
                              Unduh {index + 1}
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Request ID */}
                  <div className="bg-slate-50 p-3 rounded-xl">
                    <p className="text-xs font-medium text-slate-600 uppercase tracking-wide">ID Pengajuan</p>
                    <p className="text-sm font-mono text-slate-900 mt-1">{request.id}</p>
                  </div>

                  {/* Submission Date */}
                  <div className="bg-slate-50 p-3 rounded-xl">
                    <p className="text-xs font-medium text-slate-600 uppercase tracking-wide">Tanggal Pengajuan</p>
                    <p className="text-sm text-slate-900 mt-1">{formatDate(request.submissionDate)}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-slate-50 px-6 py-4 border-t border-slate-200">
          <div className="flex justify-end">
            <button
              onClick={onClose}
              className="px-6 py-2 bg-slate-600 text-white rounded-xl hover:bg-slate-700 transition-colors"
            >
              Tutup
            </button>
          </div>
        </div>
      </div>

      {/* Rejection Modal */}
      <RejectionModal
        isOpen={rejectionModal.isOpen}
        onClose={() => setRejectionModal({ isOpen: false, requestId: '' })}
        onSubmit={submitRejection}
      />

      {/* PDF Preview Modal */}
      <PDFPreviewModal
        isOpen={pdfPreview.isOpen}
        onClose={() => setPdfPreview({ isOpen: false, fileUrl: '', fileName: '' })}
        fileUrl={pdfPreview.fileUrl}
        fileName={pdfPreview.fileName}
      />

      {/* Final Letter Upload Modal */}
      {request && (
        <FinalLetterUploadModal
          isOpen={finalLetterUploadModal}
          onClose={() => setFinalLetterUploadModal(false)}
          request={request}
          onSave={handleFinalLetterUploadSave}
        />
      )}
    </div>
  );
};

export default LeaveRequestDetailModal;
