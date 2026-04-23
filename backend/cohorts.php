<?php
// This file is part of Moodle - http://moodle.org/

require_once(__DIR__ . '/../../config.php');
require_once(__DIR__ . '/lib.php');

// Validate authentication
try {
    local_gradebookapi_validate_token();
} catch (Exception $e) {
    local_gradebookapi_error_response($e->getMessage(), 401);
}

// Get course ID parameter
$courseid = required_param('courseid', PARAM_INT);

try {
    // Check cache first
    $cache_key = local_gradebookapi_cache_key('cohorts', ['courseid' => $courseid]);
    $cached_result = local_gradebookapi_cache_get($cache_key);

    if ($cached_result !== false) {
        // Log successful cached access
        local_gradebookapi_log_access('cohorts', ['courseid' => $courseid, 'cached' => true], true);
        local_gradebookapi_json_response($cached_result);
    }

    // Verify course exists
    $course = $DB->get_record('course', ['id' => $courseid], '*', MUST_EXIST);

    // Get all cohorts that have members enrolled in this course
    $sql = "SELECT DISTINCT c.id, c.name, c.description, c.idnumber
            FROM {cohort} c
            INNER JOIN {cohort_members} cm ON cm.cohortid = c.id
            INNER JOIN {user_enrolments} ue ON ue.userid = cm.userid
            INNER JOIN {enrol} e ON e.id = ue.enrolid
            WHERE e.courseid = :courseid
            AND e.status = 0
            ORDER BY c.name ASC";

    $cohorts = $DB->get_records_sql($sql, ['courseid' => $courseid]);

    // Format response
    $result = [];
    foreach ($cohorts as $cohort) {
        $result[] = [
            'id' => (int)$cohort->id,
            'name' => $cohort->name,
            'description' => $cohort->description ?? '',
            'idnumber' => $cohort->idnumber ?? '',
        ];
    }

    // Store in cache
    local_gradebookapi_cache_set($cache_key, $result);

    // Log successful access
    local_gradebookapi_log_access('cohorts', ['courseid' => $courseid], true);

    local_gradebookapi_json_response($result);

} catch (Exception $e) {
    // Log failed access
    local_gradebookapi_log_access('cohorts', ['courseid' => $courseid], false, $e->getMessage());

    local_gradebookapi_error_response($e->getMessage(), 500);
}
