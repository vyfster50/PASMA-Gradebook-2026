<?php
// This file is part of Moodle - http://moodle.org/
// GET /cohort_courses.php?cohortid={id}
// Returns courses where at least one cohort member is enrolled.

require_once(__DIR__ . '/../../config.php');
require_once(__DIR__ . '/lib.php');

local_gradebookapi_cors_headers();

try {
    local_gradebookapi_validate_token();
} catch (Exception $e) {
    local_gradebookapi_error_response($e->getMessage(), 401);
}

$cohortid = required_param('cohortid', PARAM_INT);

try {
    local_gradebookapi_check_rate_limit();

    $cache_key = local_gradebookapi_cache_key('cohort_courses', ['cohortid' => $cohortid]);
    $cached_result = local_gradebookapi_cache_get($cache_key);

    if ($cached_result !== false) {
        local_gradebookapi_log_access('cohort_courses', [
            'cohortid' => $cohortid,
            'cached' => true,
        ], true);
        local_gradebookapi_json_response($cached_result);
    }

    // Verify cohort exists.
    $cohort = $DB->get_record('cohort', ['id' => $cohortid], '*', MUST_EXIST);

    $sql = "SELECT DISTINCT c.id, c.shortname, c.fullname, c.sortorder
            FROM {course} c
            INNER JOIN {enrol} e ON e.courseid = c.id
            INNER JOIN {user_enrolments} ue ON ue.enrolid = e.id
            INNER JOIN {cohort_members} cm ON cm.userid = ue.userid
            WHERE cm.cohortid = :cohortid
              AND e.status = 0
              AND c.id != 1
            ORDER BY c.sortorder ASC, c.fullname ASC";

    $courses = $DB->get_records_sql($sql, ['cohortid' => $cohortid]);

    $result = [];
    foreach ($courses as $course) {
        $result[] = [
            'id' => (int)$course->id,
            'shortname' => $course->shortname,
            'fullname' => $course->fullname,
        ];
    }

    local_gradebookapi_cache_set($cache_key, $result);
    local_gradebookapi_log_access('cohort_courses', ['cohortid' => $cohortid], true);
    local_gradebookapi_json_response($result);

} catch (Exception $e) {
    local_gradebookapi_log_access('cohort_courses', ['cohortid' => $cohortid], false, $e->getMessage());
    local_gradebookapi_error_response($e->getMessage(), 500);
}

