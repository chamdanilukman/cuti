import React, { useEffect, useState } from 'react';
import { Upload, X, FileText, AlertCircle, Info } from 'lucide-react';
import { LeaveRequest, FileInfo } from '../types';
import { validateLeaveRequest, validateNIP, validateLeaveDates, isSickLeaveType, isMaternityLeave } from '../utils/leaveValidation';
import { calculateAnnualLeaveQuota, isAnnualLeaveType } from '../utils/annualLeaveQuota';
import { countEffectiveLeaveDays } from '../utils/workCalendar';
import { useWorkCalendar } from '../hooks/useWorkCalendar';
import { uploadFile, deleteFile, getFilePathFromUrl } from '../utils/cpanelStorage';
import { smpSkbData, kecamatanList } from '../data/smpData';

interface LeaveFormProps {
  onSubmit: (request: Omit<LeaveRequest, 'id' | 'status' | 'rejectionReason' | 'submissionDate'>) => void;
  showModal: (message: string) => void;
  editingRequest?: LeaveRequest;
  getLeaveRequestsByNIP?: (nip: string) => Promise<LeaveRequest[]>;
}

const LeaveForm: React.FC<LeaveFormProps> = ({ onSubmit, showModal, editingRequest, getLeaveRequestsByNIP }) => {
  const [formData, setFormData] = useState({
    nama: editingRequest?.nama || '',
    nip: editingRequest?.nip || '',
    pangkatGolongan: editingRequest?.pangkatGolongan || '',
    jabatan: editingRequest?.jabatan || '',
    kecamatan: editingRequest?.kecamatan || '',
    jenjang: editingRequest?.jenjang || '',
    unitKerja: editingRequest?.unitKerja || '',
    jenisCuti: editingRequest?.jenisCuti || '',
    tanggalMulai: editingRequest?.tanggalMulai || '',
    tanggalSelesai: editingRequest?.tanggalSelesai || '',
    alasanCuti: editingRequest?.alasanCuti || '',
    driveLink: editingRequest?.driveLink || '',
  });

  const [files, setFiles] = useState<FileInfo[]>(editingRequest?.files || []);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validationMessage, setValidationMessage] = useState<{ type: 'info' | 'warning' | 'error'; message: string } | null>(null);
  const [nipValidation, setNipValidation] = useState<{ type: 'info' | 'warning' | 'error'; message: string } | null>(null);
  const [dateValidation, setDateValidation] = useState<{ type: 'info' | 'warning' | 'error'; message: string } | null>(null);
  const [validationRequests, setValidationRequests] = useState<LeaveRequest[]>(editingRequest ? [editingRequest] : []);
  const [isLoadingValidationRequests, setIsLoadingValidationRequests] = useState(false);

  const getQuotaYear = (startDate?: string) => (
    startDate ? new Date(`${startDate}T00:00:00`).getFullYear() : new Date().getFullYear()
  );
  const selectedQuotaYear = getQuotaYear(formData.tanggalMulai);
  const { days: workCalendarDays } = useWorkCalendar(selectedQuotaYear);

  useEffect(() => {
    const nip = formData.nip.trim();
    const nipValidationResult = validateNIP(nip);

    if (!getLeaveRequestsByNIP || !nipValidationResult.isValid) {
      setValidationRequests(editingRequest ? [editingRequest] : []);
      return;
    }

    let isMounted = true;
    setIsLoadingValidationRequests(true);

    getLeaveRequestsByNIP(nip)
      .then(requests => {
        if (isMounted) {
          setValidationRequests(requests);
        }
      })
      .catch(error => {
        console.error('Error loading validation history by NIP:', error);
        if (isMounted) {
          setValidationRequests(editingRequest ? [editingRequest] : []);
        }
      })
      .finally(() => {
        if (isMounted) {
          setIsLoadingValidationRequests(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [formData.nip, getLeaveRequestsByNIP, editingRequest]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => {
      const newData = { ...prev, [name]: value };
      // Reset unitKerja when kecamatan or jenjang changes
      if (name === 'kecamatan' || name === 'jenjang') {
        newData.unitKerja = '';
      }

      // Validate NIP when it changes
      if (name === 'nip') {
        const nipValidationResult = value ? validateNIP(value) : { isValid: false, message: 'NIP wajib diisi' };
        if (!nipValidationResult.isValid) {
          setNipValidation({
            type: 'error',
            message: nipValidationResult.message || 'Format NIP tidak valid'
          });
        } else {
          setNipValidation({
            type: 'info',
            message: 'Format NIP valid ✓'
          });
        }
      }

      // Check annual leave stats when NIP or leave type changes
      if ((name === 'nip' || name === 'jenisCuti') && newData.nip && isAnnualLeaveType(newData.jenisCuti)) {
        // Only check quota if NIP is valid
        const nipValidationResult = validateNIP(newData.nip);
        if (nipValidationResult.isValid) {
          const quotaYear = getQuotaYear(newData.tanggalMulai);
          const stats = calculateAnnualLeaveQuota(newData.nip, quotaYear, validationRequests, workCalendarDays);

          if (stats.remainingQuota <= 0) {
            setValidationMessage({
              type: 'error',
              message: `Kuota cuti tahunan habis! Anda telah menggunakan ${stats.usedDays}/${stats.availableQuota} hari untuk tahun ${quotaYear}.`
            });
          } else if (stats.remainingQuota <= 2) {
            setValidationMessage({
              type: 'warning',
              message: `Perhatian: Sisa kuota cuti tahunan ${stats.remainingQuota} hari untuk tahun ${quotaYear}.`
            });
          } else {
            setValidationMessage({
              type: 'info',
              message: `Sisa kuota cuti tahunan: ${stats.remainingQuota} hari dari kuota ${stats.availableQuota} hari untuk tahun ${quotaYear}.`
            });
          }
        }
      } else if (name === 'jenisCuti' && !isAnnualLeaveType(value)) {
        setValidationMessage(null);
      }

      // Additional validation when dates change for annual leave
      if ((name === 'tanggalMulai' || name === 'tanggalSelesai') && isAnnualLeaveType(newData.jenisCuti) && newData.nip && newData.tanggalMulai && newData.tanggalSelesai) {
        const nipValidationResult = validateNIP(newData.nip);
        if (nipValidationResult.isValid) {
          const quotaYear = getQuotaYear(newData.tanggalMulai);
          const stats = calculateAnnualLeaveQuota(newData.nip, quotaYear, validationRequests, workCalendarDays);
          const newRequestDays = countEffectiveLeaveDays(newData.tanggalMulai, newData.tanggalSelesai, workCalendarDays);
          
          // Check if this request would exceed quota
          if (stats.usedDays + newRequestDays > stats.availableQuota) {
            setValidationMessage({
              type: 'error',
              message: `Pengajuan cuti tahunan gagal! Total hari cuti yang akan digunakan (${stats.usedDays + newRequestDays} hari) melebihi kuota ${stats.availableQuota} hari untuk tahun ${quotaYear}. Hari yang sudah digunakan: ${stats.usedDays} hari.`
            });
          } else {
            setValidationMessage({
              type: 'info',
              message: `Pengajuan ini memakai ${newRequestDays} hari efektif. Sisa kuota setelah pengajuan: ${stats.availableQuota - stats.usedDays - newRequestDays} hari untuk tahun ${quotaYear}.`
            });
          }
        }
      }

      // Validate dates when tanggalMulai or tanggalSelesai changes
      if ((name === 'tanggalMulai' || name === 'tanggalSelesai') && newData.tanggalMulai && newData.tanggalSelesai) {
        const dateValidationResult = validateLeaveDates(newData.tanggalMulai, newData.tanggalSelesai, newData.jenisCuti);
        if (!dateValidationResult.isValid) {
          setDateValidation({
            type: 'error',
            message: dateValidationResult.message || 'Tanggal tidak valid'
          });
        } else {
          // Show success message with duration info for maternity leave
          let successMessage = 'Tanggal cuti valid ✓';

          if (isMaternityLeave(newData.jenisCuti)) {
            const start = new Date(newData.tanggalMulai);
            const end = new Date(newData.tanggalSelesai);
            const duration = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
            successMessage = `Tanggal cuti valid ✓ - Durasi: ${duration} hari (maksimal 90 hari untuk cuti melahirkan)`;
          }

          setDateValidation({
            type: 'info',
            message: successMessage
          });
        }
      } else if (name === 'tanggalMulai' && value) {
        // Validate start date with new policy - allow all leave types for past/future dates
        const today = new Date();
        const startDate = new Date(value);
        today.setHours(0, 0, 0, 0);
        startDate.setHours(0, 0, 0, 0);

        // Check 30-day limit for past dates
        const thirtyDaysAgo = new Date(today);
        thirtyDaysAgo.setDate(today.getDate() - 30);

        if (startDate < thirtyDaysAgo) {
          setDateValidation({
            type: 'error',
            message: 'Pengajuan cuti tidak dapat diajukan untuk tanggal lebih dari 30 hari yang lalu.'
          });
        } else {
          setDateValidation({
            type: 'info',
            message: 'Tanggal cuti valid ✓'
          });
        }
      }

      return newData;
    });
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    const maxFileSize = 5 * 1024 * 1024; // 5MB
    const allowedTypes = ['application/pdf'];

    // Only allow 1 file
    if (selectedFiles.length > 1) {
      showModal('Hanya dapat mengunggah 1 berkas PDF.');
      e.target.value = '';
      return;
    }

    // Check if already has a file
    if (files.length > 0) {
      showModal('Berkas sudah diunggah. Hapus berkas yang ada terlebih dahulu untuk mengunggah berkas baru.');
      e.target.value = '';
      return;
    }

    selectedFiles.forEach(file => {
      if (file.size > maxFileSize) {
        showModal(`Ukuran berkas "${file.name}" (${(file.size / (1024 * 1024)).toFixed(2)} MB) melebihi batas maksimum 5 MB.`);
      } else if (!allowedTypes.includes(file.type)) {
        showModal(`Jenis berkas "${file.name}" tidak didukung. Hanya mendukung berkas PDF.`);
      } else {
        // Upload file to Supabase storage
        uploadFileToStorage(file);
      }
    });

    // Reset input
    e.target.value = '';
  };

  const uploadFileToStorage = async (file: File) => {
    try {
      showModal(`Mengunggah berkas "${file.name}", mohon tunggu...`);

      const result = await uploadFile(file, 'leave-documents');

      if (result.success && result.url) {
        const fileInfo: FileInfo = {
          name: file.name,
          url: result.url
        };
        setFiles(prev => [...prev, fileInfo]);
        showModal(`✅ Berkas "${file.name}" berhasil diunggah ke server!`);
      } else {
        showModal(`❌ ${result.error || 'Gagal mengunggah berkas. Silakan coba kembali.'}`);
      }
    } catch (error) {
      console.error('Error uploading file:', error);
      showModal('❌ Terjadi kesalahan saat mengunggah berkas. Silakan coba kembali.');
    }
  };

  const removeFile = (index: number) => {
    const fileToRemove = files[index];

    // Delete from storage if it's our hosting URL
    if (fileToRemove.url.includes('cuti.disdik.grobogan.online') || fileToRemove.url.includes('supabase')) {
      const filePath = getFilePathFromUrl(fileToRemove.url);
      if (filePath) {
        deleteFile(filePath).then(success => {
          if (success) {
            console.log('File deleted from storage successfully');
          } else {
            console.error('Failed to delete file from storage');
          }
        });
      }
    }

    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isSubmitting) return;

    // Validation
    const requiredFields = ['nama', 'nip', 'pangkatGolongan', 'jabatan', 'kecamatan', 'jenjang', 'unitKerja', 'jenisCuti', 'tanggalMulai', 'tanggalSelesai', 'alasanCuti'];
    const missingFields = requiredFields.filter(field => !formData[field as keyof typeof formData].trim());

    if (missingFields.length > 0) {
      showModal('Harap lengkapi seluruh kolom wajib pada pengajuan cuti.');
      return;
    }

    if (files.length === 0) {
      showModal('Berkas pendukung wajib diunggah sebelum pengajuan cuti.');
      return;
    }

    // Comprehensive validation
    const requestData = {
      ...formData,
      files,
      status: 'pending' as const,
      rejectionReason: ''
    };
    const validationResult = validateLeaveRequest(requestData, validationRequests, workCalendarDays);
    if (!validationResult.isValid) {
      showModal(validationResult.message || 'Pengajuan cuti tidak valid.');
      return;
    }

    setIsSubmitting(true);

    try {
      await onSubmit({
        ...formData,
        files
      });

      // Reset form only if not editing
      if (!editingRequest) {
        setFormData({
          nama: '',
          nip: '',
          pangkatGolongan: '',
          jabatan: '',
          kecamatan: '',
          jenjang: '',
          unitKerja: '',
          jenisCuti: '',
          tanggalMulai: '',
          tanggalSelesai: '',
          alasanCuti: '',
          driveLink: '',
        });
        setFiles([]);
      }
    } catch (error) {
      console.error('Error submitting form:', error);
      showModal('Terjadi kesalahan saat menyimpan pengajuan. Silakan coba kembali.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white rounded-xl shadow-soft border border-slate-200 p-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="nama" className="block text-sm font-semibold text-slate-700 mb-2">
                Nama Lengkap *
              </label>
              <input
                type="text"
                id="nama"
                name="nama"
                value={formData.nama}
                onChange={handleInputChange}
                required
                disabled={isSubmitting}
                className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200 disabled:bg-slate-100"
                placeholder="Masukkan nama lengkap"
              />
            </div>

            <div>
              <label htmlFor="nip" className="block text-sm font-semibold text-slate-700 mb-2">
                NIP *
              </label>
              <input
                type="text"
                id="nip"
                name="nip"
                value={formData.nip}
                onChange={handleInputChange}
                required
                disabled={isSubmitting}
                className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200 disabled:bg-slate-100"
                placeholder="Masukkan NIP (18 angka, contoh: 198810052020121006)"
              />

                  {/* NIP Validation Message */}
                  {nipValidation && (
                    <div className={`mt-2 p-3 rounded-xl border flex items-start space-x-2 ${
                  nipValidation.type === 'error'
                    ? 'bg-rose-50 border-rose-200 text-rose-800'
                    : 'bg-emerald-50 border-emerald-200 text-emerald-800'
                }`}>
                  {nipValidation.type === 'error' ? (
                    <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                  ) : (
                    <Info className="w-5 h-5 flex-shrink-0 mt-0.5" />
                  )}
                      <span className="text-sm">{nipValidation.message}</span>
                    </div>
                  )}
                  {isLoadingValidationRequests && (
                    <p className="mt-2 text-sm text-slate-500">Memuat riwayat cuti NIP ini...</p>
                  )}
                </div>

            <div>
              <label htmlFor="pangkatGolongan" className="block text-sm font-semibold text-slate-700 mb-2">
                Pangkat / Golongan Ruang *
              </label>
              <input
                type="text"
                id="pangkatGolongan"
                name="pangkatGolongan"
                value={formData.pangkatGolongan}
                onChange={handleInputChange}
                required
                disabled={isSubmitting}
                className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200 disabled:bg-slate-100"
                placeholder="Contoh: Penata Muda (III/a)"
              />
            </div>

            <div>
              <label htmlFor="jabatan" className="block text-sm font-semibold text-slate-700 mb-2">
                Jabatan *
              </label>
              <input
                type="text"
                id="jabatan"
                name="jabatan"
                value={formData.jabatan}
                onChange={handleInputChange}
                required
                disabled={isSubmitting}
                className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200 disabled:bg-slate-100"
                placeholder="Contoh: GURU AHLI PERTAMA"
              />
            </div>

            <div>
              <label htmlFor="kecamatan" className="block text-sm font-semibold text-slate-700 mb-2">
                Kecamatan *
              </label>
              <select
                id="kecamatan"
                name="kecamatan"
                value={formData.kecamatan}
                onChange={handleInputChange}
                required
                disabled={isSubmitting}
                className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200 disabled:bg-slate-100"
              >
                <option value="">Pilih Kecamatan</option>
                {kecamatanList.map((kecamatan) => (
                  <option key={kecamatan} value={kecamatan}>
                    KECAMATAN {kecamatan}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="jenjang" className="block text-sm font-semibold text-slate-700 mb-2">
                Jenjang *
              </label>
              <select
                id="jenjang"
                name="jenjang"
                value={formData.jenjang}
                onChange={handleInputChange}
                required
                disabled={isSubmitting}
                className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200 disabled:bg-slate-100"
              >
                <option value="">Pilih Jenjang</option>
                <option value="TK">TK</option>
                <option value="SD">SD</option>
                <option value="SMP">SMP & SKB</option>
              </select>
            </div>

            <div>
              <label htmlFor="unitKerja" className="block text-sm font-semibold text-slate-700 mb-2">
                Unit Kerja *
              </label>
              {formData.jenjang === 'SMP' && formData.kecamatan ? (
                <select
                  id="unitKerja"
                  name="unitKerja"
                  value={formData.unitKerja}
                  onChange={handleInputChange}
                  required
                  disabled={isSubmitting}
                  className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200 disabled:bg-slate-100"
                >
                  <option value="">Pilih SMP</option>
                  {smpSkbData[formData.kecamatan]?.map((smp) => (
                    <option key={smp} value={smp}>
                      {smp}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  id="unitKerja"
                  name="unitKerja"
                  value={formData.unitKerja}
                  onChange={handleInputChange}
                  required
                  disabled={isSubmitting}
                  className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200 disabled:bg-slate-100"
                  placeholder="Contoh: SDN 1 Sugihmanik"
                />
              )}
            </div>

            <div>
              <label htmlFor="jenisCuti" className="block text-sm font-semibold text-slate-700 mb-2">
                Jenis Cuti *
              </label>
              <select
                id="jenisCuti"
                name="jenisCuti"
                value={formData.jenisCuti}
                onChange={handleInputChange}
                required
                disabled={isSubmitting}
                className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200 disabled:bg-slate-100"
              >
                <option value="">Pilih Jenis Cuti</option>
                <option value="Cuti Tahunan">Cuti Tahunan</option>
                <option value="Cuti Sakit">Cuti Sakit</option>
                <option value="Cuti Alasan Penting">Cuti Alasan Penting</option>
                <option value="Cuti Gol. IV Tahunan">Cuti Gol. IV Tahunan</option>
                <option value="Cuti Gol. IV Alasan Penting">Cuti Gol. IV Alasan Penting</option>
                <option value="Cuti Gol. IV Sakit">Cuti Gol. IV Sakit</option>
                <option value="Cuti Melahirkan">Cuti Melahirkan</option>
                <option value="Cuti Umroh">Cuti Umroh</option>
                <option value="Cuti Haji">Cuti Haji</option>
                <option value="Sakit Lebih 14 Hari">Sakit Lebih 14 Hari</option>
              </select>

              {/* General info for all leave types */}
              {formData.jenisCuti && (
                <div className="mt-2 p-3 rounded-xl border border-indigo-200 bg-indigo-50 text-indigo-800">
                  <div className="flex items-start space-x-2">
                    <Info className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <div className="text-sm">
                      <p className="font-medium">Informasi Pengajuan Cuti:</p>
                      <p>• Pengajuan dapat mencakup tanggal lampau maupun mendatang</p>
                      <p>• Batas maksimum: 30 hari sebelum hari ini</p>
                      <p>• Tidak ada batas untuk tanggal di masa depan</p>
                      {formData.jenisCuti === 'Cuti Melahirkan' && (
                        <p>• <strong>Cuti melahirkan:</strong> Maksimal 3 bulan (90 hari)</p>
                      )}
                      {isAnnualLeaveType(formData.jenisCuti) && (
                        <p>• <strong>Cuti tahunan:</strong> Minggu, libur nasional, dan cuti bersama tidak mengurangi kuota</p>
                      )}
                      {isSickLeaveType(formData.jenisCuti) && (
                        <p>• <strong>Cuti sakit:</strong> Wajib melampirkan surat keterangan dokter</p>
                      )}
                    </div>
                  </div>
                </div>
              )}



              {/* Validation Message */}
              {validationMessage && (
                <div className={`mt-2 p-3 rounded-xl border flex items-start space-x-2 ${
                  validationMessage.type === 'error'
                    ? 'bg-rose-50 border-rose-200 text-rose-800'
                    : validationMessage.type === 'warning'
                    ? 'bg-amber-50 border-amber-200 text-amber-800'
                    : 'bg-indigo-50 border-indigo-200 text-indigo-800'
                }`}>
                  {validationMessage.type === 'error' ? (
                    <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                  ) : (
                    <Info className="w-5 h-5 flex-shrink-0 mt-0.5" />
                  )}
                  <span className="text-sm">{validationMessage.message}</span>
                </div>
              )}
            </div>

            <div>
              <label htmlFor="tanggalMulai" className="block text-sm font-semibold text-slate-700 mb-2">
                Tanggal Mulai Cuti *
              </label>
              <input
                type="date"
                id="tanggalMulai"
                name="tanggalMulai"
                value={formData.tanggalMulai}
                onChange={handleInputChange}
                required
                disabled={isSubmitting}
                className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200 disabled:bg-slate-100"
              />

              {/* Date Validation Message */}
              {dateValidation && (
                <div className={`mt-2 p-3 rounded-xl border flex items-start space-x-2 ${
                  dateValidation.type === 'error'
                    ? 'bg-rose-50 border-rose-200 text-rose-800'
                    : 'bg-indigo-50 border-indigo-200 text-indigo-800'
                }`}>
                  <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                  <span className="text-sm">{dateValidation.message}</span>
                </div>
              )}
            </div>

            <div>
              <label htmlFor="tanggalSelesai" className="block text-sm font-semibold text-slate-700 mb-2">
                Tanggal Selesai Cuti *
              </label>
              <input
                type="date"
                id="tanggalSelesai"
                name="tanggalSelesai"
                value={formData.tanggalSelesai}
                onChange={handleInputChange}
                required
                disabled={isSubmitting}
                className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200 disabled:bg-slate-100"
              />
            </div>
          </div>

          <div>
            <label htmlFor="alasanCuti" className="block text-sm font-semibold text-slate-700 mb-2">
              Alasan Cuti *
            </label>
            <textarea
              id="alasanCuti"
              name="alasanCuti"
              value={formData.alasanCuti}
              onChange={handleInputChange}
              required
              disabled={isSubmitting}
              rows={4}
              className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200 resize-vertical disabled:bg-slate-100"
              placeholder="Jelaskan alasan pengajuan cuti"
            />
          </div>

          <div className="space-y-6">
            <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4">
              <p className="text-sm text-indigo-800 mb-2">
                <strong>Pilihan Pengajuan Dokumen:</strong>
              </p>
              <ul className="text-sm text-indigo-700 space-y-1">
                <li>• <strong>Unggah Berkas:</strong> Unggah berkas PDF langsung ke sistem</li>
                <li>• <strong>Tautan Drive:</strong> Cantumkan tautan Google Drive (berkas atau folder)</li>
              </ul>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Unggah Berkas Pendukung *
              </label>
            {files.length === 0 ? (
              <div className="border-2 border-dashed border-slate-300 rounded-xl p-6 text-center hover:border-indigo-400 transition-colors duration-200">
                <Upload className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                <p className="text-slate-600 mb-2">Klik untuk memilih berkas atau seret berkas ke area ini</p>
                <p className="text-sm text-slate-500">Hanya berkas PDF, maksimal 1 berkas dengan ukuran 5 MB</p>
                <input
                  type="file"
                  onChange={handleFileUpload}
                  disabled={isSubmitting}
                  className="hidden"
                  id="fileUpload"
                  accept=".pdf,application/pdf"
                />
                <label
                  htmlFor="fileUpload"
                  className={`inline-block mt-4 px-6 py-2 rounded-xl transition-colors duration-200 cursor-pointer ${
                    isSubmitting
                      ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
                      : 'bg-indigo-500 text-white hover:bg-indigo-600'
                  }`}
                >
                  Pilih Berkas
                </label>
              </div>
            ) : (
              <div className="border-2 border-slate-200 rounded-xl p-4 bg-slate-50">
                <p className="text-sm text-slate-600 mb-2">Berkas sudah diunggah (maksimal 1 berkas):</p>
                <div className="text-xs text-slate-500">Hapus berkas yang ada untuk mengunggah berkas baru</div>
              </div>
            )}

            {files.length > 0 && (
              <div className="mt-4 space-y-2">
                <h4 className="text-sm font-semibold text-slate-700">Berkas yang diunggah:</h4>
                {files.map((file, index) => (
                  <div key={index} className="flex items-center justify-between bg-slate-50 p-3 rounded-xl">
                    <span className="text-sm text-slate-700 truncate flex-1">{file.name}</span>
                    <button
                      type="button"
                      onClick={() => removeFile(index)}
                      disabled={isSubmitting}
                      className="ml-2 p-1 text-rose-500 hover:text-rose-700 transition-colors duration-200 disabled:text-slate-400"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            </div>

            <div className="mt-6">
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Tautan Google Drive (Opsional)
              </label>
              <input
                type="url"
                name="driveLink"
                value={formData.driveLink || ''}
                onChange={handleInputChange}
                disabled={isSubmitting}
                className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200 disabled:bg-slate-100"
                placeholder="https://drive.google.com/... (file atau folder)"
              />
              <p className="text-xs text-slate-500 mt-1">
                Alternatif unggah: cantumkan tautan Google Drive yang dapat diakses oleh admin
              </p>
            </div>
          </div>

          <div className="flex justify-end pt-6">
            <button
              type="submit"
              disabled={isSubmitting}
              className={`px-8 py-3 font-semibold rounded-xl transition-all duration-200 shadow-card hover:shadow-lg ${
                isSubmitting
                  ? 'bg-slate-400 text-slate-200 cursor-not-allowed'
                  : 'bg-emerald-500 text-white hover:bg-emerald-600'
              }`}
            >
              {isSubmitting 
                ? 'Menyimpan...' 
                : editingRequest 
                  ? 'Perbarui Pengajuan' 
                  : 'Ajukan Cuti'
              }
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default LeaveForm;
