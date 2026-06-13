<?php
/**
 * File Delete Handler for cPanel Hosting
 * FIXED VERSION - Delete from domain-specific folder
 */

// Enable CORS
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Content-Type: application/json');

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Allow POST or DELETE methods
if (!in_array($_SERVER['REQUEST_METHOD'], ['POST', 'DELETE'])) {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Method not allowed']);
    exit();
}

// Configuration
// FIXED: Delete from domain folder, not root public_html
$uploadDir = __DIR__ . '/../documents/leave-documents/';

// Get JSON input
$input = json_decode(file_get_contents('php://input'), true);

if (!isset($input['filename']) || empty($input['filename'])) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Filename is required']);
    exit();
}

$filename = basename($input['filename']); // Security: prevent directory traversal
$filePath = $uploadDir . $filename;

// Check if file exists
if (!file_exists($filePath)) {
    http_response_code(404);
    echo json_encode(['success' => false, 'error' => 'File not found']);
    exit();
}

// Delete file
if (unlink($filePath)) {
    echo json_encode(['success' => true, 'message' => 'File deleted successfully']);
} else {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Failed to delete file']);
}
