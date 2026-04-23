# Next Steps for Development

## Current State (Session 1 - Initializer)

✅ **Completed:**
- Project structure created (frontend + backend)
- Frontend: React + TypeScript + Vite + Material UI configured
- Backend: Moodle plugin structure with 3 API endpoints
- Authentication middleware (Bearer token validation)
- Type definitions for API responses
- API service layer with axios
- Build configuration (Vite with proxy for CORS)
- Documentation (README.md with full setup instructions)
- Feature tracking system (feature_list.json with 24 features)

## Project Files Created

### Frontend (18 files)
```
frontend/
├── package.json          ✅ Dependencies configured
├── tsconfig.json         ✅ TypeScript config
├── vite.config.ts        ✅ Vite + proxy for dev
├── index.html            ✅ HTML template
├── .env.example          ✅ Environment template
└── src/
    ├── main.tsx          ✅ React entry point
    ├── App.tsx           ✅ Main app component (stub)
    ├── vite-env.d.ts     ✅ Vite types
    ├── types/index.ts    ✅ API type definitions
    └── services/api.ts   ✅ API client with auth
```

### Backend (8 files)
```
backend/
├── version.php           ✅ Plugin metadata
├── settings.php          ✅ Admin settings page
├── lib.php               ✅ Auth + helper functions
├── cohorts.php           ✅ Cohorts endpoint
├── students.php          ✅ Students endpoint
├── student_grades.php    ✅ Grades endpoint
├── db/access.php         ✅ Capabilities
└── lang/en/local_gradebookapi.php ✅ Strings
```

## Priority 1: High-Priority Features (Next Agent Should Do)

Focus on these features in order:

### 1. Install Frontend Dependencies (Feature #2)
```bash
cd frontend && npm install
```

### 2. Create Cohort Selector Component (Feature #11)
- File: `frontend/src/components/CohortSelector.tsx`
- Should:
  - Accept a `courseId` prop
  - Fetch cohorts using `gradebookAPI.getCohorts()`
  - Display cohorts in a MUI Select or List
  - Emit selected cohort via callback
  - Handle loading and error states

### 3. Create Student Search Component (Feature #12)
- File: `frontend/src/components/StudentSearch.tsx`
- Should:
  - Accept `courseId` and `cohortId` props
  - Fetch students using `gradebookAPI.getStudents()`
  - Implement search/filter by name, studentid, studentnumber
  - Use MUI Autocomplete or Table with search
  - Emit selected student via callback
  - Handle loading and error states

### 4. Create Student Grade Detail Component (Feature #13)
- File: `frontend/src/components/StudentGradeDetail.tsx`
- Should:
  - Accept `courseId` and `userId` props
  - Fetch grades using `gradebookAPI.getStudentGrades()`
  - Display grade items in a MUI Table or Card layout
  - Show course total prominently
  - Handle loading and error states

### 5. Wire Components into App.tsx
- Update `frontend/src/App.tsx` to:
  - Manage state for selected cohort and student
  - Render CohortSelector → StudentSearch → StudentGradeDetail
  - Handle the selection flow

### 6. Test the Full Flow
- Start dev server: `cd frontend && npm run dev`
- Verify components render (may need mock data without backend)
- Update feature_list.json as features pass

## Priority 2: Backend Testing & Deployment

Once frontend components are working:

7. **Deploy backend to Moodle server**
   - Copy `backend/` to `/path/to/moodle/local/gradebookapi/`
   - Visit Moodle notifications to install
   - Configure API token in plugin settings

8. **Test API endpoints**
   - Test authentication
   - Test cohorts endpoint
   - Test students endpoint (verify custom fields work)
   - Test student_grades endpoint (verify hidden items excluded)

9. **Integration testing**
   - Connect frontend to real backend
   - Test full user flow: cohort → student → grades
   - Verify visibility rules work correctly

## Priority 3: Enhancements

10. **Cohort Grid View (Feature #18)**
    - Use MUI DataGrid
    - Show all students in cohort with grades
    - Pin identity columns

11. **CSV Export (Feature #19)**
    - Add export button to grade detail view
    - Generate CSV from grade data

12. **Offline State (Feature #20)**
    - Use localStorage to remember last selections
    - Restore state on page load

## Testing Commands

Run these to verify features:

```bash
# Feature 1: Structure
test -d frontend && test -d backend

# Feature 2: Dependencies
cd frontend && npm list react @mui/material

# Feature 4: Dev server
cd frontend && timeout 5 npm run dev || test $? -eq 124

# Feature 11: Cohort selector exists
test -f frontend/src/components/CohortSelector.tsx

# Feature 12: Student search exists
test -f frontend/src/components/StudentSearch.tsx

# Feature 13: Grade detail exists
test -f frontend/src/components/StudentGradeDetail.tsx
```

## Notes for Next Agent

- **Don't reinstall git**: The git commands need approval. Next agent can handle this.
- **Environment setup**: Create a `.env` file based on `.env.example` before testing.
- **Moodle server**: Server is at `192.168.1.9` (see app_spec.txt for SSH details).
- **Feature tracking**: Update `feature_list.json` as you complete features (set `passes: true`).
- **Progress log**: Append to `claude-progress.txt` at the end of your session.

## Quick Start for Next Agent

```bash
# 1. Install dependencies
cd frontend && npm install && cd ..

# 2. Create .env
cd frontend
cp .env.example .env
# Edit .env with real values

# 3. Start coding the UI components
# - CohortSelector.tsx
# - StudentSearch.tsx
# - StudentGradeDetail.tsx

# 4. Wire them into App.tsx

# 5. Test
npm run dev
```

## Architecture Notes

- **API Flow**: CohortSelector → StudentSearch → StudentGradeDetail
- **State**: App.tsx manages `courseId`, `selectedCohort`, `selectedStudent`
- **Auth**: Token passed via Authorization header in every request
- **CORS**: Vite proxy handles this in dev (see vite.config.ts)
- **Types**: All API responses typed in `frontend/src/types/index.ts`

---

**Session 1 Complete** ✅
Next agent: Focus on frontend UI components (Features 11-13) and integration.
