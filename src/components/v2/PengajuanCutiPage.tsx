import React from 'react';
import V2PageShell from './V2PageShell';
import LeaveForm from '../LeaveForm';
import { LeaveRequest } from '../../types';

interface PengajuanCutiPageProps {
  onSubmit: (request: Omit<LeaveRequest, 'id' | 'status' | 'rejectionReason' | 'submissionDate'>) => void;
  showModal: (message: string) => void;
  editingRequest: LeaveRequest | null;
  getLeaveRequestsByNIP: (nip: string) => Promise<LeaveRequest[]>;
}

const PengajuanCutiPage: React.FC<PengajuanCutiPageProps> = (props) => (
  <V2PageShell
    eyebrow="Layanan"
    title="Pengajuan Cuti"
    description="Formulir pengajuan cuti untuk pegawai Dinas Pendidikan Kabupaten Grobogan."
  >
    <LeaveForm {...props} />
  </V2PageShell>
);

export default PengajuanCutiPage;
