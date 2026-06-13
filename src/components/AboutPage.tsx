import React from 'react';
import { FileText, Upload, Users, ExternalLink } from 'lucide-react';

const AboutPage: React.FC = () => {
  const steps = [
    {
      icon: FileText,
      title: 'Isi Formulir Pengajuan Cuti',
      description: 'Lengkapi seluruh data yang dipersyaratkan pada formulir pengajuan cuti secara daring.'
    },
    {
      icon: Upload,
      title: 'Unggah Berkas Pendukung',
      description: 'Lampirkan surat permohonan cuti, keterangan dari atasan langsung, serta dokumen pendukung sesuai jenis cuti.'
    },
    {
      icon: Users,
      title: 'Proses Persetujuan',
      description: 'Pengajuan diproses secara berjenjang, mulai dari Koordinator Wilayah hingga Dinas Pendidikan.'
    },
    {
      icon: ExternalLink,
      title: 'Pemantauan Status',
      description: 'Pantau status pengajuan melalui menu Status Pengajuan.'
    }
  ];

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white rounded-xl shadow-soft border border-slate-200 p-8">
        <div className="mb-8">
          <p className="text-base leading-7 text-slate-600">
            Panduan lengkap penggunaan layanan pengajuan cuti daring bagi ASN Guru
            di Dinas Pendidikan Kabupaten Grobogan.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {steps.map((step, index) => {
            const Icon = step.icon;
            return (
              <div key={index} className="bg-slate-50 rounded-xl p-6 border border-slate-200">
                <div className="flex items-center space-x-3 mb-3">
                  <div className="w-10 h-10 bg-indigo-500 rounded-xl flex items-center justify-center">
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-lg font-semibold text-slate-900">{step.title}</h3>
                </div>
                <p className="text-slate-600">{step.description}</p>
              </div>
            );
          })}
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 mb-8">
          <h2 className="text-xl font-bold text-amber-900 mb-4">Berkas yang Diperlukan</h2>
          <div className="space-y-3 text-amber-800">
            <div className="flex items-start space-x-2">
              <div className="w-2 h-2 bg-amber-500 rounded-full mt-2"></div>
              <span>Surat permohonan cuti yang telah ditandatangani</span>
            </div>
            <div className="flex items-start space-x-2">
              <div className="w-2 h-2 bg-amber-500 rounded-full mt-2"></div>
              <span>Surat keterangan dari atasan langsung</span>
            </div>
            <div className="flex items-start space-x-2">
              <div className="w-2 h-2 bg-amber-500 rounded-full mt-2"></div>
              <span>Lampiran pendukung (surat dokter, undangan, dan dokumen sejenis) sesuai jenis cuti</span>
            </div>
          </div>
        </div>

        <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-6 mb-8">
          <h2 className="text-xl font-bold text-indigo-900 mb-4">Contoh Format Surat</h2>
          <p className="text-indigo-800 mb-4">
            Untuk memudahkan pemohon, kami menyediakan contoh format surat permohonan cuti dan
            surat keterangan dari atasan yang dapat diunduh dan digunakan sebagai referensi.
          </p>
          <a
            href="https://drive.google.com/drive/folders/11F6E9tmqaoRxn1RB4IZZE_1lIZHgEqNK?usp=sharing"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center space-x-2 px-6 py-3 bg-indigo-500 text-white font-medium rounded-xl hover:bg-indigo-600 transition-all duration-200"
          >
            <ExternalLink className="w-5 h-5" />
            <span>Unduh Contoh Surat</span>
          </a>
        </div>

        <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-6">
          <h2 className="text-xl font-bold text-indigo-900 mb-4">Alur Persetujuan</h2>
          <p className="text-indigo-800 leading-relaxed">
            Setelah pengajuan diajukan, proses akan berlangsung secara berjenjang:
            <strong>Koordinator Wilayah → Dinas Pendidikan</strong>. 
            Pemohon dapat memantau status pengajuan melalui menu Status Pengajuan dengan memasukkan NIP.
          </p>
        </div>
      </div>
    </div>
  );
};

export default AboutPage;
