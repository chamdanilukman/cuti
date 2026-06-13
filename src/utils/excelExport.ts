import * as XLSX from 'xlsx';
import { LeaveRequest } from '../types';
import { WorkCalendarDay, countEffectiveLeaveDays } from './workCalendar';

// Helper function to get month name in Indonesian
const getMonthName = (month: number): string => {
  const months = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];
  return months[month - 1] || '';
};

// Helper function to format date to Indonesian format
const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
};

// Export leave requests to Excel format
export const exportLeaveRequestsToExcel = (
  requests: LeaveRequest[],
  month: number,
  year: number,
  unitKerja?: string,
  calendarDays?: WorkCalendarDay[]
) => {
  // Filter requests by month and year
  const filteredRequests = requests.filter(request => {
    const startDate = new Date(request.tanggalMulai);
    return startDate.getMonth() + 1 === month && startDate.getFullYear() === year;
  });

  // Create workbook
  const workbook = XLSX.utils.book_new();

  // Prepare data for Excel
  const excelData = [
    // Header row 1 - Title
    [`REKAP USULAN CUTI ${getMonthName(month).toUpperCase()} ${year}`],
    [], // Empty row
    
    // Header row 2 - Unit Kerja (if specified)
    unitKerja ? [`UNIT KERJA: ${unitKerja.toUpperCase()}`] : [],
    unitKerja ? [] : [], // Empty row if unit kerja specified
    
    // Header row 3 - Column headers
    [
      'NO',
      'NAMA',
      'NIP',
      'PANGKAT/GOL',
      'JABATAN',
      'KECAMATAN',
      'JENJANG',
      'UNIT KERJA',
      'JENIS CUTI',
      'TANGGAL MULAI',
      'TANGGAL SELESAI',
      'DURASI (HARI)',
      'ALASAN CUTI',
      'STATUS',
      'TANGGAL PENGAJUAN',
      'LINK DOKUMEN'
    ]
  ];

  // Add data rows
  filteredRequests.forEach((request, index) => {
    const duration = countEffectiveLeaveDays(request.tanggalMulai, request.tanggalSelesai, calendarDays || []);
    const status = getStatusText(request.status);
    const submissionDate = formatDate(request.submissionDate);
    const startDate = formatDate(request.tanggalMulai);
    const endDate = formatDate(request.tanggalSelesai);
    
    // Get document link (file or drive link)
    let documentLink = '';
    if (request.driveLink) {
      documentLink = request.driveLink;
    } else if (request.files && request.files.length > 0) {
      documentLink = request.files[0].url;
    }

    excelData.push([
      index + 1, // NO
      request.nama,
      request.nip,
      request.pangkatGolongan,
      request.jabatan,
      request.kecamatan,
      request.jenjang,
      request.unitKerja,
      request.jenisCuti,
      startDate,
      endDate,
      duration,
      request.alasanCuti,
      status,
      submissionDate,
      documentLink
    ]);
  });

  // Add summary row
  excelData.push(
    [], // Empty row
    [`TOTAL PENGAJUAN: ${filteredRequests.length} usulan`],
    [`DISETUJUI: ${filteredRequests.filter(r => r.status === 'approved_admin').length} usulan`],
    [`DITOLAK: ${filteredRequests.filter(r => r.status === 'rejected').length} usulan`],
    [`PENDING: ${filteredRequests.filter(r => r.status === 'pending' || r.status === 'approved_coordinator').length} usulan`]
  );

  // Create worksheet
  const worksheet = XLSX.utils.aoa_to_sheet(excelData);

  // Set column widths
  const columnWidths = [
    { wch: 5 },  // NO
    { wch: 20 }, // NAMA
    { wch: 18 }, // NIP
    { wch: 15 }, // PANGKAT/GOL
    { wch: 25 }, // JABATAN
    { wch: 15 }, // KECAMATAN
    { wch: 10 }, // JENJANG
    { wch: 25 }, // UNIT KERJA
    { wch: 18 }, // JENIS CUTI
    { wch: 12 }, // TANGGAL MULAI
    { wch: 12 }, // TANGGAL SELESAI
    { wch: 10 }, // DURASI
    { wch: 30 }, // ALASAN CUTI
    { wch: 15 }, // STATUS
    { wch: 15 }, // TANGGAL PENGAJUAN
    { wch: 40 }  // LINK DOKUMEN
  ];
  worksheet['!cols'] = columnWidths;

  // Style the header rows
  const headerRowIndex = unitKerja ? 4 : 2; // Adjust based on whether unit kerja is shown
  
  // Add worksheet to workbook
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Rekap Cuti');

  // Generate filename
  const monthName = getMonthName(month);
  const unitSuffix = unitKerja ? `_${unitKerja.replace(/\s+/g, '_')}` : '';
  const filename = `Rekap_Cuti_${monthName}_${year}${unitSuffix}.xlsx`;

  // Download file
  XLSX.writeFile(workbook, filename);

  return {
    success: true,
    filename,
    totalRecords: filteredRequests.length,
    message: `Rekap cuti ${monthName} ${year} berhasil didownload`
  };
};

// Helper function to get status text in Indonesian
const getStatusText = (status: string): string => {
  switch (status) {
    case 'pending':
      return 'MENUNGGU PERSETUJUAN';
    case 'approved_coordinator':
      return 'DISETUJUI KOORDINATOR';
    case 'approved_admin':
      return 'DISETUJUI';
    case 'rejected':
      return 'DITOLAK';
    case 'document_issued':
      return 'SURAT CUTI TERBIT';
    default:
      return status.toUpperCase();
  }
};

// Export function for specific unit kerja
export const exportLeaveRequestsByUnit = (
  requests: LeaveRequest[],
  month: number,
  year: number,
  unitKerja: string,
  calendarDays?: WorkCalendarDay[]
) => {
  const filteredRequests = requests.filter(request => {
    const startDate = new Date(request.tanggalMulai);
    const isCorrectPeriod = startDate.getMonth() + 1 === month && startDate.getFullYear() === year;
    const isCorrectUnit = request.unitKerja.toLowerCase().includes(unitKerja.toLowerCase());
    return isCorrectPeriod && isCorrectUnit;
  });

  return exportLeaveRequestsToExcel(filteredRequests, month, year, unitKerja, calendarDays);
};

// Export function for all requests (admin disdik)
export const exportAllLeaveRequests = (
  requests: LeaveRequest[],
  month: number,
  year: number,
  calendarDays?: WorkCalendarDay[]
) => {
  return exportLeaveRequestsToExcel(requests, month, year, undefined, calendarDays);
};

// Export function for specific status
export const exportLeaveRequestsByStatus = (
  requests: LeaveRequest[],
  month: number,
  year: number,
  status: string,
  unitKerja?: string,
  calendarDays?: WorkCalendarDay[]
) => {
  let filteredRequests = requests.filter(request => {
    const startDate = new Date(request.tanggalMulai);
    const isCorrectPeriod = startDate.getMonth() + 1 === month && startDate.getFullYear() === year;

    // Special case: "approved_admin" should include "document_issued" status
    let isCorrectStatus = false;
    if (status === 'approved_admin') {
      isCorrectStatus = request.status === 'approved_admin' || request.status === 'document_issued';
    } else {
      isCorrectStatus = request.status === status;
    }

    return isCorrectPeriod && isCorrectStatus;
  });

  // Further filter by unit if specified
  if (unitKerja) {
    filteredRequests = filteredRequests.filter(request =>
      request.unitKerja.toLowerCase().includes(unitKerja.toLowerCase())
    );
  }

  // Get status label for filename
  const statusLabel = getStatusLabel(status);
  const monthName = getMonthName(month);
  const unitSuffix = unitKerja ? `_${unitKerja.replace(/\s+/g, '_')}` : '';
  const statusSuffix = `_${statusLabel.replace(/\s+/g, '_')}`;

  // Create workbook with status-specific data
  const workbook = XLSX.utils.book_new();

  // Prepare data for Excel with status info
  const excelData = [
    // Header row 1 - Title with status
    [`REKAP USULAN CUTI ${getMonthName(month).toUpperCase()} ${year} - ${statusLabel.toUpperCase()}`],
    [], // Empty row

    // Header row 2 - Unit Kerja (if specified)
    unitKerja ? [`UNIT KERJA: ${unitKerja.toUpperCase()}`] : [],
    unitKerja ? [] : [], // Empty row if unit kerja specified

    // Header row 3 - Column headers
    [
      'NO',
      'NAMA',
      'NIP',
      'PANGKAT/GOL',
      'JABATAN',
      'KECAMATAN',
      'JENJANG',
      'UNIT KERJA',
      'JENIS CUTI',
      'TANGGAL MULAI',
      'TANGGAL SELESAI',
      'DURASI (HARI)',
      'ALASAN CUTI',
      'STATUS',
      'TANGGAL PENGAJUAN',
      'LINK DOKUMEN'
    ]
  ];

  // Add data rows
  filteredRequests.forEach((request, index) => {
    const duration = countEffectiveLeaveDays(request.tanggalMulai, request.tanggalSelesai, calendarDays || []);
    const statusText = getStatusText(request.status);
    const submissionDate = formatDate(request.submissionDate);
    const startDate = formatDate(request.tanggalMulai);
    const endDate = formatDate(request.tanggalSelesai);

    // Get document link (file or drive link)
    let documentLink = '';
    if (request.driveLink) {
      documentLink = request.driveLink;
    } else if (request.files && request.files.length > 0) {
      documentLink = request.files[0].url;
    }

    excelData.push([
      index + 1, // NO
      request.nama,
      request.nip,
      request.pangkatGolongan,
      request.jabatan,
      request.kecamatan,
      request.jenjang,
      request.unitKerja,
      request.jenisCuti,
      startDate,
      endDate,
      duration,
      request.alasanCuti,
      statusText,
      submissionDate,
      documentLink
    ]);
  });

  // Add summary row
  excelData.push(
    [], // Empty row
    [`TOTAL PENGAJUAN ${statusLabel.toUpperCase()}: ${filteredRequests.length} usulan`],
    [`PERIODE: ${monthName} ${year}`],
    unitKerja ? [`UNIT KERJA: ${unitKerja}`] : [`SEMUA UNIT KERJA`]
  );

  // Create worksheet
  const worksheet = XLSX.utils.aoa_to_sheet(excelData);

  // Set column widths
  const columnWidths = [
    { wch: 5 },  // NO
    { wch: 20 }, // NAMA
    { wch: 18 }, // NIP
    { wch: 15 }, // PANGKAT/GOL
    { wch: 25 }, // JABATAN
    { wch: 15 }, // KECAMATAN
    { wch: 10 }, // JENJANG
    { wch: 25 }, // UNIT KERJA
    { wch: 18 }, // JENIS CUTI
    { wch: 12 }, // TANGGAL MULAI
    { wch: 12 }, // TANGGAL SELESAI
    { wch: 10 }, // DURASI
    { wch: 30 }, // ALASAN CUTI
    { wch: 15 }, // STATUS
    { wch: 15 }, // TANGGAL PENGAJUAN
    { wch: 40 }  // LINK DOKUMEN
  ];
  worksheet['!cols'] = columnWidths;

  // Add worksheet to workbook
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Rekap Cuti');

  // Generate filename
  const filename = `Rekap_Cuti_${monthName}_${year}${unitSuffix}${statusSuffix}.xlsx`;

  // Download file
  XLSX.writeFile(workbook, filename);

  return {
    success: true,
    filename,
    totalRecords: filteredRequests.length,
    message: `Rekap cuti ${statusLabel.toLowerCase()} ${monthName} ${year} berhasil didownload`
  };
};

// Helper function to get status label
const getStatusLabel = (status: string): string => {
  switch (status) {
    case 'pending':
      return 'Menunggu Persetujuan';
    case 'approved_coordinator':
      return 'Disetujui Koordinator';
    case 'approved_admin':
      return 'Disetujui Dinas';
    case 'rejected':
      return 'Ditolak';
    case 'document_issued':
      return 'Surat Cuti Terbit';
    default:
      return status;
  }
};
