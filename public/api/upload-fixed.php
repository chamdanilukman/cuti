<?php
/**
 * File Upload Handler for cPanel Hosting
 * FIXED VERSION - Upload to domain-specific folder
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

// Configuration
// FIXED: Upload to domain folder, not root public_html
$uploadDir = __DIR__ . '/../documents/leave-documents/';
$baseUrl = 'https://cuti.disdik.grobogan.online/documents/leave-documents/';
$maxFileSize = 5 * 1024 * 1024; // 5MB
$allowedTypes = ['application/pdf'];

// Error logging
function logError($message) {
    $logFile = __DIR__ . '/upload-errors.log';
    $timestamp = date('Y-m-d H:i:s');
    file_put_contents($logFile, "[$timestamp] $message\n", FILE_APPEND);
}

logError("Upload request received");

// Create upload directory if it doesn't exist
if (!file_exists($uploadDir)) {
    logError("Creating upload directory: $uploadDir");
    if (!mkdir($uploadDir, 0755, true)) {
        logError("CRITICAL: Failed to create upload directory");
        http_response_code(500);
        echo json_encode(['success' => false, 'error' => 'Failed to create upload directory.']);
        exit();
    }
}

// Check if directory is writable
if (!is_writable($uploadDir)) {
    logError("CRITICAL: Upload directory is not writable: $uploadDir");
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Upload directory is not writable.']);
    exit();
}

// Validate file upload
if (!isset($_FILES['file'])) {
    logError("ERROR: No file in request");
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'No file uploaded']);
    exit();
}

$file = $_FILES['file'];

logError("File upload: {$file['name']} ({$file['size']} bytes)");

if ($file['error'] !== UPLOAD_ERR_OK) {
    $errorMessages = [
        UPLOAD_ERR_INI_SIZE => 'File exceeds upload_max_filesize',
        UPLOAD_ERR_FORM_SIZE => 'File exceeds MAX_FILE_SIZE',
        UPLOAD_ERR_PARTIAL => 'File only partially uploaded',
        UPLOAD_ERR_NO_FILE => 'No file was uploaded',
        UPLOAD_ERR_NO_TMP_DIR => 'Missing temporary folder',
        UPLOAD_ERR_CANT_WRITE => 'Failed to write file to disk',
        UPLOAD_ERR_EXTENSION => 'PHP extension stopped upload'
    ];

    $errorMsg = $errorMessages[$file['error']] ?? 'Unknown error: ' . $file['error'];
    logError("Upload error: $errorMsg");

    http_response_code(400);
    echo json_encode(['success' => false, 'error' => $errorMsg]);
    exit();
}

// Validate file type
$finfo = finfo_open(FILEINFO_MIME_TYPE);
$mimeType = finfo_file($finfo, $file['tmp_name']);
finfo_close($finfo);

if (!in_array($mimeType, $allowedTypes)) {
    logError("ERROR: Invalid file type - $mimeType");
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Invalid file type. Only PDF files are allowed.']);
    exit();
}

// Validate file size
if ($file['size'] > $maxFileSize) {
    logError("ERROR: File too large - {$file['size']} bytes");
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'File size exceeds 5MB limit.']);
    exit();
}

// Generate unique filename
$fileExt = pathinfo($file['name'], PATHINFO_EXTENSION);
$fileName = time() . '_' . substr(md5(uniqid(rand(), true)), 0, 13) . '.' . $fileExt;
$targetPath = $uploadDir . $fileName;

logError("Target: $targetPath");

// Move uploaded file
if (!move_uploaded_file($file['tmp_name'], $targetPath)) {
    logError("CRITICAL: Failed to move file");
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Failed to save file to server.']);
    exit();
}

// Set file permissions
chmod($targetPath, 0644);

// Return success response
$publicUrl = $baseUrl . $fileName;
logError("SUCCESS: $publicUrl");

echo json_encode([
    'success' => true,
    'url' => $publicUrl,
    'filename' => $fileName
]);
