import React, { useState } from 'react';
import { Shield, Lock, Eye, EyeOff, AlertCircle, CheckCircle, Key } from 'lucide-react';
import { supabase } from '../utils/database';

interface ChangePasswordModalProps {
  adminNama: string;
  sessionToken: string;
  onSuccess: () => void;
  onCancel: () => void;
}

const ChangePasswordModal: React.FC<ChangePasswordModalProps> = ({
  adminNama,
  sessionToken,
  onSuccess,
  onCancel,
}) => {
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showOld, setShowOld] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!oldPassword) {
      setError('Password lama wajib diisi');
      return;
    }

    if (newPassword.length < 6) {
      setError('Password baru minimal 6 karakter');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Konfirmasi password tidak cocok');
      return;
    }

    if (oldPassword === newPassword) {
      setError('Password baru harus berbeda dari password lama');
      return;
    }

    setIsSubmitting(true);

    try {
      const { error: rpcError } = await supabase.rpc('admin_change_password', {
        p_session_token: sessionToken,
        p_old_password: oldPassword,
        p_new_password: newPassword,
      });

      if (rpcError) {
        setError(rpcError.message);
        return;
      }

      onSuccess();
    } catch (err) {
      setError('Terjadi kesalahan sistem. Silakan coba lagi.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-2xl p-8 w-full max-w-md mx-4">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-amber-100 rounded-full mb-4">
            <Key className="w-8 h-8 text-amber-600" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Ganti Password</h2>
          <p className="text-slate-600">
            Hai <span className="font-semibold">{adminNama}</span>,
            kamu harus ganti password sebelum bisa mengakses panel.
          </p>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-4 p-4 bg-rose-50 border border-rose-200 rounded-xl flex items-center space-x-3">
            <AlertCircle className="w-5 h-5 text-rose-500 flex-shrink-0" />
            <span className="text-rose-700 text-sm">{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Old Password */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Password Lama
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Lock className="h-5 w-5 text-slate-400" />
              </div>
              <input
                type={showOld ? 'text' : 'password'}
                value={oldPassword}
                onChange={(e) => setOldPassword(e.target.value)}
                className="block w-full pl-10 pr-12 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                placeholder="Password lama"
                required
                disabled={isSubmitting}
              />
              <button
                type="button"
                onClick={() => setShowOld(!showOld)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center"
              >
                {showOld ? <EyeOff className="h-5 w-5 text-slate-400" /> : <Eye className="h-5 w-5 text-slate-400" />}
              </button>
            </div>
          </div>

          {/* New Password */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Password Baru
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Lock className="h-5 w-5 text-slate-400" />
              </div>
              <input
                type={showNew ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="block w-full pl-10 pr-12 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                placeholder="Password baru (min 6 karakter)"
                required
                minLength={6}
                disabled={isSubmitting}
              />
              <button
                type="button"
                onClick={() => setShowNew(!showNew)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center"
              >
                {showNew ? <EyeOff className="h-5 w-5 text-slate-400" /> : <Eye className="h-5 w-5 text-slate-400" />}
              </button>
            </div>
          </div>

          {/* Confirm Password */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Konfirmasi Password Baru
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <CheckCircle className="h-5 w-5 text-slate-400" />
              </div>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="block w-full pl-10 pr-3 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                placeholder="Ulangi password baru"
                required
                minLength={6}
                disabled={isSubmitting}
              />
            </div>
          </div>

          {/* Hint */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-3">
            <p className="text-xs text-blue-700">
              Password baru minimal 6 karakter. Gunakan kombinasi huruf dan angka untuk keamanan lebih baik.
            </p>
          </div>

          {/* Buttons */}
          <div className="flex space-x-4 pt-2">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 px-4 py-3 border border-slate-300 text-slate-700 rounded-xl hover:bg-slate-50 transition-colors"
              disabled={isSubmitting}
            >
              Logout
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-3 bg-amber-600 text-white rounded-xl hover:bg-amber-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isSubmitting || !oldPassword || !newPassword || !confirmPassword}
            >
              {isSubmitting ? (
                <div className="flex items-center justify-center space-x-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Menyimpan...</span>
                </div>
              ) : (
                'Simpan Password Baru'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ChangePasswordModal;
