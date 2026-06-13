<?php
/**
 * DEBUG VERSION - File Upload Handler with Detailed Logging
 * Use this to troubleshoot upload issues
 */

// Enable error reporting
error_reporting(E_ALL);
ini_set('display_errors', 1);

// Log file location
$logFile = __DIR__ . '/upload-debug.log';

function logDebug($message) {
    global $logFile;
    $timestamp = date('Y-m-d H:i:s');
    file_put_contents($logFile, "[$timestamp] $message\n", FILE_APPEND);
}

logDebug("=== Upload Request Started ===");
logDebug("Request Method: " . $_SERVER['REQUEST_METHOD']);
logDebug("Content-Type: " . ($_SERVER['CONTENT_TYPE'] ?? 'not set'));

// Enable CORS
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Content-Type: application/json');

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    logDebug("OPTIONS request - returning 200");
    http_response_code(200);
    exit();
}

// Only allow POST requests
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    logDebug("Error: Method not allowed - " . $_SERVER['REQUEST_METHOD']);
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Method not allowed']);
    exit();
}

// Configuration
$uploadDir = __DIR__ . '/../../documents/leave-documents/';
$baseUrl = 'https://cuti.disdik.grobogan.online/documents/leave-documents/';
$maxFileSize = 5 * 1024 * 1024; // 5MB
$allowedTypes = ['application/pdf'];

logDebug("Upload Directory: $uploadDir");
logDebug("Upload Directory Exists: " . (file_exists($uploadDir) ? 'YES' : 'NO'));
logDebug("Upload Directory Writable: " . (is_writable($uploadDir) ? 'YES' : 'NO'));

// Create upload directory if it doesn't exist
if (!file_exists($uploadDir)) {
    logDebug("Creating upload directory...");
    $result = mkdir($uploadDir, 0755, true);
    logDebug("Directory created: " . ($result ? 'SUCCESS' : 'FAILED'));
}

// Check PHP settings
logDebug("PHP upload_max_filesize: " . ini_get('upload_max_filesize'));
logDebug("PHP post_max_size: " . ini_get('post_max_size'));
logDebug("PHP max_execution_time: " . ini_get('max_execution_time'));

// Log $_FILES
logDebug("FILES array: " . json_encode($_FILES));

// Validate file upload
if (!isset($_FILES['file'])) {
    logDebug("Error: No file in request");
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'No file uploaded', 'debug' => $_FILES]);
    exit();
}

$file = $_FILES['file'];
logDebug("File name: " . $file['name']);
logDebug("File size: " . $file['size']);
logDebug("File type: " . $file['type']);
logDebug("File tmp_name: " . $file['tmp_name']);
logDebug("File error: " . $file['error']);

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
    logDebug("Upload error: $errorMsg");

    http_response_code(400);
    echo json_encode(['success' => false, 'error' => $errorMsg]);
    exit();
}

// Validate file type
$finfo = finfo_open(FILEINFO_MIME_TYPE);
$mimeType = finfo_file($finfo, $file['tmp_name']);
finfo_close($finfo);

logDebug("Detected MIME type: $mimeType");

if (!in_array($mimeType, $allowedTypes)) {
    logDebug("Error: Invalid MIME type");
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Invalid file type. Only PDF files are allowed.']);
    exit();
}

// Validate file size
if ($file['size'] > $maxFileSize) {
    logDebug("Error: File too large - " . $file['size'] . " bytes");
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'File size exceeds 5MB limit.']);
    exit();
}

// Generate unique filename
$fileExt = pathinfo($file['name'], PATHINFO_EXTENSION);
$fileName = time() . '_' . substr(md5(uniqid(rand(), true)), 0, 13) . '.' . $fileExt;
$targetPath = $uploadDir . $fileName;

logDebug("Generated filename: $fileName");
logDebug("Target path: $targetPath");

// Move uploaded file
logDebug("Attempting to move uploaded file...");
$moveResult = move_uploaded_file($file['tmp_name'], $targetPath);

if (!$moveResult) {
    logDebug("Error: Failed to move uploaded file");
    logDebug("Source exists: " . (file_exists($file['tmp_name']) ? 'YES' : 'NO'));
    logDebug("Target dir writable: " . (is_writable($uploadDir) ? 'YES' : 'NO'));

    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => 'Failed to save file to server.',
        'debug' => [
            'tmp_exists' => file_exists($file['tmp_name']),
            'dir_writable' => is_writable($uploadDir),
            'target_path' => $targetPath
        ]
    ]);
    exit();
}

logDebug("File moved successfully");

// Set file permissions
chmod($targetPath, 0644);
logDebug("File permissions set to 0644");

// Verify file exists
$fileExists = file_exists($targetPath);
$fileSize = $fileExists ? filesize($targetPath) : 0;
logDebug("File exists after upload: " . ($fileExists ? 'YES' : 'NO'));
logDebug("File size on disk: $fileSize bytes");

// Return success response
$publicUrl = $baseUrl . $fileName;
logDebug("Success! Public URL: $publicUrl");
logDebug("=== Upload Request Completed ===\n");

echo json_encode([
    'success' => true,
    'url' => $publicUrl,
    'filename' => $fileName,
    'debug' => [
        'file_exists' => $fileExists,
        'file_size' => $fileSize,
        'target_path' => $targetPath
    ]
]);
