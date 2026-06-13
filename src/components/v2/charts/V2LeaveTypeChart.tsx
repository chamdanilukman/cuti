import React from 'react';
import { Bar } from 'react-chartjs-2';
import { DetailedLeaveType } from '../../hooks/useDashboardStats';

interface V2LeaveTypeChartProps {
  detailedLeaveTypes: DetailedLeaveType[];
}

const colors = [
  'rgba(99,102,241,0.8)',
  'rgba(239,68,68,0.8)',
  'rgba(245,158,11,0.8)',
  'rgba(16,185,129,0.8)',
  'rgba(139,92,246,0.8)',
  'rgba(59,130,246,0.8)',
  'rgba(236,72,153,0.8)',
  'rgba(148,163,184,0.8)',
];

const V2LeaveTypeChart: React.FC<V2LeaveTypeChartProps> = ({ detailedLeaveTypes }) => {
  const data = {
    labels: detailedLeaveTypes.map(lt => lt.type),
    datasets: [{
      data: detailedLeaveTypes.map(lt => lt.count),
      backgroundColor: detailedLeaveTypes.map((_, i) => colors[i % colors.length]),
      borderRadius: 6,
      borderSkipped: false,
      maxBarThickness: 40,
    }],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      x: { grid: { display: false }, border: { display: false } },
      y: { grid: { color: '#f1f5f9' }, border: { display: false }, beginAtZero: true },
    },
    plugins: {
      tooltip: { backgroundColor: '#1e293b', padding: 12, cornerRadius: 8 },
    },
  };

  return (
    <div className="h-72">
      <Bar data={data} options={options} />
    </div>
  );
};

export default V2LeaveTypeChart;
