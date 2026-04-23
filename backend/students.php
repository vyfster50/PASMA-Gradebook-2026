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

// Get parameters
$courseid = required_param('courseid', PARAM_INT);
$cohortid = required_param('cohortid', PARAM_INT);

try {
    // Check cache first
    $cache_key = local_gradebookapi_cache_key('students', [
        'courseid' => $courseid,
        'cohortid' => $cohortid
    ]);
    $cached_result = local_gradebookapi_cache_get($cache_key);

    if ($cached_result !== false) {
        // Log successful cached access
        local_gradebookapi_log_access('students', [
            'courseid' => $courseid,
            'cohortid' => $cohortid,
            'cached' => true
        ], true);
        local_gradebookapi_json_response($cached_result);
    }

    // Verify course and cohort exist
    $course = $DB->get_record('course', ['id' => $courseid], '*', MUST_EXIST);
    $cohort = $DB->get_record('cohort', ['id' => $cohortid], '*', MUST_EXIST);

    // Get students who are in both the cohort AND enrolled in the course
    $sql = "SELECT DISTINCT u.id, u.firstname, u.lastname, u.email
            FROM {user} u
            INNER JOIN {cohort_members} cm ON cm.userid = u.id
            INNER JOIN {user_enrolments} ue ON ue.userid = u.id
            INNER JOIN {enrol} e ON e.id = ue.enrolid
            WHERE cm.cohortid = :cohortid
            AND e.courseid = :courseid
            AND e.status = 0
            AND u.deleted = 0
            AND u.suspended = 0
            ORDER BY u.lastname ASC, u.firstname ASC";

    $students = $DB->get_records_sql($sql, [
        'cohortid' => $cohortid,
        'courseid' => $courseid
    ]);

    // Fetch custom profile fields (studentid, studentnumber)
    $result = [];
    foreach ($students as $student) {
        // Get custom profile field data
        $studentid_field = $DB->get_record_sql(
            "SELECT d.data
             FROM {user_info_data} d
             INNER JOIN {user_info_field} f ON f.id = d.fieldid
             WHERE d.userid = :userid AND f.shortname = :shortname",
            ['userid' => $student->id, 'shortname' => 'studentid']
        );

        $studentnumber_field = $DB->get_record_sql(
            "SELECT d.data
             FROM {user_info_data} d
             INNER JOIN {user_info_field} f ON f.id = d.fieldid
             WHERE d.userid = :userid AND f.shortname = :shortname",
            ['userid' => $student->id, 'shortname' => 'studentnumber']
        );

        $result[] = [
            'id' => (int)$student->id,
            'firstname' => $student->firstname,
            'lastname' => $student->lastname,
            'email' => $student->email,
            'studentid' => $studentid_field->data ?? '',
            'studentnumber' => $studentnumber_field->data ?? '',
        ];
    }

    // Store in cache
    local_gradebookapi_cache_set($cache_key, $result);

    // Log successful access
    local_gradebookapi_log_access('students', [
        'courseid' => $courseid,
        'cohortid' => $cohortid
    ], true);

    local_gradebookapi_json_response($result);

} catch (Exception $e) {
    // Log failed access
    local_gradebookapi_log_access('students', [
        'courseid' => $courseid,
        'cohortid' => $cohortid
    ], false, $e->getMessage());

    local_gradebookapi_error_response($e->getMessage(), 500);
}
