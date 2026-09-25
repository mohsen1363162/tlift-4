<?php
/**
 * سرویس همگام‌سازی تلیفت — نسخهٔ قابل اجرا روی هاست اشتراکی (cPanel/DirectAdmin)
 *
 * این فایل یک انبار کلید-مقدار ساده است که جایگزین سوپابیس می‌شود:
 *   GET  ?prefix=tlift_&token=...   → فهرست رکوردها با پیشوند
 *   GET  ?key=نام‌کلید&token=...     → یک رکورد
 *   POST {key, data, updated_at}    → ذخیره/به‌روزرسانی رکورد
 *
 * ⚠️ بعد از آپلود روی هاست، حتماً SYNC_TOKEN را عوض کنید.
 */

define('SYNC_TOKEN', 'tlift-asemansara-1405'); // ← این رمز را عوض کنید
define('DATA_DIR', __DIR__ . '/sync_data');
define('MAX_BODY_BYTES', 8 * 1024 * 1024);

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Cache-Control: no-store');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

// --- احراز هویت با توکن مشترک ---
$token = isset($_GET['token']) ? (string)$_GET['token'] : '';
if ($token === '' && isset($_SERVER['HTTP_AUTHORIZATION'])) {
    $token = trim(str_ireplace('Bearer ', '', $_SERVER['HTTP_AUTHORIZATION']));
}
if (!hash_equals(SYNC_TOKEN, $token)) {
    http_response_code(401);
    echo json_encode(['error' => 'invalid token']);
    exit;
}

if (!is_dir(DATA_DIR)) {
    @mkdir(DATA_DIR, 0755, true);
}

function file_for($key) {
    if (!is_string($key) || !preg_match('/^[A-Za-z0-9_\-]{1,120}$/', $key)) return null;
    return DATA_DIR . '/' . $key . '.json';
}

$method = $_SERVER['REQUEST_METHOD'];

// --- خواندن ---
if ($method === 'GET') {
    $key = isset($_GET['key']) ? (string)$_GET['key'] : '';
    $prefix = isset($_GET['prefix']) ? (string)$_GET['prefix'] : '';

    if ($key !== '') {
        $f = file_for($key);
        if ($f && is_file($f)) {
            readfile($f);
        } else {
            echo json_encode(['key' => $key, 'data' => null, 'updated_at' => null, 'exists' => false]);
        }
        exit;
    }

    $rows = [];
    foreach (glob(DATA_DIR . '/*.json') ?: [] as $f) {
        $k = basename($f, '.json');
        if ($prefix !== '' && strpos($k, $prefix) !== 0) continue;
        $c = json_decode((string)file_get_contents($f), true);
        if (is_array($c)) $rows[] = $c;
    }
    echo json_encode($rows);
    exit;
}

// --- نوشتن ---
if ($method === 'POST') {
    $raw = file_get_contents('php://input');
    if ($raw === false || strlen($raw) > MAX_BODY_BYTES) {
        http_response_code(413);
        echo json_encode(['error' => 'payload too large']);
        exit;
    }
    $body = json_decode($raw, true);
    if (!is_array($body) || !isset($body['key'])) {
        http_response_code(400);
        echo json_encode(['error' => 'bad request']);
        exit;
    }
    $f = file_for($body['key']);
    if (!$f) {
        http_response_code(400);
        echo json_encode(['error' => 'bad key']);
        exit;
    }

    $payload = json_encode([
        'key' => $body['key'],
        'data' => isset($body['data']) ? $body['data'] : null,
        'updated_at' => isset($body['updated_at']) ? $body['updated_at'] : date('c'),
    ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);

    // نوشتن اتمی با قفل فایل تا داده‌ها در درخواست‌های همزمان خراب نشوند
    $fp = fopen($f, 'c');
    if ($fp === false) {
        http_response_code(500);
        echo json_encode(['error' => 'cannot write data directory']);
        exit;
    }
    if (flock($fp, LOCK_EX)) {
        ftruncate($fp, 0);
        fwrite($fp, $payload);
        fflush($fp);
        flock($fp, LOCK_UN);
    }
    fclose($fp);

    echo json_encode(['ok' => true, 'key' => $body['key']]);
    exit;
}

http_response_code(405);
echo json_encode(['error' => 'method not allowed']);
