import React from 'react';
import { PieChart } from 'lucide-react';
import { LeaveTypeDashboardStat } from '../../hooks/useDashboardStats';

interface LeaveTypePercentageChartProps {
  leaveTypeData: LeaveTypeDashboardStat;
}

const LeaveTypePercentageChart: React.FC<LeaveTypePercentageChartProps> = ({ leaveTypeData }) => {
  const total = leaveTypeData.annual + leaveTypeData.others;
  
  // Create data for the chart
  const data = [
    {
      label: 'Cuti Tahunan',
      value: leaveTypeData.annual,
      color: '#3B82F6', // Blue
      percentage: total > 0 ? (leaveTypeData.annual / total) * 100 : 0
    },
    {
      label: 'Cuti Lainnya',
      value: leaveTypeData.others,
      color: '#10B981', // Green
      percentage: total > 0 ? (leaveTypeData.others / total) * 100 : 0
    }
  ];

  // Calculate stroke dash array for circular progress
  const circumference = 2 * Math.PI * 80;
  let currentOffset = 0;
  
  const segments = data.map((item) => {
    const strokeDasharray = `${(item.percentage / 100) * circumference} ${circumference}`;
    const strokeDashoffset = -currentOffset;
    currentOffset += (item.percentage / 100) * circumference;
    
    return {
      ...item,
      strokeDasharray,
      strokeDashoffset
    };
  });

  return (
    <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
      <div className="flex items-center mb-6">
        <PieChart className="w-6 h-6 mr-3 text-purple-500" />
        <h3 className="text-lg font-semibold text-gray-900">Perbandingan Jenis Cuti</h3>
      </div>
      
      <div className="flex flex-col lg:flex-row items-center">
        {/* Circular Chart */}
        <div className="relative w-48 h-48 mb-6 lg:mb-0 lg:mr-8">
          <svg className="w-full h-full transform -rotate-90" viewBox="0 0 200 200">
            {/* Background circle */}
            <circle
              cx="100"
              cy="100"
              r="80"
              fill="none"
              stroke="#f3f4f6"
              strokeWidth="16"
            />
            
            {/* Data segments */}
            {segments.map((segment, index) => (
              <circle
                key={index}
                cx="100"
                cy="100"
                r="80"
                fill="none"
                stroke={segment.color}
                strokeWidth="16"
                strokeDasharray={segment.strokeDasharray}
                strokeDashoffset={segment.strokeDashoffset}
                className="transition-all duration-300"
                style={{
                  strokeLinecap: 'round'
                }}
              />
            ))}
          </svg>
          
          {/* Center content */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <div className="text-3xl font-bold text-gray-900">{total}</div>
            <div className="text-sm text-gray-600 text-center">Total Pengajuan</div>
          </div>
        </div>
        
        {/* Legend and Stats */}
        <div className="flex-1">
          <div className="space-y-4">
            {segments.map((segment, index) => (
              <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center">
                  <div
                    className="w-4 h-4 rounded-full mr-4"
                    style={{ backgroundColor: segment.color }}
                  ></div>
                  <div>
                    <div className="font-medium text-gray-900">{segment.label}</div>
                    <div className="text-sm text-gray-600">
                      {segment.value} dari {total} pengajuan
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div 
                    className="text-2xl font-bold"
                    style={{ color: segment.color }}
                  >
                    {segment.percentage.toFixed(1)}%
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          {/* Summary */}
          <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <h4 className="font-semibold text-blue-900 mb-2">Ringkasan</h4>
            <div className="text-sm text-blue-800">
              {leaveTypeData.annual > leaveTypeData.others ? (
                <span>
                  Cuti tahunan lebih banyak diusulkan ({leaveTypeData.annual} vs {leaveTypeData.others})
                </span>
              ) : leaveTypeData.others > leaveTypeData.annual ? (
                <span>
                  Cuti lainnya lebih banyak diusulkan ({leaveTypeData.others} vs {leaveTypeData.annual})
                </span>
              ) : (
                <span>
                  Jenis cuti diusulkan seimbang
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LeaveTypePercentageChart;
