import React from 'react';
import { Bar } from 'react-chartjs-2';
import { DistrictStat } from '../../hooks/useDashboardStats';

interface V2DistrictChartProps {
  districtData: DistrictStat[];
}

const V2DistrictChart: React.FC<V2DistrictChartProps> = ({ districtData }) => {
  const data = {
    labels: districtData.map(d => d.district),
    datasets: [{
      data: districtData.map(d => d.count),
      backgroundColor: 'rgba(99,102,241,0.75)',
      borderRadius: 6,
      borderSkipped: false,
      maxBarThickness: 24,
    }],
  };

  const options = {
    indexAxis: 'y' as const,
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      x: { grid: { color: '#f1f5f9' }, border: { display: false }, beginAtZero: true },
      y: { grid: { display: false }, border: { display: false } },
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

export default V2DistrictChart;
