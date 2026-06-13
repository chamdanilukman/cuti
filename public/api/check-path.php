<?php
/**
 * Debug Helper - Check Upload Path Configuration
 * Access: https://cuti.disdik.grobogan.online/api/check-path.php
 */

header('Content-Type: application/json');

$documentRoot = $_SERVER['DOCUMENT_ROOT'];
$uploadDir = $documentRoot . '/documents/leave-documents/';
$finalDir = $documentRoot . '/documents/leave-documents/final/';

$info = [
    'server_info' => [
        'DOCUMENT_ROOT' => $_SERVER['DOCUMENT_ROOT'],
        'SCRIPT_FILENAME' => __FILE__,
        '__DIR__' => __DIR__,
        'HTTP_HOST' => $_SERVER['HTTP_HOST'] ?? 'N/A',
    ],
    'paths' => [
        'upload_dir' => $uploadDir,
        'final_dir' => $finalDir,
    ],
    'directory_checks' => [
        'upload_dir_exists' => file_exists($uploadDir),
        'upload_dir_writable' => is_writable($uploadDir),
        'final_dir_exists' => file_exists($finalDir),
        'final_dir_writable' => is_writable($finalDir),
    ],
    'urls' => [
        'base_url' => 'https://cuti.disdik.grobogan.online/documents/leave-documents/',
        'final_url' => 'https://cuti.disdik.grobogan.online/documents/leave-documents/final/',
    ],
];

// List files in directories (if exist)
if (file_exists($uploadDir)) {
    $files = array_diff(scandir($uploadDir), ['.', '..']);
    $info['files_in_upload_dir'] = array_values($files);
}

if (file_exists($finalDir)) {
    $files = array_diff(scandir($finalDir), ['.', '..']);
    $info['files_in_final_dir'] = array_values($files);
}

echo json_encode($info, JSON_PRETTY_PRINT);
