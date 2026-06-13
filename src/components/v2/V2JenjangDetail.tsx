import React from 'react';
import { Baby, BookOpen, GraduationCap, School } from 'lucide-react';
import { JenjangStat } from '../../hooks/useDashboardStats';

interface V2JenjangDetailProps {
  jenjangData: JenjangStat[];
}

const jenjangConfig: Record<string, { icon: React.FC<{ className?: string }>; color: string; bg: string }> = {
  TK: { icon: Baby, color: 'text-violet-600', bg: 'bg-violet-50' },
  SD: { icon: School, color: 'text-blue-600', bg: 'bg-blue-50' },
  SMP: { icon: GraduationCap, color: 'text-emerald-600', bg: 'bg-emerald-50' },
  SKB: { icon: BookOpen, color: 'text-amber-600', bg: 'bg-amber-50' },
};

const progressColor: Record<string, string> = {
  TK: 'bg-violet-500',
  SD: 'bg-blue-500',
  SMP: 'bg-emerald-500',
  SKB: 'bg-amber-500',
};

const V2JenjangDetail: React.FC<V2JenjangDetailProps> = ({ jenjangData }) => {
  const total = jenjangData.reduce((sum, j) => sum + j.count, 0);

  if (jenjangData.length === 0) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-soft">
        <h3 className="text-base font-semibold text-slate-900 mb-6">Detail Per Jenjang</h3>
        <p className="text-sm text-slate-500">Belum ada data.</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-soft">
      <div className="mb-6">
        <h3 className="text-base font-semibold text-slate-900">Detail Per Jenjang</h3>
        <p className="text-xs text-slate-500 mt-0.5">Jumlah pengajuan aktif per jenjang</p>
      </div>
      <div className="space-y-4">
        {jenjangData.map((item) => {
          const config = jenjangConfig[item.jenjang] || jenjangConfig.TK;
          const IconComponent = config.icon;
          const pct = total > 0 ? (item.count / total) * 100 : 0;

          return (
            <div key={item.jenjang} className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${config.bg}`}>
                  <IconComponent className={`w-4 h-4 ${config.color}`} />
                </div>
                <span className="text-sm font-medium text-slate-700">{item.jenjang}</span>
              </div>
              <div className="text-right">
                <span className="text-sm font-bold text-slate-900">{item.count}</span>
                <div className="w-20 bg-slate-100 rounded-full h-1.5 mt-1">
                  <div
                    className={`h-1.5 rounded-full ${progressColor[item.jenjang] || 'bg-slate-400'}`}
                    style={{ width: `${Math.min(pct, 100)}%` }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default V2JenjangDetail;
