// Sample data untuk kecamatan GUBUG
// Data ini akan digunakan untuk testing admin korwil GUBUG

export const gubugSampleData = [
  {
    id: 'gubug_001',
    nama: 'SITI RAHAYU, S.Pd',
    nip: '197508152006042001',
    pangkatGolongan: 'Penata Muda Tk.I / III.b',
    jabatan: 'Guru Kelas',
    kecamatan: 'GUBUG',
    jenjang: 'SD',
    unitKerja: 'SDN 1 GUBUG',
    jenisCuti: 'Cuti Tahunan',
    tanggalMulai: '2025-08-30',
    tanggalSelesai: '2025-09-02',
    alasanCuti: 'Keperluan keluarga',
    files: [],
    status: 'pending',
    rejectionReason: '',
    submissionDate: '2025-08-28',
    createdAt: new Date('2025-08-28T08:00:00Z'),
    updatedAt: new Date('2025-08-28T08:00:00Z')
  },
  {
    id: 'gubug_002',
    nama: 'AHMAD FAUZI, S.Pd',
    nip: '198203152009011001',
    pangkatGolongan: 'Penata / III.c',
    jabatan: 'Guru Kelas',
    kecamatan: 'GUBUG',
    jenjang: 'SD',
    unitKerja: 'SDN 2 GUBUG',
    jenisCuti: 'Cuti Sakit',
    tanggalMulai: '2025-08-29',
    tanggalSelesai: '2025-08-30',
    alasanCuti: 'Sakit demam',
    files: [],
    status: 'approved_coordinator',
    rejectionReason: '',
    submissionDate: '2025-08-27',
    createdAt: new Date('2025-08-27T09:00:00Z'),
    updatedAt: new Date('2025-08-28T10:00:00Z')
  },
  {
    id: 'gubug_003',
    nama: 'RETNO WULANDARI, S.Pd',
    nip: '198907252015032001',
    pangkatGolongan: 'Penata Muda / III.a',
    jabatan: 'Guru Kelas',
    kecamatan: 'GUBUG',
    jenjang: 'SD',
    unitKerja: 'SDN 3 GUBUG',
    jenisCuti: 'Cuti Melahirkan',
    tanggalMulai: '2025-09-01',
    tanggalSelesai: '2025-11-30',
    alasanCuti: 'Melahirkan anak kedua',
    files: [],
    status: 'approved_admin',
    rejectionReason: '',
    submissionDate: '2025-08-25',
    createdAt: new Date('2025-08-25T14:00:00Z'),
    updatedAt: new Date('2025-08-27T16:00:00Z')
  },
  {
    id: 'gubug_004',
    nama: 'BUDI SANTOSO, S.Pd',
    nip: '199012102018011001',
    pangkatGolongan: 'Penata Muda / III.a',
    jabatan: 'Guru Kelas',
    kecamatan: 'GUBUG',
    jenjang: 'SD',
    unitKerja: 'SDN 4 GUBUG',
    jenisCuti: 'Cuti Alasan Penting',
    tanggalMulai: '2025-09-05',
    tanggalSelesai: '2025-09-06',
    alasanCuti: 'Mengurus orang tua sakit',
    files: [],
    status: 'pending',
    rejectionReason: '',
    submissionDate: '2025-08-28',
    createdAt: new Date('2025-08-28T11:00:00Z'),
    updatedAt: new Date('2025-08-28T11:00:00Z')
  },
  {
    id: 'gubug_005',
    nama: 'LESTARI DEWI, S.Pd',
    nip: '199505102019032001',
    pangkatGolongan: 'Penata Muda / III.a',
    jabatan: 'Guru Kelas',
    kecamatan: 'GUBUG',
    jenjang: 'TK',
    unitKerja: 'TK NEGERI PEMBINA GUBUG',
    jenisCuti: 'Cuti Tahunan',
    tanggalMulai: '2025-09-10',
    tanggalSelesai: '2025-09-12',
    alasanCuti: 'Liburan keluarga',
    files: [],
    status: 'pending',
    rejectionReason: '',
    submissionDate: '2025-08-28',
    createdAt: new Date('2025-08-28T13:00:00Z'),
    updatedAt: new Date('2025-08-28T13:00:00Z')
  },
  {
    id: 'gubug_006',
    nama: 'INDAH PERMATA, S.Pd',
    nip: '199203152020012001',
    pangkatGolongan: 'Penata Muda / III.a',
    jabatan: 'Guru Kelas',
    kecamatan: 'GUBUG',
    jenjang: 'TK',
    unitKerja: 'TK NEGERI 1 GUBUG',
    jenisCuti: 'Cuti Sakit',
    tanggalMulai: '2025-08-31',
    tanggalSelesai: '2025-09-01',
    alasanCuti: 'Sakit flu',
    files: [],
    status: 'approved_coordinator',
    rejectionReason: '',
    submissionDate: '2025-08-26',
    createdAt: new Date('2025-08-26T15:00:00Z'),
    updatedAt: new Date('2025-08-27T09:00:00Z')
  }
];

// Data sekolah di kecamatan GUBUG
export const gubugSchoolData = {
  SD: [
    'SDN 1 GUBUG',
    'SDN 2 GUBUG', 
    'SDN 3 GUBUG',
    'SDN 4 GUBUG',
    'SDN 5 GUBUG'
  ],
  TK: [
    'TK NEGERI PEMBINA GUBUG',
    'TK NEGERI 1 GUBUG',
    'TK NEGERI 2 GUBUG'
  ],
  SMP: [
    'SMP NEGERI 1 GUBUG',
    'SMP NEGERI 2 GUBUG',
    'SMP NEGERI 3 GUBUG',
    'SMP NEGERI 4 SATU ATAP GUBUG'
  ]
};

// Admin korwil GUBUG credentials
export const gubugAdminData = {
  username: 'kwc_gub',
  password: 'pass_gub',
  nama: 'Admin Korwil Gubug',
  role: 'korwil',
  permissions: {
    kecamatan: ['GUBUG'],
    kecamatanAccess: ['GUBUG'],
    jenjangAccess: ['TK', 'SD']
  }
};
