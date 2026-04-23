#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT_DIR"

pass() { echo "✅ $1"; }
fail() { echo "❌ $1"; exit 1; }

echo "Running Sprint 1 backend verification tests..."

test -f backend/all_cohorts.php || fail "backend/all_cohorts.php exists"
pass "backend/all_cohorts.php exists"

test -f backend/cohort_courses.php || fail "backend/cohort_courses.php exists"
pass "backend/cohort_courses.php exists"

test -f backend/cohort_progress.php || fail "backend/cohort_progress.php exists"
pass "backend/cohort_progress.php exists"

grep -q "function local_gradebookapi_activity_type_label" backend/lib.php || fail "activity type helper added to lib.php"
pass "activity type helper added to lib.php"

php -l backend/lib.php >/dev/null || fail "PHP lint: backend/lib.php"
pass "PHP lint: backend/lib.php"

php -l backend/all_cohorts.php >/dev/null || fail "PHP lint: backend/all_cohorts.php"
pass "PHP lint: backend/all_cohorts.php"

php -l backend/cohort_courses.php >/dev/null || fail "PHP lint: backend/cohort_courses.php"
pass "PHP lint: backend/cohort_courses.php"

php -l backend/cohort_progress.php >/dev/null || fail "PHP lint: backend/cohort_progress.php"
pass "PHP lint: backend/cohort_progress.php"

grep -q "local_gradebookapi_check_rate_limit" backend/all_cohorts.php || fail "all_cohorts has rate limit"
pass "all_cohorts has rate limit"

grep -q "local_gradebookapi_cache_key('cohort_courses'" backend/cohort_courses.php || fail "cohort_courses has caching"
pass "cohort_courses has caching"

grep -q "local_gradebookapi_activity_type_label" backend/cohort_progress.php || fail "cohort_progress maps activity labels"
pass "cohort_progress maps activity labels"

grep -q "cohortname" backend/cohort_progress.php || fail "cohort_progress includes expected response fields"
pass "cohort_progress includes expected response fields"

echo ""
echo "🎉 Sprint 1 backend tests PASSED"

