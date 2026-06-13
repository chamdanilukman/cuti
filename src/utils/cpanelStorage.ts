/**
 * cPanel Storage Utility
 * Handles file upload and deletion to cPanel hosting
 */

export interface UploadResult {
  success: boolean;
  url?: string;
  error?: string;
}

// Configuration - Load from environment variables
const UPLOAD_API_URL = import.meta.env.VITE_CPANEL_UPLOAD_URL || 'https://cuti.disdik.grobogan.online/api/upload.php';
const DELETE_API_URL = import.meta.env.VITE_CPANEL_DELETE_URL || 'https://cuti.disdik.grobogan.online/api/delete.php';

/**
 * Upload file to cPanel hosting
 * @param file - File to upload
 * @param folder - Folder name (optional, for future expansion)
 * @returns Promise with upload result
 */
export const uploadFile = async (file: File, folder: string = 'leave-documents'): Promise<UploadResult> => {
  try {
    console.log('Starting file upload to cPanel hosting...');
    console.log('File details:', { name: file.name, size: file.size, type: file.type });

    // Validate file type
    if (file.type !== 'application/pdf') {
      return {
        success: false,
        error: 'Only PDF files are allowed'
      };
    }

    // Validate file size (5MB max)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      return {
        success: false,
        error: `File size (${(file.size / (1024 * 1024)).toFixed(2)}MB) exceeds 5MB limit`
      };
    }

    // Create FormData for multipart/form-data upload
    const formData = new FormData();
    formData.append('file', file);
    formData.append('folder', folder);

    console.log('Uploading to:', UPLOAD_API_URL);

    // Upload file to cPanel
    const response = await fetch(UPLOAD_API_URL, {
      method: 'POST',
      body: formData,
      // Note: Don't set Content-Type header, browser will set it automatically with boundary
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Upload failed' }));
      console.error('Upload error:', errorData);
      return {
        success: false,
        error: errorData.error || `HTTP error! status: ${response.status}`
      };
    }

    const result = await response.json();
    console.log('Upload successful:', result);

    if (result.success && result.url) {
      return {
        success: true,
        url: result.url
      };
    } else {
      return {
        success: false,
        error: result.error || 'Upload failed'
      };
    }

  } catch (error) {
    console.error('Error uploading file:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown upload error'
    };
  }
};

/**
 * Delete file from cPanel hosting
 * @param filePath - Full URL or filename to delete
 * @returns Promise with deletion status
 */
export const deleteFile = async (filePath: string): Promise<boolean> => {
  try {
    console.log('Deleting file from cPanel hosting:', filePath);

    // Extract filename from URL if full URL is provided
    const filename = getFilenameFromUrl(filePath);

    if (!filename) {
      console.error('Invalid file path or URL');
      return false;
    }

    console.log('Deleting file:', filename);

    // Send delete request to cPanel
    const response = await fetch(DELETE_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ filename }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Delete failed' }));
      console.error('Delete error:', errorData);
      return false;
    }

    const result = await response.json();
    console.log('Delete result:', result);

    return result.success === true;

  } catch (error) {
    console.error('Error deleting file:', error);
    return false;
  }
};

/**
 * Extract filename from URL or file path
 * @param url - Full URL or file path
 * @returns Filename only
 */
export const getFilenameFromUrl = (url: string): string => {
  try {
    // If it's a full URL, parse it
    if (url.startsWith('http://') || url.startsWith('https://')) {
      const urlObj = new URL(url);
      const pathParts = urlObj.pathname.split('/');
      return pathParts[pathParts.length - 1];
    }

    // If it's already a filename or path, extract the filename
    const pathParts = url.split('/');
    return pathParts[pathParts.length - 1];
  } catch (error) {
    console.error('Error extracting filename from URL:', error);
    return '';
  }
};

/**
 * Extract file path from URL for deletion (legacy compatibility)
 * @param url - Full URL
 * @returns File path
 */
export const getFilePathFromUrl = (url: string): string => {
  // For cPanel storage, we just need the filename
  return getFilenameFromUrl(url);
};
