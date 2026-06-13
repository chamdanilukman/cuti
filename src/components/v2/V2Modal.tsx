import React from 'react';
import { X } from 'lucide-react';

interface V2ModalProps {
  isOpen: boolean;
  onClose: () => void;
  message: string;
  type?: 'info' | 'success' | 'error';
}

const V2Modal: React.FC<V2ModalProps> = ({ isOpen, onClose, message, type = 'info' }) => {
  if (!isOpen) return null;

  const barColor = type === 'success' ? 'bg-emerald-500' : type === 'error' ? 'bg-rose-500' : 'bg-indigo-500';

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-card max-w-md w-full overflow-hidden">
        <div className={`h-1 ${barColor}`} />
        <div className="flex items-center justify-between px-6 pt-5 pb-3">
          <h3 className="text-lg font-semibold text-slate-900">Informasi</h3>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition-colors duration-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="px-6 pb-5">
          <p className="text-slate-700 leading-relaxed">{message}</p>
        </div>
        <div className="flex justify-end px-6 pb-5">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors duration-200 text-sm font-semibold"
          >
            OK
          </button>
        </div>
      </div>
    </div>
  );
};

export default V2Modal;
