import React from 'react';
import { Bar } from 'react-chartjs-2';
import { JenjangStat } from '../../hooks/useDashboardStats';

interface V2JenjangChartProps {
  jenjangData: JenjangStat[];
}

const jenjangColorMap: Record<string, string> = {
  TK: 'rgba(139,92,246,0.8)',
  SD: 'rgba(59,130,246,0.8)',
  SMP: 'rgba(16,185,129,0.8)',
  SKB: 'rgba(245,158,11,0.8)',
};

const V2JenjangChart: React.FC<V2JenjangChartProps> = ({ jenjangData }) => {
  const data = {
    labels: jenjangData.map(j => j.jenjang),
    datasets: [{
      data: jenjangData.map(j => j.count),
      backgroundColor: jenjangData.map(j => jenjangColorMap[j.jenjang] || 'rgba(148,163,184,0.8)'),
      borderRadius: 8,
      borderSkipped: false,
      maxBarThickness: 48,
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
    <div className="h-64">
      <Bar data={data} options={options} />
    </div>
  );
};

export default V2JenjangChart;
