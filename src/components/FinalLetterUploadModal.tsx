import React, { useState } from 'react';
import { X, Upload, Save, AlertCircle, FileText, CheckCircle } from 'lucide-react';
import { LeaveRequest } from '../types';

interface FinalLetterUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  request: LeaveRequest;
  onSave: (requestId: string, fileUrl: string) => Promise<boolean>;
}

const FinalLetterUploadModal: React.FC<FinalLetterUploadModalProps> = ({
  isOpen,
  onClose,
  request,
  onSave
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState('');
  const [uploadProgress, setUploadProgress] = useState(0);

  if (!isOpen) return null;

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (file.type !== 'application/pdf') {
      setError('Hanya berkas PDF yang diperbolehkan.');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError('Ukuran berkas maksimum 5 MB.');
      return;
    }

    setSelectedFile(file);
    setError('');
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      setError('Silakan pilih berkas terlebih dahulu.');
      return;
    }

    setIsUploading(true);
    setError('');
    setUploadProgress(0);

    try {
      // Upload to cPanel
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('folder', 'final'); // Upload to documents/leave-documents/final

      const uploadUrl = import.meta.env.VITE_CPANEL_UPLOAD_URL || 'https://cuti.disdik.grobogan.online/api/upload.php';

      const uploadResponse = await fetch(uploadUrl, {
        method: 'POST',
        body: formData,
      });

      if (!uploadResponse.ok) {
        throw new Error('Unggah gagal');
      }

      const uploadResult = await uploadResponse.json();

      if (!uploadResult.success) {
        throw new Error(uploadResult.error || 'Unggah gagal');
      }

      setUploadProgress(50);

      // Save URL to database
      const success = await onSave(request.id, uploadResult.url);

      if (success) {
        setUploadProgress(100);
        setTimeout(() => {
          onClose();
          setSelectedFile(null);
          setUploadProgress(0);
        }, 500);
      } else {
        throw new Error('Gagal menyimpan URL ke basis data');
      }
    } catch (err) {
      console.error('Error uploading file:', err);
      const errorMessage = err instanceof Error ? err.message : 'Terjadi kesalahan sistem';
      setError(errorMessage);
      setUploadProgress(0);
    } finally {
      setIsUploading(false);
    }
  };

  const handleClose = () => {
    if (!isUploading) {
      setSelectedFile(null);
      setError('');
      setUploadProgress(0);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-md mx-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center">
              <FileText className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-slate-900">Unggah Surat Usulan Cuti Final</h3>
              <p className="text-sm text-slate-600">
                {request.finalLetterUrl ? 'Perbarui surat final' : 'Unggah surat final (PDF)'}
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="text-slate-400 hover:text-slate-600 transition-colors"
            disabled={isUploading}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Request Info */}
        <div className="bg-slate-50 rounded-xl p-4 mb-6">
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-sm font-medium text-slate-700">Nama:</span>
              <span className="text-sm text-slate-900">{request.nama}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm font-medium text-slate-700">NIP:</span>
              <span className="text-sm text-slate-900">{request.nip}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm font-medium text-slate-700">Jenis Cuti:</span>
              <span className="text-sm text-slate-900">{request.jenisCuti}</span>
            </div>

            {/* Current file info */}
            {request.finalLetterUrl && (
              <div className="pt-2 mt-2 border-t border-slate-300">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-slate-700">File Saat Ini:</span>
                  <CheckCircle className="w-4 h-4 text-emerald-600" />
                </div>
                <a
                  href={request.finalLetterUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-indigo-600 hover:text-indigo-800 break-all mt-1 block"
                >
                  Lihat file saat ini
                </a>
              </div>
            )}
          </div>
        </div>

        {/* File Upload */}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Berkas Surat Final (PDF) *
            </label>

            {/* File Input */}
            <div className="relative">
              <input
                type="file"
                accept="application/pdf"
                onChange={handleFileSelect}
                className="hidden"
                id="final-letter-upload"
                disabled={isUploading}
              />
              <label
                htmlFor="final-letter-upload"
                className={`flex items-center justify-center w-full px-4 py-8 border-2 border-dashed rounded-xl cursor-pointer transition-colors ${
                  selectedFile
                    ? 'border-emerald-400 bg-emerald-50'
                    : 'border-slate-300 bg-slate-50 hover:bg-slate-100'
                } ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <div className="text-center">
                  {selectedFile ? (
                    <>
                      <CheckCircle className="w-12 h-12 text-emerald-600 mx-auto mb-2" />
                      <p className="text-sm font-medium text-slate-900">{selectedFile.name}</p>
                      <p className="text-xs text-slate-500 mt-1">
                        {(selectedFile.size / 1024).toFixed(2)} KB
                      </p>
                    </>
                  ) : (
                    <>
                      <Upload className="w-12 h-12 text-slate-400 mx-auto mb-2" />
                      <p className="text-sm font-medium text-slate-900">Klik untuk memilih berkas</p>
                      <p className="text-xs text-slate-500 mt-1">PDF, maksimal 5MB</p>
                    </>
                  )}
                </div>
              </label>
            </div>
          </div>

          {/* Upload Progress */}
          {isUploading && uploadProgress > 0 && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-slate-700">Mengunggah...</span>
                <span className="text-slate-900 font-medium">{uploadProgress}%</span>
              </div>
              <div className="w-full bg-slate-200 rounded-full h-2">
                <div
                  className="bg-emerald-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                ></div>
              </div>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="flex items-center space-x-2 text-rose-600 bg-rose-50 p-3 rounded-xl">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span className="text-sm">{error}</span>
            </div>
          )}

          {/* Instructions */}
          <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4">
            <h4 className="text-sm font-medium text-indigo-900 mb-2">Petunjuk:</h4>
            <ul className="text-xs text-indigo-800 space-y-1">
              <li>• Unggah surat usulan cuti yang telah disahkan dalam format PDF</li>
              <li>• Berkas akan tersimpan di server cPanel secara permanen</li>
              <li>• Pemohon dapat mengunduh melalui menu Status Pengajuan Cuti</li>
              <li>• Ukuran maksimum berkas adalah 5 MB</li>
            </ul>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex space-x-3 mt-6">
          <button
            onClick={handleClose}
            className="flex-1 px-4 py-3 border border-slate-300 text-slate-700 rounded-xl hover:bg-slate-50 transition-colors"
            disabled={isUploading}
          >
            Batal
          </button>
          <button
            onClick={handleUpload}
            className="flex-1 px-4 py-3 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={isUploading || !selectedFile}
          >
            {isUploading ? (
              <div className="flex items-center justify-center space-x-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span>Mengunggah...</span>
              </div>
            ) : (
              <div className="flex items-center justify-center space-x-2">
                <Save className="w-4 h-4" />
                <span>{request.finalLetterUrl ? 'Perbarui Berkas' : 'Unggah Berkas'}</span>
              </div>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default FinalLetterUploadModal;
