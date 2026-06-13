import React, { useState } from 'react';
import { Download, FileText, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { LeaveRequest } from '../types';
import { WorkCalendarDay } from '../utils/workCalendar';

// Lazy load document generator functions
const loadDocumentGenerator = async () => {
  const module = await import('../utils/documentGenerator');
  return module;
};

interface DocumentDownloadButtonProps {
  request: LeaveRequest;
  onSuccess?: (message: string) => void;
  onError?: (error: string) => void;
  className?: string;
  variant?: 'primary' | 'secondary' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  workCalendarDays?: WorkCalendarDay[];
}

const DocumentDownloadButton: React.FC<DocumentDownloadButtonProps> = ({
  request,
  onSuccess,
  onError,
  className = '',
  variant = 'primary',
  size = 'md',
  workCalendarDays = [],
}) => {
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadStatus, setDownloadStatus] = useState<'idle' | 'success' | 'error'>('idle');

  // Check if document can be generated (approved_admin status)
  const canDownload = request.status === 'approved_admin';

  // Get document type description
  const getDocTypeDesc = (leaveType: string): string => {
    const descriptions: Record<string, string> = {
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
    };
    return descriptions[leaveType] || 'Surat Izin Cuti';
  };

  const documentType = getDocTypeDesc(request.jenisCuti);

  const handleDownload = async () => {
    if (!canDownload || isDownloading) return;

    setIsDownloading(true);
    setDownloadStatus('idle');

    try {
      const { generateAndDownloadDocument } = await loadDocumentGenerator();
      await generateAndDownloadDocument(request, workCalendarDays);
      setDownloadStatus('success');
      
      const successMessage = `Dokumen ${documentType} untuk ${request.nama} berhasil diunduh.`;
      onSuccess?.(successMessage);
      
      // Reset status after 3 seconds
      setTimeout(() => setDownloadStatus('idle'), 3000);
    } catch (error) {
      setDownloadStatus('error');
      const errorMessage = error instanceof Error ? error.message : 'Gagal mengunduh dokumen.';
      onError?.(errorMessage);
      
      // Reset status after 5 seconds
      setTimeout(() => setDownloadStatus('idle'), 5000);
    } finally {
      setIsDownloading(false);
    }
  };

  // Style variants
  const getVariantStyles = () => {
    const baseStyles = 'inline-flex items-center justify-center font-medium rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2';
    
    switch (variant) {
      case 'primary':
        return `${baseStyles} bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500 disabled:bg-gray-300 disabled:cursor-not-allowed`;
      case 'secondary':
        return `${baseStyles} bg-gray-600 text-white hover:bg-gray-700 focus:ring-gray-500 disabled:bg-gray-300 disabled:cursor-not-allowed`;
      case 'outline':
        return `${baseStyles} border border-blue-600 text-blue-600 hover:bg-blue-50 focus:ring-blue-500 disabled:border-gray-300 disabled:text-gray-300 disabled:cursor-not-allowed`;
      default:
        return `${baseStyles} bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500`;
    }
  };

  // Size variants
  const getSizeStyles = () => {
    switch (size) {
      case 'sm':
        return 'px-3 py-1.5 text-sm';
      case 'md':
        return 'px-4 py-2 text-sm';
      case 'lg':
        return 'px-6 py-3 text-base';
      default:
        return 'px-4 py-2 text-sm';
    }
  };

  // Icon size based on button size
  const getIconSize = () => {
    switch (size) {
      case 'sm':
        return 'w-3 h-3';
      case 'md':
        return 'w-4 h-4';
      case 'lg':
        return 'w-5 h-5';
      default:
        return 'w-4 h-4';
    }
  };

  const renderIcon = () => {
    const iconClass = getIconSize();
    
    if (isDownloading) {
      return <Loader2 className={`${iconClass} animate-spin`} />;
    }
    
    if (downloadStatus === 'success') {
      return <CheckCircle className={`${iconClass} text-green-500`} />;
    }
    
    if (downloadStatus === 'error') {
      return <AlertCircle className={`${iconClass} text-red-500`} />;
    }
    
    return <Download className={iconClass} />;
  };

  const getButtonText = () => {
    if (isDownloading) {
      return 'Mengunduh...';
    }
    
    if (downloadStatus === 'success') {
      return 'Berhasil';
    }
    
    if (downloadStatus === 'error') {
      return 'Gagal';
    }
    
    return 'Unduh Dokumen';
  };

  if (!canDownload) {
    return (
      <div className="inline-flex items-center space-x-2 px-3 py-1.5 text-xs text-gray-500 bg-gray-100 rounded-lg">
        <FileText className="w-3 h-3" />
        <span>Belum dapat diunduh</span>
      </div>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={handleDownload}
        disabled={isDownloading || !canDownload}
        className={`${getVariantStyles()} ${getSizeStyles()} ${className}`}
        title={`Unduh ${documentType}`}
      >
        <span className="flex items-center space-x-2">
          {renderIcon()}
          <span>{getButtonText()}</span>
        </span>
      </button>
      
      {/* Tooltip */}
      {canDownload && (
        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-1 text-xs text-white bg-gray-900 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap">
          {documentType}
          <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
        </div>
      )}
    </div>
  );
};

// Compact version for table cells
export const CompactDocumentDownloadButton: React.FC<{
  request: LeaveRequest;
  onSuccess?: (message: string) => void;
  onError?: (error: string) => void;
  workCalendarDays?: WorkCalendarDay[];
}> = ({ request, onSuccess, onError, workCalendarDays = [] }) => {
  const [isDownloading, setIsDownloading] = useState(false);
  const canDownload = request.status === 'approved_admin';

  // Get document type description
  const getDocTypeDesc = (leaveType: string): string => {
    const descriptions: Record<string, string> = {
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
    };
    return descriptions[leaveType] || 'Surat Izin Cuti';
  };

  const handleDownload = async () => {
    if (!canDownload || isDownloading) return;

    setIsDownloading(true);
    try {
      const { generateAndDownloadDocument } = await loadDocumentGenerator();
      await generateAndDownloadDocument(request, workCalendarDays);
      onSuccess?.(`Dokumen untuk ${request.nama} berhasil diunduh.`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Gagal mengunduh dokumen.';
      onError?.(errorMessage);
    } finally {
      setIsDownloading(false);
    }
  };

  if (!canDownload) {
    return (
      <span className="text-xs text-gray-400" title="Belum dapat diunduh">
        <FileText className="w-3 h-3" />
      </span>
    );
  }

  return (
    <button
      onClick={handleDownload}
      disabled={isDownloading}
      className="p-1 text-blue-600 hover:text-blue-800 transition-colors duration-200 disabled:opacity-50"
      title={`Unduh ${getDocTypeDesc(request.jenisCuti)}`}
    >
      {isDownloading ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : (
        <Download className="w-4 h-4" />
      )}
    </button>
  );
};

// Bulk download component for multiple requests
export const BulkDocumentDownloadButton: React.FC<{
  requests: LeaveRequest[];
  onSuccess?: (message: string) => void;
  onError?: (error: string) => void;
  workCalendarDays?: WorkCalendarDay[];
}> = ({ requests, onSuccess, onError, workCalendarDays = [] }) => {
  const [isDownloading, setIsDownloading] = useState(false);
  const [progress, setProgress] = useState(0);

  const downloadableRequests = requests.filter(req => req.status === 'approved_admin');

  const handleBulkDownload = async () => {
    if (downloadableRequests.length === 0 || isDownloading) return;

    setIsDownloading(true);
    setProgress(0);

    try {
      const { generateAndDownloadDocument } = await loadDocumentGenerator();
      
      for (let i = 0; i < downloadableRequests.length; i++) {
        const request = downloadableRequests[i];
        await generateAndDownloadDocument(request, workCalendarDays);
        setProgress(((i + 1) / downloadableRequests.length) * 100);
        
        // Small delay between downloads to prevent browser blocking
        if (i < downloadableRequests.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }
      
      onSuccess?.(`${downloadableRequests.length} dokumen berhasil diunduh.`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Gagal mengunduh beberapa dokumen.';
      onError?.(errorMessage);
    } finally {
      setIsDownloading(false);
      setProgress(0);
    }
  };

  if (downloadableRequests.length === 0) {
    return null;
  }

  return (
    <button
      onClick={handleBulkDownload}
      disabled={isDownloading}
      className="inline-flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors duration-200 disabled:opacity-50"
    >
      {isDownloading ? (
        <>
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>Mengunduh... ({Math.round(progress)}%)</span>
        </>
      ) : (
        <>
          <Download className="w-4 h-4" />
          <span>Unduh Semua ({downloadableRequests.length})</span>
        </>
      )}
    </button>
  );
};

export default DocumentDownloadButton;
