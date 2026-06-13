import React from 'react';
import { Clock, CheckCircle, Award, XCircle, FileCheck } from 'lucide-react';

interface StatusBadgeProps {
  status: 'pending' | 'approved_coordinator' | 'approved_admin' | 'rejected' | 'document_issued';
}

const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  const getStatusConfig = () => {
    switch (status) {
      case 'pending':
        return {
          text: 'Menunggu Persetujuan',
          icon: Clock,
          className: 'bg-amber-100 text-amber-800 border-amber-200'
        };
      case 'approved_coordinator':
        return {
          text: 'Disetujui Koordinator Wilayah',
          icon: CheckCircle,
          className: 'bg-amber-100 text-amber-700 border-amber-200'
        };
      case 'approved_admin':
        return {
          text: 'Disetujui Dinas Pendidikan',
          icon: Award,
          className: 'bg-emerald-100 text-emerald-800 border-emerald-200'
        };
      case 'rejected':
        return {
          text: 'Ditolak',
          icon: XCircle,
          className: 'bg-rose-100 text-rose-800 border-rose-200'
        };
      case 'document_issued':
        return {
          text: 'Surat Cuti Terbit',
          icon: FileCheck,
          className: 'bg-violet-100 text-violet-800 border-violet-200'
        };
      default:
        return {
          text: 'Tidak Diketahui',
          icon: Clock,
          className: 'bg-slate-100 text-slate-700 border-slate-200'
        };
    }
  };

  const config = getStatusConfig();
  const Icon = config.icon;

  return (
    <span className={`inline-flex items-center space-x-1 px-3 py-1 rounded-full text-sm font-medium border ${config.className}`}>
      <Icon className="w-4 h-4" />
      <span>{config.text}</span>
    </span>
  );
};

export default StatusBadge;
