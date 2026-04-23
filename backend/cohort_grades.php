<?php
// This file is part of Moodle - http://moodle.org/
// Bulk endpoint: returns all students' grades for a cohort in one request.

require_once(__DIR__ . '/../../config.php');
require_once(__DIR__ . '/lib.php');
require_once($CFG->libdir . '/gradelib.php');

// Set CORS headers for preflight
local_gradebookapi_cors_headers();

// Validate authentication
try {
    local_gradebookapi_validate_token();
} catch (Exception $e) {
    local_gradebookapi_error_response($e->getMessage(), 401);
}

// Rate limit check
try {
    local_gradebookapi_check_rate_limit();
} catch (Exception $e) {
    local_gradebookapi_error_response($e->getMessage(), 429);
}

// Get parameters
$courseid = required_param('courseid', PARAM_INT);
$cohortid = required_param('cohortid', PARAM_INT);

try {
    // Check cache first
    $cache_key = local_gradebookapi_cache_key('cohort_grades', [
        'courseid' => $courseid,
        'cohortid' => $cohortid
    ]);
    $cached_result = local_gradebookapi_cache_get($cache_key);

    if ($cached_result !== false) {
        local_gradebookapi_log_access('cohort_grades', [
            'courseid' => $courseid,
            'cohortid' => $cohortid,
            'cached' => true
        ], true);
        local_gradebookapi_json_response($cached_result);
    }

    // Verify course and cohort exist
    $course = $DB->get_record('course', ['id' => $courseid], '*', MUST_EXIST);
    $cohort = $DB->get_record('cohort', ['id' => $cohortid], '*', MUST_EXIST);

    // Get all students in cohort enrolled in course (single query)
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

    if (empty($students)) {
        $result = [
            'courseid' => (int)$courseid,
            'coursename' => $course->fullname,
            'cohortid' => (int)$cohortid,
            'cohortname' => $cohort->name,
            'students' => [],
        ];
        local_gradebookapi_cache_set($cache_key, $result);
        local_gradebookapi_log_access('cohort_grades', [
            'courseid' => $courseid,
            'cohortid' => $cohortid
        ], true);
        local_gradebookapi_json_response($result);
    }

    $student_ids = array_keys($students);

    // Batch fetch custom profile fields for all students (2 queries instead of 2*N)
    list($in_sql, $in_params) = $DB->get_in_or_equal($student_ids, SQL_PARAMS_NAMED, 'uid');
    $custom_fields_sql = "SELECT d.userid, f.shortname, d.data
                          FROM {user_info_data} d
                          INNER JOIN {user_info_field} f ON f.id = d.fieldid
                          WHERE d.userid $in_sql
                          AND f.shortname IN ('studentid', 'studentnumber')";
    $custom_fields = $DB->get_records_sql($custom_fields_sql, $in_params);

    // Build custom fields lookup
    $custom_by_user = [];
    foreach ($custom_fields as $cf) {
        if (!isset($custom_by_user[$cf->userid])) {
            $custom_by_user[$cf->userid] = [];
        }
        $custom_by_user[$cf->userid][$cf->shortname] = $cf->data;
    }

    // Batch fetch ALL grade items for the course (1 query)
    $gradeitems = $DB->get_records('grade_items', ['courseid' => $courseid], 'sortorder ASC');

    // Separate course item from activity items
    $course_item = null;
    $activity_items = [];
    foreach ($gradeitems as $gi) {
        if ($gi->itemtype === 'course') {
            $course_item = $gi;
        } else {
            $activity_items[$gi->id] = $gi;
        }
    }

    // Batch fetch ALL grades for all students in this course (1 query instead of N)
    $item_ids = array_keys($gradeitems);
    if (!empty($item_ids)) {
        list($item_in_sql, $item_params) = $DB->get_in_or_equal($item_ids, SQL_PARAMS_NAMED, 'iid');
        list($user_in_sql, $user_params) = $DB->get_in_or_equal($student_ids, SQL_PARAMS_NAMED, 'uid');

        $grades_sql = "SELECT gg.*
                       FROM {grade_grades} gg
                       WHERE gg.itemid $item_in_sql
                       AND gg.userid $user_in_sql";

        $all_grades = $DB->get_records_sql($grades_sql, array_merge($item_params, $user_params));
    } else {
        $all_grades = [];
    }

    // Build grades lookup: [userid][itemid] => grade
    $grades_lookup = [];
    foreach ($all_grades as $g) {
        $grades_lookup[$g->userid][$g->itemid] = $g;
    }

    // Build the response for each student
    $students_result = [];
    foreach ($students as $student) {
        $user_grades = $grades_lookup[$student->id] ?? [];

        // Filter visible grade items and build per-student data
        $items_result = [];
        $grades_result = [];
        foreach ($activity_items as $item) {
            $grade = $user_grades[$item->id] ?? null;

            // Skip hidden items
            if (local_gradebookapi_is_hidden($item, $grade)) {
                continue;
            }

            $items_result[] = [
                'id' => (int)$item->id,
                'itemname' => $item->itemname,
                'itemtype' => $item->itemtype,
                'itemmodule' => $item->itemmodule ?? '',
                'grademax' => (float)$item->grademax,
                'grademin' => (float)$item->grademin,
                'gradepass' => isset($item->gradepass) ? (float)$item->gradepass : null,
            ];

            if ($grade) {
                $percentage = null;
                if ($item->grademax > 0 && $grade->finalgrade !== null) {
                    $percentage = round(($grade->finalgrade / $item->grademax) * 100, 2);
                }
                $grades_result[] = [
                    'itemid' => (int)$item->id,
                    'userid' => (int)$student->id,
                    'finalgrade' => $grade->finalgrade !== null ? (float)$grade->finalgrade : null,
                    'rawgrade' => $grade->rawgrade !== null ? (float)$grade->rawgrade : null,
                    'percentageformatted' => $percentage !== null ? $percentage . '%' : null,
                    'feedback' => $grade->feedback ?? '',
                ];
            }
        }

        // Course total
        $course_total = null;
        if ($course_item) {
            $course_grade = $user_grades[$course_item->id] ?? null;
            if ($course_grade && !local_gradebookapi_is_hidden($course_item, $course_grade)) {
                $pct = null;
                if ($course_item->grademax > 0 && $course_grade->finalgrade !== null) {
                    $pct = round(($course_grade->finalgrade / $course_item->grademax) * 100, 2);
                }
                $course_total = [
                    'finalgrade' => $course_grade->finalgrade !== null ? (float)$course_grade->finalgrade : null,
                    'grademax' => (float)$course_item->grademax,
                    'gradepass' => isset($course_item->gradepass) ? (float)$course_item->gradepass : null,
                    'percentageformatted' => $pct !== null ? $pct . '%' : null,
                ];
            }
        }

        $students_result[] = [
            'student' => [
                'id' => (int)$student->id,
                'firstname' => $student->firstname,
                'lastname' => $student->lastname,
                'email' => $student->email,
                'studentid' => $custom_by_user[$student->id]['studentid'] ?? '',
                'studentnumber' => $custom_by_user[$student->id]['studentnumber'] ?? '',
            ],
            'items' => $items_result,
            'grades' => $grades_result,
            'coursetotal' => $course_total,
        ];
    }

    $result = [
        'courseid' => (int)$courseid,
        'coursename' => $course->fullname,
        'cohortid' => (int)$cohortid,
        'cohortname' => $cohort->name,
        'students' => $students_result,
    ];

    // Cache for 5 minutes
    local_gradebookapi_cache_set($cache_key, $result);

    local_gradebookapi_log_access('cohort_grades', [
        'courseid' => $courseid,
        'cohortid' => $cohortid,
        'student_count' => count($students_result)
    ], true);

    local_gradebookapi_json_response($result);

} catch (Exception $e) {
    local_gradebookapi_log_access('cohort_grades', [
        'courseid' => $courseid,
        'cohortid' => $cohortid
    ], false, $e->getMessage());

    local_gradebookapi_error_response($e->getMessage(), 500);
}
