<?php
// CLI diagnostic for PASMALP — run as: sudo php cli_debug_pasmalp.php
define('CLI_SCRIPT', true);
require('/var/www/html/pasmoodle/config.php');

$courseid = 175; // PASMALP

echo "=== PASMALP DIAGNOSTIC (course $courseid) ===\n\n";

// 1) Confirm course
$course = $DB->get_record('course', ['id' => $courseid]);
echo "Course: {$course->shortname} — {$course->fullname}\n\n";

// 2) Grade items
$items = $DB->get_records_sql(
    "SELECT gi.id, gi.itemname, gi.itemtype, gi.itemmodule,
            gi.grademax, gi.hidden
     FROM {grade_items} gi
     WHERE gi.courseid = :cid
     ORDER BY gi.sortorder",
    ['cid' => $courseid]
);
echo "Grade items (" . count($items) . "):\n";
foreach ($items as $i) {
    // Older Moodle: hidden=0 visible, =1 permanently hidden, >1 = hidden-until unix timestamp
    $hv = (int)$i->hidden;
    $hidden_str = '';
    if ($hv === 1) $hidden_str = ' [HIDDEN]';
    elseif ($hv > 1) $hidden_str = ' [HIDDEN_UNTIL=' . date('Y-m-d H:i', $hv) . ($hv > time() ? ' STILL_HIDDEN' : ' NOW_VISIBLE') . ']';
    echo "  id={$i->id} type={$i->itemtype}/{$i->itemmodule} max={$i->grademax} name=" . ($i->itemname ?? '(course total)') . $hidden_str . "\n";
}
echo "\n";

if (empty($items)) {
    echo "NO GRADE ITEMS — stopping.\n";
    exit;
}

$item_ids = array_keys($items);
list($isql, $iparams) = $DB->get_in_or_equal($item_ids, SQL_PARAMS_NAMED, 'i');

// 3) Count grade_grades rows per item
$counts = $DB->get_records_sql(
    "SELECT gg.itemid,
            COUNT(*) AS total_rows,
            COUNT(gg.finalgrade) AS graded_rows,
            SUM(CASE WHEN gg.hidden != 0 THEN 1 ELSE 0 END) AS hidden_rows
     FROM {grade_grades} gg
     WHERE gg.itemid $isql
     GROUP BY gg.itemid",
    $iparams
);
echo "grade_grades row counts per item:\n";
foreach ($counts as $c) {
    $name = $items[$c->itemid]->itemname ?? '(course total)';
    echo "  itemid={$c->itemid} ($name): total={$c->total_rows} graded={$c->graded_rows} hidden={$c->hidden_rows}\n";
}
echo "\n";

// 4) All graded rows with student names
$grades = $DB->get_records_sql(
    "SELECT gg.id, gg.itemid, gg.userid, gg.finalgrade, gg.hidden,
            gi.grademax, gi.itemname,
            u.firstname, u.lastname, u.username
     FROM {grade_grades} gg
     INNER JOIN {grade_items} gi ON gi.id = gg.itemid
     INNER JOIN {user} u ON u.id = gg.userid
     WHERE gg.itemid $isql
       AND gg.finalgrade IS NOT NULL
     ORDER BY gi.sortorder, u.lastname",
    $iparams
);
echo "Actual graded rows (" . count($grades) . "):\n";
foreach ($grades as $g) {
    $pct = $g->grademax > 0 ? round(($g->finalgrade / $g->grademax) * 100, 1) : 0;
    echo "  gg.id={$g->id} itemid={$g->itemid} ({$g->itemname}) userid={$g->userid} ({$g->lastname},{$g->firstname}) grade={$g->finalgrade}/{$g->grademax} = {$pct}% hidden={$g->hidden}\n";
}
echo "\n";

// 5) Enrolments in PASMALP
$enrolled = $DB->get_records_sql(
    "SELECT DISTINCT u.id, u.firstname, u.lastname, u.username
     FROM {user} u
     INNER JOIN {user_enrolments} ue ON ue.userid = u.id
     INNER JOIN {enrol} e ON e.id = ue.enrolid
     WHERE e.courseid = :cid
       AND e.status = 0
       AND u.deleted = 0
       AND u.suspended = 0
     ORDER BY u.lastname",
    ['cid' => $courseid]
);
echo "Enrolled users (" . count($enrolled) . "):\n";
foreach ($enrolled as $u) {
    echo "  id={$u->id} {$u->lastname},{$u->firstname} ({$u->username})\n";
}
echo "\n";

// 6) Cross-check: which enrolled users have ZERO grade rows
$graded_uids = array_unique(array_column((array)$grades, 'userid'));
echo "Users with grades in DB: " . count($graded_uids) . "\n";
$no_grades = [];
foreach ($enrolled as $u) {
    if (!in_array((int)$u->id, array_map('intval', $graded_uids))) {
        $no_grades[] = "{$u->lastname},{$u->firstname} (id={$u->id})";
    }
}
echo "Enrolled users with NO grade rows in grade_grades: " . count($no_grades) . "\n";
foreach ($no_grades as $n) {
    echo "  $n\n";
}

echo "\n=== DONE ===\n";
