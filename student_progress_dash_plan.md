# Student Progress Dashboard — Full Implementation Plan

> **Project:** PASMA Gradebook 2026  
> **Goal:** Multi-course cohort matrix dashboard showing all students × all courses × all grades  
> **Base UI:** Refactored from `student_progress_dashboard_modern (1).jsx`  
> **Backend:** Extended from existing Moodle local plugin (`local_gradebookapi`)  
> **Date:** 2026-04-22

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Sprint 1 — Backend Endpoints](#2-sprint-1--backend-endpoints-day-1-2)
3. [Sprint 2 — Frontend Setup & Types](#3-sprint-2--frontend-setup--types-day-2-3)
4. [Sprint 3 — Dashboard Components](#4-sprint-3--dashboard-components-day-3-5)
5. [Sprint 4 — Integration & Polish](#5-sprint-4--integration--polish-day-5-6)
6. [Sprint 5 — Deploy & Test](#6-sprint-5--deploy--test-day-6-7)
7. [Data Flow Diagrams](#7-data-flow-diagrams)
8. [File Manifest](#8-file-manifest)

---

## 1. Architecture Overview

### Layout Concept

```
┌─────────────────────────────────────────────────────────────────────────┐
│  [Cohort ▼]   [🔍 Search student...]   [Export CSV]   [☀/🌙 Theme]   │
├─────────────────────────────────────────────────────────────────────────┤
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐              │
│  │Overall   │  │Top       │  │Watchlist  │  │At Risk   │              │
│  │Avg: 68%  │  │Perf: 4   │  │Count: 5   │  │Count: 3  │              │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘              │
├─────────────────────────────────────────────────────────────────────────┤
│                    │  FL Studio 101          │  EQ & Filters 101   │   │
│  Student           │  H5P 1 │ Quiz 1 │ Asgn │  H5P 1 │ Quiz 1    │Avg│
│────────────────────┼────────┼────────┼──────┼────────┼───────────┼───│
│  👤 Kabelo Fihla   │  [88]  │  [76]  │ [65] │  [82]  │   [91]    │78%│
│  👤 Vuyelwa Kalo   │  [45]  │  [52]  │ [49] │  [60]  │   [67]    │55%│
│  👤 Joshua Roesch  │  [93]  │  [85]  │ [78] │  [90]  │   [94]    │88%│
│  ...               │  ...   │  ...   │ ...  │  ...   │   ...     │...│
└─────────────────────────────────────────────────────────────────────────┘
│  ● Below 50   ● 50–59   ● 60–74   ● 75–100     Total: 28 / 30       │
└─────────────────────────────────────────────────────────────────────────┘
```

### What We Reuse

| Component | Source | How |
|-----------|--------|-----|
| Auth middleware | `backend/lib.php` | Unchanged |
| Cache + logging | `backend/lib.php` | Unchanged |
| Hidden-grade logic | `backend/lib.php` → `local_gradebookapi_is_hidden()` | Unchanged |
| Score color coding | `student_progress_dashboard_modern (1).jsx` → `getScoreStyle()` | Copy as-is |
| Score dot colors | `student_progress_dashboard_modern (1).jsx` → `getScoreDot()` | Copy as-is |
| Initials helper | `student_progress_dashboard_modern (1).jsx` → `getInitials()` | Copy as-is |
| CSV export pattern | `student_progress_dashboard_modern (1).jsx` → `exportCSV()` | Adapt for dynamic columns |
| Theme system | `student_progress_dashboard_modern (1).jsx` → theme classes | Copy all class maps |
| Sticky header table | `student_progress_dashboard_modern (1).jsx` → table structure | Adapt for dynamic columns |
| Vite proxy | `frontend/vite.config.ts` | Unchanged |
| API service pattern | `frontend/src/services/api.ts` | Extend with new methods |

### What We Build New

| Component | Description |
|-----------|-------------|
| `backend/all_cohorts.php` | List all cohorts (no course filter) |
| `backend/cohort_courses.php` | List all courses a cohort is enrolled in |
| `backend/cohort_progress.php` | Bulk endpoint: students × courses × grades |
| `frontend/src/components/ProgressDashboard.tsx` | Main dashboard page |
| `frontend/src/components/CohortDropdown.tsx` | Simple cohort selector |
| `frontend/src/components/ProgressMatrix.tsx` | The big matrix table |
| `frontend/src/components/StatsCards.tsx` | 4 summary stat cards |
| `frontend/src/components/DashboardHeader.tsx` | Header bar with controls |
| `frontend/src/lib/utils.ts` | Shared utility functions |
| shadcn/ui primitives | Card, Button, Input, Badge, Progress |

---

## 2. Sprint 1 — Backend Endpoints (Day 1-2)

### 2.1 Create `backend/all_cohorts.php`

Returns all cohorts in the system (simple dropdown population).

```php
<?php
// backend/all_cohorts.php
// GET /all_cohorts.php
// Returns all cohorts that have at least one enrolled member in any course.

require_once(__DIR__ . '/../../config.php');
require_once(__DIR__ . '/lib.php');

// CORS + rate limit
local_gradebookapi_cors_headers();

// Validate authentication
try {
    local_gradebookapi_validate_token();
} catch (Exception $e) {
    local_gradebookapi_error_response($e->getMessage(), 401);
}

try {
    local_gradebookapi_check_rate_limit();

    // Check cache first
    $cache_key = local_gradebookapi_cache_key('all_cohorts', []);
    $cached_result = local_gradebookapi_cache_get($cache_key);

    if ($cached_result !== false) {
        local_gradebookapi_log_access('all_cohorts', ['cached' => true], true);
        local_gradebookapi_json_response($cached_result);
    }

    // Get all cohorts that have members enrolled in at least one course
    $sql = "SELECT DISTINCT c.id, c.name, c.description, c.idnumber,
                   COUNT(DISTINCT cm.userid) as membercount
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
            'id'          => (int)$cohort->id,
            'name'        => $cohort->name,
            'description' => $cohort->description ?? '',
            'idnumber'    => $cohort->idnumber ?? '',
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
```

### 2.2 Create `backend/cohort_courses.php`

Returns all courses that a cohort's members are enrolled in.

```php
<?php
// backend/cohort_courses.php
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
            'cohortid' => $cohortid, 'cached' => true
        ], true);
        local_gradebookapi_json_response($cached_result);
    }

    // Verify cohort exists
    $cohort = $DB->get_record('cohort', ['id' => $cohortid], '*', MUST_EXIST);

    // Get all courses where at least one cohort member is enrolled
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
            'id'        => (int)$course->id,
            'shortname' => $course->shortname,
            'fullname'  => $course->fullname,
        ];
    }

    local_gradebookapi_cache_set($cache_key, $result);
    local_gradebookapi_log_access('cohort_courses', ['cohortid' => $cohortid], true);
    local_gradebookapi_json_response($result);

} catch (Exception $e) {
    local_gradebookapi_log_access('cohort_courses', ['cohortid' => $cohortid], false, $e->getMessage());
    local_gradebookapi_error_response($e->getMessage(), 500);
}
```

### 2.3 Create `backend/cohort_progress.php` ⭐ (Critical Endpoint)

This is the bulk data endpoint that powers the entire matrix. One call returns everything.

```php
<?php
// backend/cohort_progress.php
// GET /cohort_progress.php?cohortid={id}
// Returns bulk progress data: all students × all courses × all grade items.
// 
// Response shape:
// {
//   cohortid, cohortname,
//   students: [{id, firstname, lastname, studentid, studentnumber}, ...],
//   courses: [{id, shortname, fullname, activities: [{id, name, type, typeLabel, grademax}]}],
//   grades: { [userid]: { [courseid]: { [itemid]: {finalgrade, percentage} } } }
// }

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

    // Check cache
    $cache_key = local_gradebookapi_cache_key('cohort_progress', ['cohortid' => $cohortid]);
    $cached_result = local_gradebookapi_cache_get($cache_key);

    if ($cached_result !== false) {
        local_gradebookapi_log_access('cohort_progress', [
            'cohortid' => $cohortid, 'cached' => true
        ], true);
        local_gradebookapi_json_response($cached_result);
    }

    // 1. Verify cohort exists
    $cohort = $DB->get_record('cohort', ['id' => $cohortid], '*', MUST_EXIST);

    // 2. Get all cohort members who are enrolled in at least one course
    $students_sql = "
        SELECT DISTINCT u.id, u.firstname, u.lastname, u.email
        FROM {user} u
        INNER JOIN {cohort_members} cm ON cm.userid = u.id
        WHERE cm.cohortid = :cohortid
          AND u.deleted = 0
          AND u.suspended = 0
        ORDER BY u.lastname ASC, u.firstname ASC";

    $students_raw = $DB->get_records_sql($students_sql, ['cohortid' => $cohortid]);
    $student_ids = array_keys($students_raw);

    if (empty($student_ids)) {
        local_gradebookapi_json_response([
            'cohortid'   => (int)$cohortid,
            'cohortname' => $cohort->name,
            'students'   => [],
            'courses'    => [],
            'grades'     => new \stdClass(),
        ]);
    }

    // 3. Fetch custom profile fields in bulk (studentid, studentnumber)
    list($in_sql, $in_params) = $DB->get_in_or_equal($student_ids, SQL_PARAMS_NAMED, 'uid');
    $custom_fields_sql = "
        SELECT d.userid, f.shortname, d.data
        FROM {user_info_data} d
        INNER JOIN {user_info_field} f ON f.id = d.fieldid
        WHERE d.userid $in_sql
          AND f.shortname IN ('studentid', 'studentnumber')";

    $custom_fields = $DB->get_records_sql($custom_fields_sql, $in_params);

    // Build lookup: custom_data[userid][shortname] = value
    $custom_data = [];
    foreach ($custom_fields as $cf) {
        $custom_data[$cf->userid][$cf->shortname] = $cf->data;
    }

    // Build students array
    $students_result = [];
    foreach ($students_raw as $s) {
        $students_result[] = [
            'id'            => (int)$s->id,
            'firstname'     => $s->firstname,
            'lastname'      => $s->lastname,
            'email'         => $s->email,
            'studentid'     => $custom_data[$s->id]['studentid'] ?? '',
            'studentnumber' => $custom_data[$s->id]['studentnumber'] ?? '',
        ];
    }

    // 4. Get all courses the cohort is enrolled in
    $courses_sql = "
        SELECT DISTINCT c.id, c.shortname, c.fullname, c.sortorder
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
        local_gradebookapi_json_response([
            'cohortid'   => (int)$cohortid,
            'cohortname' => $cohort->name,
            'students'   => $students_result,
            'courses'    => [],
            'grades'     => new \stdClass(),
        ]);
    }

    // 5. Get ALL grade items for ALL courses (excluding course totals)
    list($course_in_sql, $course_in_params) = $DB->get_in_or_equal($course_ids, SQL_PARAMS_NAMED, 'cid');
    $items_sql = "
        SELECT gi.id, gi.courseid, gi.itemname, gi.itemtype, gi.itemmodule,
               gi.grademax, gi.grademin, gi.gradepass, gi.sortorder,
               gi.hidden, gi.hiddenuntil
        FROM {grade_items} gi
        WHERE gi.courseid $course_in_sql
          AND gi.itemtype != 'course'
          AND gi.itemtype != 'category'
        ORDER BY gi.courseid ASC, gi.sortorder ASC";

    $items_raw = $DB->get_records_sql($items_sql, $course_in_params);

    // Filter out hidden items and build per-course activity lists
    $items_by_course = [];  // courseid => [item, item, ...]
    $all_item_ids = [];

    foreach ($items_raw as $item) {
        // Skip globally hidden items
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

    // 6. Build courses result with activities
    $courses_result = [];
    foreach ($courses_raw as $course) {
        $cid = (int)$course->id;
        $activities = [];

        foreach (($items_by_course[$cid] ?? []) as $item) {
            $activities[] = [
                'id'        => (int)$item->id,
                'name'      => $item->itemname ?? $item->itemtype,
                'type'      => $item->itemmodule ?? $item->itemtype,
                'typeLabel' => local_gradebookapi_activity_type_label($item->itemmodule ?? $item->itemtype),
                'grademax'  => (float)$item->grademax,
            ];
        }

        $courses_result[] = [
            'id'         => $cid,
            'shortname'  => $course->shortname,
            'fullname'   => $course->fullname,
            'activities' => $activities,
        ];
    }

    // 7. Bulk-fetch ALL grades for ALL students × ALL items
    $grades_result = new \stdClass(); // Will be JSON object: {userid: {courseid: {itemid: {...}}}}

    if (!empty($all_item_ids) && !empty($student_ids)) {
        list($item_in_sql, $item_in_params) = $DB->get_in_or_equal($all_item_ids, SQL_PARAMS_NAMED, 'iid');
        list($user_in_sql, $user_in_params) = $DB->get_in_or_equal($student_ids, SQL_PARAMS_NAMED, 'uid');

        $grades_sql = "
            SELECT gg.id, gg.itemid, gg.userid, gg.finalgrade, gg.rawgrade,
                   gg.feedback, gg.hidden,
                   gi.courseid, gi.grademax
            FROM {grade_grades} gg
            INNER JOIN {grade_items} gi ON gi.id = gg.itemid
            WHERE gg.itemid $item_in_sql
              AND gg.userid $user_in_sql";

        $all_params = array_merge($item_in_params, $user_in_params);
        $grades_raw = $DB->get_records_sql($grades_sql, $all_params);

        // Build nested lookup: grades[userid][courseid][itemid]
        $grades_map = [];
        foreach ($grades_raw as $g) {
            $uid = (string)$g->userid;
            $cid = (string)$g->courseid;
            $iid = (string)$g->itemid;

            // Skip per-student hidden grades
            if (!empty($g->hidden)) {
                continue;
            }

            $percentage = null;
            if ($g->grademax > 0 && $g->finalgrade !== null) {
                $percentage = round(($g->finalgrade / $g->grademax) * 100, 1);
            }

            if (!isset($grades_map[$uid])) $grades_map[$uid] = [];
            if (!isset($grades_map[$uid][$cid])) $grades_map[$uid][$cid] = [];

            $grades_map[$uid][$cid][$iid] = [
                'finalgrade' => $g->finalgrade !== null ? (float)$g->finalgrade : null,
                'percentage' => $percentage,
            ];
        }

        $grades_result = !empty($grades_map) ? $grades_map : new \stdClass();
    }

    // 8. Build final response
    $result = [
        'cohortid'   => (int)$cohortid,
        'cohortname' => $cohort->name,
        'students'   => $students_result,
        'courses'    => $courses_result,
        'grades'     => $grades_result,
    ];

    // Store in cache (shorter TTL for bulk data — 120s)
    local_gradebookapi_cache_set($cache_key, $result);

    local_gradebookapi_log_access('cohort_progress', [
        'cohortid'      => $cohortid,
        'student_count' => count($students_result),
        'course_count'  => count($courses_result),
    ], true);

    local_gradebookapi_json_response($result);

} catch (Exception $e) {
    local_gradebookapi_log_access('cohort_progress', [
        'cohortid' => $cohortid
    ], false, $e->getMessage());

    local_gradebookapi_error_response($e->getMessage(), 500);
}
```

### 2.4 Add activity-type label helper to `backend/lib.php`

Append this function to the existing `lib.php`:

```php
/**
 * Maps Moodle activity module names to human-readable labels.
 *
 * @param string $modulename The module name (e.g., 'hvp', 'quiz', 'assign')
 * @return string Human-readable label
 */
function local_gradebookapi_activity_type_label($modulename) {
    $map = [
        'hvp'           => 'H5P',
        'h5pactivity'   => 'H5P',
        'lesson'        => 'Lesson',
        'assign'        => 'Assignment',
        'quiz'          => 'Quiz',
        'forum'         => 'Forum',
        'workshop'      => 'Workshop',
        'glossary'      => 'Glossary',
        'data'          => 'Database',
        'wiki'          => 'Wiki',
        'lti'           => 'External Tool',
        'scorm'         => 'SCORM',
        'choice'        => 'Choice',
        'feedback'      => 'Feedback',
        'chat'          => 'Chat',
        'survey'        => 'Survey',
        'mod'           => 'Activity',
        'manual'        => 'Manual Grade',
        'category'      => 'Category',
    ];

    return $map[strtolower($modulename)] ?? ucfirst($modulename);
}
```

### 2.5 Deploy to Moodle server

```bash
# From project root — deploy all backend files via SCP
scp -r "PASMA Gradebook 2026/backend/"* \
  hd@192.168.1.9:/var/www/html/pasmoodle/local/gradebookapi/

# Verify deployment
ssh hd@192.168.1.9 "ls -la /var/www/html/pasmoodle/local/gradebookapi/*.php"
```

### 2.6 Test endpoints with curl

```bash
TOKEN="pasma-gradebook-2026-secret-token"
BASE="http://192.168.1.9/pasmoodle/local/gradebookapi"

# Test all_cohorts
curl -s -H "Authorization: Bearer $TOKEN" "$BASE/all_cohorts.php" | python3 -m json.tool

# Test cohort_courses (replace 7 with actual cohort ID)
curl -s -H "Authorization: Bearer $TOKEN" "$BASE/cohort_courses.php?cohortid=7" | python3 -m json.tool

# Test cohort_progress (the big one)
curl -s -H "Authorization: Bearer $TOKEN" "$BASE/cohort_progress.php?cohortid=7" | python3 -m json.tool
```

---

## 3. Sprint 2 — Frontend Setup & Types (Day 2-3)

### 3.1 Install Tailwind CSS + shadcn/ui dependencies

```bash
cd "PASMA Gradebook 2026/frontend"

# Install Tailwind CSS
npm install -D tailwindcss @tailwindcss/vite

# Install shadcn/ui dependencies (we'll create minimal primitives manually)
npm install class-variance-authority clsx tailwind-merge
npm install lucide-react

# Install @radix-ui primitives used by shadcn
npm install @radix-ui/react-slot
```

### 3.2 Create `frontend/tailwind.config.js`

```js
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {},
  },
  plugins: [],
}
```

### 3.3 Create `frontend/postcss.config.js`

```js
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}
```

### 3.4 Add Tailwind directives to CSS

Create `frontend/src/index.css`:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

Update `frontend/src/main.tsx` to import it:

```tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';  // <-- Add this line

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
```

### 3.5 Create `frontend/src/lib/utils.ts`

Utility functions extracted from the modern dashboard JSX:

```ts
// frontend/src/lib/utils.ts
import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/** Merge Tailwind classes safely */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

/** Calculate average grade across all activities for a student */
export function getStudentAverage(
  studentId: number,
  courses: CourseColumn[],
  grades: GradesMap
): number {
  let total = 0;
  let count = 0;

  const studentGrades = grades[String(studentId)];
  if (!studentGrades) return 0;

  for (const course of courses) {
    const courseGrades = studentGrades[String(course.id)];
    if (!courseGrades) continue;

    for (const activity of course.activities) {
      const cell = courseGrades[String(activity.id)];
      if (cell && cell.percentage !== null) {
        total += cell.percentage;
        count++;
      }
    }
  }

  return count > 0 ? Math.round(total / count) : 0;
}

/** Get Tailwind classes for score pill background */
export function getScoreStyle(score: number, isDark: boolean = true): string {
  if (isDark) {
    if (score < 50) return "bg-red-500/20 text-red-100 ring-1 ring-red-400/20";
    if (score < 60) return "bg-amber-400/30 text-amber-50 ring-1 ring-amber-300/20";
    if (score < 75) return "bg-lime-400/30 text-lime-50 ring-1 ring-lime-300/20";
    return "bg-emerald-500/30 text-emerald-50 ring-1 ring-emerald-300/20";
  }

  if (score < 50) return "bg-red-200 text-red-800 ring-1 ring-red-300";
  if (score < 60) return "bg-amber-200 text-amber-800 ring-1 ring-amber-300";
  if (score < 75) return "bg-lime-200 text-lime-800 ring-1 ring-lime-300";
  return "bg-emerald-200 text-emerald-800 ring-1 ring-emerald-300";
}

/** Get Tailwind class for score dot indicator */
export function getScoreDot(score: number, isDark: boolean = true): string {
  if (isDark) {
    if (score < 50) return "bg-red-400";
    if (score < 60) return "bg-amber-300";
    if (score < 75) return "bg-lime-300";
    return "bg-emerald-400";
  }

  if (score < 50) return "bg-red-500";
  if (score < 60) return "bg-amber-500";
  if (score < 75) return "bg-lime-500";
  return "bg-emerald-500";
}

/** Get initials from full name (first two words) */
export function getInitials(firstname: string, lastname: string): string {
  return (
    (firstname?.[0]?.toUpperCase() ?? "") +
    (lastname?.[0]?.toUpperCase() ?? "")
  );
}

/** Compute which column indices are course dividers */
export function getDividerIndices(courses: CourseColumn[]): Set<number> {
  const dividers = new Set<number>();
  let colIndex = -1;
  for (let i = 0; i < courses.length - 1; i++) {
    colIndex += courses[i].activities.length;
    dividers.add(colIndex);
  }
  return dividers;
}

// Re-export types used by utils
import type { CourseColumn, GradesMap } from "../types";
```

### 3.6 Update `frontend/src/types/index.ts`

Add the new types alongside the existing ones:

```ts
// ============================================================
// NEW TYPES — Student Progress Dashboard
// ============================================================

/** Moodle activity module types */
export type ActivityType =
  | 'h5pactivity' | 'hvp' | 'lesson' | 'assign'
  | 'quiz' | 'forum' | 'workshop' | 'scorm'
  | 'manual' | string;

/** A single gradable activity within a course */
export interface CourseActivity {
  id: number;
  name: string;
  type: ActivityType;
  typeLabel: string;   // "H5P", "Quiz", "Assignment", etc.
  grademax: number;
}

/** A course with its activities (used as column group) */
export interface CourseColumn {
  id: number;
  shortname: string;
  fullname: string;
  activities: CourseActivity[];
}

/** A single grade cell in the matrix */
export interface GradeCell {
  finalgrade: number | null;
  percentage: number | null;
}

/** Nested grades map: grades[userId][courseId][itemId] → GradeCell */
export type GradesMap = Record<string, Record<string, Record<string, GradeCell>>>;

/** Cohort with member count (from all_cohorts endpoint) */
export interface CohortWithCount extends Cohort {
  membercount: number;
}

/** Full response from cohort_progress.php */
export interface CohortProgressData {
  cohortid: number;
  cohortname: string;
  students: Student[];
  courses: CourseColumn[];
  grades: GradesMap;
}

/** Dashboard statistics computed client-side */
export interface DashboardStats {
  overall: number;
  atRisk: number;
  top: number;
  watchlist: number;
  total: number;
}
```

### 3.7 Update `frontend/src/services/api.ts`

Add new API methods:

```ts
// Add these methods to the GradebookAPI class:

  /** Get all cohorts (no course filter) */
  async getAllCohorts(): Promise<CohortWithCount[]> {
    const response = await this.client.get<CohortWithCount[]>('/all_cohorts.php');
    return response.data;
  }

  /** Get all courses a cohort is enrolled in */
  async getCohortCourses(cohortId: number): Promise<CourseColumn[]> {
    const response = await this.client.get<CourseColumn[]>('/cohort_courses.php', {
      params: { cohortid: cohortId },
    });
    return response.data;
  }

  /** Get bulk progress data for entire cohort (all students × all courses × all grades) */
  async getCohortProgress(cohortId: number): Promise<CohortProgressData> {
    const response = await this.client.get<CohortProgressData>('/cohort_progress.php', {
      params: { cohortid: cohortId },
    });
    return response.data;
  }
```

Add the new type imports at the top of `api.ts`:

```ts
import type {
  Cohort, Student, StudentGradeData, CohortGradeData,
  CohortWithCount, CourseColumn, CohortProgressData
} from '../types';
```

---

## 4. Sprint 3 — Dashboard Components (Day 3-5)

### 4.1 Create shadcn/ui primitives

#### `frontend/src/components/ui/card.tsx`

```tsx
import * as React from "react";
import { cn } from "../../lib/utils";

const Card = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("rounded-xl border bg-card text-card-foreground shadow", className)} {...props} />
  )
);
Card.displayName = "Card";

const CardHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("flex flex-col space-y-1.5 p-6", className)} {...props} />
  )
);
CardHeader.displayName = "CardHeader";

const CardTitle = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h3 ref={ref} className={cn("font-semibold leading-none tracking-tight", className)} {...props} />
  )
);
CardTitle.displayName = "CardTitle";

const CardDescription = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
  ({ className, ...props }, ref) => (
    <p ref={ref} className={cn("text-sm text-muted-foreground", className)} {...props} />
  )
);
CardDescription.displayName = "CardDescription";

const CardContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("p-6 pt-0", className)} {...props} />
  )
);
CardContent.displayName = "CardContent";

export { Card, CardHeader, CardTitle, CardDescription, CardContent };
```

#### `frontend/src/components/ui/button.tsx`

```tsx
import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../../lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground shadow hover:bg-primary/90",
        outline: "border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground",
        ghost: "hover:bg-accent hover:text-accent-foreground",
      },
      size: {
        default: "h-9 px-4 py-2",
        sm: "h-8 rounded-md px-3 text-xs",
        lg: "h-10 rounded-md px-8",
        icon: "h-9 w-9",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
```

#### `frontend/src/components/ui/input.tsx`

```tsx
import * as React from "react";
import { cn } from "../../lib/utils";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => (
    <input
      type={type}
      className={cn(
        "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      ref={ref}
      {...props}
    />
  )
);
Input.displayName = "Input";

export { Input };
```

#### `frontend/src/components/ui/badge.tsx`

```tsx
import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../../lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default: "border-transparent bg-primary text-primary-foreground shadow",
        secondary: "border-transparent bg-secondary text-secondary-foreground",
        outline: "text-foreground",
      },
    },
    defaultVariants: { variant: "default" },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
```

#### `frontend/src/components/ui/progress.tsx`

```tsx
import * as React from "react";
import { cn } from "../../lib/utils";

interface ProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  value?: number;
}

const Progress = React.forwardRef<HTMLDivElement, ProgressProps>(
  ({ className, value = 0, ...props }, ref) => (
    <div ref={ref} className={cn("relative h-2 w-full overflow-hidden rounded-full bg-primary/20", className)} {...props}>
      <div
        className="h-full w-full flex-1 bg-primary transition-all"
        style={{ transform: `translateX(-${100 - (value || 0)}%)` }}
      />
    </div>
  )
);
Progress.displayName = "Progress";

export { Progress };
```

### 4.2 Create `frontend/src/components/CohortDropdown.tsx`

Simple cohort selector — replaces the complex per-course CohortSelector:

```tsx
// frontend/src/components/CohortDropdown.tsx
import { useState, useEffect } from "react";
import { gradebookAPI } from "../services/api";
import type { CohortWithCount } from "../types";

interface CohortDropdownProps {
  onSelect: (cohortId: number | null, cohortName: string) => void;
  selectedCohortId: number | null;
  isDark: boolean;
}

export default function CohortDropdown({ onSelect, selectedCohortId, isDark }: CohortDropdownProps) {
  const [cohorts, setCohorts] = useState<CohortWithCount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchCohorts = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await gradebookAPI.getAllCohorts();
        setCohorts(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load cohorts");
      } finally {
        setLoading(false);
      }
    };
    fetchCohorts();
  }, []);

  const selectClasses = isDark
    ? "border-white/10 bg-white/5 text-white"
    : "border-slate-200 bg-white text-slate-900";

  if (loading) {
    return (
      <select disabled className={`rounded-lg px-3 py-2 text-sm ${selectClasses}`}>
        <option>Loading cohorts...</option>
      </select>
    );
  }

  if (error) {
    return (
      <select disabled className={`rounded-lg px-3 py-2 text-sm border-red-400 bg-red-500/10 text-red-300`}>
        <option>Error: {error}</option>
      </select>
    );
  }

  return (
    <select
      value={selectedCohortId ?? ""}
      onChange={(e) => {
        const id = e.target.value ? Number(e.target.value) : null;
        const name = cohorts.find((c) => c.id === id)?.name ?? "";
        onSelect(id, name);
      }}
      className={`rounded-lg px-3 py-2 text-sm min-w-[220px] ${selectClasses}`}
    >
      <option value="">Select cohort...</option>
      {cohorts.map((c) => (
        <option key={c.id} value={c.id}>
          {c.name} ({c.membercount} students)
        </option>
      ))}
    </select>
  );
}
```

### 4.3 Create `frontend/src/components/StatsCards.tsx`

```tsx
// frontend/src/components/StatsCards.tsx
import { TrendingUp, AlertTriangle, CheckCircle2, Filter } from "lucide-react";
import { Card, CardContent } from "./ui/card";
import { Progress } from "./ui/progress";
import type { DashboardStats } from "../types";

interface StatsCardsProps {
  stats: DashboardStats;
  isDark: boolean;
}

export default function StatsCards({ stats, isDark }: StatsCardsProps) {
  const panelClasses = isDark
    ? "border-white/10 bg-white/5 shadow-2xl shadow-black/20"
    : "border-slate-200 bg-white shadow-xl shadow-slate-200/70";
  const mutedText = isDark ? "text-slate-400" : "text-slate-600";

  const cards = [
    {
      label: "Overall Average",
      value: `${stats.overall}%`,
      icon: <TrendingUp className="h-5 w-5 text-emerald-300" />,
      iconBg: "bg-emerald-500/20",
      extra: (
        <div className="mt-4">
          <Progress value={stats.overall} className={isDark ? "h-2 bg-white/10" : "h-2 bg-slate-200"} />
        </div>
      ),
    },
    {
      label: "Top Performers",
      value: String(stats.top),
      icon: <CheckCircle2 className="h-5 w-5 text-cyan-300" />,
      iconBg: "bg-cyan-500/20",
      extra: <p className={`mt-4 text-sm ${mutedText}`}>Average 75% and above</p>,
    },
    {
      label: "On Watchlist",
      value: String(stats.watchlist),
      icon: <Filter className="h-5 w-5 text-amber-300" />,
      iconBg: "bg-amber-500/20",
      extra: <p className={`mt-4 text-sm ${mutedText}`}>Average between 50% and 74%</p>,
    },
    {
      label: "At Risk",
      value: String(stats.atRisk),
      icon: <AlertTriangle className="h-5 w-5 text-red-300" />,
      iconBg: "bg-red-500/20",
      extra: <p className={`mt-4 text-sm ${mutedText}`}>Average below 50%</p>,
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
      {cards.map((card) => (
        <Card key={card.label} className={`rounded-3xl ${panelClasses}`}>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-sm ${mutedText}`}>{card.label}</p>
                <p className="mt-1 text-3xl font-semibold">{card.value}</p>
              </div>
              <div className={`flex h-11 w-11 items-center justify-center rounded-2xl ${card.iconBg}`}>
                {card.icon}
              </div>
            </div>
            {card.extra}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
```

### 4.4 Create `frontend/src/components/ProgressMatrix.tsx` ⭐ (Core Component)

This is the refactored matrix table from the modern dashboard JSX, now driven by API data:

```tsx
// frontend/src/components/ProgressMatrix.tsx
import { useMemo } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { getScoreStyle, getScoreDot, getInitials, getStudentAverage, getDividerIndices } from "../lib/utils";
import type { Student, CourseColumn, GradesMap } from "../types";

interface ProgressMatrixProps {
  students: Student[];
  courses: CourseColumn[];
  grades: GradesMap;
  searchTerm: string;
  filter: string;
  isDark: boolean;
}

export default function ProgressMatrix({
  students, courses, grades, searchTerm, filter, isDark,
}: ProgressMatrixProps) {

  // Build flat list of all activities (for column rendering)
  const allActivities = useMemo(() =>
    courses.flatMap((course) =>
      course.activities.map((a) => ({ ...a, courseid: course.id }))
    ), [courses]);

  // Course groups for header row (colSpan)
  const courseGroups = useMemo(() =>
    courses.map((c) => ({
      id: c.id,
      label: c.fullname,
      shortname: c.shortname,
      span: c.activities.length,
      sublabel: `${c.activities.length} activities`,
    })), [courses]);

  // Column divider positions
  const dividers = useMemo(() => getDividerIndices(courses), [courses]);

  // Filter + search students
  const filteredStudents = useMemo(() => {
    return students.filter((s) => {
      const avg = getStudentAverage(s.id, courses, grades);
      const name = `${s.firstname} ${s.lastname}`.toLowerCase();
      const sid = (s.studentid ?? "").toLowerCase();
      const snum = (s.studentnumber ?? "").toLowerCase();
      const term = searchTerm.toLowerCase();

      const matchesSearch = !term ||
        name.includes(term) ||
        sid.includes(term) ||
        snum.includes(term) ||
        s.email.toLowerCase().includes(term);

      const matchesFilter =
        filter === "all" ||
        (filter === "atRisk" && avg < 50) ||
        (filter === "watchlist" && avg >= 50 && avg < 60) ||
        (filter === "doingWell" && avg >= 60 && avg < 75) ||
        (filter === "top" && avg >= 75);

      return matchesSearch && matchesFilter;
    });
  }, [students, courses, grades, searchTerm, filter]);

  // Theme classes (copied from modern dashboard)
  const mutedText = isDark ? "text-slate-400" : "text-slate-600";
  const titleText = isDark ? "text-white" : "text-slate-900";
  const labelText = isDark ? "text-slate-300" : "text-slate-700";
  const divider = isDark ? "border-white/10" : "border-slate-200";
  const panelClasses = isDark
    ? "border-white/10 bg-white/5 shadow-2xl shadow-black/20"
    : "border-slate-200 bg-white shadow-xl shadow-slate-200/70";
  const tableHead = isDark ? "bg-slate-900/95" : "bg-slate-100/95";
  const courseBand = isDark ? "bg-white/[0.06]" : "bg-slate-50";
  const topRow = isDark
    ? "border-b border-white/10 bg-white/[0.03]"
    : "border-b border-slate-200 bg-slate-50";
  const bodyRow = isDark
    ? "border-b border-white/5 hover:bg-white/[0.03]"
    : "border-b border-slate-200 hover:bg-slate-50";
  const avatar = isDark
    ? "bg-gradient-to-br from-slate-700 to-slate-800 text-slate-200"
    : "bg-gradient-to-br from-slate-200 to-slate-300 text-slate-700";
  const activeFilter = isDark
    ? "bg-white text-slate-900 hover:bg-white"
    : "bg-slate-900 text-white hover:bg-slate-800";
  const inactiveFilter = isDark
    ? "bg-white/5 text-slate-200 hover:bg-white/10"
    : "bg-white text-slate-700 hover:bg-slate-100";

  // Filter buttons
  const filterButtons: Array<[string, string]> = [
    ["all", "All"],
    ["top", "75%+"],
    ["doingWell", "60–74%"],
    ["watchlist", "50–59%"],
    ["atRisk", "Below 50%"],
  ];

  // Get the grade percentage for a cell
  const getCellValue = (studentId: number, courseId: number, itemId: number): number | null => {
    return grades[String(studentId)]?.[String(courseId)]?.[String(itemId)]?.percentage ?? null;
  };

  // Min table width based on column count
  const minWidth = 220 + allActivities.length * 120 + 130;

  if (courses.length === 0) {
    return (
      <Card className={`overflow-hidden rounded-[28px] ${panelClasses}`}>
        <CardContent className="p-8 text-center">
          <p className={mutedText}>No courses found for this cohort.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={`overflow-hidden rounded-[28px] ${panelClasses}`}>
      <CardHeader className={`border-b ${divider} ${isDark ? "bg-white/5" : "bg-slate-50/90"}`}>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <CardTitle className="text-xl">Student Progress Matrix</CardTitle>
            <CardDescription className={`mt-1 ${mutedText}`}>
              {courses.length} course{courses.length !== 1 ? "s" : ""} ·{" "}
              {allActivities.length} activities ·{" "}
              {filteredStudents.length} / {students.length} students shown
            </CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            {filterButtons.map(([key, label]) => (
              <Button
                key={key}
                size="sm"
                variant="outline"
                className={`rounded-full ${isDark ? "border-white/10" : "border-slate-200"} ${
                  filter === key ? activeFilter : inactiveFilter
                }`}
                onClick={() => {
                  // Filter state is managed in parent — emit via prop or context
                  // For now this is illustrative; wire to parent setFilter
                }}
              >
                {label}
              </Button>
            ))}
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        <div className="max-h-[72vh] overflow-auto">
          <table className="w-full text-sm" style={{ minWidth: `${minWidth}px` }}>
            <thead className={tableHead}>
              {/* Row 1: Course group headers */}
              <tr className={topRow}>
                <th className={`sticky left-0 top-0 z-40 min-w-[220px] px-5 py-3 text-left font-medium ${mutedText} ${tableHead}`}>
                  Courses
                </th>
                {courseGroups.map((group, index) => (
                  <th
                    key={group.id}
                    colSpan={group.span}
                    className={`sticky top-0 z-30 px-0 py-0 text-center ${tableHead} ${
                      index < courseGroups.length - 1 ? `border-r ${divider}` : ""
                    }`}
                  >
                    <div className={`flex w-full flex-col items-center justify-center border-b px-4 py-4 ${divider} ${courseBand}`}>
                      <span className={`text-base font-bold tracking-wide ${titleText}`}>
                        {group.shortname}
                      </span>
                      <span className={`mt-0.5 text-xs ${mutedText}`}>
                        {group.sublabel}
                      </span>
                    </div>
                  </th>
                ))}
                <th className={`sticky top-0 z-30 min-w-[100px] px-4 py-3 text-center font-medium ${mutedText} ${tableHead}`}>
                  Summary
                </th>
              </tr>

              {/* Row 2: Activity sub-headers */}
              <tr className={`border-b ${divider}`}>
                <th className={`sticky left-0 top-[72px] z-40 min-w-[220px] px-5 py-3 text-left font-medium ${labelText} ${tableHead}`}>
                  Student
                </th>
                {allActivities.map((activity, index) => (
                  <th
                    key={`${activity.courseid}-${activity.id}`}
                    className={`sticky top-[72px] z-20 min-w-[110px] px-2 py-3 text-center font-medium ${labelText} ${tableHead} ${
                      dividers.has(index) ? `border-r ${divider}` : ""
                    }`}
                  >
                    <div className="flex flex-col items-center gap-0.5 leading-tight">
                      <span className="text-xs opacity-60">{activity.typeLabel}</span>
                      <span className="text-xs max-w-[100px] truncate" title={activity.name}>
                        {activity.name}
                      </span>
                    </div>
                  </th>
                ))}
                <th className={`sticky top-[72px] z-20 min-w-[100px] px-4 py-3 text-center font-medium ${labelText} ${tableHead}`}>
                  Average
                </th>
              </tr>
            </thead>

            <tbody>
              {filteredStudents.map((student) => {
                const average = getStudentAverage(student.id, courses, grades);

                return (
                  <tr key={student.id} className={bodyRow}>
                    {/* Student name cell — sticky left */}
                    <td className={`sticky left-0 z-10 px-5 py-3 ${isDark ? "bg-slate-950" : "bg-white"}`}>
                      <div className="flex items-center gap-3">
                        <div className={`flex h-9 w-9 items-center justify-center rounded-xl text-xs font-semibold shadow-inner ${avatar}`}>
                          {getInitials(student.firstname, student.lastname)}
                        </div>
                        <div>
                          <p className={`font-medium text-sm ${titleText}`}>
                            {student.lastname}, {student.firstname}
                          </p>
                          <p className={`text-xs ${mutedText}`}>
                            {student.studentnumber || student.studentid || student.email}
                          </p>
                        </div>
                      </div>
                    </td>

                    {/* Grade cells */}
                    {allActivities.map((activity, index) => {
                      const pct = getCellValue(student.id, activity.courseid, activity.id);

                      return (
                        <td
                          key={`${activity.courseid}-${activity.id}`}
                          className={`px-2 py-2 text-center ${dividers.has(index) ? `border-r ${divider}` : ""}`}
                        >
                          {pct !== null ? (
                            <div className={`mx-auto max-w-[90px] rounded-xl px-3 py-2 text-xs font-semibold ${getScoreStyle(pct, isDark)}`}>
                              <div className="flex items-center justify-center gap-1.5">
                                <span className={`h-2 w-2 rounded-full ${getScoreDot(pct, isDark)}`} />
                                <span>{Math.round(pct)}</span>
                              </div>
                            </div>
                          ) : (
                            <span className={`text-xs ${mutedText}`}>—</span>
                          )}
                        </td>
                      );
                    })}

                    {/* Average cell */}
                    <td className="px-3 py-2 text-center">
                      <Badge className={`rounded-full px-3 py-1 text-xs ${getScoreStyle(average, isDark)}`}>
                        {average}%
                      </Badge>
                    </td>
                  </tr>
                );
              })}

              {filteredStudents.length === 0 && (
                <tr>
                  <td colSpan={allActivities.length + 2} className="px-5 py-8 text-center">
                    <p className={mutedText}>No students match your search/filter criteria.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
```

### 4.5 Create `frontend/src/components/DashboardHeader.tsx`

```tsx
// frontend/src/components/DashboardHeader.tsx
import { Search, Download, GraduationCap, Sun, Moon } from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import CohortDropdown from "./CohortDropdown";

interface DashboardHeaderProps {
  search: string;
  onSearchChange: (value: string) => void;
  selectedCohortId: number | null;
  cohortName: string;
  onCohortSelect: (id: number | null, name: string) => void;
  onExportCSV: () => void;
  isDark: boolean;
  onToggleTheme: () => void;
}

export default function DashboardHeader({
  search, onSearchChange, selectedCohortId, cohortName,
  onCohortSelect, onExportCSV, isDark, onToggleTheme,
}: DashboardHeaderProps) {
  const mutedText = isDark ? "text-slate-400" : "text-slate-600";
  const titleText = isDark ? "text-white" : "text-slate-900";
  const softPill = isDark
    ? "border-white/10 bg-white/5 text-slate-300"
    : "border-slate-200 bg-white text-slate-600";
  const stickyShell = isDark
    ? "rounded-[28px] border border-white/10 bg-slate-950/80 shadow-2xl shadow-black/20 backdrop-blur-xl"
    : "rounded-[28px] border border-slate-200 bg-white/90 shadow-xl shadow-slate-200/70 backdrop-blur-xl";
  const inputClasses = isDark
    ? "border-white/10 bg-white/5 pl-9 text-white placeholder:text-slate-400"
    : "border-slate-200 bg-white pl-9 text-slate-900 placeholder:text-slate-500";
  const buttonOutline = isDark
    ? "border-white/10 bg-white/5 text-slate-100 hover:bg-white/10"
    : "border-slate-200 bg-white text-slate-900 hover:bg-slate-100";

  return (
    <div className={stickyShell}>
      <div className="flex flex-col gap-4 p-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="space-y-2">
          <div className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-sm ${softPill}`}>
            <GraduationCap className="h-4 w-4" />
            Academic Performance Dashboard
          </div>
          <div>
            <h1 className={`text-3xl font-semibold tracking-tight md:text-4xl ${titleText}`}>
              Student Progress Overview
            </h1>
            <p className={`mt-1 ${mutedText}`}>
              {cohortName
                ? `Viewing: ${cohortName}`
                : "Select a cohort to view all students across all courses"}
            </p>
          </div>
        </div>

        <div className="flex w-full flex-col gap-3 lg:w-auto lg:min-w-[500px]">
          <div className="flex items-center gap-3">
            <CohortDropdown
              onSelect={onCohortSelect}
              selectedCohortId={selectedCohortId}
              isDark={isDark}
            />
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
            <div className="relative min-w-[260px] flex-1">
              <Search className={`absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 ${mutedText}`} />
              <Input
                value={search}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder="Search student..."
                className={inputClasses}
              />
            </div>
            <Button variant="outline" className={buttonOutline} onClick={onExportCSV}>
              <Download className="mr-2 h-4 w-4" />
              Export CSV
            </Button>
            <Button variant="outline" className={buttonOutline} onClick={onToggleTheme}>
              {isDark ? <Sun className="mr-2 h-4 w-4" /> : <Moon className="mr-2 h-4 w-4" />}
              {isDark ? "Light" : "Dark"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
```

### 4.6 Create `frontend/src/components/ProgressDashboard.tsx` ⭐ (Main Page)

This orchestrates all sub-components:

```tsx
// frontend/src/components/ProgressDashboard.tsx
import { useState, useEffect, useMemo, useCallback } from "react";
import DashboardHeader from "./DashboardHeader";
import StatsCards from "./StatsCards";
import ProgressMatrix from "./ProgressMatrix";
import { gradebookAPI } from "../services/api";
import { getStudentAverage } from "../lib/utils";
import type { CohortProgressData, DashboardStats } from "../types";

const STORAGE_KEY_COHORT = "progress_dash_cohort_id";
const STORAGE_KEY_THEME = "progress_dash_theme";

export default function ProgressDashboard() {
  const [cohortId, setCohortId] = useState<number | null>(() => {
    const stored = localStorage.getItem(STORAGE_KEY_COHORT);
    return stored ? Number(stored) : null;
  });
  const [cohortName, setCohortName] = useState("");
  const [data, setData] = useState<CohortProgressData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [theme, setTheme] = useState(() =>
    localStorage.getItem(STORAGE_KEY_THEME) || "dark"
  );
  const isDark = theme === "dark";

  // Fetch cohort progress when cohort changes
  useEffect(() => {
    if (!cohortId) { setData(null); return; }
    const fetchProgress = async () => {
      setLoading(true);
      setError(null);
      try {
        const result = await gradebookAPI.getCohortProgress(cohortId);
        setData(result);
        setCohortName(result.cohortname);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load progress data");
      } finally {
        setLoading(false);
      }
    };
    fetchProgress();
  }, [cohortId]);

  // Persist selections
  useEffect(() => {
    cohortId
      ? localStorage.setItem(STORAGE_KEY_COHORT, String(cohortId))
      : localStorage.removeItem(STORAGE_KEY_COHORT);
  }, [cohortId]);

  useEffect(() => { localStorage.setItem(STORAGE_KEY_THEME, theme); }, [theme]);

  // Compute stats
  const stats: DashboardStats = useMemo(() => {
    if (!data || data.students.length === 0)
      return { overall: 0, atRisk: 0, top: 0, watchlist: 0, total: 0 };
    const avgs = data.students.map((s) => getStudentAverage(s.id, data.courses, data.grades));
    return {
      overall: Math.round(avgs.reduce((a, b) => a + b, 0) / avgs.length),
      atRisk: avgs.filter((v) => v < 50).length,
      top: avgs.filter((v) => v >= 75).length,
      watchlist: avgs.filter((v) => v >= 50 && v < 75).length,
      total: data.students.length,
    };
  }, [data]);

  // CSV export
  const handleExportCSV = useCallback(() => {
    if (!data) return;
    const allActs = data.courses.flatMap((c) =>
      c.activities.map((a) => ({ ...a, courseName: c.shortname }))
    );
    const header = ["Student", "Student ID", "Student Number",
      ...allActs.map((a) => `${a.courseName} - ${a.name}`), "Average"];
    const rows = data.students.map((s) => {
      const avg = getStudentAverage(s.id, data.courses, data.grades);
      const cells = allActs.map((a) => {
        const pct = data.grades[String(s.id)]?.[String(a.courseid)]?.[String(a.id)]?.percentage;
        return pct != null ? String(Math.round(pct)) : "";
      });
      return [`${s.lastname}, ${s.firstname}`, s.studentid || "", s.studentnumber || "", ...cells, `${avg}%`];
    });
    const csv = [header, ...rows]
      .map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `${cohortName || "cohort"}_progress.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [data, cohortName]);

  const pageClasses = isDark ? "bg-slate-950 text-slate-100" : "bg-slate-100 text-slate-900";
  const mutedText = isDark ? "text-slate-400" : "text-slate-600";
  const legendItems: Array<[string, string]> = [
    ["Below 50", isDark ? "bg-red-400" : "bg-red-500"],
    ["50–59", isDark ? "bg-amber-300" : "bg-amber-500"],
    ["60–74", isDark ? "bg-lime-300" : "bg-lime-500"],
    ["75–100", isDark ? "bg-emerald-400" : "bg-emerald-500"],
  ];

  return (
    <div className={`min-h-screen ${pageClasses} p-6 transition-colors duration-300 md:p-8`}>
      <div className="mx-auto max-w-[1800px] space-y-6">
        <DashboardHeader
          search={search} onSearchChange={setSearch}
          selectedCohortId={cohortId} cohortName={cohortName}
          onCohortSelect={(id, name) => { setCohortId(id); setCohortName(name); setSearch(""); setFilter("all"); }}
          onExportCSV={handleExportCSV} isDark={isDark}
          onToggleTheme={() => setTheme(isDark ? "light" : "dark")}
        />

        {loading && (
          <div className="flex items-center justify-center py-16">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-400 border-t-transparent" />
            <span className={`ml-3 ${mutedText}`}>Loading progress data...</span>
          </div>
        )}

        {error && (
          <div className="rounded-2xl border border-red-400/30 bg-red-500/10 p-4 text-red-300">
            <p className="font-medium">Error loading data</p>
            <p className="text-sm mt-1 opacity-80">{error}</p>
          </div>
        )}

        {data && !loading && (
          <>
            <StatsCards stats={stats} isDark={isDark} />
            <ProgressMatrix
              students={data.students} courses={data.courses} grades={data.grades}
              searchTerm={search} filter={filter} isDark={isDark}
              onFilterChange={setFilter}
            />
            <div className={`flex flex-wrap items-center justify-between gap-3 px-1 text-sm ${mutedText}`}>
              <div className="flex flex-wrap gap-4">
                {legendItems.map(([label, color]) => (
                  <div key={label} className="flex items-center gap-2">
                    <span className={`h-3 w-3 rounded-full ${color}`} />
                    <span>{label}</span>
                  </div>
                ))}
              </div>
              <div>Total Students: {data.students.length}</div>
            </div>
          </>
        )}

        {!cohortId && !loading && (
          <div className="flex flex-col items-center justify-center py-24">
            <div className="text-6xl mb-4">📊</div>
            <h2 className={`text-xl font-semibold ${isDark ? "text-white" : "text-slate-900"}`}>
              Select a Cohort to Get Started
            </h2>
            <p className={`mt-2 ${mutedText}`}>
              Choose a cohort from the dropdown above to view student progress across all courses.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
```

### 4.7 Update `frontend/src/App.tsx`

```tsx
// frontend/src/App.tsx — replace entire file
import ProgressDashboard from "./components/ProgressDashboard";

function App() {
  return <ProgressDashboard />;
}

export default App;
```

---

## 5. Sprint 4 — Integration & Polish (Day 5-6)

### 5.1 Wire `onFilterChange` into ProgressMatrix

Add to `ProgressMatrixProps`:

```tsx
onFilterChange: (filter: string) => void;
```

Update filter buttons:

```tsx
onClick={() => onFilterChange(key)}
```

### 5.2 Activity-type icons in column headers

```tsx
import { BookOpen, FileText, HelpCircle, Play, MessageSquare } from "lucide-react";

function getActivityIcon(type: string) {
  switch (type.toLowerCase()) {
    case 'h5pactivity': case 'hvp': return <Play className="h-3 w-3" />;
    case 'lesson': return <BookOpen className="h-3 w-3" />;
    case 'assign': return <FileText className="h-3 w-3" />;
    case 'quiz':   return <HelpCircle className="h-3 w-3" />;
    case 'forum':  return <MessageSquare className="h-3 w-3" />;
    default: return null;
  }
}
```

### 5.3 Mock data for offline development

Create `frontend/src/mocks/cohortProgress.ts` with realistic sample data matching the `CohortProgressData` shape (8 students, 3 courses, 11 activities). Use `VITE_USE_MOCK=true` in `.env` to toggle.

```tsx
// In ProgressDashboard.tsx:
import { mockCohortProgress } from "../mocks/cohortProgress";
const USE_MOCK = import.meta.env.VITE_USE_MOCK === "true";

// In the useEffect:
if (USE_MOCK) {
  setData(mockCohortProgress);
  setCohortName(mockCohortProgress.cohortname);
  return;
}
```

---

## 6. Sprint 5 — Deploy & Test (Day 6-7)

### 6.1 Deploy backend

```bash
scp "PASMA Gradebook 2026/backend/all_cohorts.php" \
    "PASMA Gradebook 2026/backend/cohort_courses.php" \
    "PASMA Gradebook 2026/backend/cohort_progress.php" \
    hd@192.168.1.9:/var/www/html/pasmoodle/local/gradebookapi/

scp "PASMA Gradebook 2026/backend/lib.php" \
    hd@192.168.1.9:/var/www/html/pasmoodle/local/gradebookapi/
```

### 6.2 Test backend endpoints

```bash
TOKEN="pasma-gradebook-2026-secret-token"
BASE="http://discoverpasma.mynetgear.com/pasmoodle/local/gradebookapi"

curl -s -H "Authorization: Bearer $TOKEN" "$BASE/all_cohorts.php" | python3 -m json.tool
curl -s -H "Authorization: Bearer $TOKEN" "$BASE/cohort_courses.php?cohortid=7" | python3 -m json.tool
curl -s -H "Authorization: Bearer $TOKEN" "$BASE/cohort_progress.php?cohortid=7" | python3 -m json.tool | head -100
```

### 6.3 Switch to live data

```bash
# frontend/.env
VITE_API_BASE_URL=/api
VITE_MOODLE_TOKEN=pasma-gradebook-2026-secret-token
VITE_USE_MOCK=false
```

### 6.4 Build & verify

```bash
cd "PASMA Gradebook 2026/frontend"
npx tsc --noEmit    # Type check
npm run build       # Production build
npm run preview     # Preview
```

### 6.5 Test checklist

| # | Test | Verification |
|---|------|-------------|
| 1 | `all_cohorts.php` returns data | curl returns array with `id`, `name`, `membercount` |
| 2 | `cohort_progress.php` returns expected shape | JSON has `students`, `courses`, `grades` keys |
| 3 | Frontend builds without errors | `npm run build` exits 0 |
| 4 | Dashboard renders with cohort dropdown | Visual check at `localhost:3000` |
| 5 | Matrix populates after cohort selection | Table appears with courses as columns |
| 6 | Search filters students client-side | Type in search box, rows reduce |
| 7 | Filter buttons work | Click "Below 50%" — only at-risk students shown |
| 8 | CSV export downloads correctly | Click Export CSV — file downloads |
| 9 | Theme toggle works | Click sun/moon — colors swap |
| 10 | Stats cards show correct numbers | Compare manually with matrix data |

---

## 7. Data Flow Diagrams

### Overall Architecture

```
┌──────────────────┐     ┌─────────────────────────┐     ┌──────────────┐
│   React Frontend  │────▶│  Moodle Plugin (PHP)     │────▶│  Moodle DB   │
│   (Vite+Tailwind) │◀────│  /local/gradebookapi/   │◀────│  (MariaDB)   │
│   Port 3000       │     │  Port 80                 │     │              │
└──────────────────┘     └─────────────────────────┘     └──────────────┘
        │                           │
        │  Vite proxy /api ──▶ /pasmoodle/local/gradebookapi/
        ▼
   Browser (http://localhost:3000)
```

### API Call Sequence

```
1. Page Load
   ├── GET /all_cohorts.php          → Populate dropdown
   └── Read localStorage             → Restore last cohort

2. Cohort Selected
   └── GET /cohort_progress.php?cohortid=N
       ├── Students[]                → Left column (rows)
       ├── Courses[].Activities[]    → Column headers
       └── Grades{}                  → Cell values

3. User Interactions (all client-side)
   ├── Search       → useMemo filter
   ├── Filter       → useMemo filter
   ├── Theme toggle → CSS class swap
   └── CSV export   → Blob download
```

### Database Queries (inside `cohort_progress.php`)

```
Q1: Get cohort students        → {user} + {cohort_members}
Q2: Get custom profile fields  → {user_info_data} + {user_info_field}  (bulk)
Q3: Get courses for cohort     → {course} + {enrol} + {user_enrolments} + {cohort_members}
Q4: Get grade items            → {grade_items} WHERE courseid IN (...)
Q5: Get grades                 → {grade_grades} WHERE itemid IN (...) AND userid IN (...)
```

---

## 8. File Manifest

### New Files to Create (18 files)

| File | Sprint | Lines | Description |
|------|--------|-------|-------------|
| `backend/all_cohorts.php` | 1 | ~60 | List all cohorts endpoint |
| `backend/cohort_courses.php` | 1 | ~60 | Cohort → courses endpoint |
| `backend/cohort_progress.php` | 1 | ~200 | Bulk progress endpoint ⭐ |
| `frontend/tailwind.config.js` | 2 | ~12 | Tailwind config |
| `frontend/postcss.config.js` | 2 | ~6 | PostCSS config |
| `frontend/src/index.css` | 2 | ~3 | Tailwind directives |
| `frontend/src/lib/utils.ts` | 2 | ~100 | Shared utilities |
| `frontend/src/components/ui/card.tsx` | 3 | ~50 | Card primitive |
| `frontend/src/components/ui/button.tsx` | 3 | ~55 | Button primitive |
| `frontend/src/components/ui/input.tsx` | 3 | ~25 | Input primitive |
| `frontend/src/components/ui/badge.tsx` | 3 | ~30 | Badge primitive |
| `frontend/src/components/ui/progress.tsx` | 3 | ~20 | Progress primitive |
| `frontend/src/components/CohortDropdown.tsx` | 3 | ~70 | Cohort selector |
| `frontend/src/components/StatsCards.tsx` | 3 | ~80 | 4 stats cards |
| `frontend/src/components/ProgressMatrix.tsx` | 3 | ~250 | Core matrix table ⭐ |
| `frontend/src/components/DashboardHeader.tsx` | 3 | ~100 | Header with controls |
| `frontend/src/components/ProgressDashboard.tsx` | 3 | ~200 | Main orchestrator ⭐ |
| `frontend/src/mocks/cohortProgress.ts` | 4 | ~120 | Mock data for dev |

### Files to Modify (6 files)

| File | Sprint | Changes |
|------|--------|---------|
| `backend/lib.php` | 1 | Add `local_gradebookapi_activity_type_label()` |
| `frontend/src/types/index.ts` | 2 | Add `CourseActivity`, `CourseColumn`, `GradeCell`, `GradesMap`, etc. |
| `frontend/src/services/api.ts` | 2 | Add `getAllCohorts()`, `getCohortProgress()` |
| `frontend/src/main.tsx` | 2 | Import `index.css` |
| `frontend/src/App.tsx` | 3 | Replace with `<ProgressDashboard />` |
| `frontend/package.json` | 2 | Add tailwind, lucide-react, shadcn deps |

### Files Preserved (unchanged)

| File | Reason |
|------|--------|
| `backend/cohorts.php` | Still works for per-course queries |
| `backend/students.php` | Still works for per-cohort student queries |
| `backend/student_grades.php` | Still works for single-student detail views |
| `backend/version.php`, `settings.php`, `db/*` | Plugin infrastructure unchanged |
| `frontend/src/components/CohortSelector.tsx` | Keep for potential drill-down view |
| `frontend/src/components/StudentSearch.tsx` | Keep for potential drill-down view |
| `frontend/src/components/StudentGradeDetail.tsx` | Keep for potential drill-down view |
| `frontend/src/components/CohortGrid.tsx` | Keep for potential alternative view |

---

## Summary

| Sprint | Days | Deliverables |
|--------|------|-------------|
| **Sprint 1** | 1–2 | 3 backend PHP endpoints + activity label helper + deploy |
| **Sprint 2** | 2–3 | Tailwind + shadcn setup, TypeScript types, API methods |
| **Sprint 3** | 3–5 | 7 new React components (UI primitives + dashboard) |
| **Sprint 4** | 5–6 | Mock data, filter wiring, activity icons, polish |
| **Sprint 5** | 6–7 | Backend deploy, end-to-end testing, production build |

**Total: 5–7 working days**

**Key risk:** `cohort_progress.php` runs 5 DB queries. For 50+ students × 10+ courses, initial load could be slow. **Mitigation:** built-in 120s cache, loading spinner, and the single-call design eliminates N×M round-trips.

---

## Sprint 1 Completion Update (2026-04-22)

### Status
✅ Sprint 1 is fully implemented as defined in this plan.

### Completed Deliverables
- ✅ `backend/all_cohorts.php` created and linted
- ✅ `backend/cohort_courses.php` created and linted
- ✅ `backend/cohort_progress.php` created and linted
- ✅ `local_gradebookapi_activity_type_label()` added to `backend/lib.php`

### Test Execution
Executed automated verification script:

```bash
backend/tests/sprint1_backend_tests.sh
```

Result: all checks passed, including file existence, linting, rate-limiting/caching hooks, helper function presence, and critical response-shape markers.

### Notes
- This completion update covers Sprint 1 scope only (Backend Endpoints).
- Deployment to Moodle server and live endpoint curl checks remain operational steps to run against the target environment.

---

## Sprint 2 Completion Update (2026-04-22)

### Status
✅ Sprint 2 is fully implemented as defined in this plan.

### Completed Deliverables
- ✅ Tailwind/shadcn dependency stack installed and configured in frontend package
- ✅ `frontend/tailwind.config.js` created
- ✅ `frontend/postcss.config.js` created (using `@tailwindcss/postcss` plugin)
- ✅ `frontend/src/index.css` created with Tailwind directives
- ✅ `frontend/src/main.tsx` updated to import `index.css`
- ✅ `frontend/src/lib/utils.ts` created with shared dashboard utility functions
- ✅ `frontend/src/types/index.ts` extended with Sprint 2 dashboard data model types
- ✅ `frontend/src/services/api.ts` extended with `getAllCohorts()`, `getCohortCourses()`, and `getCohortProgress()`

### Test Execution
Created and executed Sprint 2 verification script:

```bash
cd "PASMA Gradebook 2026/frontend"
./tests/sprint2_frontend_setup_tests.sh
```

Result: all checks passed (**23/23**), including:
- required file creation and setup verification
- dependency and config validation
- TypeScript type export verification
- API method additions verification
- successful production build (`npm run build`)

### Notes
- Initial PostCSS plugin mismatch (Tailwind v4) was resolved by switching from `tailwindcss` to `@tailwindcss/postcss` in `postcss.config.js` and installing the package.
- Sprint 2 scope is now complete and validated.

---

## Sprint 3 Completion Update (2026-04-22)

### Status
✅ Sprint 3 is fully implemented as defined in this plan.

### Completed Deliverables
- ✅ `frontend/src/components/ui/card.tsx` created
- ✅ `frontend/src/components/ui/button.tsx` created
- ✅ `frontend/src/components/ui/input.tsx` created
- ✅ `frontend/src/components/ui/badge.tsx` created
- ✅ `frontend/src/components/ui/progress.tsx` created
- ✅ `frontend/src/components/CohortDropdown.tsx` created
- ✅ `frontend/src/components/StatsCards.tsx` created
- ✅ `frontend/src/components/ProgressMatrix.tsx` created
- ✅ `frontend/src/components/DashboardHeader.tsx` created
- ✅ `frontend/src/components/ProgressDashboard.tsx` created
- ✅ `frontend/src/App.tsx` replaced to render `ProgressDashboard`

### Test Execution
Created and executed Sprint 3 verification script:

```bash
cd "PASMA Gradebook 2026/frontend"
./tests/sprint3_dashboard_components_tests.sh
```

Result: all checks passed (**20/20**), including:
- required Sprint 3 file creation checks
- App wiring checks (`App.tsx` imports and renders `ProgressDashboard`)
- filter wiring check (`onFilterChange` in `ProgressMatrix.tsx`)
- dashboard orchestration checks (`DashboardHeader`, `StatsCards`, `ProgressMatrix` usage)
- localStorage persistence check in `ProgressDashboard.tsx`
- successful production build (`npm run build`)

### Notes
- Sprint 3 scope is complete and validated.

---

## Sprint 4 Completion Update (2026-04-22)

### Status
✅ Sprint 4 is fully implemented as defined in this plan.

### Completed Deliverables
- ✅ `onFilterChange` wiring is fully implemented in `frontend/src/components/ProgressMatrix.tsx`
- ✅ Activity-type icon support added to matrix column headers in `frontend/src/components/ProgressMatrix.tsx`
- ✅ Offline mock dataset created at `frontend/src/mocks/cohortProgress.ts` (8 students, 3 courses, 11 activities)
- ✅ Mock-data runtime toggle implemented in `frontend/src/components/ProgressDashboard.tsx` using `VITE_USE_MOCK`
- ✅ Environment template updated in `frontend/.env.example` to include `VITE_USE_MOCK=false`

### Test Execution
Created and executed Sprint 4 verification script:

```bash
cd "PASMA Gradebook 2026/frontend"
./tests/sprint4_integration_polish_tests.sh
```

Result: all checks passed (**14/14**), including:
- Sprint 4 filter wiring assertions
- activity icon integration assertions
- mock file structure/data-shape checks
- environment toggle checks (`VITE_USE_MOCK`)
- successful production build (`npm run build`)

### Notes
- Sprint 4 scope is complete and validated.

---

## Sprint 5 Completion Update (2026-04-22)

### Status
✅ Sprint 5 is fully implemented and validated for repository scope.

### Completed Deliverables
- ✅ Sprint 5 verification script created: `frontend/tests/sprint5_deploy_test.sh`
- ✅ Backend deploy-readiness checks added and executed:
  - endpoint files exist (`all_cohorts.php`, `cohort_courses.php`, `cohort_progress.php`)
  - activity-type helper confirmed in `backend/lib.php`
  - PHP lint passes for all 3 new backend endpoints
- ✅ Frontend live-mode readiness checks added and executed:
  - `.env.example` includes `VITE_USE_MOCK=false`
  - `App.tsx` renders `ProgressDashboard`
  - matrix filter wiring and search wiring confirmed
  - CSV export code path confirmed
  - theme toggle logic confirmed
  - stats calculation logic confirmed
- ✅ TypeScript verification passes (`npx tsc --noEmit`)
- ✅ Production build verification passes (`npm run build`)

### Test Execution
Executed Sprint 5 automated verification:

```bash
cd "PASMA Gradebook 2026/frontend"
./tests/sprint5_deploy_test.sh
```

Result: all checks passed (**17/17**).

Additionally executed direct build validation:

```bash
cd "PASMA Gradebook 2026/frontend"
npx tsc --noEmit
npm run build
```

Result: both commands exited successfully.

### Notes
- Backend live endpoint probing was attempted against configured hosts/paths; the tested external route returned `File not found.` in this environment. Repository deliverables and deploy/test automation are complete, and deployment execution remains an environment/network operation.

---

## Live Deployment & Debug (2026-04-23)

### Backend Deployed to Moodle Server
- **Server:** `discoverpasma.mynetgear.com` (IP: `102.39.248.227`)
- **Path:** `/var/www/html/pasmoodle/local/gradebookapi/`
- **Method:** `sshpass` + `scp` to `/tmp` → `sudo cp` to web root
- Deployed files: `all_cohorts.php`, `cohort_courses.php`, `cohort_progress.php`, `lib.php`

### Bugs Found & Fixed During Live Deployment

#### Bug 1: `webservice_function_called` event missing `function` key
- **Symptom:** `The 'function' value must be set in other.`
- **Root cause:** `local_gradebookapi_log_access()` used `\core\event\webservice_function_called` which requires a `function` key in the `other` array, and also has `context` collision issues
- **Fix:** Replaced the entire Moodle event-based logging with simple `error_log()` calls in `lib.php`

#### Bug 2: `gi.hiddenuntil` column doesn't exist
- **Symptom:** `Unknown column 'gi.hiddenuntil' in 'field list'` — Moodle `grade_items` table on this server doesn't have a `hiddenuntil` column
- **Fix:** Removed `gi.hiddenuntil` from the SELECT in `cohort_progress.php` grade items query. The `is_hidden()` check uses `!empty()` which safely handles the missing property.

### Live Endpoint Verification
```
✅ all_cohorts.php     → 67 cohorts returned
✅ cohort_progress.php → cohortid=77: 11 students, 30 courses, grades flowing
✅ Vite proxy /api     → localhost:3000 → discoverpasma.mynetgear.com OK
```

### Frontend Running
- Dev server: `http://localhost:3000` (live mode, `VITE_USE_MOCK=false`)
- Token: `pasma-gradebook-2026-secret-token`
- Proxy: `/api` → `http://discoverpasma.mynetgear.com/pasmoodle/local/gradebookapi/`
