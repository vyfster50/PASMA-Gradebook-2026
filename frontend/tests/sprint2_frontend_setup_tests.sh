#!/usr/bin/env bash
set -euo pipefail

echo "🔍 Sprint 2 Frontend Setup & Types Verification"

PASS=0

check_file() {
  local file="$1"
  if [[ -f "$file" ]]; then
    echo "✅ File exists: $file"
    PASS=$((PASS + 1))
  else
    echo "❌ Missing file: $file"
    exit 1
  fi
}

check_grep() {
  local pattern="$1"
  local file="$2"
  local label="$3"
  if grep -Eq "$pattern" "$file"; then
    echo "✅ $label"
    PASS=$((PASS + 1))
  else
    echo "❌ $label"
    exit 1
  fi
}

# 1) Config and setup files
check_file "tailwind.config.js"
check_file "postcss.config.js"
check_file "src/index.css"
check_file "src/lib/utils.ts"

# 2) main.tsx imports index.css
check_grep "import './index.css'|import \"./index.css\"" "src/main.tsx" "main.tsx imports index.css"

# 3) Package dependencies for sprint 2
check_grep "\"tailwindcss\"" "package.json" "tailwindcss dependency present"
check_grep "\"@tailwindcss/vite\"" "package.json" "@tailwindcss/vite dependency present"
check_grep "\"clsx\"" "package.json" "clsx dependency present"
check_grep "\"tailwind-merge\"" "package.json" "tailwind-merge dependency present"
check_grep "\"class-variance-authority\"" "package.json" "class-variance-authority dependency present"
check_grep "\"lucide-react\"" "package.json" "lucide-react dependency present"
check_grep "\"@radix-ui/react-slot\"" "package.json" "@radix-ui/react-slot dependency present"

# 4) New types added
check_grep "export interface CourseActivity" "src/types/index.ts" "CourseActivity type exported"
check_grep "export interface CourseColumn" "src/types/index.ts" "CourseColumn type exported"
check_grep "export interface GradeCell" "src/types/index.ts" "GradeCell type exported"
check_grep "export type GradesMap" "src/types/index.ts" "GradesMap type exported"
check_grep "export interface CohortWithCount" "src/types/index.ts" "CohortWithCount type exported"
check_grep "export interface CohortProgressData" "src/types/index.ts" "CohortProgressData type exported"
check_grep "export interface DashboardStats" "src/types/index.ts" "DashboardStats type exported"

# 5) API service methods added
check_grep "async getAllCohorts\(" "src/services/api.ts" "getAllCohorts() added"
check_grep "async getCohortCourses\(" "src/services/api.ts" "getCohortCourses() added"
check_grep "async getCohortProgress\(" "src/services/api.ts" "getCohortProgress() added"

# 6) Build validation
echo "🧪 Running build validation..."
npm run build >/dev/null
echo "✅ Build succeeds"
PASS=$((PASS + 1))

echo "\n🎉 Sprint 2 verification complete. Checks passed: $PASS"

