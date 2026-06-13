import React from 'react';
import { TrendingUp } from 'lucide-react';
import { MonthlyDashboardStat } from '../../hooks/useDashboardStats';

interface MonthlyTrendChartProps {
  monthlyData: MonthlyDashboardStat[];
}

const MonthlyTrendChart: React.FC<MonthlyTrendChartProps> = ({ monthlyData }) => {
  const currentYear = new Date().getFullYear();

  const maxValue = Math.max(...monthlyData.map(d => d.total), 1);

  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 
                     'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

  return (
    <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
      <div className="flex items-center mb-6">
        <TrendingUp className="w-6 h-6 mr-3 text-blue-500" />
        <h3 className="text-lg font-semibold text-gray-900">Tren Bulanan {currentYear}</h3>
      </div>
      
      {/* Chart Area */}
      <div className="relative">
        {/* Y-axis labels */}
        <div className="absolute left-0 top-0 h-full flex flex-col justify-between text-xs text-gray-500 py-2">
          <span>{maxValue}</span>
          <span>{Math.round(maxValue * 0.75)}</span>
          <span>{Math.round(maxValue * 0.5)}</span>
          <span>{Math.round(maxValue * 0.25)}</span>
          <span>0</span>
        </div>
        
        {/* Chart */}
        <div className="ml-12">
          <div className="flex items-end justify-between h-48 mb-4">
            {monthlyData.map((data, index) => {
              const height = (data.total / maxValue) * 100;
              const barHeight = Math.max(height, data.total > 0 ? 8 : 2);
              
              return (
                <div key={index} className="flex flex-col items-center flex-1 max-w-16">
                  {/* Value on top of bar */}
                  {data.total > 0 && (
                    <div className="text-xs font-semibold text-gray-700 mb-1">
                      {data.total}
                    </div>
                  )}
                  {/* Bar */}
                  <div className="relative w-8 mb-2 h-40 flex flex-col justify-end">
                    <div
                      className="w-full bg-gradient-to-t from-blue-500 to-blue-400 rounded-t transition-all duration-300 hover:from-blue-600 hover:to-blue-500"
                      style={{ height: `${barHeight}%`, minHeight: data.total > 0 ? '8px' : '2px' }}
                      title={`${monthNames[index]}: ${data.total} pengajuan (${data.approved} disetujui, ${data.pending} menunggu persetujuan)`}
                    ></div>
                  </div>
                  {/* Month label */}
                  <span className="text-xs text-gray-600 text-center">{monthNames[index]}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
      
      {/* Legend */}
      <div className="flex items-center justify-center space-x-6 text-sm">
        <div className="flex items-center">
          <div className="w-3 h-3 bg-blue-500 rounded mr-2"></div>
          <span className="text-gray-600">Total Pengajuan</span>
        </div>
        <div className="text-xs text-gray-500">
          Maksimum: {maxValue} pengajuan per bulan
        </div>
      </div>
      
      {/* Summary Stats */}
      <div className="mt-4 pt-4 border-t border-gray-100">
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <div className="text-lg font-bold text-blue-600">
              {monthlyData.reduce((sum, d) => sum + d.total, 0)}
            </div>
            <div className="text-xs text-gray-600">Total Tahun Ini</div>
          </div>
          <div>
            <div className="text-lg font-bold text-green-600">
              {monthlyData.reduce((sum, d) => sum + d.approved, 0)}
            </div>
            <div className="text-xs text-gray-600">Disetujui</div>
          </div>
          <div>
            <div className="text-lg font-bold text-yellow-600">
              {Math.round(monthlyData.reduce((sum, d) => sum + d.total, 0) / 12)}
            </div>
            <div className="text-xs text-gray-600">Rata-rata per Bulan</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MonthlyTrendChart;
