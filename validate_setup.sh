#!/bin/bash
# Validation script to verify Session 1 setup

echo "🔍 Validating Moodle Modern Gradebook Setup..."
echo ""

PASS=0
FAIL=0

# Helper functions
check_file() {
    if [ -f "$1" ]; then
        echo "✅ $1"
        ((PASS++))
    else
        echo "❌ $1 MISSING"
        ((FAIL++))
    fi
}

check_dir() {
    if [ -d "$1" ]; then
        echo "✅ $1/"
        ((PASS++))
    else
        echo "❌ $1/ MISSING"
        ((FAIL++))
    fi
}

echo "📁 Checking directories..."
check_dir "frontend"
check_dir "frontend/src"
check_dir "frontend/src/components"
check_dir "frontend/src/services"
check_dir "frontend/src/types"
check_dir "backend"
check_dir "backend/db"
check_dir "backend/lang/en"

echo ""
echo "📄 Checking frontend files..."
check_file "frontend/package.json"
check_file "frontend/tsconfig.json"
check_file "frontend/vite.config.ts"
check_file "frontend/index.html"
check_file "frontend/.env.example"
check_file "frontend/src/main.tsx"
check_file "frontend/src/App.tsx"
check_file "frontend/src/types/index.ts"
check_file "frontend/src/services/api.ts"
check_file "frontend/src/vite-env.d.ts"

echo ""
echo "🔌 Checking backend files..."
check_file "backend/version.php"
check_file "backend/settings.php"
check_file "backend/lib.php"
check_file "backend/cohorts.php"
check_file "backend/students.php"
check_file "backend/student_grades.php"
check_file "backend/db/access.php"
check_file "backend/lang/en/local_gradebookapi.php"

echo ""
echo "📚 Checking documentation..."
check_file "README.md"
check_file "NEXT_STEPS.md"
check_file "QUICK_START.md"
check_file "feature_list.json"
check_file "claude-progress.txt"

echo ""
echo "🛠️  Checking config files..."
check_file ".gitignore"
check_file "init.sh"

echo ""
echo "================================"
echo "Summary: $PASS passed, $FAIL failed"
echo "================================"

if [ $FAIL -eq 0 ]; then
    echo "✅ All checks passed! Setup is complete."
    exit 0
else
    echo "⚠️  Some files are missing. Review the output above."
    exit 1
fi
