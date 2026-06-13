import React from 'react';
import CircularChart from './CircularChart';
import { LeaveRequest } from '../../types';

interface ProposalChartsProps {
  leaveRequests: LeaveRequest[];
}

// Extract real district data from leaveRequests
const getDistrictData = (leaveRequests: LeaveRequest[]) => {
  // Count proposals by district
  const districtCount = leaveRequests.reduce((acc, request) => {
    const district = request.kecamatan?.toUpperCase() || 'UNKNOWN';
    acc[district] = (acc[district] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Define colors for districts
  const colors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#6B7280', '#EC4899', '#14B8A6'];
  
  // Convert to array and sort by value (descending)
  const districtData = Object.entries(districtCount)
    .map(([label, value], index) => ({
      label: label === 'UNKNOWN' ? 'Lainnya' : label, // Simplified label for circle
      fullName: label === 'UNKNOWN' ? 'Lainnya' : `Kecamatan ${label}`, // Full name for tooltip
      value,
      color: colors[index % colors.length]
    }))
    .sort((a, b) => b.value - a.value);
  
  return districtData.map(item => ({
    ...item,
    percentage: 0 // Will be calculated in CircularChart
  }));
};

// Extract real school data from leaveRequests using unitKerja
const getSchoolData = (leaveRequests: LeaveRequest[]) => {
  // Count proposals by unitKerja (school names)
  const schoolCount = leaveRequests.reduce((acc, request) => {
    const school = request.unitKerja?.trim() || 'UNKNOWN';
    acc[school] = (acc[school] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Define colors for different school types
  const getSchoolColor = (schoolName: string): string => {
    const name = schoolName.toUpperCase();
    if (name.includes('TK')) return '#F59E0B';
    if (name.includes('SD')) return '#10B981';
    if (name.includes('SMP')) return '#3B82F6';
    if (name.includes('SKB')) return '#EF4444';
    return '#6B7280';
  };

  // Get top 8 schools by proposal count
  const topSchools = Object.entries(schoolCount)
    .map(([schoolName, value]) => ({
      label: schoolName.substring(0, 20) + (schoolName.length > 20 ? '...' : ''), // Short label for circle
      fullName: schoolName, // Full name for tooltip
      value,
      color: getSchoolColor(schoolName)
    }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 8); // Show top 8 schools
  
  // Group remaining schools as "Others"
  const remainingSchools = Object.entries(schoolCount)
    .sort((a, b) => b[1] - a[1])
    .slice(8);
  
  if (remainingSchools.length > 0) {
    const othersValue = remainingSchools.reduce((sum, [_, value]) => sum + value, 0);
    topSchools.push({
      label: 'Others',
      fullName: `Lainnya (${remainingSchools.length} sekolah)`,
      value: othersValue,
      color: '#9CA3AF'
    });
  }
  
  return topSchools.map(item => ({
    ...item,
    percentage: 0 // Will be calculated in CircularChart
  }));
};

const ProposalCharts: React.FC<ProposalChartsProps> = ({ leaveRequests }) => {
  const districtData = getDistrictData(leaveRequests);
  const schoolData = getSchoolData(leaveRequests);
  
  const totalDistrictProposals = districtData.reduce((sum, item) => sum + item.value, 0);
  const totalSchoolProposals = schoolData.reduce((sum, item) => sum + item.value, 0);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* District Proposals Chart */}
      <CircularChart
        title="Usulan Kecamatan"
        data={districtData}
        centerValue={totalDistrictProposals.toString()}
        centerLabel="Total Usulan"
        showLegend={false} // Disable legend as requested
      />
      
      {/* School Proposals Chart */}
      <CircularChart
        title="Usulan Sekolah (SMP/SKB/SD/TK)"
        data={schoolData}
        centerValue={totalSchoolProposals.toString()}
        centerLabel="Total Usulan"
        showLegend={false} // Disable legend as requested
      />
    </div>
  );
};

export default ProposalCharts;
