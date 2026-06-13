<?php
/**
 * Improved File Upload Handler for cPanel Hosting
 * With error logging and better error messages
 */

// Error logging function
function logError($message) {
    $logFile = __DIR__ . '/upload-errors.log';
    $timestamp = date('Y-m-d H:i:s');
    file_put_contents($logFile, "[$timestamp] $message\n", FILE_APPEND);
}

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
$uploadDir = __DIR__ . '/../../documents/leave-documents/';
$baseUrl = 'https://cuti.disdik.grobogan.online/documents/leave-documents/';
$maxFileSize = 5 * 1024 * 1024; // 5MB
$allowedTypes = ['application/pdf'];

logError("Upload request received from: " . ($_SERVER['HTTP_REFERER'] ?? 'unknown'));

// Create upload directory if it doesn't exist
if (!file_exists($uploadDir)) {
    logError("Upload directory does not exist, creating: $uploadDir");
    if (!mkdir($uploadDir, 0755, true)) {
        logError("CRITICAL: Failed to create upload directory");
        http_response_code(500);
        echo json_encode(['success' => false, 'error' => 'Failed to create upload directory. Check permissions.']);
        exit();
    }
    logError("Upload directory created successfully");
}

// Check if directory is writable
if (!is_writable($uploadDir)) {
    logError("CRITICAL: Upload directory is not writable: $uploadDir");
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Upload directory is not writable. Check permissions.']);
    exit();
}

// Validate file upload
if (!isset($_FILES['file'])) {
    logError("ERROR: No file in request. FILES array: " . json_encode($_FILES));
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'No file uploaded']);
    exit();
}

$file = $_FILES['file'];

// Log file details
logError("File upload attempt: " . $file['name'] . " (" . $file['size'] . " bytes)");

if ($file['error'] !== UPLOAD_ERR_OK) {
    $errorMessages = [
        UPLOAD_ERR_INI_SIZE => 'File exceeds upload_max_filesize directive in php.ini',
        UPLOAD_ERR_FORM_SIZE => 'File exceeds MAX_FILE_SIZE directive',
        UPLOAD_ERR_PARTIAL => 'File was only partially uploaded',
        UPLOAD_ERR_NO_FILE => 'No file was uploaded',
        UPLOAD_ERR_NO_TMP_DIR => 'Missing temporary folder',
        UPLOAD_ERR_CANT_WRITE => 'Failed to write file to disk',
        UPLOAD_ERR_EXTENSION => 'PHP extension stopped the upload'
    ];

    $errorMsg = $errorMessages[$file['error']] ?? 'Unknown upload error: ' . $file['error'];
    logError("Upload error code {$file['error']}: $errorMsg");

    http_response_code(400);
    echo json_encode(['success' => false, 'error' => $errorMsg]);
    exit();
}

// Validate file type
$finfo = finfo_open(FILEINFO_MIME_TYPE);
$mimeType = finfo_file($finfo, $file['tmp_name']);
finfo_close($finfo);

logError("Detected MIME type: $mimeType");

if (!in_array($mimeType, $allowedTypes)) {
    logError("ERROR: Invalid file type - $mimeType");
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Invalid file type. Only PDF files are allowed.']);
    exit();
}

// Validate file size
if ($file['size'] > $maxFileSize) {
    logError("ERROR: File too large - " . $file['size'] . " bytes (max: $maxFileSize)");
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'File size exceeds 5MB limit.']);
    exit();
}

// Generate unique filename
$fileExt = pathinfo($file['name'], PATHINFO_EXTENSION);
$fileName = time() . '_' . substr(md5(uniqid(rand(), true)), 0, 13) . '.' . $fileExt;
$targetPath = $uploadDir . $fileName;

logError("Target path: $targetPath");

// Move uploaded file
if (!move_uploaded_file($file['tmp_name'], $targetPath)) {
    logError("CRITICAL: Failed to move uploaded file from {$file['tmp_name']} to $targetPath");
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Failed to save file to server.']);
    exit();
}

logError("File uploaded successfully: $fileName");

// Set file permissions
chmod($targetPath, 0644);

// Return success response
$publicUrl = $baseUrl . $fileName;
echo json_encode([
    'success' => true,
    'url' => $publicUrl,
    'filename' => $fileName
]);

logError("Upload completed. Public URL: $publicUrl");
