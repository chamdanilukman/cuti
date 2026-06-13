import React from 'react';
import { RecentActivityItem } from '../../hooks/useDashboardStats';
import { formatDistanceToNow, parseISO } from 'date-fns';
import { id } from 'date-fns/locale';

interface V2RecentActivityProps {
  activities: RecentActivityItem[];
}

const statusDotColor: Record<string, string> = {
  pending: 'bg-amber-500',
  approved_coordinator: 'bg-blue-500',
  approved_admin: 'bg-emerald-500',
  document_issued: 'bg-emerald-500',
  rejected: 'bg-rose-500',
};

const statusVerb: Record<string, string> = {
  pending: 'mengajukan',
  approved_coordinator: 'disetujui oleh Korwil/SMP/SKB',
  approved_admin: 'disetujui oleh Admin Dinas',
  document_issued: 'surat cuti telah terbit untuk',
  rejected: 'pengajuan ditolak untuk',
};

const V2RecentActivity: React.FC<V2RecentActivityProps> = ({ activities }) => {
  if (activities.length === 0) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-soft">
        <h3 className="text-base font-semibold text-slate-900 mb-6">Aktivitas Terbaru</h3>
        <p className="text-sm text-slate-500">Belum ada aktivitas.</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-soft">
      <div className="mb-6">
        <h3 className="text-base font-semibold text-slate-900">Aktivitas Terbaru</h3>
        <p className="text-xs text-slate-500 mt-0.5">Pengajuan yang baru masuk</p>
      </div>
      <div className="space-y-4">
        {activities.map((activity, index) => {
          let timeAgo = '';
          try {
            timeAgo = formatDistanceToNow(parseISO(activity.createdAt), { addSuffix: true, locale: id });
          } catch {
            timeAgo = 'beberapa waktu lalu';
          }

          return (
            <div key={index} className="flex items-start gap-3">
              <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${statusDotColor[activity.status] || 'bg-slate-400'}`} />
              <div>
                <p className="text-sm text-slate-800">
                  <span className="font-semibold">{activity.nama}</span>{' '}
                  {statusVerb[activity.status] || 'mengajukan'}{' '}
                  <span className="font-medium">{activity.jenisCuti}</span>
                </p>
                <p className="text-xs text-slate-400 mt-0.5">{timeAgo}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default V2RecentActivity;
