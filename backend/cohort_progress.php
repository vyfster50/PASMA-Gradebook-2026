<?php
// This file is part of Moodle - http://moodle.org/
// GET /cohort_progress.php?cohortid={id}
// Returns bulk progress data: all students × all courses × all grade items.

require_once(__DIR__ . '/../../config.php');
require_once(__DIR__ . '/lib.php');
require_once($CFG->libdir . '/gradelib.php');

local_gradebookapi_cors_headers();

try {
    local_gradebookapi_validate_token();
} catch (Exception $e) {
    local_gradebookapi_error_response($e->getMessage(), 401);
}

$cohortid = required_param('cohortid', PARAM_INT);

try {
    local_gradebookapi_check_rate_limit();

    // Cache check.
    $cache_key = local_gradebookapi_cache_key('cohort_progress', ['cohortid' => $cohortid]);
    $cached_result = local_gradebookapi_cache_get($cache_key, 120);

    if ($cached_result !== false) {
        local_gradebookapi_log_access('cohort_progress', [
            'cohortid' => $cohortid,
            'cached' => true,
        ], true);
        local_gradebookapi_json_response($cached_result);
    }

    // 1) Verify cohort exists.
    $cohort = $DB->get_record('cohort', ['id' => $cohortid], '*', MUST_EXIST);

    // 2) Cohort members.
    $students_sql = "SELECT DISTINCT u.id, u.firstname, u.lastname, u.email
                     FROM {user} u
                     INNER JOIN {cohort_members} cm ON cm.userid = u.id
                     WHERE cm.cohortid = :cohortid
                       AND u.deleted = 0
                       AND u.suspended = 0
                     ORDER BY u.lastname ASC, u.firstname ASC";

    $students_raw = $DB->get_records_sql($students_sql, ['cohortid' => $cohortid]);
    $student_ids = array_keys($students_raw);

    if (empty($student_ids)) {
        $empty_result = [
            'cohortid' => (int)$cohortid,
            'cohortname' => $cohort->name,
            'students' => [],
            'courses' => [],
            'grades' => new stdClass(),
        ];
        local_gradebookapi_cache_set($cache_key, $empty_result);
        local_gradebookapi_log_access('cohort_progress', [
            'cohortid' => $cohortid,
            'student_count' => 0,
            'course_count' => 0,
        ], true);
        local_gradebookapi_json_response($empty_result);
    }

    // 3) Bulk custom profile fields.
    list($in_sql, $in_params) = $DB->get_in_or_equal($student_ids, SQL_PARAMS_NAMED, 'uid');
    $custom_fields_sql = "SELECT d.userid, f.shortname, d.data
                          FROM {user_info_data} d
                          INNER JOIN {user_info_field} f ON f.id = d.fieldid
                          WHERE d.userid $in_sql
                            AND f.shortname IN ('studentid', 'studentnumber')";
    $custom_fields = $DB->get_records_sql($custom_fields_sql, $in_params);

    $custom_data = [];
    foreach ($custom_fields as $cf) {
        if (!isset($custom_data[$cf->userid])) {
            $custom_data[$cf->userid] = [];
        }
        $custom_data[$cf->userid][$cf->shortname] = $cf->data;
    }

    $students_result = [];
    foreach ($students_raw as $s) {
        $students_result[] = [
            'id' => (int)$s->id,
            'firstname' => $s->firstname,
            'lastname' => $s->lastname,
            'email' => $s->email,
            'studentid' => $custom_data[$s->id]['studentid'] ?? '',
            'studentnumber' => $custom_data[$s->id]['studentnumber'] ?? '',
        ];
    }

    // 4) Courses where cohort members are enrolled.
    $courses_sql = "SELECT DISTINCT c.id, c.shortname, c.fullname, c.sortorder
                    FROM {course} c
                    INNER JOIN {enrol} e ON e.courseid = c.id
                    INNER JOIN {user_enrolments} ue ON ue.enrolid = e.id
                    INNER JOIN {cohort_members} cm ON cm.userid = ue.userid
                    WHERE cm.cohortid = :cohortid
                      AND e.status = 0
                      AND c.id != 1
                    ORDER BY c.sortorder ASC, c.fullname ASC";

    $courses_raw = $DB->get_records_sql($courses_sql, ['cohortid' => $cohortid]);
    $course_ids = array_keys($courses_raw);

    if (empty($course_ids)) {
        $empty_courses = [
            'cohortid' => (int)$cohortid,
            'cohortname' => $cohort->name,
            'students' => $students_result,
            'courses' => [],
            'grades' => new stdClass(),
        ];
        local_gradebookapi_cache_set($cache_key, $empty_courses);
        local_gradebookapi_log_access('cohort_progress', [
            'cohortid' => $cohortid,
            'student_count' => count($students_result),
            'course_count' => 0,
        ], true);
        local_gradebookapi_json_response($empty_courses);
    }

    // 5) Grade items (all courses), excluding hidden and non-activity items.
    list($course_in_sql, $course_in_params) = $DB->get_in_or_equal($course_ids, SQL_PARAMS_NAMED, 'cid');
    $items_sql = "SELECT gi.id, gi.courseid, gi.itemname, gi.itemtype, gi.itemmodule,
                         gi.grademax, gi.grademin, gi.gradepass, gi.sortorder,
                         gi.hidden
                  FROM {grade_items} gi
                  WHERE gi.courseid $course_in_sql
                    AND gi.itemtype != 'course'
                    AND gi.itemtype != 'category'
                  ORDER BY gi.courseid ASC, gi.sortorder ASC";
    $items_raw = $DB->get_records_sql($items_sql, $course_in_params);

    $items_by_course = [];
    $all_item_ids = [];
    foreach ($items_raw as $item) {
        if (local_gradebookapi_is_hidden($item, null)) {
            continue;
        }

        $cid = (int)$item->courseid;
        if (!isset($items_by_course[$cid])) {
            $items_by_course[$cid] = [];
        }

        $items_by_course[$cid][] = $item;
        $all_item_ids[] = (int)$item->id;
    }

    // 6) Build course columns with activities.
    $courses_result = [];
    foreach ($courses_raw as $course) {
        $cid = (int)$course->id;
        $activities = [];

        foreach (($items_by_course[$cid] ?? []) as $item) {
            $module = $item->itemmodule ?? $item->itemtype;
            $activities[] = [
                'id' => (int)$item->id,
                'name' => $item->itemname ?? $item->itemtype,
                'type' => $module,
                'typeLabel' => local_gradebookapi_activity_type_label($module),
                'grademax' => (float)$item->grademax,
            ];
        }

        $courses_result[] = [
            'id' => $cid,
            'shortname' => $course->shortname,
            'fullname' => $course->fullname,
            'activities' => $activities,
        ];
    }

    // 7) Bulk grades for all students x all visible items.
    $grades_result = new stdClass();

    if (!empty($all_item_ids) && !empty($student_ids)) {
        list($item_in_sql, $item_in_params) = $DB->get_in_or_equal($all_item_ids, SQL_PARAMS_NAMED, 'iid');
        list($user_in_sql, $user_in_params) = $DB->get_in_or_equal($student_ids, SQL_PARAMS_NAMED, 'uidg');

        // NOTE: First column MUST be unique — get_records_sql() keys results by
        // the first column value. Using gg.id (PK) avoids overwriting rows that
        // share the same itemid across multiple students.
        $grades_sql = "SELECT gg.id, gg.itemid, gg.userid, gg.finalgrade, gg.hidden,
                             gi.courseid, gi.grademax
                      FROM {grade_grades} gg
                      INNER JOIN {grade_items} gi ON gi.id = gg.itemid
                      WHERE gg.itemid $item_in_sql
                        AND gg.userid $user_in_sql";

        $all_params = array_merge($item_in_params, $user_in_params);
        $grades_raw = $DB->get_records_sql($grades_sql, $all_params);

        $grades_map = [];
        foreach ($grades_raw as $g) {
            // Skip per-student hidden grades.
            if (!empty($g->hidden)) {
                continue;
            }

            $uid = (string)$g->userid;
            $cid = (string)$g->courseid;
            $iid = (string)$g->itemid;

            $percentage = null;
            if ($g->grademax > 0 && $g->finalgrade !== null) {
                $percentage = round(($g->finalgrade / $g->grademax) * 100, 1);
            }

            if (!isset($grades_map[$uid])) {
                $grades_map[$uid] = [];
            }
            if (!isset($grades_map[$uid][$cid])) {
                $grades_map[$uid][$cid] = [];
            }

            $grades_map[$uid][$cid][$iid] = [
                'finalgrade' => $g->finalgrade !== null ? (float)$g->finalgrade : null,
                'percentage' => $percentage,
            ];
        }

        $grades_result = !empty($grades_map) ? $grades_map : new stdClass();
    }

    $result = [
        'cohortid' => (int)$cohortid,
        'cohortname' => $cohort->name,
        'students' => $students_result,
        'courses' => $courses_result,
        'grades' => $grades_result,
    ];

    local_gradebookapi_cache_set($cache_key, $result);
    local_gradebookapi_log_access('cohort_progress', [
        'cohortid' => $cohortid,
        'student_count' => count($students_result),
        'course_count' => count($courses_result),
    ], true);

    local_gradebookapi_json_response($result);

} catch (Exception $e) {
    local_gradebookapi_log_access('cohort_progress', [
        'cohortid' => $cohortid,
    ], false, $e->getMessage());
    local_gradebookapi_error_response($e->getMessage(), 500);
}

