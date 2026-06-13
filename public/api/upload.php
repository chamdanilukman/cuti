<?php
/**
 * File Upload Handler for cPanel Hosting
 * Handles PDF file uploads for leave request documents
 */

// Enable CORS
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Content-Type: application/json');

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Only allow POST requests
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Method not allowed']);
    exit();
}

// Get folder parameter (default: leave-documents, option: final)
$folder = isset($_POST['folder']) ? $_POST['folder'] : 'leave-documents';

// Validate folder (security: only allow specific folders)
$allowedFolders = ['leave-documents', 'final'];
if (!in_array($folder, $allowedFolders)) {
    $folder = 'leave-documents'; // Default fallback
}

// Configuration - Dynamic path based on folder parameter
// Auto-detect correct path (works for both local dev and cPanel hosting)
$documentRoot = $_SERVER['DOCUMENT_ROOT']; // /home/groy4783/public_html/cuti.disdik.grobogan.online

if ($folder === 'final') {
    // Upload to final subfolder
    $uploadDir = $documentRoot . '/documents/leave-documents/final/';
    $baseUrl = 'https://cuti.disdik.grobogan.online/documents/leave-documents/final/';
} else {
    // Upload to leave-documents folder (default)
    $uploadDir = $documentRoot . '/documents/leave-documents/';
    $baseUrl = 'https://cuti.disdik.grobogan.online/documents/leave-documents/';
}
$maxFileSize = 5 * 1024 * 1024; // 5MB
$allowedTypes = ['application/pdf'];

// Create upload directory if it doesn't exist
if (!file_exists($uploadDir)) {
    mkdir($uploadDir, 0755, true);
}

// Validate file upload
if (!isset($_FILES['file']) || $_FILES['file']['error'] !== UPLOAD_ERR_OK) {
    $error = isset($_FILES['file']['error']) ? $_FILES['file']['error'] : 'No file uploaded';
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'File upload error: ' . $error]);
    exit();
}

$file = $_FILES['file'];

// Validate file type
$finfo = finfo_open(FILEINFO_MIME_TYPE);
$mimeType = finfo_file($finfo, $file['tmp_name']);
finfo_close($finfo);

if (!in_array($mimeType, $allowedTypes)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Invalid file type. Only PDF files are allowed.']);
    exit();
}

// Validate file size
if ($file['size'] > $maxFileSize) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'File size exceeds 5MB limit.']);
    exit();
}

// Generate unique filename
$fileExt = pathinfo($file['name'], PATHINFO_EXTENSION);
$fileName = time() . '_' . substr(md5(uniqid(rand(), true)), 0, 13) . '.' . $fileExt;
$targetPath = $uploadDir . $fileName;

// Move uploaded file
if (!move_uploaded_file($file['tmp_name'], $targetPath)) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Failed to save file to server.']);
    exit();
}

// Set file permissions
chmod($targetPath, 0644);

// Return success response
$publicUrl = $baseUrl . $fileName;
echo json_encode([
    'success' => true,
    'url' => $publicUrl,
    'filename' => $fileName
]);
