# Quick Start Guide for Next Agent

## Context
You're continuing work on the **Moodle Modern Gradebook** project.
Session 1 (Initializer) completed the foundation - all infrastructure is ready.

## What's Been Done ✅
- ✅ Full project structure (frontend + backend)
- ✅ Backend API endpoints (3 PHP files with auth)
- ✅ Frontend types and API service layer
- ✅ Build configuration (Vite, TypeScript, MUI)
- ✅ Documentation (README, NEXT_STEPS)

## Your Mission 🎯
**Build the three main UI components:**
1. CohortSelector
2. StudentSearch
3. StudentGradeDetail

Then wire them together in App.tsx.

## Step-by-Step

### 1. Install Dependencies (2 minutes)
```bash
cd frontend
npm install
```

### 2. Create .env file (1 minute)
```bash
cp .env.example .env
# Edit .env - set dummy values for now:
VITE_API_BASE_URL=http://192.168.1.9/local/gradebookapi
VITE_MOODLE_TOKEN=test-token-123
VITE_DEFAULT_COURSE_ID=12
```

### 3. Create CohortSelector Component (15 minutes)
**File:** `frontend/src/components/CohortSelector.tsx`

**Props:**
- `courseId: number`
- `onSelect: (cohort: Cohort) => void`

**Features:**
- Fetch cohorts with `gradebookAPI.getCohorts(courseId)`
- MUI Select or List to display cohorts
- Loading spinner while fetching
- Error handling

**Example structure:**
```tsx
import { useState, useEffect } from 'react';
import { Box, FormControl, InputLabel, Select, MenuItem } from '@mui/material';
import { gradebookAPI } from '../services/api';
import type { Cohort } from '../types';

interface Props {
  courseId: number;
  onSelect: (cohort: Cohort) => void;
}

export default function CohortSelector({ courseId, onSelect }: Props) {
  const [cohorts, setCohorts] = useState<Cohort[]>([]);
  const [loading, setLoading] = useState(false);
  // ... implement fetch logic
}
```

### 4. Create StudentSearch Component (20 minutes)
**File:** `frontend/src/components/StudentSearch.tsx`

**Props:**
- `courseId: number`
- `cohortId: number`
- `onSelect: (student: Student) => void`

**Features:**
- Fetch students with `gradebookAPI.getStudents(courseId, cohortId)`
- MUI Autocomplete for search by name/ID/number
- Display: "LastName, FirstName (ID: xxx, Number: yyy)"
- Loading and error states

### 5. Create StudentGradeDetail Component (25 minutes)
**File:** `frontend/src/components/StudentGradeDetail.tsx`

**Props:**
- `courseId: number`
- `userId: number`

**Features:**
- Fetch grades with `gradebookAPI.getStudentGrades(courseId, userId)`
- MUI Table or Card layout showing:
  - Student name (header)
  - Each grade item with score and percentage
  - Course total (prominent display)
- Loading spinner
- Error handling

### 6. Update App.tsx (10 minutes)
Wire the components together:

```tsx
// Manage state
const [selectedCohort, setSelectedCohort] = useState<Cohort | null>(null);
const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);

// Render flow
return (
  <Container>
    <CohortSelector
      courseId={courseId}
      onSelect={setSelectedCohort}
    />

    {selectedCohort && (
      <StudentSearch
        courseId={courseId}
        cohortId={selectedCohort.id}
        onSelect={setSelectedStudent}
      />
    )}

    {selectedStudent && (
      <StudentGradeDetail
        courseId={courseId}
        userId={selectedStudent.id}
      />
    )}
  </Container>
);
```

### 7. Test It (5 minutes)
```bash
npm run dev
# Visit http://localhost:3000
```

**Expected behavior:**
- Components render without errors
- API calls will fail (backend not deployed yet) - that's OK
- Add error boundaries or mock data if needed

### 8. Update Progress (5 minutes)
When done, update these files:

**feature_list.json** - Set `passes: true` for completed features:
- Feature #2 (dependencies installed)
- Feature #11 (CohortSelector)
- Feature #12 (StudentSearch)
- Feature #13 (StudentGradeDetail)

**claude-progress.txt** - Add Session 2 entry:
```
## Session 2 (UI Components)
- Date: [today]
- Agent: [your name]
- Created CohortSelector, StudentSearch, StudentGradeDetail
- Wired components in App.tsx
- Frontend dev server running
```

## Key Files Reference

| File | Purpose |
|------|---------|
| `frontend/src/types/index.ts` | Type definitions (Cohort, Student, etc.) |
| `frontend/src/services/api.ts` | API client (gradebookAPI) |
| `frontend/package.json` | Dependencies list |
| `frontend/vite.config.ts` | Dev server config with proxy |
| `backend/cohorts.php` | Cohorts API endpoint |
| `backend/students.php` | Students API endpoint |
| `backend/student_grades.php` | Grades API endpoint |

## Helpful Commands

```bash
# Install deps
cd frontend && npm install

# Start dev server
npm run dev

# Type check
npm run build  # Will show TS errors

# Check feature tests
cd .. && bash -c 'test -f frontend/src/components/CohortSelector.tsx && echo "✅ CohortSelector exists"'
```

## Tips

- **Use MUI components** - Already imported in package.json
- **Handle loading states** - Show CircularProgress while fetching
- **Handle errors** - Show Alert or Snackbar on API errors
- **Type safety** - Use the types from `src/types/index.ts`
- **Mock data** - If backend not available, create mock responses

## What's Next (After You)
- Backend deployment to Moodle server
- Integration testing with real API
- Bonus features (DataGrid, CSV export, etc.)

---

**You've got this! The foundation is solid. Just build the UI components.** 🚀
