# PASMA Gradebook 2026 — Course Filtering & Order Quick Reference

> Tag this file + the files listed below when asking an LLM to implement course filtering or reordering.

---

## Feature Summary

| Feature | Description |
|---|---|
| **Course filtering** | Show/hide individual courses from the matrix (select all, select some) |
| **Course ordering** | Change the left-to-right column order of courses in the matrix |

**Both are pure frontend** — the API already returns all courses and grades. No backend changes needed.

---

## Files to Tag

### Always tag (data flow)
- `PASMA Gradebook 2026/frontend/src/components/ProgressDashboard.tsx` — state owner; add `selectedCourseIds` + `courseOrder` state here, pass as props
- `PASMA Gradebook 2026/frontend/src/components/ProgressMatrix.tsx` — table renderer; must accept filtered/ordered `courses` prop

### Tag for types
- `PASMA Gradebook 2026/frontend/src/types/index.ts` — new props will need type updates

### Tag for controls placement
- `PASMA Gradebook 2026/frontend/src/components/DashboardHeader.tsx` — course controls UI likely lives here or near here

### New file to create
- `PASMA Gradebook 2026/frontend/src/components/CourseControls.tsx` — does not exist yet; tell the LLM to create it

---

## Minimum Tag Set

```
@PASMA Gradebook 2026/frontend/src/components/ProgressDashboard.tsx
@PASMA Gradebook 2026/frontend/src/components/ProgressMatrix.tsx
@PASMA Gradebook 2026/frontend/src/components/DashboardHeader.tsx
@PASMA Gradebook 2026/frontend/src/types/index.ts
@PASMA Gradebook 2026/quickref/course_filtering_order.md
```

---

## Suggested Prompt Template

> Add course filtering (select/deselect which courses are shown) and course ordering (change left-to-right column order with drag or arrow buttons). Create a new `CourseControls.tsx` component for the UI. State lives in `ProgressDashboard.tsx` and is passed as props to `ProgressMatrix.tsx`. No backend changes needed — all courses and grades are already in the API response.

---

## Implementation Notes for the LLM

### State to add in `ProgressDashboard.tsx`
```ts
// Ordered list of course IDs (controls column order)
const [courseOrder, setCourseOrder] = useState<number[]>([]);

// Set of visible course IDs (controls filtering)
const [visibleCourseIds, setVisibleCourseIds] = useState<Set<number>>(new Set());

// Initialise both when data loads (in the fetchProgress useEffect)
// courseOrder = data.courses.map(c => c.id)
// visibleCourseIds = new Set(data.courses.map(c => c.id))
```

### Derived prop to compute and pass to ProgressMatrix
```ts
const displayedCourses = useMemo(() => {
  if (!data) return [];
  // 1. Filter to visible only
  // 2. Sort by courseOrder index
  return courseOrder
    .filter(id => visibleCourseIds.has(id))
    .map(id => data.courses.find(c => c.id === id)!)
    .filter(Boolean);
}, [data, courseOrder, visibleCourseIds]);
```

### Props to add to `ProgressMatrix.tsx`
`ProgressMatrix` already accepts `courses: CourseColumn[]` — just pass `displayedCourses` instead of `data.courses`. No structural changes needed inside the component.

### `CourseControls.tsx` responsibilities
- Checkbox list of all courses (check = visible)
- "Select all" / "Deselect all" buttons
- Up/down arrow buttons (or drag handles) to reorder
- Emits: `onVisibilityChange(id, visible)` and `onReorder(newOrderIds)`

### Persistence (optional)
Store `courseOrder` and `visibleCourseIds` in `localStorage` (keys: `progress_dash_course_order`, `progress_dash_visible_courses`) so selections survive page refresh — same pattern as theme and cohortId in `ProgressDashboard.tsx`.

---

## Related Quickref Files
- [`layout_theme_styles.md`](layout_theme_styles.md) — full component map, score colours, theme system
