import React from 'react';
import { FileText, Clock, CheckCircle, Award } from 'lucide-react';
import MonthlyTrendChart from './charts/MonthlyTrendChart';
import LeaveTypePercentageChart from './charts/LeaveTypePercentageChart';
import { useDashboardStats } from '../hooks/useDashboardStats';

const Dashboard: React.FC = () => {
  const { stats, loading, error } = useDashboardStats();

  const summaryStats = stats ?? {
    pending: 0,
    approvedCoordinator: 0,
    approvedAdmin: 0,
    documentIssued: 0,
    monthlyData: Array.from({ length: 12 }, (_, index) => ({
      month: index + 1,
      approved: 0,
      pending: 0,
      total: 0,
    })),
    leaveTypeData: { annual: 0, others: 0 },
  };

  const statCards = [
    {
      title: 'Pengajuan Baru',
      value: summaryStats.pending,
      icon: FileText,
      color: 'bg-blue-500',
      bgColor: 'bg-blue-50',
      textColor: 'text-blue-700'
    },
    {
      title: 'Menunggu Persetujuan',
      value: summaryStats.pending,
      icon: Clock,
      color: 'bg-yellow-500',
      bgColor: 'bg-yellow-50',
      textColor: 'text-yellow-700'
    },
    {
      title: 'Disetujui Koordinator Wilayah',
      value: summaryStats.approvedCoordinator,
      icon: CheckCircle,
      color: 'bg-orange-500',
      bgColor: 'bg-orange-50',
      textColor: 'text-orange-700'
    },
    {
      title: 'Disetujui Dinas Pendidikan',
      value: summaryStats.approvedAdmin,
      icon: Award,
      color: 'bg-green-500',
      bgColor: 'bg-green-50',
      textColor: 'text-green-700'
    },
  ];

  return (
    <div className="space-y-8">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          Selamat Datang di Si CERDAS
        </h1>
        <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
          Sistem Cuti Elektronik Dinas Pendidikan Kabupaten Grobogan
        </p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
          {error}
        </div>
      )}

      {loading && (
        <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm text-gray-600">
          Memuat statistik dashboard...
        </div>
      )}

      {/* Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((card, index) => {
          const Icon = card.icon;
          return (
            <div
              key={index}
              className={`${card.bgColor} rounded-xl p-6 border border-gray-200 shadow-sm hover:shadow-md transition-all duration-200`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className={`text-sm font-medium ${card.textColor} mb-1`}>
                    {card.title}
                  </p>
                  <p className={`text-3xl font-bold ${card.textColor}`}>
                    {card.value}
                  </p>
                </div>
                <div className={`${card.color} p-3 rounded-lg`}>
                  <Icon className="w-6 h-6 text-white" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Charts Section */}
      <div className="space-y-8">
        {/* Monthly Trend Chart */}
        <MonthlyTrendChart monthlyData={summaryStats.monthlyData} />
        
        {/* Leave Type Percentage Chart */}
        <LeaveTypePercentageChart leaveTypeData={summaryStats.leaveTypeData} />
      </div>
    </div>
  );
};

export default Dashboard;
