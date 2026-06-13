import React, { useState } from 'react';

interface CircularChartProps {
  title: string;
  data: Array<{
    label: string;
    value: number;
    color: string;
    percentage: number;
    fullName?: string; // For showing full school/kecamatan name on hover
  }>;
  centerValue?: string;
  centerLabel?: string;
  showLegend?: boolean; // Optional: whether to show legend below
}

const CircularChart: React.FC<CircularChartProps> = ({ 
  title, 
  data, 
  centerValue, 
  centerLabel, 
  showLegend = true 
}) => {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  
  const total = data.reduce((sum, item) => sum + item.value, 0);
  
  // Calculate stroke dash array for circular progress
  const circumference = 2 * Math.PI * 90; // radius = 90
  let currentOffset = 0;
  
  const segments = data.map((item, index) => {
    const percentage = total > 0 ? (item.value / total) * 100 : 0;
    const strokeDasharray = `${(percentage / 100) * circumference} ${circumference}`;
    const strokeDashoffset = -currentOffset;
    currentOffset += (percentage / 100) * circumference;
    
    return {
      ...item,
      percentage,
      strokeDasharray,
      strokeDashoffset
    };
  });

  const handleMouseMove = (e: React.MouseEvent) => {
    setMousePosition({ x: e.clientX, y: e.clientY });
  };

  const handleMouseEnter = (index: number) => {
    setHoveredIndex(index);
  };

  const handleMouseLeave = () => {
    setHoveredIndex(null);
  };

  return (
    <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
      <h3 className="text-lg font-semibold text-gray-900 mb-6 text-center">{title}</h3>
      
      <div className="flex flex-col items-center">
        {/* Circular Chart */}
        <div 
          className="relative w-48 h-48 mb-6"
          onMouseMove={handleMouseMove}
        >
          <svg className="w-full h-full transform -rotate-90" viewBox="0 0 200 200">
            {/* Background circle */}
            <circle
              cx="100"
              cy="100"
              r="90"
              fill="none"
              stroke="#f3f4f6"
              strokeWidth="12"
            />
            
            {/* Data segments */}
            {segments.map((segment, index) => (
              <circle
                key={index}
                cx="100"
                cy="100"
                r="90"
                fill="none"
                stroke={segment.color}
                strokeWidth="12"
                strokeDasharray={segment.strokeDasharray}
                strokeDashoffset={segment.strokeDashoffset}
                className={`transition-all duration-300 cursor-pointer ${
                  hoveredIndex === index ? 'opacity-80' : 'opacity-100'
                }`}
                style={{
                  strokeLinecap: 'round'
                }}
                onMouseEnter={() => handleMouseEnter(index)}
                onMouseLeave={handleMouseLeave}
              />
            ))}
          </svg>
          
          {/* Center content */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            {centerValue && (
              <div className="text-2xl font-bold text-gray-900">{centerValue}</div>
            )}
            {centerLabel && (
              <div className="text-sm text-gray-600 text-center">{centerLabel}</div>
            )}
            {!centerValue && !centerLabel && (
              <div className="text-sm text-gray-600 text-center">Total</div>
            )}
          </div>
        </div>
        
        {/* Hover Tooltip */}
        {hoveredIndex !== null && (
          <div 
            className="fixed z-50 bg-gray-900 text-white px-3 py-2 rounded-lg shadow-lg pointer-events-none max-w-xs"
            style={{
              left: mousePosition.x + 10,
              top: mousePosition.y - 10,
              transform: 'translateY(-100%)'
            }}
          >
            <div className="text-sm font-medium">
              {segments[hoveredIndex].fullName || segments[hoveredIndex].label}
            </div>
            <div className="text-xs text-gray-300">
              {segments[hoveredIndex].value} pengajuan ({segments[hoveredIndex].percentage.toFixed(1)}%)
            </div>
          </div>
        )}
        
        {/* Legend - Only show if showLegend is true */}
        {showLegend && (
          <div className="space-y-2 w-full">
            {segments.map((segment, index) => (
              <div key={index} className="flex items-center justify-between">
                <div className="flex items-center">
                  <div
                    className="w-3 h-3 rounded-full mr-3"
                    style={{ backgroundColor: segment.color }}
                  ></div>
                  <span className="text-sm text-gray-700">
                    {segment.label}
                    {segment.fullName && segment.fullName !== segment.label && (
                      <span className="text-xs text-gray-500 ml-1">
                        ({segment.fullName.substring(0, 30)}{segment.fullName.length > 30 ? '...' : ''})
                      </span>
                    )}
                  </span>
                </div>
                <div className="text-right">
                  <div className="text-sm font-semibold text-gray-900">{segment.value}</div>
                  <div className="text-xs text-gray-500">{segment.percentage.toFixed(1)}%</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default CircularChart;
