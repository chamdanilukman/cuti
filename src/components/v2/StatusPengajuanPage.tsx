import React from 'react';
import V2PageShell from './V2PageShell';
import StatusPage from '../StatusPage';
import { LeaveRequest } from '../../types';

interface StatusPengajuanPageProps {
  leaveRequests: LeaveRequest[];
  nipFilter: string;
  setNipFilter: (filter: string) => void;
  onEditRequest: (request: LeaveRequest) => void;
  getLeaveRequestsByNIP: (nip: string) => Promise<LeaveRequest[]>;
}

const StatusPengajuanPage: React.FC<StatusPengajuanPageProps> = (props) => (
  <V2PageShell
    eyebrow="Pemantauan"
    title="Status Pengajuan"
    description="Pantau status pengajuan cuti yang telah diajukan."
  >
    <StatusPage {...props} />
  </V2PageShell>
);

export default StatusPengajuanPage;
