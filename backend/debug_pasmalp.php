<?php
// ============================================================
// DIAGNOSTIC: PASMALP grade data in DB
// GET /debug_pasmalp.php  (no auth — remove after use)
// ============================================================
require_once(__DIR__ . '/../../config.php');

header('Content-Type: application/json');

$out = [];

// 1) Find PASMALP course(s) by shortname
$courses = $DB->get_records_sql(
    "SELECT id, shortname, fullname FROM {course} WHERE shortname LIKE :sn ORDER BY id",
    ['sn' => '%PASMALP%']
);
$out['courses_found'] = array_values(array_map(function($c){
    return ['id'=>(int)$c->id, 'shortname'=>$c->shortname, 'fullname'=>$c->fullname];
}, $courses));

if (empty($courses)) {
    $out['error'] = 'No course with shortname LIKE PASMALP found';
    echo json_encode($out, JSON_PRETTY_PRINT);
    exit;
}

$course_ids = array_keys($courses);
list($cid_sql, $cid_params) = $DB->get_in_or_equal($course_ids, SQL_PARAMS_NAMED, 'c');

// 2) Grade items for PASMALP
$items = $DB->get_records_sql(
    "SELECT gi.id, gi.courseid, gi.itemname, gi.itemtype, gi.itemmodule,
            gi.grademax, gi.hidden, gi.hiddenuntil
     FROM {grade_items} gi
     WHERE gi.courseid $cid_sql
     ORDER BY gi.courseid, gi.sortorder",
    $cid_params
);
$out['grade_items'] = array_values(array_map(function($i){
    return [
        'id'          => (int)$i->id,
        'courseid'    => (int)$i->courseid,
        'itemname'    => $i->itemname,
        'itemtype'    => $i->itemtype,
        'itemmodule'  => $i->itemmodule,
        'grademax'    => (float)$i->grademax,
        'hidden'      => (int)$i->hidden,
        'hiddenuntil' => (int)$i->hiddenuntil,
        'hidden_now'  => (!empty($i->hidden) || (!empty($i->hiddenuntil) && $i->hiddenuntil > time())),
    ];
}, $items));

$item_ids = array_keys($items);

if (empty($item_ids)) {
    $out['error'] = 'No grade_items found for PASMALP course(s)';
    echo json_encode($out, JSON_PRETTY_PRINT);
    exit;
}

list($iid_sql, $iid_params) = $DB->get_in_or_equal($item_ids, SQL_PARAMS_NAMED, 'i');

// 3) Count raw grade_grades rows per item (before any hidden filter)
$raw_counts = $DB->get_records_sql(
    "SELECT gg.itemid,
            COUNT(*) AS total_rows,
            COUNT(gg.finalgrade) AS rows_with_grade,
            SUM(CASE WHEN gg.finalgrade IS NULL THEN 1 ELSE 0 END) AS null_grade_rows,
            SUM(CASE WHEN gg.hidden != 0 THEN 1 ELSE 0 END) AS hidden_rows
     FROM {grade_grades} gg
     WHERE gg.itemid $iid_sql
     GROUP BY gg.itemid",
    $iid_params
);
$out['grade_grades_summary_per_item'] = array_values(array_map(function($r){
    return [
        'itemid'          => (int)$r->itemid,
        'total_rows'      => (int)$r->total_rows,
        'rows_with_grade' => (int)$r->rows_with_grade,
        'null_grade_rows' => (int)$r->null_grade_rows,
        'hidden_rows'     => (int)$r->hidden_rows,
    ];
}, $raw_counts));

// 4) All actual grade rows with student info
$grades = $DB->get_records_sql(
    "SELECT gg.id, gg.itemid, gg.userid, gg.finalgrade, gg.hidden,
            gi.grademax, gi.itemname,
            u.username, u.firstname, u.lastname
     FROM {grade_grades} gg
     INNER JOIN {grade_items} gi ON gi.id = gg.itemid
     INNER JOIN {user} u ON u.id = gg.userid
     WHERE gg.itemid $iid_sql
       AND gg.finalgrade IS NOT NULL
     ORDER BY gg.itemid, u.lastname, u.firstname",
    $iid_params
);
$out['actual_grade_rows'] = array_values(array_map(function($g){
    return [
        'gg_id'      => (int)$g->id,
        'itemid'     => (int)$g->itemid,
        'itemname'   => $g->itemname,
        'userid'     => (int)$g->userid,
        'username'   => $g->username,
        'name'       => $g->firstname . ' ' . $g->lastname,
        'finalgrade' => (float)$g->finalgrade,
        'grademax'   => (float)$g->grademax,
        'pct'        => $g->grademax > 0 ? round(($g->finalgrade/$g->grademax)*100,1) : null,
        'gg_hidden'  => (int)$g->hidden,
    ];
}, $grades));
$out['actual_grade_rows_count'] = count($out['actual_grade_rows']);

// 5) Enrollments check — how many cohort members are enrolled in PASMALP
$enrolments = $DB->get_records_sql(
    "SELECT DISTINCT u.id, u.firstname, u.lastname, u.username
     FROM {user} u
     INNER JOIN {user_enrolments} ue ON ue.userid = u.id
     INNER JOIN {enrol} e ON e.id = ue.enrolid
     WHERE e.courseid $cid_sql
       AND e.status = 0
       AND u.deleted = 0
       AND u.suspended = 0
     ORDER BY u.lastname",
    $cid_params
);
$out['enrolled_users'] = array_values(array_map(function($u){
    return ['id'=>(int)$u->id,'name'=>$u->firstname.' '.$u->lastname,'username'=>$u->username];
}, $enrolments));
$out['enrolled_count'] = count($out['enrolled_users']);

// 6) Cross-check: enrolled users who have ZERO grade rows in grade_grades for PASMALP items
$enrolled_ids = array_keys($enrolments);
$graded_user_ids = array_unique(array_column($out['actual_grade_rows'], 'userid'));
$ungraded_ids = array_diff($enrolled_ids, $graded_user_ids);

$out['enrolled_with_no_grades_in_db'] = count($ungraded_ids);
if (!empty($ungraded_ids)) {
    $out['ungraded_users'] = array_values(array_map(function($uid) use ($enrolments){
        $u = $enrolments[$uid];
        return ['id'=>(int)$uid, 'name'=>$u->firstname.' '.$u->lastname];
    }, $ungraded_ids));
}

echo json_encode($out, JSON_PRETTY_PRINT);
