import React, { useState } from 'react';
import { X } from 'lucide-react';

interface RejectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (reason: string) => void;
  isRevision?: boolean;
}

const RejectionModal: React.FC<RejectionModalProps> = ({ isOpen, onClose, onSubmit, isRevision = false }) => {
  const [reason, setReason] = useState('');

  const handleSubmit = () => {
    if (reason.trim()) {
      onSubmit(reason.trim());
      setReason('');
    }
  };

  const handleClose = () => {
    setReason('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
        <div className="flex items-center justify-between p-6 border-b border-slate-200">
          <h3 className="text-lg font-semibold text-slate-900">
            {isRevision ? 'Alasan Revisi Persetujuan' : 'Alasan Penolakan'}
          </h3>
          <button
            onClick={handleClose}
            className="text-slate-400 hover:text-slate-600 transition-colors duration-200"
          >
            <X className="w-6 h-6" />
          </button>
        </div>
        
        <div className="p-6">
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder={isRevision ? "Masukkan alasan revisi persetujuan..." : "Masukkan alasan penolakan..."}
            rows={4}
            className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-rose-500 focus:border-transparent transition-all duration-200 resize-vertical"
          />
        </div>
        
        <div className="flex justify-end space-x-3 p-6 border-t border-slate-200">
          <button
            onClick={handleClose}
            className="px-4 py-2 text-slate-700 bg-slate-100 rounded-xl hover:bg-slate-200 transition-all duration-200"
          >
            Batal
          </button>
          <button
            onClick={handleSubmit}
            disabled={!reason.trim()}
            className="px-4 py-2 bg-rose-500 text-white rounded-xl hover:bg-rose-600 disabled:bg-slate-300 disabled:cursor-not-allowed transition-all duration-200"
          >
            {isRevision ? 'Kirim Revisi' : 'Kirim Penolakan'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default RejectionModal;
