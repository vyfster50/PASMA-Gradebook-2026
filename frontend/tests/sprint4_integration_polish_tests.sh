#!/bin/bash
set -euo pipefail

echo "== Sprint 4 Integration & Polish Verification =="

PASS=0
FAIL=0

check_file() {
  local file="$1"
  if [ -f "$file" ]; then
    echo "✅ File exists: $file"
    PASS=$((PASS + 1))
  else
    echo "❌ Missing file: $file"
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

# 5.1 Filter wiring
check_grep "onFilterChange: (filter: string) => void;" "src/components/ProgressMatrix.tsx" "ProgressMatrix exposes onFilterChange prop"
check_grep "onClick={() => onFilterChange(key)}" "src/components/ProgressMatrix.tsx" "ProgressMatrix filter buttons call onFilterChange"

# 5.2 Activity icons
check_grep "from 'lucide-react'" "src/components/ProgressMatrix.tsx" "ProgressMatrix imports lucide activity icons"
check_grep "function getActivityIcon(type: string)" "src/components/ProgressMatrix.tsx" "ProgressMatrix defines getActivityIcon helper"
check_grep "getActivityIcon(activity.type)" "src/components/ProgressMatrix.tsx" "ProgressMatrix renders activity icons in headers"

# 5.3 Mock data + toggle
check_file "src/mocks/cohortProgress.ts"
check_grep "export const mockCohortProgress" "src/mocks/cohortProgress.ts" "Mock cohort progress export exists"
check_grep "students:" "src/mocks/cohortProgress.ts" "Mock includes students"
check_grep "courses:" "src/mocks/cohortProgress.ts" "Mock includes courses"
check_grep "grades:" "src/mocks/cohortProgress.ts" "Mock includes grades"

check_grep "VITE_USE_MOCK" ".env.example" ".env.example includes VITE_USE_MOCK"
check_grep "const USE_MOCK = import.meta.env.VITE_USE_MOCK === 'true'" "src/components/ProgressDashboard.tsx" "ProgressDashboard reads VITE_USE_MOCK"
check_grep "mockCohortProgress" "src/components/ProgressDashboard.tsx" "ProgressDashboard imports and uses mockCohortProgress"

# Build verification
if npm run build > /tmp/sprint4_build.log 2>&1; then
  echo "✅ Build passes (npm run build)"
  PASS=$((PASS + 1))
else
  echo "❌ Build failed (npm run build)"
  FAIL=$((FAIL + 1))
  echo "--- Build output ---"
  cat /tmp/sprint4_build.log
fi

echo ""
echo "Summary: $PASS passed, $FAIL failed"

if [ "$FAIL" -eq 0 ]; then
  echo "Sprint 4 verification PASSED"
  exit 0
else
  echo "Sprint 4 verification FAILED"
  exit 1
fi

