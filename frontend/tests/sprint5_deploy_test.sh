#!/bin/bash
set -euo pipefail

echo "== Sprint 5 Deploy & Test Verification =="

PASS=0
FAIL=0

check_file() {
  local file="$1"
  local label="$2"
  if [ -f "$file" ]; then
    echo "✅ $label"
    PASS=$((PASS + 1))
  else
    echo "❌ $label"
    FAIL=$((FAIL + 1))
  fi
}

check_grep() {
  local pattern="$1"
  local file="$2"
  local label="$3"
  if grep -q "$pattern" "$file"; then
    echo "✅ $label"
    PASS=$((PASS + 1))
  else
    echo "❌ $label"
    FAIL=$((FAIL + 1))
  fi
}

echo "-- Backend deploy readiness --"
check_file "../backend/all_cohorts.php" "all_cohorts endpoint file exists"
check_file "../backend/cohort_courses.php" "cohort_courses endpoint file exists"
check_file "../backend/cohort_progress.php" "cohort_progress endpoint file exists"
check_grep "function local_gradebookapi_activity_type_label" "../backend/lib.php" "activity type helper exists in backend/lib.php"

if php -l "../backend/all_cohorts.php" >/tmp/sprint5_php_all_cohorts.log 2>&1; then
  echo "✅ all_cohorts.php passes PHP lint"
  PASS=$((PASS + 1))
else
  echo "❌ all_cohorts.php PHP lint failed"
  FAIL=$((FAIL + 1))
  cat /tmp/sprint5_php_all_cohorts.log
fi

if php -l "../backend/cohort_courses.php" >/tmp/sprint5_php_cohort_courses.log 2>&1; then
  echo "✅ cohort_courses.php passes PHP lint"
  PASS=$((PASS + 1))
else
  echo "❌ cohort_courses.php PHP lint failed"
  FAIL=$((FAIL + 1))
  cat /tmp/sprint5_php_cohort_courses.log
fi

if php -l "../backend/cohort_progress.php" >/tmp/sprint5_php_cohort_progress.log 2>&1; then
  echo "✅ cohort_progress.php passes PHP lint"
  PASS=$((PASS + 1))
else
  echo "❌ cohort_progress.php PHP lint failed"
  FAIL=$((FAIL + 1))
  cat /tmp/sprint5_php_cohort_progress.log
fi

echo "-- Frontend production readiness --"
check_grep "VITE_USE_MOCK=false" ".env.example" ".env.example is configured for live mode"
check_grep "return <ProgressDashboard />" "src/App.tsx" "App renders ProgressDashboard"
check_grep "onFilterChange={setFilter}" "src/components/ProgressDashboard.tsx" "ProgressDashboard wires filter changes"
check_grep "onClick={() => onFilterChange(key)}" "src/components/ProgressMatrix.tsx" "ProgressMatrix filter buttons are clickable"
check_grep "searchTerm" "src/components/ProgressMatrix.tsx" "ProgressMatrix supports search filtering"
check_grep "const blob = new Blob" "src/components/ProgressDashboard.tsx" "CSV export blob generation exists"
check_grep "setTheme(isDark ? 'light' : 'dark')" "src/components/ProgressDashboard.tsx" "Theme toggle logic exists"
check_grep "const stats: DashboardStats = useMemo" "src/components/ProgressDashboard.tsx" "Stats are computed from matrix data"

if npx tsc --noEmit >/tmp/sprint5_tsc.log 2>&1; then
  echo "✅ TypeScript check passes (npx tsc --noEmit)"
  PASS=$((PASS + 1))
else
  echo "❌ TypeScript check failed (npx tsc --noEmit)"
  FAIL=$((FAIL + 1))
  cat /tmp/sprint5_tsc.log
fi

if npm run build >/tmp/sprint5_build.log 2>&1; then
  echo "✅ Production build passes (npm run build)"
  PASS=$((PASS + 1))
else
  echo "❌ Production build failed (npm run build)"
  FAIL=$((FAIL + 1))
  cat /tmp/sprint5_build.log
fi

echo ""
echo "Summary: $PASS passed, $FAIL failed"

if [ "$FAIL" -eq 0 ]; then
  echo "Sprint 5 verification PASSED"
  exit 0
else
  echo "Sprint 5 verification FAILED"
  exit 1
fi

