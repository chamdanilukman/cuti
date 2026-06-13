import React, { useState } from 'react';
import { Paperclip, Download, Loader2, FileText, AlertCircle } from 'lucide-react';
import { LeaveRequest, FileInfo } from '../types';

interface AttachmentDownloadButtonProps {
  request: LeaveRequest;
  onSuccess?: (message: string) => void;
  onError?: (error: string) => void;
  className?: string;
  variant?: 'primary' | 'secondary' | 'outline';
  size?: 'sm' | 'md' | 'lg';
}

const AttachmentDownloadButton: React.FC<AttachmentDownloadButtonProps> = ({
  request,
  onSuccess,
  onError,
  className = '',
  variant = 'secondary',
  size = 'md',
}) => {
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadStatus, setDownloadStatus] = useState<'idle' | 'success' | 'error'>('idle');

  const hasAttachments = request.files && request.files.length > 0;
  const attachmentCount = request.files?.length || 0;

  const handleDownload = async (file: FileInfo) => {
    if (isDownloading) return;

    setIsDownloading(true);
    setDownloadStatus('idle');

    try {
      // Create a temporary link to download the file
      const link = document.createElement('a');
      link.href = file.url;
      link.download = file.name;
      link.target = '_blank';
      
      // Trigger download
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      setDownloadStatus('success');
      onSuccess?.(`Lampiran ${file.name} berhasil diunduh.`);
      
      // Reset status after 3 seconds
      setTimeout(() => setDownloadStatus('idle'), 3000);
    } catch (error) {
      setDownloadStatus('error');
      const errorMessage = error instanceof Error ? error.message : 'Gagal mengunduh lampiran.';
      onError?.(errorMessage);
      
      // Reset status after 5 seconds
      setTimeout(() => setDownloadStatus('idle'), 5000);
    } finally {
      setIsDownloading(false);
    }
  };

  const handleDownloadAll = async () => {
    if (!hasAttachments || isDownloading) return;

    setIsDownloading(true);
    setDownloadStatus('idle');

    try {
      for (let i = 0; i < request.files!.length; i++) {
        const file = request.files![i];
        await handleDownload(file);
        
        // Small delay between downloads
        if (i < request.files!.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }
      
      setDownloadStatus('success');
      onSuccess?.(`${attachmentCount} lampiran berhasil diunduh.`);
    } catch (error) {
      setDownloadStatus('error');
      const errorMessage = error instanceof Error ? error.message : 'Gagal mengunduh beberapa lampiran.';
      onError?.(errorMessage);
    } finally {
      setIsDownloading(false);
    }
  };

  // Style variants
  const getVariantStyles = () => {
    const baseStyles = 'inline-flex items-center justify-center font-medium rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2';
    
    switch (variant) {
      case 'primary':
        return `${baseStyles} bg-orange-600 text-white hover:bg-orange-700 focus:ring-orange-500 disabled:bg-gray-300 disabled:cursor-not-allowed`;
      case 'secondary':
        return `${baseStyles} bg-gray-600 text-white hover:bg-gray-700 focus:ring-gray-500 disabled:bg-gray-300 disabled:cursor-not-allowed`;
      case 'outline':
        return `${baseStyles} border border-orange-600 text-orange-600 hover:bg-orange-50 focus:ring-orange-500 disabled:border-gray-300 disabled:text-gray-300 disabled:cursor-not-allowed`;
      default:
        return `${baseStyles} bg-orange-600 text-white hover:bg-orange-700 focus:ring-orange-500`;
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
      return <Download className={`${iconClass} text-green-500`} />;
    }
    
    if (downloadStatus === 'error') {
      return <AlertCircle className={`${iconClass} text-red-500`} />;
    }
    
    return <Paperclip className={iconClass} />;
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
    
    return attachmentCount > 1 ? `Lampiran (${attachmentCount})` : 'Lampiran';
  };

  if (!hasAttachments) {
    return (
      <div className="inline-flex items-center space-x-2 px-3 py-1.5 text-xs text-gray-500 bg-gray-100 rounded-lg">
        <FileText className="w-3 h-3" />
        <span>Tidak ada lampiran</span>
      </div>
    );
  }

  // If only one attachment, download directly
  if (attachmentCount === 1) {
    return (
      <button
        onClick={() => handleDownload(request.files![0])}
        disabled={isDownloading}
        className={`${getVariantStyles()} ${getSizeStyles()} ${className}`}
        title={`Unduh lampiran: ${request.files![0].name}`}
      >
        <span className="flex items-center space-x-2">
          {renderIcon()}
          <span>{getButtonText()}</span>
        </span>
      </button>
    );
  }

  // Multiple attachments - show dropdown or download all
  return (
    <div className="relative group">
      <button
        onClick={handleDownloadAll}
        disabled={isDownloading}
        className={`${getVariantStyles()} ${getSizeStyles()} ${className}`}
        title={`Unduh semua lampiran (${attachmentCount} berkas)`}
      >
        <span className="flex items-center space-x-2">
          {renderIcon()}
          <span>{getButtonText()}</span>
        </span>
      </button>
      
      {/* Dropdown for individual files */}
      <div className="absolute top-full left-0 mt-1 w-64 bg-white border border-gray-200 rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-10">
        <div className="p-2">
          <div className="text-xs font-medium text-gray-700 mb-2">Lampiran per Berkas:</div>
          {request.files!.map((file, index) => (
            <button
              key={index}
              onClick={() => handleDownload(file)}
              className="w-full text-left px-2 py-1 text-xs text-gray-600 hover:bg-gray-100 rounded flex items-center space-x-2"
              title={file.name}
            >
              <FileText className="w-3 h-3 flex-shrink-0" />
              <span className="truncate">{file.name}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

// Compact version for table cells
export const CompactAttachmentDownloadButton: React.FC<{
  request: LeaveRequest;
  onSuccess?: (message: string) => void;
  onError?: (error: string) => void;
}> = ({ request, onSuccess, onError }) => {
  const [isDownloading, setIsDownloading] = useState(false);
  const hasAttachments = request.files && request.files.length > 0;
  const attachmentCount = request.files?.length || 0;

  const handleDownload = async () => {
    if (!hasAttachments || isDownloading) return;

    setIsDownloading(true);
    try {
      const file = request.files![0];
      const link = document.createElement('a');
      link.href = file.url;
      link.download = file.name;
      link.target = '_blank';
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      onSuccess?.(`Lampiran ${file.name} berhasil diunduh`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Gagal mengunduh lampiran';
      onError?.(errorMessage);
    } finally {
      setIsDownloading(false);
    }
  };

  if (!hasAttachments) {
    return (
      <span className="text-xs text-gray-400" title="Tidak ada lampiran">
        <FileText className="w-3 h-3" />
      </span>
    );
  }

  return (
    <button
      onClick={handleDownload}
      disabled={isDownloading}
      className="p-1 text-orange-600 hover:text-orange-800 transition-colors duration-200 disabled:opacity-50"
      title={attachmentCount > 1 ? `Unduh lampiran (${attachmentCount} file)` : `Unduh lampiran: ${request.files![0].name}`}
    >
      {isDownloading ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : (
        <div className="relative">
          <Paperclip className="w-4 h-4" />
          {attachmentCount > 1 && (
            <span className="absolute -top-1 -right-1 bg-orange-500 text-white text-xs rounded-full w-3 h-3 flex items-center justify-center" style={{ fontSize: '8px' }}>
              {attachmentCount}
            </span>
          )}
        </div>
      )}
    </button>
  );
};

export default AttachmentDownloadButton;
