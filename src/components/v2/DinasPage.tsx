import React from 'react';
import V2PageShell from './V2PageShell';
import RolePage from '../RolePage';
import { LeaveRequest, UserRole } from '../../types';

interface DinasPageProps {
  leaveRequests: LeaveRequest[];
  currentRole: UserRole;
  setCurrentRole: (role: UserRole) => void;
  isAdminLoggedIn: boolean;
  setIsAdminLoggedIn: (loggedIn: boolean) => void;
  onApprove: (id: string, role: 'coordinator' | 'admin') => Promise<boolean>;
  onReject: (id: string, role: 'coordinator' | 'admin', reason: string) => Promise<boolean>;
  onUpdate: (id: string, updates: Partial<LeaveRequest>) => Promise<boolean>;
  showModal: (message: string) => void;
}

const DinasPage: React.FC<DinasPageProps> = (props) => (
  <V2PageShell
    eyebrow="Administrator"
    title="Dinas"
    description="Panel administrasi untuk Admin Dinas, Korwil, dan SMP/SKB."
  >
    <RolePage {...props} />
  </V2PageShell>
);

export default DinasPage;
