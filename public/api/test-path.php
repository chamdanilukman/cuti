<?php
/**
 * Test Script - Check Upload Directory Path
 */

header('Content-Type: text/plain');

echo "=== cPanel Upload Directory Test ===\n\n";

$uploadDir = __DIR__ . '/../../documents/leave-documents/';

echo "1. Upload Directory Path:\n";
echo "   " . $uploadDir . "\n\n";

echo "2. Directory Exists:\n";
echo "   " . (file_exists($uploadDir) ? '✅ YES' : '❌ NO') . "\n\n";

echo "3. Directory Writable:\n";
echo "   " . (is_writable($uploadDir) ? '✅ YES' : '❌ NO') . "\n\n";

echo "4. Absolute Path (Real Path):\n";
echo "   " . (realpath($uploadDir) ?: 'N/A') . "\n\n";

echo "5. Current Script Location:\n";
echo "   " . __DIR__ . "\n\n";

echo "6. Parent Directory:\n";
echo "   " . dirname(__DIR__) . "\n\n";

echo "7. Root Directory:\n";
echo "   " . dirname(dirname(__DIR__)) . "\n\n";

if (file_exists($uploadDir)) {
    echo "8. Directory Contents:\n";
    $files = scandir($uploadDir);
    if (count($files) > 2) {
        foreach ($files as $file) {
            if ($file != '.' && $file != '..') {
                echo "   - $file\n";
            }
        }
    } else {
        echo "   (empty)\n";
    }
} else {
    echo "8. Directory Contents:\n";
    echo "   Directory does not exist!\n";
}

echo "\n9. PHP Upload Settings:\n";
echo "   upload_max_filesize: " . ini_get('upload_max_filesize') . "\n";
echo "   post_max_size: " . ini_get('post_max_size') . "\n";
echo "   max_execution_time: " . ini_get('max_execution_time') . "\n";
echo "   memory_limit: " . ini_get('memory_limit') . "\n";

echo "\n=== End of Test ===\n";
