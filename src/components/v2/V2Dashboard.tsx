import React, { useState } from 'react';
import { CheckCircle2, Clock, FileText, XCircle } from 'lucide-react';
import { useDashboardStats } from '../../hooks/useDashboardStats';
import V2StatCard from './V2StatCard';
import V2MonthlyTrendChart from './charts/V2MonthlyTrendChart';
import V2StatusDistributionChart from './charts/V2StatusDistributionChart';
import V2LeaveTypeChart from './charts/V2LeaveTypeChart';
import V2DistrictChart from './charts/V2DistrictChart';
import V2JenjangChart from './charts/V2JenjangChart';
import V2RecentActivity from './V2RecentActivity';
import V2JenjangDetail from './V2JenjangDetail';

const currentYear = new Date().getFullYear();
const yearOptions = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i);

const V2Dashboard: React.FC = () => {
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const { stats, recentActivity, loading, error } = useDashboardStats(selectedYear);

  const summaryStats = stats ?? {
    pending: 0,
    approvedCoordinator: 0,
    approvedAdmin: 0,
    documentIssued: 0,
    rejected: 0,
    monthlyData: Array.from({ length: 12 }, (_, index) => ({
      month: index + 1,
      approved: 0,
      pending: 0,
      total: 0,
    })),
    leaveTypeData: { annual: 0, others: 0 },
    districtData: [],
    jenjangData: [],
    detailedLeaveTypes: [],
  };

  const totalApproved = summaryStats.approvedAdmin + summaryStats.documentIssued;
  const totalRequests = summaryStats.pending + summaryStats.approvedCoordinator + summaryStats.approvedAdmin + summaryStats.documentIssued + summaryStats.rejected;
  const approvalRate = totalRequests > 0 ? Math.round((totalApproved / totalRequests) * 100) : 0;

  const currentMonth = new Date().getMonth();
  const prevMonth = currentMonth === 0 ? 11 : currentMonth - 1;
  const prevMonthTotal = summaryStats.monthlyData[prevMonth]?.total || 0;
  const currentMonthTotal = summaryStats.monthlyData[currentMonth]?.total || 0;
  const monthChange = prevMonthTotal > 0 ? Math.round(((currentMonthTotal - prevMonthTotal) / prevMonthTotal) * 100) : currentMonthTotal > 0 ? 100 : 0;

  return (
    <main id="main-content" className="flex-1 py-6 sm:py-8">
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <section className="mb-8 text-center">
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-950 sm:text-4xl">
            Selamat Datang di Si CERDAS
          </h1>
          <p className="mt-3 text-base text-slate-500 max-w-2xl mx-auto">
            Sistem Cuti Elektronik Dinas Pendidikan Kabupaten Grobogan
          </p>
        </section>

        <div className="flex items-center justify-end gap-2 mb-6">
          <select
            className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-700 focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none"
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
          >
            {yearOptions.map(y => (
              <option key={y} value={y}>Tahun {y}</option>
            ))}
          </select>
        </div>

      <div aria-live="polite">
        {loading && (
          <div className="mb-5 rounded-2xl border border-blue-100 bg-blue-50 p-4 text-sm font-medium text-blue-700">
            Memuat statistik dashboard…
          </div>
        )}
        {error && (
          <div className="mb-5 rounded-2xl border border-rose-100 bg-rose-50 p-4 text-sm font-medium text-rose-700">
            {error}
          </div>
        )}
      </div>

      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        <V2StatCard
          title="Total Pengajuan"
          value={totalRequests}
          helper=""
          icon={FileText}
          tone="slate"
          trend={{
            direction: monthChange >= 0 ? 'up' : 'down',
            label: `${monthChange >= 0 ? '+' : ''}${monthChange}% dari bulan lalu`,
            tone: monthChange >= 0 ? 'emerald' : 'rose',
          }}
        />
        <V2StatCard
          title="Menunggu Persetujuan"
          value={summaryStats.approvedCoordinator}
          helper=""
          icon={Clock}
          tone="amber"
          trend={{
            direction: summaryStats.approvedCoordinator > 0 ? 'up' : 'neutral',
            label: `${summaryStats.pending} pengajuan baru`,
            tone: 'amber',
          }}
        />
        <V2StatCard
          title="Disetujui"
          value={totalApproved}
          helper=""
          icon={CheckCircle2}
          tone="emerald"
          trend={{
            direction: 'up',
            label: `${approvalRate}% approval rate`,
            tone: 'emerald',
          }}
        />
        <V2StatCard
          title="Ditolak / Revisi"
          value={summaryStats.rejected}
          helper=""
          icon={XCircle}
          tone="rose"
          trend={{
            direction: summaryStats.rejected > 0 ? 'up' : 'neutral',
            label: 'Perlu ditindaklanjuti',
            tone: 'rose',
          }}
        />
      </section>

      <section className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 rounded-xl border border-slate-200 bg-white p-6 shadow-soft">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-base font-semibold text-slate-900">Tren Pengajuan Bulanan</h3>
              <p className="text-xs text-slate-500 mt-0.5">Jumlah pengajuan per bulan tahun {selectedYear}</p>
            </div>
            <div className="flex items-center gap-4 text-xs font-medium">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-indigo-500" />
                Pengajuan
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                Disetujui
              </span>
            </div>
          </div>
          <V2MonthlyTrendChart monthlyData={summaryStats.monthlyData} />
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-soft">
          <div className="mb-6">
            <h3 className="text-base font-semibold text-slate-900">Distribusi Status</h3>
            <p className="text-xs text-slate-500 mt-0.5">Proporsi pengajuan saat ini</p>
          </div>
          <V2StatusDistributionChart
            pending={summaryStats.pending}
            approvedCoordinator={summaryStats.approvedCoordinator}
            approvedAdminDocument={totalApproved}
            rejected={summaryStats.rejected}
          />
        </div>
      </section>

      <section className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-soft">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-base font-semibold text-slate-900">Berdasarkan Jenis Cuti</h3>
              <p className="text-xs text-slate-500 mt-0.5">Distribusi jenis cuti yang diajukan</p>
            </div>
          </div>
          <V2LeaveTypeChart detailedLeaveTypes={summaryStats.detailedLeaveTypes} />
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-soft">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-base font-semibold text-slate-900">Berdasarkan Kecamatan</h3>
              <p className="text-xs text-slate-500 mt-0.5">Top {summaryStats.districtData.length} kecamatan dengan pengajuan terbanyak</p>
            </div>
          </div>
          <V2DistrictChart districtData={summaryStats.districtData} />
        </div>
      </section>

      <section className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-soft">
          <div className="mb-6">
            <h3 className="text-base font-semibold text-slate-900">Berdasarkan Jenjang</h3>
            <p className="text-xs text-slate-500 mt-0.5">Distribusi per jenjang pendidikan</p>
          </div>
          <V2JenjangChart jenjangData={summaryStats.jenjangData} />
        </div>

        <V2JenjangDetail jenjangData={summaryStats.jenjangData} />

        <V2RecentActivity activities={recentActivity} />
      </section>
      </div>
    </main>
  );
};

export default V2Dashboard;
