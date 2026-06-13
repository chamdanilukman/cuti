import React, { useState } from 'react';
import { X, Link, Save, ExternalLink, AlertCircle } from 'lucide-react';
import { LeaveRequest } from '../types';

interface DriveLinkModalProps {
  isOpen: boolean;
  onClose: () => void;
  request: LeaveRequest;
  onSave: (requestId: string, driveLink: string) => Promise<boolean>;
}

const DriveLinkModal: React.FC<DriveLinkModalProps> = ({
  isOpen,
  onClose,
  request,
  onSave
}) => {
  const [driveLink, setDriveLink] = useState(request.driveLink || '');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSave = async () => {
    if (!driveLink.trim()) {
      setError('Tautan Google Drive wajib diisi.');
      return;
    }

    // Validate Google Drive URL
    const driveUrlPattern = /^https:\/\/drive\.google\.com\//;
    if (!driveUrlPattern.test(driveLink)) {
      setError('Tautan harus berupa URL Google Drive yang valid.');
      return;
    }

    setIsSaving(true);
    setError('');

    try {
      const success = await onSave(request.id, driveLink);
      if (success) {
        onClose();
      } else {
        setError('Gagal menyimpan tautan. Silakan coba kembali.');
      }
    } catch (err) {
      console.error('Error saving drive link:', err);
      const errorMessage = err instanceof Error ? err.message : 'Terjadi kesalahan sistem';
      if (errorMessage.includes('multiple (or no) rows returned')) {
        setError('Data tidak ditemukan atau terduplikasi. Silakan muat ulang halaman dan coba kembali.');
      } else if (errorMessage.includes('not found')) {
        setError('Data pengajuan tidak ditemukan. Silakan muat ulang halaman.');
      } else {
        setError(`Kesalahan: ${errorMessage}`);
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleTestLink = () => {
    if (driveLink) {
      window.open(driveLink, '_blank');
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-md mx-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center">
              <Link className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-slate-900">Tautan Surat Usulan Cuti</h3>
              <p className="text-sm text-slate-600">
                {request.driveLink ? 'Perbarui tautan Google Drive' : 'Tambahkan tautan Google Drive'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition-colors"
            disabled={isSaving}
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

            {/* Status Info */}
            <div className="pt-2 mt-2 border-t border-slate-300">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-slate-700">Status:</span>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  request.status === 'document_issued'
                    ? 'bg-violet-100 text-violet-800'
                    : 'bg-emerald-100 text-emerald-800'
                }`}>
                  {request.status === 'document_issued' ? 'Surat Cuti Terbit' : 'Disetujui Dinas Pendidikan'}
                </span>
              </div>
              {request.driveLink && (
                <div className="mt-2">
                  <span className="text-sm font-medium text-slate-700">Tautan Saat Ini:</span>
                  <p className="text-xs text-indigo-600 break-all mt-1">{request.driveLink}</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Drive Link Input */}
        <div className="space-y-4">
          <div>
            <label htmlFor="driveLink" className="block text-sm font-medium text-slate-700 mb-2">
              Tautan Google Drive *
            </label>
            <div className="relative">
              <input
                id="driveLink"
                type="url"
                value={driveLink}
                onChange={(e) => {
                  setDriveLink(e.target.value);
                  setError('');
                }}
                placeholder="https://drive.google.com/file/d/..."
                className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                disabled={isSaving}
              />
              {driveLink && (
                <button
                  type="button"
                  onClick={handleTestLink}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-indigo-600 hover:text-indigo-800"
                  title="Uji tautan"
                >
                  <ExternalLink className="w-4 h-4" />
                </button>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Pastikan tautan dapat diakses oleh pemohon cuti
            </p>
          </div>

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
              <li>• Unggah surat usulan cuti yang telah disahkan ke Google Drive</li>
              <li>• Pastikan pengaturan berbagi diatur ke "Siapa pun yang memiliki tautan dapat melihat"</li>
              <li>• Salin tautan dan tempelkan pada kolom di atas</li>
              <li>• Pemohon dapat mengunduh melalui menu Status Pengajuan Cuti</li>
            </ul>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex space-x-3 mt-6">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-3 border border-slate-300 text-slate-700 rounded-xl hover:bg-slate-50 transition-colors"
            disabled={isSaving}
          >
            Batal
          </button>
          <button
            onClick={handleSave}
            className="flex-1 px-4 py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={isSaving || !driveLink.trim()}
          >
            {isSaving ? (
              <div className="flex items-center justify-center space-x-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span>Menyimpan...</span>
              </div>
            ) : (
              <div className="flex items-center justify-center space-x-2">
                <Save className="w-4 h-4" />
                <span>{request.driveLink ? 'Perbarui Tautan' : 'Simpan Tautan'}</span>
              </div>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default DriveLinkModal;
