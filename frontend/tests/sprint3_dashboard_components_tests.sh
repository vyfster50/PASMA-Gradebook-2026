#!/bin/bash
set -euo pipefail

echo "== Sprint 3 Dashboard Components Verification =="

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

# Required Sprint 3 files
check_file "src/components/ui/card.tsx"
check_file "src/components/ui/button.tsx"
check_file "src/components/ui/input.tsx"
check_file "src/components/ui/badge.tsx"
check_file "src/components/ui/progress.tsx"
check_file "src/components/CohortDropdown.tsx"
check_file "src/components/StatsCards.tsx"
check_file "src/components/ProgressMatrix.tsx"
check_file "src/components/DashboardHeader.tsx"
check_file "src/components/ProgressDashboard.tsx"

# App wiring
check_grep "import ProgressDashboard from './components/ProgressDashboard'" "src/App.tsx" "App imports ProgressDashboard"
check_grep "return <ProgressDashboard />" "src/App.tsx" "App renders ProgressDashboard"

# Core matrix behavior
check_grep "onFilterChange: (filter: string) => void;" "src/components/ProgressMatrix.tsx" "ProgressMatrix exposes onFilterChange prop"
check_grep "onClick={() => onFilterChange(key)}" "src/components/ProgressMatrix.tsx" "ProgressMatrix filter buttons wired"

# Dashboard orchestration
check_grep "gradebookAPI.getCohortProgress" "src/components/ProgressDashboard.tsx" "ProgressDashboard fetches cohort progress"
check_grep "<DashboardHeader" "src/components/ProgressDashboard.tsx" "ProgressDashboard renders DashboardHeader"
check_grep "<StatsCards" "src/components/ProgressDashboard.tsx" "ProgressDashboard renders StatsCards"
check_grep "<ProgressMatrix" "src/components/ProgressDashboard.tsx" "ProgressDashboard renders ProgressMatrix"
check_grep "localStorage" "src/components/ProgressDashboard.tsx" "ProgressDashboard persists state"

# Build verification
if npm run build > /tmp/sprint3_build.log 2>&1; then
  echo "✅ Build passes (npm run build)"
  PASS=$((PASS + 1))
else
  echo "❌ Build failed (npm run build)"
  FAIL=$((FAIL + 1))
  echo "--- Build output ---"
  cat /tmp/sprint3_build.log
fi

echo ""
echo "Summary: $PASS passed, $FAIL failed"

if [ "$FAIL" -eq 0 ]; then
  echo "Sprint 3 verification PASSED"
  exit 0
else
  echo "Sprint 3 verification FAILED"
  exit 1
fi

