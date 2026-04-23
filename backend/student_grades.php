<?php
// This file is part of Moodle - http://moodle.org/

require_once(__DIR__ . '/../../config.php');
require_once(__DIR__ . '/lib.php');
require_once($CFG->libdir . '/gradelib.php');
require_once($CFG->dirroot . '/grade/querylib.php');

// Validate authentication
try {
    local_gradebookapi_validate_token();
} catch (Exception $e) {
    local_gradebookapi_error_response($e->getMessage(), 401);
}

// Get parameters
$courseid = required_param('courseid', PARAM_INT);
$userid = required_param('userid', PARAM_INT);

try {
    // Check cache first
    $cache_key = local_gradebookapi_cache_key('student_grades', [
        'courseid' => $courseid,
        'userid' => $userid
    ]);
    $cached_result = local_gradebookapi_cache_get($cache_key);

    if ($cached_result !== false) {
        // Log successful cached access
        local_gradebookapi_log_access('student_grades', [
            'courseid' => $courseid,
            'userid' => $userid,
            'cached' => true
        ], true);
        local_gradebookapi_json_response($cached_result);
    }

    // Verify course and user exist
    $course = $DB->get_record('course', ['id' => $courseid], '*', MUST_EXIST);
    $user = $DB->get_record('user', ['id' => $userid], '*', MUST_EXIST);

    // Get grade items for the course
    $sql = "SELECT gi.*
            FROM {grade_items} gi
            WHERE gi.courseid = :courseid
            AND gi.itemtype != 'course'
            ORDER BY gi.sortorder ASC";

    $gradeitems = $DB->get_records_sql($sql, ['courseid' => $courseid]);

    // Get grades for the user
    $grades_sql = "SELECT gg.*
                   FROM {grade_grades} gg
                   WHERE gg.userid = :userid
                   AND gg.itemid IN (
                       SELECT id FROM {grade_items}
                       WHERE courseid = :courseid
                   )";

    $grades = $DB->get_records_sql($grades_sql, [
        'userid' => $userid,
        'courseid' => $courseid
    ]);

    // Build grades lookup by itemid
    $grades_by_item = [];
    foreach ($grades as $grade) {
        $grades_by_item[$grade->itemid] = $grade;
    }

    // Filter out hidden items and build response
    $items_result = [];
    $grades_result = [];

    foreach ($gradeitems as $item) {
        $grade = $grades_by_item[$item->id] ?? null;

        // Skip if hidden from student
        if (local_gradebookapi_is_hidden($item, $grade)) {
            continue;
        }

        // Add grade item
        $items_result[] = [
            'id' => (int)$item->id,
            'itemname' => $item->itemname,
            'itemtype' => $item->itemtype,
            'itemmodule' => $item->itemmodule ?? '',
            'grademax' => (float)$item->grademax,
            'grademin' => (float)$item->grademin,
            'gradepass' => isset($item->gradepass) ? (float)$item->gradepass : null,
        ];

        // Add grade if exists
        if ($grade) {
            $percentage = null;
            if ($item->grademax > 0 && $grade->finalgrade !== null) {
                $percentage = round(($grade->finalgrade / $item->grademax) * 100, 2);
            }

            $grades_result[] = [
                'itemid' => (int)$item->id,
                'userid' => (int)$userid,
                'finalgrade' => $grade->finalgrade !== null ? (float)$grade->finalgrade : null,
                'rawgrade' => $grade->rawgrade !== null ? (float)$grade->rawgrade : null,
                'percentageformatted' => $percentage !== null ? $percentage . '%' : null,
                'feedback' => $grade->feedback ?? '',
                'timecreated' => (int)$grade->timecreated,
                'timemodified' => (int)$grade->timemodified,
            ];
        }
    }

    // Get course total
    $course_item = $DB->get_record('grade_items', [
        'courseid' => $courseid,
        'itemtype' => 'course'
    ]);

    $course_total = null;
    if ($course_item) {
        $course_grade = $DB->get_record('grade_grades', [
            'itemid' => $course_item->id,
            'userid' => $userid
        ]);

        if ($course_grade && !local_gradebookapi_is_hidden($course_item, $course_grade)) {
            $percentage = null;
            if ($course_item->grademax > 0 && $course_grade->finalgrade !== null) {
                $percentage = round(($course_grade->finalgrade / $course_item->grademax) * 100, 2);
            }

            $course_total = [
                'finalgrade' => $course_grade->finalgrade !== null ? (float)$course_grade->finalgrade : null,
                'grademax' => (float)$course_item->grademax,
                'percentageformatted' => $percentage !== null ? $percentage . '%' : null,
            ];
        }
    }

    // Build final response
    $result = [
        'student' => [
            'id' => (int)$user->id,
            'firstname' => $user->firstname,
            'lastname' => $user->lastname,
            'email' => $user->email,
        ],
        'courseid' => (int)$courseid,
        'coursename' => $course->fullname,
        'items' => $items_result,
        'grades' => $grades_result,
        'coursetotal' => $course_total,
    ];

    // Store in cache
    local_gradebookapi_cache_set($cache_key, $result);

    // Log successful access
    local_gradebookapi_log_access('student_grades', [
        'courseid' => $courseid,
        'userid' => $userid
    ], true);

    local_gradebookapi_json_response($result);

} catch (Exception $e) {
    // Log failed access
    local_gradebookapi_log_access('student_grades', [
        'courseid' => $courseid,
        'userid' => $userid
    ], false, $e->getMessage());

    local_gradebookapi_error_response($e->getMessage(), 500);
}
