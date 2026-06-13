import { LeaveRequest } from '../types';
import { WorkCalendarDay, countEffectiveLeaveDays } from './workCalendar';

// Lazy load docx libraries only when needed and DOM is ready
const loadDocxLibs = async () => {
  // Wait for DOM to be ready
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    throw new Error('Fitur pembuatan dokumen tidak didukung di lingkungan ini.');
  }
  
  if (typeof DOMParser === 'undefined') {
    throw new Error('Fitur pembuatan dokumen tidak didukung di peramban ini.');
  }

  const [{ default: Docxtemplater }, { default: PizZip }] = await Promise.all([
    import('docxtemplater'),
    import('pizzip')
  ]);

  return { Docxtemplater, PizZip };
};

// Document template mapping
const TEMPLATE_MAPPING = {
  'Cuti Tahunan': 'cuti_tahunan.docx',
  'Cuti Sakit': 'cuti_sakit.docx',
  'Cuti Alasan Penting': 'cuti_alasanpenting.docx',
  'Cuti Gol. IV Tahunan': 'Pcuti_tahunan_gol4.docx',
  'Cuti Gol. IV Alasan Penting': 'Pcuti_alasanpenting_gol4.docx',
  'Cuti Gol. IV Sakit': 'Pcuti_sakit_gol4.docx',
  'Cuti Melahirkan': 'Pcuti_melahirkan.docx',
  'Cuti Umroh': 'Pcuti_umroh.docx',
  'Cuti Haji': 'Pcuti_haji.docx',
  'Sakit Lebih 14 Hari': 'Pcuti_sakit14.docx'
};

// Calculate the duration between two dates using work calendar
const calculateLeaveDuration = (startDate: string, endDate: string, calendarDays: WorkCalendarDay[] = []): string => {
  const effective = countEffectiveLeaveDays(startDate, endDate, calendarDays);
  return `${effective} Hari`;
};

// Format date to Indonesian format
const formatDateIndonesian = (dateString: string): string => {
  const date = new Date(dateString);
  const months = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];
  
  const day = date.getDate();
  const month = months[date.getMonth()];
  const year = date.getFullYear();
  
  return `${day} ${month} ${year}`;
};

// Check if template is Pcuti_ type (minimal data only)
const isPcutiTemplate = (leaveType: string): boolean => {
  const pcutiTypes = [
    'Cuti Gol. IV Tahunan',
    'Cuti Gol. IV Alasan Penting',
    'Cuti Gol. IV Sakit',
    'Cuti Melahirkan',
    'Cuti Umroh',
    'Cuti Haji',
    'Sakit Lebih 14 Hari'
  ];
  return pcutiTypes.includes(leaveType);
};

// Generate document data for template replacement
export const generateDocumentData = (request: LeaveRequest, calendarDays: WorkCalendarDay[] = []) => {
  // For Pcuti_ templates, only fill minimal data
  if (isPcutiTemplate(request.jenisCuti)) {
    return {
      nama: request.nama,
      nip: (request.nip || '-').replace(/\s/g, ''), // Remove all spaces from NIP
      sekolah: request.unitKerja,
      koordinator_wilayah: request.kecamatan
    };
  }

  // For regular templates, fill complete data
  const lamaCuti = calculateLeaveDuration(request.tanggalMulai, request.tanggalSelesai, calendarDays);
  const tanggalMulai = formatDateIndonesian(request.tanggalMulai);
  const tanggalSelesai = formatDateIndonesian(request.tanggalSelesai);

  const baseData = {
    nama: request.nama,
    nip: (request.nip || '-').replace(/\s/g, ''), // Remove all spaces from NIP
    pangkat_golongan: request.pangkatGolongan || '-',
    jabatan: request.jabatan || '-',
    sekolah: request.unitKerja,
    lama_cuti: lamaCuti,
    tanggal_mulai: tanggalMulai,
    tanggal_selesai: tanggalSelesai
  };

  // Add additional fields for specific leave types
  if (request.jenisCuti === 'Cuti Alasan Penting') {
    return {
      ...baseData,
      alasan_cuti: request.alasanCuti || 'Alasan penting'
    };
  }

  return baseData;
};

// Get template filename based on leave type
export const getTemplateFilename = (leaveType: string): string => {
  return TEMPLATE_MAPPING[leaveType] || 'cuti_tahunan.docx';
};

// Process Word template with docxtemplater - preserving existing template text
export const replaceTemplateVariables = async (templateUrl: string, data: Record<string, string>): Promise<Blob> => {
  try {
    const { Docxtemplater, PizZip } = await loadDocxLibs();

    // Fetch the template file
    const response = await fetch(templateUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch template: ${response.statusText}`);
    }

    const arrayBuffer = await response.arrayBuffer();

    // Load the template with PizZip
    const zip = new PizZip(arrayBuffer);

    // Create docxtemplater instance with nullGetter to preserve undefined variables
    const doc = new Docxtemplater(zip, {
      paragraphLoop: true,
      linebreaks: true,
      nullGetter: function(part: any) {
        // Preserve variables that are not in our data (like ${nomor_naskah}, ${tanggal_naskah}, ${ttd_pengirim})
        if (!Object.prototype.hasOwnProperty.call(data, part.value)) {
          return `{${part.value}}`;
        }
        return '';
      }
    });

    // Only render variables that we have data for
    const filteredData = Object.keys(data).reduce((acc, key) => {
      if (data[key] !== undefined && data[key] !== null && data[key] !== '') {
        acc[key] = data[key];
      }
      return acc;
    }, {} as Record<string, string>);

    // Render the document with filtered data
    doc.render(filteredData);

    // Generate the document buffer
    const buffer = doc.getZip().generate({
      type: 'arraybuffer',
      mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    });

    // Create and return blob
    return new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    });
  } catch (error) {
    console.error('Error processing template:', error);

    // Fallback: Return the original template without processing
    try {
      const response = await fetch(templateUrl);
      if (response.ok) {
        const arrayBuffer = await response.arrayBuffer();
        return new Blob([arrayBuffer], {
          type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        });
      }
    } catch (fallbackError) {
      console.error('Fallback also failed:', fallbackError);
    }

    // Final fallback: create a simple text document
    const documentContent = `
SURAT IZIN CUTI

Nama: ${data.nama}
NIP: ${data.nip}
Pangkat/Golongan: ${data.pangkat_golongan}
Jabatan: ${data.jabatan}
Unit Kerja: ${data.sekolah}
Jenis Cuti: ${data.jenis_cuti || 'Cuti Tahunan'}
Lama Cuti: ${data.lama_cuti}
Tanggal Mulai: ${data.tanggal_mulai}
Tanggal Selesai: ${data.tanggal_selesai}
${data.alasan_cuti ? `Alasan: ${data.alasan_cuti}` : ''}

Dokumen ini dibuat secara otomatis oleh Sistem Manajemen Cuti ASN.
Tanggal Cetak: ${new Date().toLocaleDateString('id-ID')}

CATATAN: Template tidak dapat diproses, menggunakan format teks sederhana.
    `.trim();

    return new Blob([documentContent], {
      type: 'text/plain;charset=utf-8'
    });
  }
};

// Generate and download document
export const generateAndDownloadDocument = async (request: LeaveRequest, calendarDays: WorkCalendarDay[] = []): Promise<void> => {
  try {
    const templateFilename = getTemplateFilename(request.jenisCuti);
    const templateUrl = `/templates/${templateFilename}`;
    const documentData = generateDocumentData(request, calendarDays);
    
    // Add leave type to document data
    const dataWithLeaveType = {
      ...documentData,
      jenis_cuti: request.jenisCuti
    };
    
    // Generate the document
    const documentBlob = await replaceTemplateVariables(templateUrl, dataWithLeaveType);
    
    // Create download link
    const url = URL.createObjectURL(documentBlob);
    const link = document.createElement('a');
    link.href = url;
    
    // Generate filename
    const sanitizedName = request.nama.replace(/[^a-zA-Z0-9]/g, '_');
    const dateStr = new Date().toISOString().split('T')[0];
    link.download = `Surat_Cuti_${sanitizedName}_${dateStr}.docx`;
    
    // Trigger download
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // Clean up
    URL.revokeObjectURL(url);
    
  } catch (error) {
    console.error('Error generating document:', error);
    throw new Error('Gagal mengunduh dokumen cuti');
  }
};

// Advanced document generation with proper Word template processing
export const generateDocumentWithTemplate = async (request: LeaveRequest, calendarDays: WorkCalendarDay[] = []): Promise<Blob> => {
  const templateFilename = getTemplateFilename(request.jenisCuti);
  const templateUrl = `/templates/${templateFilename}`;
  const documentData = generateDocumentData(request, calendarDays);

  return await replaceTemplateVariables(templateUrl, {
    ...documentData,
    jenis_cuti: request.jenisCuti
  });
};

// Utility function to check if document generation is available for a request
export const canGenerateDocument = (request: LeaveRequest): boolean => {
  return request.status === 'approved_admin';
};

// Get document type description
export const getDocumentTypeDescription = (leaveType: string): string => {
  const descriptions = {
    'Cuti Tahunan': 'Surat Izin Cuti Tahunan',
    'Cuti Sakit': 'Surat Izin Cuti Sakit',
    'Cuti Alasan Penting': 'Surat Izin Cuti Alasan Penting',
    'Cuti Gol. IV Tahunan': 'Surat Izin Cuti Golongan IV Tahunan',
    'Cuti Gol. IV Alasan Penting': 'Surat Izin Cuti Golongan IV Alasan Penting',
    'Cuti Gol. IV Sakit': 'Surat Izin Cuti Golongan IV Sakit',
    'Cuti Melahirkan': 'Surat Izin Cuti Melahirkan',
    'Cuti Umroh': 'Surat Izin Cuti Umroh',
    'Cuti Haji': 'Surat Izin Cuti Haji',
    'Sakit Lebih 14 Hari': 'Surat Izin Sakit Lebih 14 Hari',
    'Cuti Besar': 'Surat Izin Cuti Besar'
  };

  return descriptions[leaveType] || 'Surat Izin Cuti';
};
