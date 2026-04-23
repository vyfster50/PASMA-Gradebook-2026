<?php
// This file is part of Moodle - http://moodle.org/

defined('MOODLE_INTERNAL') || die();

/**
 * Validates the API token from the Authorization header
 *
 * @return bool True if token is valid
 * @throws moodle_exception If authentication fails
 */
function local_gradebookapi_validate_token() {
    $headers = getallheaders();
    $auth_header = $headers['Authorization'] ?? '';

    if (empty($auth_header)) {
        throw new moodle_exception('missingauth', 'local_gradebookapi', '', null,
            'Authorization header is required');
    }

    // Extract Bearer token
    if (!preg_match('/Bearer\s+(.+)$/i', $auth_header, $matches)) {
        throw new moodle_exception('invalidauth', 'local_gradebookapi', '', null,
            'Invalid Authorization header format');
    }

    $token = $matches[1];
    $configured_token = get_config('local_gradebookapi', 'apitoken');

    if (empty($configured_token)) {
        throw new moodle_exception('notconfigured', 'local_gradebookapi', '', null,
            'API token not configured');
    }

    if (!hash_equals($configured_token, $token)) {
        throw new moodle_exception('invalidtoken', 'local_gradebookapi', '', null,
            'Invalid API token');
    }

    return true;
}

/**
 * Sends a JSON response and exits
 *
 * @param mixed $data Data to encode as JSON
 * @param int $status HTTP status code
 */
function local_gradebookapi_json_response($data, $status = 200) {
    http_response_code($status);
    header('Content-Type: application/json');
    echo json_encode($data);
    exit;
}

/**
 * Sends a JSON error response and exits
 *
 * @param string $message Error message
 * @param int $status HTTP status code
 */
function local_gradebookapi_error_response($message, $status = 400) {
    local_gradebookapi_json_response([
        'error' => true,
        'message' => $message
    ], $status);
}

/**
 * Checks if a grade item or grade is hidden from student
 *
 * @param object $gradeitem Grade item object
 * @param object|null $grade Grade object (optional)
 * @return bool True if hidden
 */
function local_gradebookapi_is_hidden($gradeitem, $grade = null) {
    // In older Moodle schemas the 'hidden' column is dual-purpose:
    //   0          = visible
    //   1          = permanently hidden
    //   >1 (unix)  = hidden until that timestamp ("hiddenuntil" — no separate column)
    $hidden_val = isset($gradeitem->hidden) ? (int)$gradeitem->hidden : 0;

    if ($hidden_val === 1) {
        // Permanently hidden
        return true;
    }

    if ($hidden_val > 1 && $hidden_val > time()) {
        // Hidden-until timestamp has not yet passed
        return true;
    }

    // Check per-grade hidden flag (same dual-purpose convention)
    if ($grade !== null) {
        $grade_hidden = isset($grade->hidden) ? (int)$grade->hidden : 0;
        if ($grade_hidden === 1 || ($grade_hidden > 1 && $grade_hidden > time())) {
            return true;
        }
    }

    return false;
}

/**
 * Logs API access to Moodle event log_store system
 *
 * @param string $endpoint Endpoint name (cohorts, students, student_grades)
 * @param array $params Request parameters
 * @param bool $success Whether the request was successful
 * @param string|null $error_message Error message if failed
 */
function local_gradebookapi_log_access($endpoint, $params, $success = true, $error_message = null) {
    // Simple PHP error_log-based logging — avoids Moodle event system issues
    $status = $success ? 'OK' : 'FAIL';
    $detail = $error_message ? " error=$error_message" : '';
    $ip = function_exists('getremoteaddr') ? getremoteaddr() : ($_SERVER['REMOTE_ADDR'] ?? '?');
    error_log("local_gradebookapi [$status] $endpoint ip=$ip" . $detail);
}

/**
 * Gets the cache instance for the gradebook API
 *
 * @return cache|null Cache instance or null if cache not available
 */
function local_gradebookapi_get_cache() {
    try {
        // Use Moodle's cache API with application cache
        return cache::make('local_gradebookapi', 'apiresponses');
    } catch (Exception $e) {
        // Cache definition may not exist yet, fall back to no caching
        error_log('local_gradebookapi: Cache not available - ' . $e->getMessage());
        return null;
    }
}

/**
 * Gets cached data if available and not expired
 *
 * @param string $key Cache key
 * @param int $ttl Time-to-live in seconds (default 300 = 5 minutes)
 * @return mixed|false Cached data or false if not found/expired
 */
function local_gradebookapi_cache_get($key, $ttl = 300) {
    $cache = local_gradebookapi_get_cache();
    if ($cache === null) {
        return false;
    }

    try {
        $data = $cache->get($key);
        if ($data === false) {
            return false;
        }

        // Check if cached data has expired
        if (isset($data['timestamp']) && (time() - $data['timestamp']) > $ttl) {
            $cache->delete($key);
            return false;
        }

        return $data['content'] ?? false;
    } catch (Exception $e) {
        error_log('local_gradebookapi: Cache get failed - ' . $e->getMessage());
        return false;
    }
}

/**
 * Stores data in cache
 *
 * @param string $key Cache key
 * @param mixed $data Data to cache
 * @return bool True if cached successfully
 */
function local_gradebookapi_cache_set($key, $data) {
    $cache = local_gradebookapi_get_cache();
    if ($cache === null) {
        return false;
    }

    try {
        $cache_data = [
            'timestamp' => time(),
            'content' => $data
        ];
        return $cache->set($key, $cache_data);
    } catch (Exception $e) {
        error_log('local_gradebookapi: Cache set failed - ' . $e->getMessage());
        return false;
    }
}

/**
 * Generates a cache key from endpoint and parameters
 *
 * @param string $endpoint Endpoint name
 * @param array $params Request parameters
 * @return string Cache key
 */
function local_gradebookapi_cache_key($endpoint, $params) {
    ksort($params); // Ensure consistent key regardless of parameter order
    return $endpoint . '_' . md5(json_encode($params));
}

/**
 * Invalidates cache for a specific course
 *
 * @param int $courseid Course ID
 */
function local_gradebookapi_invalidate_cache($courseid) {
    $cache = local_gradebookapi_get_cache();
    if ($cache === null) {
        return;
    }

    try {
        // For simplicity, purge all cache when course data changes
        // In production, you could implement more granular invalidation
        $cache->purge();
    } catch (Exception $e) {
        error_log('local_gradebookapi: Cache invalidation failed - ' . $e->getMessage());
    }
}

/**
 * Sets CORS headers for API responses.
 * Allows requests from any origin in dev; restrict in production.
 */
function local_gradebookapi_cors_headers() {
    header('Access-Control-Allow-Origin: *');
    header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
    header('Access-Control-Allow-Headers: Authorization, Content-Type');
    
    // Handle preflight
    if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
        http_response_code(204);
        exit;
    }
}

/**
 * Simple rate limiter using filesystem.
 * Allows max $limit requests per $window seconds per IP.
 *
 * @param int $limit Max requests per window (default 120)
 * @param int $window Window in seconds (default 60)
 * @throws Exception if rate limit exceeded
 */
function local_gradebookapi_check_rate_limit($limit = 120, $window = 60) {
    global $CFG;
    
    $ip = getremoteaddr();
    $rate_dir = $CFG->dataroot . '/gradebookapi_ratelimit';
    
    // Create directory if needed
    if (!is_dir($rate_dir)) {
        @mkdir($rate_dir, 0770, true);
    }
    
    $file = $rate_dir . '/' . md5($ip) . '.json';
    
    $now = time();
    $data = ['requests' => [], 'ip' => $ip];
    
    if (file_exists($file)) {
        $content = @file_get_contents($file);
        if ($content) {
            $data = json_decode($content, true) ?: $data;
        }
    }
    
    // Remove requests outside the window
    $data['requests'] = array_values(array_filter(
        $data['requests'] ?? [],
        function($ts) use ($now, $window) { return ($now - $ts) < $window; }
    ));
    
    // Check limit
    if (count($data['requests']) >= $limit) {
        $retry_after = $window - ($now - min($data['requests']));
        header('Retry-After: ' . max(1, $retry_after));
        throw new Exception("Rate limit exceeded. Max $limit requests per {$window}s. Retry in {$retry_after}s.");
    }
    
    // Record this request
    $data['requests'][] = $now;
    @file_put_contents($file, json_encode($data), LOCK_EX);
    
    // Cleanup old files occasionally (1% chance)
    if (mt_rand(1, 100) === 1) {
        local_gradebookapi_cleanup_ratelimit($rate_dir, $window);
    }
}

/**
 * Cleanup stale rate limit files
 */
function local_gradebookapi_cleanup_ratelimit($dir, $max_age = 120) {
    $files = glob($dir . '/*.json');
    $now = time();
    foreach ($files as $f) {
        if (($now - filemtime($f)) > $max_age) {
            @unlink($f);
        }
    }
}

/**
 * Maps Moodle activity module names to human-readable labels.
 *
 * @param string $modulename The module name (e.g., 'hvp', 'quiz', 'assign')
 * @return string Human-readable label
 */
function local_gradebookapi_activity_type_label($modulename) {
    $map = [
        'hvp' => 'H5P',
        'h5pactivity' => 'H5P',
        'lesson' => 'Lesson',
        'assign' => 'Assignment',
        'quiz' => 'Quiz',
        'forum' => 'Forum',
        'workshop' => 'Workshop',
        'glossary' => 'Glossary',
        'data' => 'Database',
        'wiki' => 'Wiki',
        'lti' => 'External Tool',
        'scorm' => 'SCORM',
        'choice' => 'Choice',
        'feedback' => 'Feedback',
        'chat' => 'Chat',
        'survey' => 'Survey',
        'mod' => 'Activity',
        'manual' => 'Manual Grade',
        'category' => 'Category',
    ];

    $key = strtolower((string)$modulename);
    return $map[$key] ?? ucfirst((string)$modulename);
}
