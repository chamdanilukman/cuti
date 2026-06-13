import React from 'react';
import { Line } from 'react-chartjs-2';
import { MonthlyDashboardStat } from '../../hooks/useDashboardStats';

interface V2MonthlyTrendChartProps {
  monthlyData: MonthlyDashboardStat[];
}

const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

const V2MonthlyTrendChart: React.FC<V2MonthlyTrendChartProps> = ({ monthlyData }) => {
  const data = {
    labels: months,
    datasets: [
      {
        label: 'Pengajuan',
        data: monthlyData.map(m => m.total),
        borderColor: '#6366f1',
        backgroundColor: 'rgba(99,102,241,0.08)',
        fill: true,
        tension: 0.4,
        borderWidth: 2.5,
        pointRadius: 3,
        pointBackgroundColor: '#6366f1',
        pointBorderColor: '#fff',
        pointBorderWidth: 2,
        pointHoverRadius: 6,
      },
      {
        label: 'Disetujui',
        data: monthlyData.map(m => m.approved),
        borderColor: '#10b981',
        backgroundColor: 'rgba(16,185,129,0.05)',
        fill: true,
        tension: 0.4,
        borderWidth: 2,
        pointRadius: 2,
        pointBackgroundColor: '#10b981',
        pointBorderColor: '#fff',
        pointBorderWidth: 2,
        pointHoverRadius: 5,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index' as const, intersect: false },
    scales: {
      x: { grid: { display: false }, border: { display: false } },
      y: { grid: { color: '#f1f5f9' }, border: { display: false }, beginAtZero: true, ticks: { stepSize: 5 } },
    },
    plugins: {
      tooltip: { backgroundColor: '#1e293b', titleColor: '#f8fafc', bodyColor: '#cbd5e1', padding: 12, cornerRadius: 8, displayColors: true, boxPadding: 4 },
    },
  };

  return (
    <div className="h-72">
      <Line data={data} options={options} />
    </div>
  );
};

export default V2MonthlyTrendChart;
