<?php
// This file is part of Moodle - http://moodle.org/
// GET /all_cohorts.php
// Returns all cohorts that have at least one enrolled member in any course.

require_once(__DIR__ . '/../../config.php');
require_once(__DIR__ . '/lib.php');

local_gradebookapi_cors_headers();

// Validate authentication.
try {
    local_gradebookapi_validate_token();
} catch (Exception $e) {
    local_gradebookapi_error_response($e->getMessage(), 401);
}

try {
    local_gradebookapi_check_rate_limit();

    $cache_key = local_gradebookapi_cache_key('all_cohorts', []);
    $cached_result = local_gradebookapi_cache_get($cache_key);

    if ($cached_result !== false) {
        local_gradebookapi_log_access('all_cohorts', ['cached' => true], true);
        local_gradebookapi_json_response($cached_result);
    }

    $sql = "SELECT DISTINCT c.id, c.name, c.description, c.idnumber,
                   COUNT(DISTINCT cm.userid) AS membercount
            FROM {cohort} c
            INNER JOIN {cohort_members} cm ON cm.cohortid = c.id
            INNER JOIN {user_enrolments} ue ON ue.userid = cm.userid
            INNER JOIN {enrol} e ON e.id = ue.enrolid
            WHERE e.status = 0
            GROUP BY c.id, c.name, c.description, c.idnumber
            ORDER BY c.name ASC";

    $cohorts = $DB->get_records_sql($sql);

    $result = [];
    foreach ($cohorts as $cohort) {
        $result[] = [
            'id' => (int)$cohort->id,
            'name' => $cohort->name,
            'description' => $cohort->description ?? '',
            'idnumber' => $cohort->idnumber ?? '',
            'membercount' => (int)$cohort->membercount,
        ];
    }

    local_gradebookapi_cache_set($cache_key, $result);
    local_gradebookapi_log_access('all_cohorts', [], true);
    local_gradebookapi_json_response($result);

} catch (Exception $e) {
    local_gradebookapi_log_access('all_cohorts', [], false, $e->getMessage());
    local_gradebookapi_error_response($e->getMessage(), 500);
}

