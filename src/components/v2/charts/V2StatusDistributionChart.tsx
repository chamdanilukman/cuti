import React from 'react';
import { Doughnut } from 'react-chartjs-2';

interface V2StatusDistributionChartProps {
  pending: number;
  approvedCoordinator: number;
  approvedAdminDocument: number;
  rejected: number;
}

const V2StatusDistributionChart: React.FC<V2StatusDistributionChartProps> = ({
  pending,
  approvedCoordinator,
  approvedAdminDocument,
  rejected,
}) => {
  const data = {
    labels: ['Menunggu', 'Disetujui Korwil/SMP/SKB', 'Disetujui Dinas', 'Ditolak'],
    datasets: [{
      data: [pending, approvedCoordinator, approvedAdminDocument, rejected],
      backgroundColor: ['#f59e0b', '#3b82f6', '#10b981', '#ef4444'],
      borderWidth: 0,
      hoverOffset: 6,
    }],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '65%',
    plugins: {
      legend: {
        display: true,
        position: 'bottom' as const,
        labels: {
          usePointStyle: true,
          pointStyle: 'circle' as const,
          padding: 16,
          font: { size: 11 },
          color: '#475569',
        },
      },
      tooltip: { backgroundColor: '#1e293b', padding: 12, cornerRadius: 8, boxPadding: 4 },
    },
  };

  return (
    <div className="h-64">
      <Doughnut data={data} options={options} />
    </div>
  );
};

export default V2StatusDistributionChart;
